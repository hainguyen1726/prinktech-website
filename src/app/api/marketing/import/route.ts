import { NextRequest, NextResponse } from 'next/server';
import { supabaseMarketing } from '@/lib/supabaseMarketing';
import { verifyAdminOrMarketing } from '@/lib/adminAuth';

// POST /api/marketing/import - Import dữ liệu quảng cáo từ CSV thô
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { csvText } = await request.json();
    if (!csvText) {
      return NextResponse.json({ error: 'Nội dung file CSV trống' }, { status: 400 });
    }

    // 1. Phân tích các dòng CSV
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'File CSV không có dữ liệu hoặc sai định dạng' }, { status: 400 });
    }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    // 2. Tìm kiếm chỉ số của các cột tương ứng (Hỗ trợ cả Việt và Anh)
    const colIndices = {
      date: findColumnIndex(headers, ['ngày', 'date', 'reporting starts', 'reporting period', 'start date']),
      campaignName: findColumnIndex(headers, ['tên chiến dịch', 'campaign name', 'campaign']),
      campaignId: findColumnIndex(headers, ['id chiến dịch', 'campaign id', 'id']),
      spend: findColumnIndex(headers, ['số tiền đã chi tiêu', 'amount spent', 'spend', 'amount spent (vnd)']),
      impressions: findColumnIndex(headers, ['lượt hiển thị', 'impressions', 'impressions count']),
      clicks: findColumnIndex(headers, ['lượt nhấp vào liên kết', 'link clicks', 'clicks', 'lượt nhấp chuột']),
      conversations: findColumnIndex(headers, ['số cuộc hội thoại tin nhắn mới bắt đầu', 'messaging conversations started', 'conversations', 'tin nhắn mới', 'new messaging conversations']),
      purchases: findColumnIndex(headers, ['lượt mua hàng', 'purchases', 'đơn hàng', 'purchase count']),
      revenue: findColumnIndex(headers, ['doanh thu', 'revenue', 'doanh số', 'purchase value'])
    };

    // Kiểm tra các cột tối thiểu bắt buộc
    if (colIndices.campaignName === -1 || colIndices.date === -1) {
      return NextResponse.json({ 
        error: 'Không thể nhận diện cột "Tên chiến dịch" hoặc cột "Ngày" trong file CSV. Vui lòng kiểm tra lại dòng tiêu đề.' 
      }, { status: 400 });
    }

    let campaignsCreatedOrFound = 0;
    let reportsUpserted = 0;
    
    // Lưu cache campaign map để tránh gọi DB liên tục
    const campaignCache: Record<string, string> = {};

    // 3. Duyệt dữ liệu từng dòng
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2 || !row[colIndices.campaignName]) continue; // Bỏ qua dòng trống

      const rawDate = row[colIndices.date];
      const campaignName = row[colIndices.campaignName];
      const rawCampId = colIndices.campaignId !== -1 ? row[colIndices.campaignId] : `csv_mock_${campaignName.replace(/\s+/g, '_')}`;
      
      const spend = cleanNumber(colIndices.spend !== -1 ? row[colIndices.spend] : '0');
      const impressions = Math.floor(cleanNumber(colIndices.impressions !== -1 ? row[colIndices.impressions] : '0'));
      const clicks = Math.floor(cleanNumber(colIndices.clicks !== -1 ? row[colIndices.clicks] : '0'));
      const conversations = Math.floor(cleanNumber(colIndices.conversations !== -1 ? row[colIndices.conversations] : '0'));
      const purchases = Math.floor(cleanNumber(colIndices.purchases !== -1 ? row[colIndices.purchases] : '0'));
      let revenue = cleanNumber(colIndices.revenue !== -1 ? row[colIndices.revenue] : '0');

      // Tự động gán doanh thu giả định nếu chốt đơn mà doanh thu bằng 0
      if (purchases > 0 && revenue === 0) {
        revenue = purchases * 250000;
      }

      // Chuẩn hóa định dạng ngày thành YYYY-MM-DD
      const reportDate = formatDate(rawDate);
      if (!reportDate) continue; // Ngày không hợp lệ thì bỏ qua

      // Lấy hoặc tạo chiến dịch
      let campaignId = campaignCache[rawCampId];
      if (!campaignId) {
        const { data: existingCamp } = await supabaseMarketing
          .from('campaigns')
          .select('id')
          .eq('fb_campaign_id', rawCampId)
          .maybeSingle();

        if (existingCamp) {
          campaignId = existingCamp.id;
        } else {
          // Tạo mới
          const { data: newCamp, error: campErr } = await supabaseMarketing
            .from('campaigns')
            .insert({
              name: campaignName,
              platform: 'facebook',
              status: 'active',
              fb_campaign_id: rawCampId,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (campErr) continue; // Lỗi tạo chiến dịch thì bỏ qua dòng này
          campaignId = newCamp.id;
          campaignsCreatedOrFound++;
        }
        campaignCache[rawCampId] = campaignId;
      }

      // UPSERT báo cáo ngày
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

      if (!upsertErr) {
        reportsUpserted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Nhập dữ liệu thành công! Đã thêm/cập nhật ${reportsUpserted} bản ghi số liệu ngày, phát hiện ${campaignsCreatedOrFound} chiến dịch mới.`,
      details: { reportsUpserted, campaignsCreatedOrFound }
    });

  } catch (error: any) {
    console.error('[API Marketing Import CSV Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống khi import CSV' }, { status: 500 });
  }
}

// -------------------------------------------------------------
// CÁC HÀM TIỆN ÍCH PHÂN TÍCH CSV
// -------------------------------------------------------------

// Phân tích văn bản CSV thành mảng 2 chiều, xử lý cả dấu ngoặc kép bọc chuỗi chứa dấu phẩy
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const result: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row: string[] = [];
    let inQuotes = false;
    let currentToken = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    row.push(currentToken.trim());
    result.push(row);
  }

  return result;
}

// Tìm chỉ số cột khớp với danh sách từ khóa gợi ý
function findColumnIndex(headers: string[], keywords: string[]): number {
  return headers.findIndex(h => {
    return keywords.some(k => h.includes(k) || k.includes(h));
  });
}

// Chuẩn hóa chuỗi số (xóa bỏ dấu phẩy phân cách phần nghìn, xử lý dấu chấm thập phân)
function cleanNumber(str: string): number {
  if (!str) return 0;
  // Xóa mọi ký tự ngoại trừ số, dấu trừ, dấu phẩy, dấu chấm
  let cleaned = str.replace(/[^0-9.,-]/g, '');
  
  // Xác định định dạng số kiểu Việt Nam (ví dụ 1.200,50) hay kiểu Mỹ (1,200.50)
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const dotPos = cleaned.indexOf('.');
    const commaPos = cleaned.indexOf(',');
    if (commaPos < dotPos) {
      // Kiểu Mỹ: 1,200.50 -> xóa dấu phẩy
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Kiểu Việt Nam: 1.200,50 -> xóa dấu chấm, đổi dấu phẩy thành dấu chấm thập phân
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (commaCount > 0 && dotCount === 0) {
    // Chỉ có dấu phẩy: có thể là phân cách phần nghìn (1,000) hoặc thập phân (1,5)
    // Nếu có 3 chữ số sau dấu phẩy -> coi là phân cách phần nghìn
    const parts = cleaned.split(',');
    if (parts[parts.length - 1].length === 3) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(/,/g, '.');
    }
  } else if (dotCount > 0 && commaCount === 0) {
    // Chỉ có dấu chấm: có thể là phân cách phần nghìn (1.000) hoặc thập phân (1.5)
    const parts = cleaned.split('.');
    if (parts[parts.length - 1].length === 3) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

// Chuẩn hóa ngày tháng sang định dạng YYYY-MM-DD
function formatDate(str: string): string | null {
  if (!str) return null;
  const cleaned = str.trim();

  // Nhận diện định dạng YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Nhận diện định dạng DD/MM/YYYY hoặc DD.MM.YYYY
  const parts = cleaned.split(/[\/\.]/);
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];

    // Xử lý năm dạng 2 chữ số (e.g. 26 -> 2026)
    if (year.length === 2) {
      year = '20' + year;
    }

    if (year.length === 4) {
      // Nếu phần đầu dài 4 chữ số, có thể là YYYY/MM/DD
      if (parts[0].length === 4) {
        year = parts[0];
        month = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
      }
      
      const dateStr = `${year}-${month}-${day}`;
      // Kiểm tra ngày hợp lệ
      if (!isNaN(Date.parse(dateStr))) {
        return dateStr;
      }
    }
  }

  // Phương án dự phòng: dùng Date.parse
  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return null;
}
