import { google } from 'googleapis';
import { Readable } from 'stream';
import { createClient } from '@supabase/supabase-js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";
export const ROOT_DRIVE_FOLDER_ID = "1HKqBw0DKnmQvcXzyjo9cgtrFl15Ehj24";

const printingSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'printing' } }
);

export function removeAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '');
}

export function getDriveClient() {
  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oAuth2Client });
}

/**
 * Tìm hoặc tạo thư mục Google Drive cho Khách hàng:
 * Sơ đồ: ROOT (1HKqBw0DKnmQvcXzyjo9cgtrFl15Ehj24) -> [SDT]_[Ten_Khach] -> 01_Mau_Thiet_Ke
 */
export async function getOrCreateCustomerDesignFolder(
  customerId: string,
  customerName: string,
  customerPhone: string
): Promise<string> {
  const drive = getDriveClient();
  const cleanPhone = removeAccents(customerPhone || '0000000000');
  const cleanName = removeAccents(customerName || 'Khach_Hang');
  const folderName = `${cleanPhone}_${cleanName}`;

  // 1. Kiểm tra v2_customers xem đã lưu drive_folder_id chưa
  if (customerId) {
    const { data: cust } = await printingSupabase
      .from('v2_customers')
      .select('drive_folder_id')
      .eq('id', customerId)
      .single();

    if (cust?.drive_folder_id) {
      // Đã có folder thiết kế ID
      return cust.drive_folder_id;
    }
  }

  // 2. Tìm folder khách hàng trong ROOT
  const qCustFolder = `'${ROOT_DRIVE_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
  const resCustFolder = await drive.files.list({ q: qCustFolder, fields: 'files(id, name)' });
  
  let custFolderId = resCustFolder.data.files?.[0]?.id;

  if (!custFolderId) {
    // Tạo folder khách hàng mới
    const createCustFolder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [ROOT_DRIVE_FOLDER_ID],
      },
      fields: 'id',
    });
    custFolderId = createCustFolder.data.id!;
  }

  // 3. Tìm hoặc tạo subfolder '01_Mau_Thiet_Ke' trong folder khách hàng
  const qSubFolder = `'${custFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '01_Mau_Thiet_Ke' and trashed = false`;
  const resSubFolder = await drive.files.list({ q: qSubFolder, fields: 'files(id, name)' });

  let designSubfolderId = resSubFolder.data.files?.[0]?.id;

  if (!designSubfolderId) {
    const createSubFolder = await drive.files.create({
      requestBody: {
        name: '01_Mau_Thiet_Ke',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [custFolderId],
      },
      fields: 'id',
    });
    designSubfolderId = createSubFolder.data.id!;
  }

  // 4. Lưu lại designSubfolderId vào database v2_customers
  if (customerId && designSubfolderId) {
    await printingSupabase
      .from('v2_customers')
      .update({ drive_folder_id: designSubfolderId })
      .eq('id', customerId);
  }

  return designSubfolderId;
}

/**
 * Upload file thiết kế vào thư mục Google Drive của khách hàng
 */
export async function uploadDesignToDrive(
  folderId: string,
  formattedFileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ fileId: string; fileUrl: string }> {
  const drive = getDriveClient();

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const uploadRes = await drive.files.create({
    requestBody: {
      name: formattedFileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    },
    fields: 'id, webViewLink',
  });

  const fileId = uploadRes.data.id!;
  const fileUrl = uploadRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  // Cấp quyền reader cho anyone
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (err) {
    console.warn('Set permission error:', err);
  }

  return { fileId, fileUrl };
}
