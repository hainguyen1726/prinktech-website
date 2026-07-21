import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import { google } from 'googleapis';
import { Readable } from 'stream';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";
const PARENT_DRIVE_FOLDER_ID = "1HKqBw0DKnmQvcXzyjo9cgtrFl15Ehj24";

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const { customer_name, design_name, size_label, file_name, file_data, mime_type } = body;

    if (!design_name || !file_data || !file_name) {
      return NextResponse.json({ error: 'design_name, file_name và file_data là bắt buộc' }, { status: 400 });
    }

    const extMatch = file_name.match(/\.([^.]+)$/);
    const ext = extMatch ? extMatch[1] : 'pdf';

    const cleanCust = removeAccents(customer_name || 'Khach_Hang');
    const cleanDesign = removeAccents(design_name);
    const cleanSize = size_label ? removeAccents(size_label) : 'Standard';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Đặt tên lại file theo chuẩn
    const driveFileName = `${cleanCust}_${cleanDesign}_${cleanSize}_${dateStr}.${ext}`;

    console.log(`Connecting to Google Drive to upload design file: ${driveFileName}`);
    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    // Upload file lên Google Drive
    const buffer = Buffer.from(file_data, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const uploadRes = await drive.files.create({
      requestBody: {
        name: driveFileName,
        parents: [PARENT_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: mime_type || 'application/octet-stream',
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    const fileId = uploadRes.data.id;
    const fileUrl = uploadRes.data.webViewLink || '';

    // Cấp quyền xem cho bất kỳ ai có link
    try {
      await drive.permissions.create({
        fileId: fileId!,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (permErr) {
      console.warn('Cấp quyền Drive file error:', permErr);
    }

    return NextResponse.json({
      success: true,
      file_url: fileUrl,
      renamed_filename: driveFileName
    });
  } catch (err: any) {
    console.error('Lỗi upload file thiết kế lên Drive:', err);
    return NextResponse.json({ error: err.message || 'Lỗi upload file' }, { status: 500 });
  }
}
