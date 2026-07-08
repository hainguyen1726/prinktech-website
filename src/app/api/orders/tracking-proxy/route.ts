import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const carrier = searchParams.get('carrier')?.trim().toLowerCase(); // 'ghtk' | 'viettelpost'
    const code = searchParams.get('code')?.trim();

    if (!carrier || !code) {
      return NextResponse.json(
        { error: 'Thiếu đơn vị vận chuyển hoặc mã vận đơn để truy vấn' },
        { status: 400 }
      );
    }

    // 1. KẾT NỐI GIAO HÀNG TIẾT KIỆM (GHTK)
    if (carrier === 'ghtk') {
      // Endpoint API public của GHTK dùng trên trang i.ghtk.vn
      const apiUrl = `https://services.giaohangtietkiem.vn/services/shipment/v2/public-tracking?id=${code}`;
      
      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://i.ghtk.vn',
          'Referer': 'https://i.ghtk.vn/'
        },
        next: { revalidate: 60 } // Cache kết quả trong 60 giây để tránh spam API của hãng
      });

      if (!res.ok) {
        throw new Error(`GHTK trả về lỗi HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data && data.success && data.data) {
        const logs = data.data.logs?.map((log: any) => ({
          status_name: log.status_text || 'Cập nhật hành trình',
          status_detail: log.desc || '',
          locate: log.location || '',
          time: log.created_at || '' // YYYY-MM-DD HH:mm:ss
        })) || [];

        return NextResponse.json({
          success: true,
          carrier: 'ghtk',
          bill_code: code,
          status_text: data.data.status_text || 'Đang vận chuyển',
          logs: logs
        });
      }

      return NextResponse.json(
        { error: data.message || 'Mã vận đơn GHTK không tồn tại hoặc không thể tra cứu' },
        { status: 404 }
      );
    }

    // 2. KẾT NỐI VIETTEL POST
    if (carrier === 'viettelpost') {
      // Endpoint API public của Viettel Post
      const apiUrl = 'https://partner.viettelpost.vn/v2/order/trackingPublic';
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ orderCode: code }),
        next: { revalidate: 60 } // Cache 60s
      });

      if (!res.ok) {
        throw new Error(`Viettel Post trả về lỗi HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data && data.status === 200 && Array.isArray(data.data) && data.data.length > 0) {
        const logs = data.data.map((log: any) => ({
          status_name: log.STATUS_NAME || 'Cập nhật hành trình',
          status_detail: log.NOTE || '',
          locate: log.LOCATE_NAME || '',
          time: log.STATUS_DATE || '' // DD/MM/YYYY HH:mm:ss
        }));

        return NextResponse.json({
          success: true,
          carrier: 'viettelpost',
          bill_code: code,
          status_text: data.data[0]?.STATUS_NAME || 'Đang vận chuyển',
          logs: logs // Viettel Post thường trả về sắp xếp từ mới nhất đến cũ nhất
        });
      }

      return NextResponse.json(
        { error: data.message || 'Mã vận đơn Viettel Post không tồn tại hoặc không thể tra cứu' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `Đơn vị vận chuyển '${carrier}' chưa được hỗ trợ liên kết tự động` },
      { status: 400 }
    );

  } catch (err: any) {
    console.error('[Tracking Proxy Error]', err);
    return NextResponse.json(
      { error: err.message || 'Lỗi hệ thống khi kết nối đơn vị vận chuyển' },
      { status: 500 }
    );
  }
}
