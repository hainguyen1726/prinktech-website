import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// 1. Parse .env.local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim().replace(/^["']|["']$/g, '');
        process.env[match[1]] = val;
      }
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Thông tin OAuth2 cá nhân
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";
const PARENT_DRIVE_FOLDER_ID = "1HKqBw0DKnmQvcXzyjo9cgtrFl15Ehj24";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Supabase config not found!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'printing' }
});

async function syncOrder({
  customerName,
  customerPhone,
  customerAddress,
  customerNote,
  localFolderSlug, // Ví dụ: "2. Dang_Khoa_Sinh_C_0768598540"
  quantity,
  meters,
  subtotalAfterVat, // Tiền in hàng gồm VAT (ví dụ: 450,000)
  shippingFee,
  tags
}) {
  try {
    const localDir = path.join(process.cwd(), 'bao_gia', localFolderSlug);
    if (!fs.existsSync(localDir)) {
      throw new Error(`Thư mục local không tồn tại: ${localDir}`);
    }

    console.log("=== BƯỚC 1: ĐỒNG BỘ GOOGLE DRIVE ===");
    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    // Trích xuất số thứ tự (STT) từ localFolderSlug (ví dụ: "2.") để đánh số thư mục Drive
    const sttMatch = localFolderSlug.match(/^(\d+\.)/);
    const sttPrefix = sttMatch ? `${sttMatch[1]} ` : ''; // Ví dụ: "2. "
    
    // Tên thư mục Drive được đánh số đồng bộ: "2. Đặng Khoa Sinh - 0768598540"
    const folderName = `${sttPrefix}${customerName} - ${customerPhone}`;
    let folderId = null;
    let driveFolderLink = null;

    // Tìm thư mục cũ
    const searchRes = await drive.files.list({
      q: `'${PARENT_DRIVE_FOLDER_ID}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      folderId = searchRes.data.files[0].id;
      driveFolderLink = searchRes.data.files[0].webViewLink;
      console.log("Found existing folder:", folderId);
    } else {
      const createRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [PARENT_DRIVE_FOLDER_ID],
        },
        fields: 'id, webViewLink',
      });
      folderId = createRes.data.id;
      driveFolderLink = createRes.data.webViewLink;
      console.log("Created folder:", folderId);

      // Share public link
      await drive.permissions.create({
        fileId: folderId,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    }

    // Upload files
    const localFiles = fs.readdirSync(localDir);
    const uploadedLinks = {};
    let layoutFileId = null;

    for (const file of localFiles) {
      const filePath = path.join(localDir, file);
      let mime = 'application/octet-stream';
      if (file.endsWith('.xlsx')) mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (file.endsWith('.pdf')) mime = 'application/pdf';
      else if (file.endsWith('.webp')) mime = 'image/webp';
      else if (file.endsWith('.txt')) mime = 'text/plain';

      // Check if file exists in Drive subfolder
      const existCheck = await drive.files.list({
        q: `'${folderId}' in parents and name = '${file}' and trashed = false`,
        fields: 'files(id, webViewLink)',
      });

      let link;
      let fId;
      if (existCheck.data.files && existCheck.data.files.length > 0) {
        fId = existCheck.data.files[0].id;
        link = existCheck.data.files[0].webViewLink;
        console.log(`File already exists on Drive: ${file}`);
      } else {
        console.log(`Uploading file to Drive: ${file}`);
        const uploadRes = await drive.files.create({
          requestBody: { name: file, parents: [folderId] },
          media: { mimeType: mime, body: fs.createReadStream(filePath) },
          fields: 'id, webViewLink',
        });
        fId = uploadRes.data.id;
        link = uploadRes.data.webViewLink;
      }

      uploadedLinks[file] = link;
      if (file.includes('nesting_layout')) {
        layoutFileId = fId;
      }
    }

    const directLayoutLink = layoutFileId 
      ? `https://drive.google.com/thumbnail?id=${layoutFileId}&sz=w600`
      : null;

    console.log("\n=== BƯỚC 2: UPSERT KHÁCH HÀNG (PARTNER) ===");
    const cleanPhone = customerPhone.replace(/\s+/g, '');
    let partnerId = null;

    const { data: partners } = await supabase
      .from('partners')
      .select('id')
      .or(`phone.eq.${cleanPhone},phone.eq.${customerPhone}`);

    if (partners && partners.length > 0) {
      partnerId = partners[0].id;
      console.log("Existing partner ID:", partnerId);
      await supabase.from('partners').update({ address: customerAddress }).eq('id', partnerId);
    } else {
      const { data: newP, error: pErr } = await supabase
        .from('partners')
        .insert({
          name: customerName,
          phone: cleanPhone,
          address: customerAddress,
          partner_type: 'standard'
        })
        .select('id')
        .single();
      if (pErr) throw pErr;
      partnerId = newP.id;
      console.log("Created partner ID:", partnerId);
    }

    console.log("\n=== BƯỚC 3: TẠO ĐƠN HÀNG (ORDER) ===");
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(Math.random() * 9000) + 1000;
    const orderCode = `ORD-${dateStr}-${randNum}`;

    // Tính đơn giá in/mét đã gồm VAT 8%
    const unitPriceInclVat = Math.round(subtotalAfterVat / meters);

    // Tìm file Excel & PDF trong folder
    const excelFile = localFiles.find(f => f.endsWith('.xlsx')) || '';
    const pdfFile = localFiles.find(f => f.endsWith('.pdf')) || '';

    const excelLink = uploadedLinks[excelFile] || 'N/A';
    const pdfLink = uploadedLinks[pdfFile] || 'N/A';

    const orderNote = `${customerNote}\n` +
      `- Excel Báo giá: ${excelLink}\n` +
      `- PDF Báo giá: ${pdfLink}`;

    const newOrder = {
      order_code: orderCode,
      partner_id: partnerId,
      sticker_type: 'dtf_roll',
      design_link: driveFolderLink,
      preview_image: directLayoutLink,
      layout_image: directLayoutLink,
      quantity_expected: quantity,
      quantity_actual: meters,
      unit_price: unitPriceInclVat,
      shipping_cost: shippingFee,
      discount_amount: 0,
      status: 'processing', // Bắt buộc để tránh check constraint
      payment_status: 'unpaid',
      note: orderNote,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: tags || []
    };

    const { data: orderData, error: oErr } = await supabase
      .from('orders')
      .insert([newOrder])
      .select('id')
      .single();

    if (oErr) throw oErr;
    console.log(`Created order: ${orderCode} (ID: ${orderData.id})`);

    console.log("\n=== BƯỚC 4: GHI CHÚ NHẬT KÝ ĐƠN HÀNG ===");
    await supabase.from('order_logs').insert({
      order_id: orderData.id,
      action: 'create',
      changes: {
        order_code: orderCode,
        vat_rate: '8%',
        shipping_fee: shippingFee,
        total_with_vat_and_ship: subtotalAfterVat + shippingFee
      },
      changed_by_name: 'Admin Panel',
      created_at: new Date().toISOString()
    });

    console.log("\n✅ ĐỒNG BỘ HOÀN TẤT THÀNH CÔNG!");
    return { orderCode, driveFolderLink };
  } catch (err) {
    console.error("Lỗi đồng bộ đơn hàng:", err);
    throw err;
  }
}

// Chạy trực tiếp từ dòng lệnh (để test hoặc demo)
if (process.argv[1].endsWith('sync_order.mjs')) {
  syncOrder({
    customerName: "Đặng Khoa Sinh",
    customerPhone: "0768598540",
    customerAddress: "94 Phan Đình Phùng, Phú Phong, Tây Sơn, Bình Định",
    customerNote: "Giao hàng COD về địa chỉ Anh Đặng Khoa Sinh. Điện thoại: 0768 598 540. Phí ship 30k.",
    localFolderSlug: "2. Dang_Khoa_Sinh_C_0768598540",
    quantity: 200,
    meters: 1.35,
    subtotalAfterVat: 450000,
    shippingFee: 30000,
    tags: ['Tem UV DTF', 'Kéo mẫu', 'Báo giá 450k', 'VAT 8%']
  }).catch(console.error);
}

export { syncOrder };
