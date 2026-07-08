import { NextRequest, NextResponse } from 'next/server';
import { supabaseMarketing } from '@/lib/supabaseMarketing';
import { verifyAdminOrMarketing } from '@/lib/adminAuth';

// POST /api/marketing/sync - Đồng bộ dữ liệu quảng cáo từ Facebook API
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { start_date, end_date } = body;

    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'Thiếu start_date hoặc end_date' }, { status: 400 });
    }

    // 1. Lấy thông tin cấu hình Token từ database
    const { data: settingsData } = await supabaseMarketing
      .from('settings')
      .select('*');

    const settings: Record<string, string> = {};
    settingsData?.forEach(item => {
      settings[item.key] = item.value;
    });

    const fbAccessToken = settings['fb_access_token'];
    const fbAdAccountId = settings['fb_ad_account_id'];

    // 2. Kiểm tra nếu thiếu token thật -> kích hoạt chế độ Giả lập (Mock Data)
    const isMock = !fbAccessToken || !fbAdAccountId || fbAccessToken.includes('...') || fbAccessToken.startsWith('placeholder');

    if (isMock) {
      return await handleMockSync(start_date, end_date);
    }

    // 3. Chạy đồng bộ thật từ Facebook API
    return await handleRealSync(fbAdAccountId, fbAccessToken, start_date, end_date);
  } catch (error: any) {
    console.error('[API Marketing Sync Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// -------------------------------------------------------------
// HÀM ĐỒNG BỘ THẬT TỪ FACEBOOK ADS GRAPH API
// -------------------------------------------------------------
async function handleRealSync(adAccountId: string, accessToken: string, startDate: string, endDate: string) {
  try {
    // Định dạng adAccountId (Đảm bảo không có chữ 'act_' thừa)
    const cleanAdId = adAccountId.replace('act_', '');
    const url = `https://graph.facebook.com/v20.0/act_${cleanAdId}/insights` +
      `?level=campaign` +
      `&time_increment=1` + // Chia nhỏ số liệu theo từng ngày (1 ngày 1 dòng)
      `&time_range={"since":"${startDate}","until":"${endDate}"}` +
      `&fields=campaign_id,campaign_name,spend,impressions,inline_link_clicks,actions` +
      `&access_token=${accessToken}` +
      `&limit=500`;

    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || `Lỗi API Facebook: ${res.statusText}`);
    }

    const fbData = await res.json();
    const insights = fbData.data || [];

    let campaignsCreatedOrFound = 0;
    let reportsUpserted = 0;

    for (const record of insights) {
      const fbCampaignId = record.campaign_id;
      const fbCampaignName = record.campaign_name;
      const reportDate = record.date_start; // Ngày báo cáo

      const spend = Number(record.spend || 0);
      const impressions = Number(record.impressions || 0);
      const clicks = Number(record.inline_link_clicks || 0);

      // Bóc tách actions (tin nhắn, mua hàng)
      let conversations = 0;
      let purchases = 0;
      let revenue = 0;

      const actions = record.actions || [];
      actions.forEach((act: any) => {
        const type = act.action_type;
        const val = Number(act.value || 0);

        if (type === 'onsite_conversion.messaging_conversation_started_7d') {
          conversations += val;
        } else if (type === 'onsite_conversion.purchase' || type === 'offsite_conversion.fb_pixel_purchase') {
          purchases += val;
        }
      });

      // Nếu có purchase và có doanh thu (Facebook API trả về giá trị action_values nếu có cấu hình pixel)
      const actionValues = record.action_values || [];
      actionValues.forEach((actVal: any) => {
        const type = actVal.action_type;
        const val = Number(actVal.value || 0);
        if (type === 'onsite_conversion.purchase' || type === 'offsite_conversion.fb_pixel_purchase') {
          revenue += val;
        }
      });

      // Nếu không có pixel đo lường doanh thu, chúng ta có thể giả định doanh thu ước tính:
      // (Bằng số đơn hàng chốt * giá trị đơn hàng trung bình của xưởng in UV DTF ~ 250.000 VNĐ)
      if (purchases > 0 && revenue === 0) {
        revenue = purchases * 250000;
      }

      // 3.1. Tìm kiếm hoặc tạo chiến dịch trong DB của chúng ta
      let campaignId = '';
      const { data: existingCamp } = await supabaseMarketing
        .from('campaigns')
        .select('id')
        .eq('fb_campaign_id', fbCampaignId)
        .maybeSingle();

      if (existingCamp) {
        campaignId = existingCamp.id;
      } else {
        // Tạo chiến dịch mới
        const { data: newCamp, error: campErr } = await supabaseMarketing
          .from('campaigns')
          .insert({
            name: fbCampaignName,
            platform: 'facebook',
            status: 'active',
            fb_campaign_id: fbCampaignId,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (campErr) throw campErr;
        campaignId = newCamp.id;
        campaignsCreatedOrFound++;
      }

      // 3.2. Tiến hành UPSERT báo cáo ngày
      const { error: upsertErr } = await supabaseMarketing
        .from('daily_reports')
        .upsert({
          campaign_id: campaignId,
          report_date: reportDate,
          spend,
          impressions,
          clicks,
          conversations,
          purchases,
          revenue,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'campaign_id,report_date'
        });

      if (upsertErr) throw upsertErr;
      reportsUpserted++;
    }

    return NextResponse.json({
      success: true,
      mode: 'real_api',
      message: `Đồng bộ hoàn tất! Cập nhật ${reportsUpserted} bản ghi số liệu, ${campaignsCreatedOrFound} chiến dịch mới được tạo.`,
      details: { reportsUpserted, campaignsCreatedOrFound }
    });

  } catch (error: any) {
    console.error('[API Facebook Sync Failure]', error);
    return NextResponse.json({ error: error.message || 'Lỗi trong quá trình kết nối API Facebook' }, { status: 500 });
  }
}

// -------------------------------------------------------------
// HÀM ĐỒNG BỘ GIẢ LẬP (MOCK DATA)
// -------------------------------------------------------------
async function handleMockSync(startDate: string, endDate: string) {
  try {
    // 1. Tạo sẵn các chiến dịch mẫu nếu chưa có
    const mockCampaigns = [
      { name: 'Campaign UV DTF Nổi 3D Ánh Kim - T7/2026', fb_campaign_id: 'fb_camp_mock_1', budget: 500000 },
      { name: 'In Tem Nhãn Decal Cốc Trà Sữa sỉ/lẻ', fb_campaign_id: 'fb_camp_mock_2', budget: 200000 },
      { name: 'Quảng bá Thương Hiệu PrinK Tech UV DTF', fb_campaign_id: 'fb_camp_mock_3', budget: 100000 }
    ];

    const campIds: string[] = [];

    for (const mc of mockCampaigns) {
      const { data: existingCamp } = await supabaseMarketing
        .from('campaigns')
        .select('id')
        .eq('fb_campaign_id', mc.fb_campaign_id)
        .maybeSingle();

      if (existingCamp) {
        campIds.push(existingCamp.id);
      } else {
        const { data: newCamp, error: campErr } = await supabaseMarketing
          .from('campaigns')
          .insert({
            name: mc.name,
            platform: 'facebook',
            status: 'active',
            budget: mc.budget,
            budget_type: 'daily',
            fb_campaign_id: mc.fb_campaign_id,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (campErr) throw campErr;
        campIds.push(newCamp.id);
      }
    }

    // 2. Tạo báo cáo số liệu từng ngày chạy từ start_date đến end_date
    const start = new Date(startDate);
    const end = new Date(endDate);
    const reportsToUpsert = [];

    // Duyệt qua từng ngày
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Tạo số ngẫu nhiên nhưng có quy luật thực tế cho từng chiến dịch
      // Chiến dịch 1 (UV DTF Nổi): Ngân sách cao, hiệu quả tốt, ROAS cao
      const spend1 = Math.floor(400000 + Math.random() * 120000); // ~ 450.000đ
      const imp1 = Math.floor(15000 + Math.random() * 5000);
      const click1 = Math.floor(imp1 * (0.018 + Math.random() * 0.008)); // CTR 1.8% - 2.6%
      const conv1 = Math.floor(click1 * (0.12 + Math.random() * 0.06)); // Tỷ lệ nhắn tin 12-18%
      const pur1 = Math.floor(conv1 * (0.15 + Math.random() * 0.08)); // Tỷ lệ chốt đơn 15-23%
      const rev1 = pur1 * (200000 + Math.floor(Math.random() * 150000)); // Doanh thu ~ AOV 270.000đ

      reportsToUpsert.push({
        campaign_id: campIds[0],
        report_date: dateStr,
        spend: spend1,
        impressions: imp1,
        clicks: click1,
        conversations: conv1,
        purchases: pur1,
        revenue: rev1,
        updated_at: new Date().toISOString()
      });

      // Chiến dịch 2 (Tem Cốc Trà Sữa): Ngân sách trung bình, số lượng chat nhiều nhưng đơn lẻ rẻ hơn
      const spend2 = Math.floor(160000 + Math.random() * 50000); // ~ 180.000đ
      const imp2 = Math.floor(8000 + Math.random() * 3000);
      const click2 = Math.floor(imp2 * (0.015 + Math.random() * 0.006)); // CTR 1.5% - 2.1%
      const conv2 = Math.floor(click2 * (0.18 + Math.random() * 0.08)); // Tỷ lệ nhắn tin cao hơn (18-26%)
      const pur2 = Math.floor(conv2 * (0.10 + Math.random() * 0.05)); // Chốt đơn lẻ khó hơn (10-15%)
      const rev2 = pur2 * (80000 + Math.floor(Math.random() * 40000)); // Đơn lẻ rẻ tiền hơn

      reportsToUpsert.push({
        campaign_id: campIds[1],
        report_date: dateStr,
        spend: spend2,
        impressions: imp2,
        clicks: click2,
        conversations: conv2,
        purchases: pur2,
        revenue: rev2,
        updated_at: new Date().toISOString()
      });

      // Chiến dịch 3 (Thương hiệu): Chi tiêu ít, chủ yếu lượt click/view, không có đơn trực tiếp
      const spend3 = Math.floor(80000 + Math.random() * 20000);
      const imp3 = Math.floor(10000 + Math.random() * 4000);
      const click3 = Math.floor(imp3 * (0.01 + Math.random() * 0.005));
      const conv3 = Math.floor(click3 * (0.02 + Math.random() * 0.02)); // Hầu như không nhắn tin
      const pur3 = Math.random() > 0.8 ? 1 : 0; // Hầu như không có đơn
      const rev3 = pur3 * 150000;

      reportsToUpsert.push({
        campaign_id: campIds[2],
        report_date: dateStr,
        spend: spend3,
        impressions: imp3,
        clicks: click3,
        conversations: conv3,
        purchases: pur3,
        revenue: rev3,
        updated_at: new Date().toISOString()
      });
    }

    // Thực hiện UPSERT hàng loạt vào db
    const { error: batchErr } = await supabaseMarketing
      .from('daily_reports')
      .upsert(reportsToUpsert, {
        onConflict: 'campaign_id,report_date'
      });

    if (batchErr) throw batchErr;

    return NextResponse.json({
      success: true,
      mode: 'mock_demo',
      message: `[Chế độ Demo] Đã tạo thành công dữ liệu quảng cáo giả lập cho 3 chiến dịch Facebook từ ngày ${startDate} đến ${endDate}. Bạn có thể điền Facebook Ads Token thật tại mục Cấu hình bất kỳ lúc nào để chuyển sang đồng bộ thật.`,
      details: { reportsUpserted: reportsToUpsert.length, campaignsCreatedOrFound: 3 }
    });

  } catch (error: any) {
    console.error('[Mock Sync Fail]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống khi sinh dữ liệu Mock' }, { status: 500 });
  }
}
