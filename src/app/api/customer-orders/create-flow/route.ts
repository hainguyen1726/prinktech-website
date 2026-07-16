import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { generateExcelQuote, generatePdfQuote } from '@/lib/quoteGenerator';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";
const PARENT_DRIVE_FOLDER_ID = "1HKqBw0DKnmQvcXzyjo9cgtrFl15Ehj24";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const {
      customer_id,
      product_type,
      product_label,
      size_label,
      quantity,
      meters,
      rate_excl_vat,
      shipping_fee,
      note,
      design_link, // Link thiết kế ban đầu
      order_source, // Nguồn đơn hàng (website, fb, shopee, tiktok, other)
      apply_vat, // Toggle áp dụng VAT (mặc định là true)
    } = body;

    // Validate bắt buộc
    if (!customer_id) {
      return NextResponse.json({ error: 'Thiếu thông tin khách hàng (customer_id)' }, { status: 400 });
    }
    if (!product_type) {
      return NextResponse.json({ error: 'Thiếu loại sản phẩm' }, { status: 400 });
    }
    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Số lượng phải lớn hơn 0' }, { status: 400 });
    }
    if (rate_excl_vat === undefined || rate_excl_vat < 0) {
      return NextResponse.json({ error: 'Đơn giá không hợp lệ' }, { status: 400 });
    }

    // 1. Lấy thông tin khách hàng từ DB
    const { data: customer, error: cErr } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (cErr || !customer) {
      return NextResponse.json({ error: 'Không tìm thấy khách hàng trong hệ thống' }, { status: 404 });
    }

    const customerName = customer.name;
    const customerPhone = customer.phone || '0000000000';
    const customerAddress = customer.address || 'Chưa cập nhật địa chỉ';

    // 2. Sinh mã đơn hàng mới: ORD-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(Math.random() * 9000) + 1000;
    const orderCode = `ORD-${dateStr}-${randNum}`;

    // 3. Tạo thư mục tạm để sinh báo giá cục bộ
    const tempDir = path.join(process.cwd(), 'public', 'temp_bao_gia', orderCode);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const nameSlug = customerName.replace(/\s+/g, '_');
    const excelPath = path.join(tempDir, `1. Bao_gia_in_tem_UV_DTF_${nameSlug}_V2.xlsx`);
    const pdfPath = path.join(tempDir, `2. Bao_gia_in_tem_UV_DTF_${nameSlug}_V2.pdf`);
    const templateExcelPath = path.join(process.cwd(), '.agents', 'skills', 'antigravity-prinktech-quote', 'resources', 'template_bao_gia.xlsx');

    // 4. Sinh file Excel & PDF báo giá
    const quoteData = {
      orderCode,
      customerName,
      customerPhone,
      customerAddress,
      productName: product_label || 'In tem UV DTF',
      size: size_label || 'Tùy chọn',
      quantity: Number(quantity),
      meters: meters ? Number(meters) : undefined,
      rateExclVat: Number(rate_excl_vat),
      shippingFee: Number(shipping_fee || 0),
      note: note || '',
      vatRate: apply_vat !== false ? 0.08 : 0,
    };

    console.log('Generating Excel quote...', excelPath);
    await generateExcelQuote(quoteData, templateExcelPath, excelPath);
    
    console.log('Generating PDF quote...', pdfPath);
    await generatePdfQuote(quoteData, pdfPath);

    // 5. Kết nối Google Drive & đồng bộ
    console.log('Connecting to Google Drive...');
    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    // Tên thư mục con trên Drive: "Tên Khách Hàng - SĐT"
    const driveFolderName = `${customerName} - ${customerPhone}`;
    let driveFolderId = null;
    let driveFolderLink = null;

    // Tìm thư mục cũ trùng tên trong thư mục cha
    const searchFolder = await drive.files.list({
      q: `'${PARENT_DRIVE_FOLDER_ID}' in parents and name = '${driveFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
    });

    if (searchFolder.data.files && searchFolder.data.files.length > 0) {
      driveFolderId = searchFolder.data.files[0].id;
      driveFolderLink = searchFolder.data.files[0].webViewLink;
      console.log('Found existing Google Drive folder:', driveFolderId);
    } else {
      console.log('Creating new Google Drive folder...');
      const createFolder = await drive.files.create({
        requestBody: {
          name: driveFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [PARENT_DRIVE_FOLDER_ID],
        },
        fields: 'id, webViewLink',
      });
      driveFolderId = createFolder.data.id;
      driveFolderLink = createFolder.data.webViewLink;
      console.log('Created Google Drive folder:', driveFolderId);

      // Cấp quyền đọc public
      await drive.permissions.create({
        fileId: driveFolderId!,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    }

    // Upload 2 file báo giá lên thư mục Drive
    const uploadedLinks: Record<string, string> = {};
    const filesToUpload = [
      { name: path.basename(excelPath), path: excelPath, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { name: path.basename(pdfPath), path: pdfPath, mime: 'application/pdf' },
    ];

    for (const f of filesToUpload) {
      // Check file trùng
      const searchFile = await drive.files.list({
        q: `'${driveFolderId}' in parents and name = '${f.name}' and trashed = false`,
        fields: 'files(id, webViewLink)',
      });

      let link = '';
      if (searchFile.data.files && searchFile.data.files.length > 0) {
        link = searchFile.data.files[0].webViewLink || '';
        console.log(`File already exists on Google Drive: ${f.name}`);
      } else {
        console.log(`Uploading file ${f.name} to Google Drive...`);
        const uploadFile = await drive.files.create({
          requestBody: { name: f.name, parents: [driveFolderId!] },
          media: { mimeType: f.mime, body: fs.createReadStream(f.path) },
          fields: 'id, webViewLink',
        });
        link = uploadFile.data.webViewLink || '';
      }
      uploadedLinks[f.name] = link;
    }

    // 6. Xóa các file tạm cục bộ để giải phóng bộ nhớ
    try {
      fs.unlinkSync(excelPath);
      fs.unlinkSync(pdfPath);
      fs.rmdirSync(tempDir);
    } catch (cleanupErr) {
      console.error('Error cleaning up temp files:', cleanupErr);
    }

    // 7. Tạo đơn hàng (Order) trong Supabase
    // Đơn giá đã bao gồm VAT (8% hoặc 0%)
    const amountExclVat = meters ? Number(meters) * Number(rate_excl_vat) : Number(quantity) * Number(rate_excl_vat);
    const subtotalAfterVat = amountExclVat * (apply_vat !== false ? 1.08 : 1.0);
    const unitPriceInclVat = Math.round(subtotalAfterVat / (meters ? Number(meters) : Number(quantity)));

    const excelFile = filesToUpload[0].name;
    const pdfFile = filesToUpload[1].name;
    const excelLink = uploadedLinks[excelFile] || 'N/A';
    const pdfLink = uploadedLinks[pdfFile] || 'N/A';

    const orderNote = `${note || ''}\n` +
      `- Excel Báo giá: ${excelLink}\n` +
      `- PDF Báo giá: ${pdfLink}` +
      (design_link ? `\n- File thiết kế khách gửi: ${design_link}` : '');

    const costAmount = meters ? Math.round(Number(meters) * 150000) : 0;

    const newOrder = {
      order_code: orderCode,
      partner_id: customer_id,
      sticker_type: product_type === 'cuon' ? 'dtf_roll' : 'uv_dtf_noi',
      design_link: driveFolderLink, // Link thư mục Google Drive
      preview_image: null,
      layout_image: null,
      quantity_expected: Number(quantity),
      quantity_actual: meters ? Number(meters) : Number(quantity),
      unit_price: unitPriceInclVat,
      shipping_cost: Number(shipping_fee || 0),
      discount_amount: 0,
      status: 'processing', // Trạng thái mặc định là đang xử lý
      payment_status: 'unpaid',
      note: orderNote,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: ['Tem UV DTF', 'Báo giá tự động', apply_vat !== false ? 'VAT 8%' : 'VAT 0%', 'prinktech', `nguồn: ${order_source || 'website'}`],
      cost_amount: costAmount
    };

    const { data: orderData, error: oErr } = await supabaseAdmin
      .from('orders')
      .insert([newOrder])
      .select('id')
      .single();

    if (oErr) {
      throw oErr;
    }

    // 8. Ghi log hoạt động tạo đơn
    await supabaseAdmin.from('order_logs').insert({
      order_id: orderData.id,
      action: 'create',
      changes: {
        order_code: orderCode,
        vat_rate: '8%',
        shipping_fee: Number(shipping_fee || 0),
        total_with_vat_and_ship: subtotalAfterVat + Number(shipping_fee || 0),
      },
      changed_by_name: 'Admin Panel',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      order_code: orderCode,
      drive_folder: driveFolderLink,
      excel_link: excelLink,
      pdf_link: pdfLink,
    });
  } catch (err: any) {
    console.error('Error in create-flow route:', err);
    return NextResponse.json({ error: err.message || 'Lỗi server khi tạo đơn' }, { status: 500 });
  }
}
