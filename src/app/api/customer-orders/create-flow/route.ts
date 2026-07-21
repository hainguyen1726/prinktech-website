import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateExcelQuote, generatePdfQuote } from '@/lib/quoteGenerator';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";
const PARENT_DRIVE_FOLDER_ID = "1HKqBw0DKnmQvcXzyjo9cgtrFl15Ehj24";

import { Readable } from 'stream';

async function uploadFileFromBase64(drive: any, folderId: string, fileName: string, base64Data: string, mimeType?: string) {
  const buffer = Buffer.from(base64Data, 'base64');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  
  const uploadFile = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    },
    fields: 'id, webViewLink',
  });
  
  return {
    id: uploadFile.data.id,
    link: uploadFile.data.webViewLink || '',
  };
}

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
      items, // Mảng items mới gửi lên từ Admin Form
    } = body;

    // Validate bắt buộc
    if (!customer_id) {
      return NextResponse.json({ error: 'Thiếu thông tin khách hàng (customer_id)' }, { status: 400 });
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

    // Chuẩn hóa mảng items
    let itemsList = items;
    if (!itemsList || itemsList.length === 0) {
      if (!product_type) {
        return NextResponse.json({ error: 'Thiếu loại sản phẩm' }, { status: 400 });
      }
      if (!quantity || quantity <= 0) {
        return NextResponse.json({ error: 'Số lượng phải lớn hơn 0' }, { status: 400 });
      }
      if (rate_excl_vat === undefined || rate_excl_vat < 0) {
        return NextResponse.json({ error: 'Đơn giá không hợp lệ' }, { status: 400 });
      }
      itemsList = [{
        product_type,
        product_label: product_label || 'In tem UV DTF',
        size_label: size_label || 'Tùy chọn',
        quantity: Number(quantity),
        meters: meters ? Number(meters) : undefined,
        rate_excl_vat: Number(rate_excl_vat),
        subtotal: meters ? Number(meters) * Number(rate_excl_vat) : Number(quantity) * Number(rate_excl_vat),
        note: note || null,
        design_url: design_link || null
      }];
    }

    // 2. Sinh mã đơn hàng mới: ORD-YYYYMMDD-XXXX (Đảm bảo tuyệt đối không bao giờ trùng lặp)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let orderCode = '';
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 20) {
      attempts++;
      const randNum = Math.floor(Math.random() * 9000) + 1000;
      const testCode = `ORD-${dateStr}-${randNum}`;
      
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('order_code', testCode)
        .maybeSingle();
        
      if (!existing) {
        orderCode = testCode;
        isUnique = true;
      }
    }
    
    if (!orderCode) {
      const now = new Date();
      const ms = now.getMilliseconds().toString().padStart(3, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      orderCode = `ORD-${dateStr}-${seconds}${ms}`;
    }

    // 3. Tạo thư mục tạm để sinh báo giá cục bộ (Ưu tiên os.tmpdir() để tránh EACCES permission denied trên Docker)
    let tempDir = path.join(os.tmpdir(), 'temp_bao_gia', orderCode);
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    } catch (e) {
      console.warn('Fallback tempDir creation error:', e);
      tempDir = path.join(process.cwd(), 'public', 'temp_bao_gia', orderCode);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    }

    const nameSlug = customerName.replace(/\s+/g, '_');
    const excelPath = path.join(tempDir, `1. Bao_gia_in_tem_UV_DTF_${nameSlug}_V2.xlsx`);
    const pdfPath = path.join(tempDir, `2. Bao_gia_in_tem_UV_DTF_${nameSlug}_V2.pdf`);
    const templateExcelPath = path.join(process.cwd(), '.agents', 'skills', 'antigravity-prinktech-quote', 'resources', 'template_bao_gia.xlsx');

    // 5. Kết nối Google Drive & đồng bộ
    console.log('Connecting to Google Drive...');
    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    // A. Tìm hoặc tạo Folder của khách hàng: dạng "<Số thứ tự>. <Tên khách>_<SĐT>" (ví dụ "4. GP House_0845011975")
    const listRes = await drive.files.list({
      q: `'${PARENT_DRIVE_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
    });
    const folders = listRes.data.files || [];
    const cleanCustName = customerName.toLowerCase().trim();
    const cleanPhone = customerPhone.toLowerCase().trim();
    
    let driveFolderId = null;
    let driveFolderLink = null;
    
    const existingFolder = folders.find((f: any) => {
      const withoutSeq = f.name.replace(/^\d+\.\s*/, '');
      const parts = withoutSeq.split('_');
      const folderCustName = parts[0]?.toLowerCase().trim();
      const folderPhone = parts[1]?.toLowerCase().trim();
      return folderCustName === cleanCustName || (folderPhone && folderPhone === cleanPhone);
    });

    if (existingFolder) {
      driveFolderId = existingFolder.id;
      driveFolderLink = existingFolder.webViewLink;
      console.log('Found existing customer Google Drive folder:', driveFolderId);
    } else {
      const nextSeq = folders.length + 1;
      const newFolderName = `${nextSeq}. ${customerName}_${customerPhone}`;
      console.log('Creating new customer Google Drive folder:', newFolderName);
      const createFolder = await drive.files.create({
        requestBody: {
          name: newFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [PARENT_DRIVE_FOLDER_ID],
        },
        fields: 'id, webViewLink',
      });
      driveFolderId = createFolder.data.id;
      driveFolderLink = createFolder.data.webViewLink;
      
      // Share public link
      try {
        await drive.permissions.create({
          fileId: driveFolderId!,
          requestBody: { role: 'reader', type: 'anyone' },
        });
      } catch (e) {
        console.error("Lỗi share folder khách hàng:", e);
      }
    }

    // B. Tạo Folder Đơn hàng con bên trong folder khách hàng: dạng "<Số thứ tự đơn>. <Mã Order_ngày đặt>"
    const listOrdersRes = await drive.files.list({
      q: `'${driveFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    });
    const orderFolders = listOrdersRes.data.files || [];
    const nextOrderSeq = orderFolders.length + 1;
    
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const dayStr = `${day}${month}${year}`; // e.g. "18072026"
    const orderFolderName = `${nextOrderSeq}. ${orderCode}_${dayStr}`;
    
    console.log('Creating order subfolder:', orderFolderName);
    const createOrderSubfolder = await drive.files.create({
      requestBody: {
        name: orderFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [driveFolderId!],
      },
      fields: 'id, webViewLink',
    });
    const orderFolderId = createOrderSubfolder.data.id;
    const orderFolderLink = createOrderSubfolder.data.webViewLink;
    
    try {
      await drive.permissions.create({
        fileId: orderFolderId!,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (e) {
      console.error("Lỗi share folder đơn hàng:", e);
    }

    // C. Upload file thiết kế (Base64) của từng mẫu vào Folder đơn hàng con mới này
    for (let i = 0; i < itemsList.length; i++) {
      const item = itemsList[i];
      if (item.designs && item.designs.length > 0) {
        for (let d = 0; d < item.designs.length; d++) {
          const design = item.designs[d];
          if (design.fileData) {
            console.log(`Uploading design file: ${design.name} (${design.fileName})`);
            const ext = path.extname(design.fileName || '');
            const driveFileName = `${design.name}${ext}`;
            const uploadRes = await uploadFileFromBase64(
              drive,
              orderFolderId!,
              driveFileName,
              design.fileData,
              design.fileType
            );
            design.url = uploadRes.link;
            delete design.fileData; // Xóa Base64 để nhẹ bộ nhớ DB
          }
        }
        item.design_url = item.designs[0]?.url || item.design_url;
      }
    }

    // D. Chuẩn bị QuoteData cho generator
    const quoteItems = itemsList.map((item: any) => ({
      productName: item.product_label || 'In tem UV DTF',
      size: item.size_label || 'Tùy chọn',
      quantity: Number(item.quantity),
      meters: item.meters ? Number(item.meters) : undefined,
      rateExclVat: Number(item.rate_excl_vat),
      note: item.note || undefined
    }));

    const quoteData = {
      orderCode,
      customerName,
      customerPhone,
      customerAddress,
      shippingFee: Number(shipping_fee || 0),
      note: note || '',
      vatRate: apply_vat !== false ? 0.08 : 0,
      items: quoteItems
    };

    console.log('Generating Excel quote...', excelPath);
    await generateExcelQuote(quoteData, templateExcelPath, excelPath);
    
    console.log('Generating PDF quote...', pdfPath);
    await generatePdfQuote(quoteData, pdfPath);

    // Upload 2 file báo giá lên thư mục Drive đơn hàng mới
    const uploadedLinks: Record<string, string> = {};
    const filesToUpload = [
      { name: path.basename(excelPath), path: excelPath, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { name: path.basename(pdfPath), path: pdfPath, mime: 'application/pdf' },
    ];

    for (const f of filesToUpload) {
      console.log(`Uploading file ${f.name} to Google Drive order folder...`);
      const uploadFile = await drive.files.create({
        requestBody: { name: f.name, parents: [orderFolderId!] },
        media: { mimeType: f.mime, body: fs.createReadStream(f.path) },
        fields: 'id, webViewLink',
      });
      uploadedLinks[f.name] = uploadFile.data.webViewLink || '';
    }

    // 6. Xóa các file tạm cục bộ để giải phóng bộ nhớ
    try {
      fs.unlinkSync(excelPath);
      fs.unlinkSync(pdfPath);
      fs.rmdirSync(tempDir);
    } catch (cleanupErr) {
      console.error('Error cleaning up temp files:', cleanupErr);
    }

    const excelFile = filesToUpload[0].name;
    const pdfFile = filesToUpload[1].name;
    const excelLink = uploadedLinks[excelFile] || 'N/A';
    const pdfLink = uploadedLinks[pdfFile] || 'N/A';

    const orderNote = `${note || ''}\n` +
      `- Excel Báo giá: ${excelLink}\n` +
      `- PDF Báo giá: ${pdfLink}\n` +
      `- Dữ liệu sản phẩm JSON: ${JSON.stringify(itemsList)}` +
      (design_link ? `\n- File thiết kế khách gửi: ${design_link}` : '');

    // Đơn giá trung bình hoặc lấy của item đầu tiên
    const totalSubtotal = itemsList.reduce((s: number, i: any) => s + (i.subtotal || 0), 0);
    const subtotalAfterVat = totalSubtotal * (apply_vat !== false ? 1.08 : 1.0);
    
    const anyMeters = itemsList.some((i: any) => i.meters && i.meters > 0);
    const totalQty = itemsList.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
    const totalMeters = itemsList.reduce((s: number, i: any) => s + (i.meters || 0), 0);
    
    const unitPriceInclVat = Math.round(subtotalAfterVat / (anyMeters ? totalMeters : totalQty));
    const costAmount = anyMeters ? Math.round(totalMeters * 150000) : 0;

    const newOrder = {
      order_code: orderCode,
      partner_id: customer_id,
      sticker_type: anyMeters ? 'dtf_roll' : 'uv_dtf_noi',
      design_link: orderFolderLink, // Link thư mục Google Drive đơn hàng con
      preview_image: null,
      layout_image: null,
      quantity_expected: totalQty,
      quantity_actual: anyMeters ? totalMeters : totalQty,
      unit_price: unitPriceInclVat,
      shipping_cost: Number(shipping_fee || 0),
      discount_amount: 0,
      status: 'pending', // Trạng thái mặc định là báo giá (Chờ xác nhận)
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
        vat_rate: apply_vat !== false ? '8%' : '0%',
        shipping_fee: Number(shipping_fee || 0),
        total_with_vat_and_ship: subtotalAfterVat + Number(shipping_fee || 0),
      },
      changed_by_name: 'Admin Panel',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      order_code: orderCode,
      drive_folder: orderFolderLink,
      excel_link: excelLink,
      pdf_link: pdfLink,
    });
  } catch (err: any) {
    console.error('Error in create-flow route:', err);
    return NextResponse.json({ error: err.message || 'Lỗi server khi tạo đơn' }, { status: 500 });
  }
}
