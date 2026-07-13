import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

// Đọc credentials từ file JSON đã được cấu hình trong env
async function getGoogleAuth() {
  const credsPath = process.env.GSC_CREDENTIALS_PATH;
  if (!credsPath) {
    throw new Error('GSC_CREDENTIALS_PATH is not configured in .env.local');
  }

  // Hỗ trợ tự động định vị tương đối dựa trên thư mục chạy dự án (process.cwd())
  const resolvedPath = path.isAbsolute(credsPath)
    ? credsPath
    : path.join(process.cwd(), credsPath);

  try {
    await fs.access(resolvedPath);
  } catch {
    throw new Error(`Credentials file not found at: ${resolvedPath}`);
  }

  return new google.auth.GoogleAuth({
    keyFile: resolvedPath,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
}

// GET /api/admin/analytics - Lấy số liệu Google Analytics 4
export async function GET(request: NextRequest) {
  try {
    // 1. Kiểm tra xác thực admin
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'realtime'; // 'realtime' hoặc 'report'
    const days = parseInt(searchParams.get('days') || '7', 10);

    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!propertyId) {
      return NextResponse.json({ error: 'GA4_PROPERTY_ID is not configured in .env.local' }, { status: 500 });
    }

    // 2. Khởi tạo Google Analytics Data API client
    const googleAuth = await getGoogleAuth();
    const analyticsdata = google.analyticsdata({
      version: 'v1beta',
      auth: googleAuth,
    });

    // 3. Xử lý tùy theo loại báo cáo yêu cầu
    if (type === 'realtime') {
      // Báo cáo thời gian thực (trong 30 phút qua)
      const response = await analyticsdata.properties.runRealtimeReport({
        property: `properties/${propertyId}`,
        requestBody: {
          metrics: [{ name: 'activeUsers' }],
          dimensions: [
            { name: 'unifiedScreenName' }, // Tên trang/tiêu đề màn hình đang xem
            { name: 'deviceCategory' },     // Thiết bị (mobile, desktop, tablet)
          ],
          limit: '10', // googleapis yêu cầu kiểu string
        },
      }) as any;

      // Phân tích kết quả Realtime
      const rows = response.data.rows || [];
      
      // Tính tổng số active users hiện tại
      const totalActiveResponse = await analyticsdata.properties.runRealtimeReport({
        property: `properties/${propertyId}`,
        requestBody: {
          metrics: [{ name: 'activeUsers' }],
        },
      }) as any;
      
      const totalActiveUsers = parseInt(
        totalActiveResponse.data.rows?.[0]?.metricValues?.[0]?.value || '0', 
        10
      );

      const topPages = rows.map((row: any) => ({
        page: row.dimensionValues?.[0]?.value || 'Unknown',
        device: row.dimensionValues?.[1]?.value || 'Unknown',
        activeUsers: parseInt(row.metricValues?.[0]?.value || '0', 10),
      }));

      return NextResponse.json({
        activeUsers: totalActiveUsers,
        topPages,
      });

    } else if (type === 'report') {
      // Báo cáo lịch sử (mặc định 7 ngày qua)
      const startDate = `${days}daysAgo`;
      
      // Báo cáo 1: Lượng truy cập theo ngày (Users, Sessions, Pageviews)
      const trafficReport = await analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate: 'today' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
          ],
          dimensions: [{ name: 'date' }],
        },
      }) as any;

      // Báo cáo 2: Nguồn lượng truy cập (Traffic Source)
      const sourceReport = await analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate: 'today' }],
          metrics: [{ name: 'sessions' }],
          dimensions: [{ name: 'sessionSourceMedium' }],
          limit: '5', // googleapis yêu cầu kiểu string
        },
      }) as any;

      // Format dữ liệu traffic theo ngày
      const trafficRows = trafficReport.data.rows || [];
      const chartData = trafficRows.map((row: any) => {
        const rawDate = row.dimensionValues?.[0]?.value || '';
        // Format YYYYMMDD -> DD/MM
        const formattedDate = rawDate.length === 8 
          ? `${rawDate.substring(6, 8)}/${rawDate.substring(4, 6)}` 
          : rawDate;

        return {
          date: formattedDate,
          rawDate,
          users: parseInt(row.metricValues?.[0]?.value || '0', 10),
          sessions: parseInt(row.metricValues?.[1]?.value || '0', 10),
          pageviews: parseInt(row.metricValues?.[2]?.value || '0', 10),
        };
      }).sort((a: any, b: any) => a.rawDate.localeCompare(b.rawDate)); // Sắp xếp theo ngày tăng dần

      // Format dữ liệu nguồn truy cập
      const sourceRows = sourceReport.data.rows || [];
      const sources = sourceRows.map((row: any) => ({
        source: row.dimensionValues?.[0]?.value || 'direct',
        sessions: parseInt(row.metricValues?.[0]?.value || '0', 10),
      }));

      return NextResponse.json({
        chartData,
        sources,
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });

  } catch (error: any) {
    console.error('[API Analytics GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi kết nối GA4 API' }, { status: 500 });
  }
}
