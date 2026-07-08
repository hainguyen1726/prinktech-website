import { NextRequest, NextResponse } from 'next/server';
import { supabaseMarketing } from '@/lib/supabaseMarketing';
import { verifyAdminOrMarketing } from '@/lib/adminAuth';

// GET /api/marketing/reports - Lấy dữ liệu báo cáo hàng ngày và tổng hợp
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get('start_date'); // YYYY-MM-DD
    const endDate = searchParams.get('end_date');     // YYYY-MM-DD
    const platform = searchParams.get('platform');     // 'all', 'facebook', 'shopee'...

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Khoảng thời gian (start_date và end_date) là bắt buộc' }, { status: 400 });
    }

    // Lấy báo cáo hàng ngày kèm thông tin chiến dịch
    // Do Supabase JS v2 hỗ trợ join bảng bằng select('*, campaigns(*)')
    let query = supabaseMarketing
      .from('daily_reports')
      .select('*, campaigns!inner(*)')
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: false });

    if (platform && platform !== 'all') {
      query = query.eq('campaigns.platform', platform);
    }

    const { data: reports, error } = await query;
    if (error) throw error;

    // Tính toán tổng hợp số liệu (Summary)
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversations = 0;
    let totalPurchases = 0;
    let totalRevenue = 0;

    const formattedReports = reports.map((r: any) => {
      totalSpend += Number(r.spend || 0);
      totalImpressions += Number(r.impressions || 0);
      totalClicks += Number(r.clicks || 0);
      totalConversations += Number(r.conversations || 0);
      totalPurchases += Number(r.purchases || 0);
      totalRevenue += Number(r.revenue || 0);

      // Tính các chỉ số chi tiết cho từng ngày
      const spendNum = Number(r.spend || 0);
      const impNum = Number(r.impressions || 0);
      const clickNum = Number(r.clicks || 0);
      const convNum = Number(r.conversations || 0);
      const purNum = Number(r.purchases || 0);
      const revNum = Number(r.revenue || 0);

      return {
        id: r.id,
        campaign_id: r.campaign_id,
        campaign_name: r.campaigns.name,
        platform: r.campaigns.platform,
        report_date: r.report_date,
        spend: spendNum,
        impressions: impNum,
        clicks: clickNum,
        conversations: convNum,
        purchases: purNum,
        revenue: revNum,
        ctr: impNum > 0 ? (clickNum / impNum) * 100 : 0,
        cpc: clickNum > 0 ? spendNum / clickNum : 0,
        cost_per_conv: convNum > 0 ? spendNum / convNum : 0,
        cpa: purNum > 0 ? spendNum / purNum : 0,
        roas: spendNum > 0 ? revNum / spendNum : 0,
      };
    });

    const summary = {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversations: totalConversations,
      purchases: totalPurchases,
      revenue: totalRevenue,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cost_per_conv: totalConversations > 0 ? totalSpend / totalConversations : 0,
      cpa: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    };

    return NextResponse.json({ reports: formattedReports, summary });
  } catch (error: any) {
    console.error('[API Marketing Reports GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/marketing/reports - Thêm hoặc cập nhật báo cáo ngày (UPSERT)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { campaign_id, report_date, spend, impressions, clicks, conversations, purchases, revenue } = body;

    if (!campaign_id || !report_date) {
      return NextResponse.json({ error: 'Thiếu ID chiến dịch hoặc ngày báo cáo' }, { status: 400 });
    }

    // Thực hiện UPSERT dữ liệu dựa trên ràng buộc duy nhất (campaign_id, report_date)
    const { data: report, error } = await supabaseMarketing
      .from('daily_reports')
      .upsert({
        campaign_id,
        report_date,
        spend: spend || 0,
        impressions: impressions || 0,
        clicks: clicks || 0,
        conversations: conversations || 0,
        purchases: purchases || 0,
        revenue: revenue || 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'campaign_id,report_date'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error('[API Marketing Reports POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// DELETE /api/marketing/reports - Xóa báo cáo ngày
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID báo cáo cần xóa' }, { status: 400 });
    }

    const { error } = await supabaseMarketing
      .from('daily_reports')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Xóa báo cáo thành công' });
  } catch (error: any) {
    console.error('[API Marketing Reports DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
