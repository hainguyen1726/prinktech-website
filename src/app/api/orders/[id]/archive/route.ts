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

// Lọc sạch các dòng ghi chú hệ thống (Excel, PDF, JSON, Vận chuyển...)
const getCleanCustomerNote = (note: string | null | undefined): string => {
  if (!note) return '';
  return note
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return (
        !trimmed.startsWith('- Excel Báo giá') &&
        !trimmed.startsWith('- PDF Báo giá') &&
        !trimmed.startsWith('- File thiết kế') &&
        !trimmed.startsWith('- Dữ liệu sản phẩm JSON') &&
        !trimmed.startsWith('- Đơn vị vận chuyển') &&
        !trimmed.startsWith('- Mã vận đơn')
      );
    })
    .join('\n')
    .trim();
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;

    // 1. Tìm đơn hàng hiện tại trong retail_orders hoặc orders
    const { data: retailOrder } = await supabaseAdmin
      .from('retail_orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    let oldOrder: any = retailOrder;
    let isRetail = true;

    if (!retailOrder) {
      const { data: adminOrder } = await supabaseAdmin
        .from('orders')
        .select('*, partners(*)')
        .eq('id', id)
        .maybeSingle();
      oldOrder = adminOrder;
      isRetail = false;
    }

    if (!oldOrder) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại' }, { status: 404 });
    }

    // 2. Trích xuất thông tin khách hàng và tài chính
    const partner = oldOrder.partners || {};
    const customerName = isRetail ? (oldOrder.customer_name || 'Khách lẻ') : (partner.name || 'Khách lẻ');
    const customerPhone = isRetail ? (oldOrder.customer_phone || '') : (partner.phone || '');
    const customerAddress = isRetail ? (oldOrder.customer_address || '') : (partner.address || '');
    const orderCode = oldOrder.order_number || oldOrder.order_code || `ORD-${id.slice(0, 8)}`;

    const subtotal = Number(oldOrder.subtotal) || 0;
    const shippingFee = Number(oldOrder.shipping_fee || oldOrder.shipping_cost || 0);
    const discount = Number(oldOrder.discount || oldOrder.discount_amount || 0);

    const tags = Array.isArray(oldOrder.tags) ? oldOrder.tags : [];
    const hasVat = Boolean(
      oldOrder.request_vat || 
      oldOrder.has_vat || 
      tags.some((t: string) => t.toLowerCase().includes('vat')) ||
      (oldOrder.note || '').toLowerCase().includes('vat 8%') ||
      (oldOrder.note || '').toLowerCase().includes('thuế vat')
    );
    const vatRate = hasVat ? 0.08 : 0;

    // 3. Chuẩn hóa sản phẩm cho Excel Generator
    const itemsList = Array.isArray(oldOrder.items) ? oldOrder.items : [];
    const quoteItems = itemsList.map((item: any) => {
      const u = (item.unit || '').toLowerCase();
      const isMeterUnit = u.includes('mét') || u.includes('met') || u === 'm';
      const isPerMeter = oldOrder.pricing_type === 'per_meter' || oldOrder.sticker_type === 'dtf_roll';
      const qty = Number(item.quantity) || 1;
      
      let unit = u.includes('tờ') ? 'tờ' : 'cái';
      let meters = undefined;
      if (isMeterUnit || isPerMeter) {
        unit = 'm';
        meters = qty;
      }

      return {
        productName: item.product_label || item.name || 'Tem UV DTF',
        size: item.size_label || 'Tùy chọn',
        quantity: qty,
        meters: meters,
        rateExclVat: Number(item.unit_price || item.rate_excl_vat || 0),
        note: item.note || undefined
      };
    });

    // 4. Tạo thư mục tạm cục bộ và sinh file Excel/PDF
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prinktech-archive-'));
    const nameSlug = customerName.replace(/\s+/g, '_');
    const excelPath = path.join(tempDir, `1. Bao_gia_in_tem_UV_DTF_${nameSlug}_V2.xlsx`);
    const pdfPath = path.join(tempDir, `2. Bao_gia_in_tem_UV_DTF_${nameSlug}_V2.pdf`);

    const templateCandidates = [
      path.join(process.cwd(), 'src', 'data', 'template_bao_gia.xlsx'),
      path.join(process.cwd(), 'public', 'template_bao_gia.xlsx'),
      path.join(process.cwd(), '.agents', 'skills', 'antigravity-prinktech-quote', 'resources', 'template_bao_gia.xlsx'),
    ];
    const templateExcelPath = templateCandidates.find(p => fs.existsSync(p)) || templateCandidates[0];

    const quoteData = {
      orderCode,
      customerName,
      customerPhone,
      customerAddress,
      shippingFee,
      discount,
      note: getCleanCustomerNote(oldOrder.customer_note || oldOrder.note || ''),
      vatRate,
      items: quoteItems
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

    // A. Tìm hoặc tạo Folder của khách hàng
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
      console.log('Creating new customer folder:', newFolderName);
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
      
      try {
        await drive.permissions.create({
          fileId: driveFolderId!,
          requestBody: { role: 'reader', type: 'anyone' },
        });
      } catch (e) {
        console.error("Lỗi share folder khách hàng:", e);
      }
    }

    // B. Tìm hoặc tạo Folder Đơn hàng con
    const listOrdersRes = await drive.files.list({
      q: `'${driveFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
    });
    const orderFolders = listOrdersRes.data.files || [];
    
    let orderFolderId = null;
    let orderFolderLink = null;
    
    const existingOrderFolder = orderFolders.find((f: any) => {
      const nameLower = f.name.toLowerCase();
      return nameLower.includes(orderCode.toLowerCase());
    });

    if (existingOrderFolder) {
      orderFolderId = existingOrderFolder.id;
      orderFolderLink = existingOrderFolder.webViewLink;
      console.log('Found existing order subfolder:', orderFolderId);
    } else {
      const nextOrderSeq = orderFolders.length + 1;
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const dayStr = `${day}${month}${year}`;
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
      orderFolderId = createOrderSubfolder.data.id;
      orderFolderLink = createOrderSubfolder.data.webViewLink;
      
      try {
        await drive.permissions.create({
          fileId: orderFolderId!,
          requestBody: { role: 'reader', type: 'anyone' },
        });
      } catch (e) {
        console.error("Lỗi share folder đơn hàng:", e);
      }
    }

    // C. Upload 2 file Excel và PDF báo giá lên folder đơn hàng con
    const uploadedLinks: Record<string, string> = {};
    const filesToUpload = [
      { name: path.basename(excelPath), path: excelPath, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { name: path.basename(pdfPath), path: pdfPath, mime: 'application/pdf' },
    ];

    for (const f of filesToUpload) {
      // Xóa file cũ có cùng tên trong folder đơn hàng trước khi upload để tránh trùng lặp
      try {
        const checkOldFile = await drive.files.list({
          q: `'${orderFolderId}' in parents and name = '${f.name}' and trashed = false`,
          fields: 'files(id)',
        });
        const oldFiles = checkOldFile.data.files || [];
        for (const ofile of oldFiles) {
          if (ofile.id) {
            console.log(`Deleting old file on Drive: ${f.name} (ID: ${ofile.id})`);
            await drive.files.delete({ fileId: ofile.id });
          }
        }
      } catch (checkErr) {
        console.error('Lỗi khi dọn file cũ:', checkErr);
      }

      console.log(`Uploading file ${f.name} to Google Drive...`);
      const uploadRes = await drive.files.create({
        requestBody: { name: f.name, parents: [orderFolderId!] },
        media: { mimeType: f.mime, body: fs.createReadStream(f.path) },
        fields: 'id, webViewLink',
      });
      uploadedLinks[f.name] = uploadRes.data.webViewLink || '';
    }

    // D. Dọn dẹp file tạm cục bộ
    try {
      fs.unlinkSync(excelPath);
      fs.unlinkSync(pdfPath);
      fs.rmdirSync(tempDir);
    } catch (cleanupErr) {
      console.error('Error cleaning up temp files:', cleanupErr);
    }

    const excelLink = uploadedLinks[filesToUpload[0].name] || 'N/A';
    const pdfLink = uploadedLinks[filesToUpload[1].name] || 'N/A';

    // 6. Cập nhật note trong cơ sở dữ liệu
    const originalNote = oldOrder.customer_note || oldOrder.note || '';
    const cleanNoteLines = originalNote
      .split('\n')
      .filter((line: string) =>
        !line.trim().startsWith('- Excel Báo giá:') &&
        !line.trim().startsWith('- PDF Báo giá:') &&
        !line.trim().startsWith('- Dữ liệu sản phẩm JSON:')
      );

    cleanNoteLines.push(`- Excel Báo giá: ${excelLink}`);
    cleanNoteLines.push(`- PDF Báo giá: ${pdfLink}`);
    cleanNoteLines.push(`- Dữ liệu sản phẩm JSON: ${JSON.stringify(itemsList)}`);

    const finalNote = cleanNoteLines.join('\n').trim();

    let updateRes;
    if (isRetail) {
      updateRes = await supabaseAdmin
        .from('retail_orders')
        .update({
          note: finalNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
    } else {
      updateRes = await supabaseAdmin
        .from('orders')
        .update({
          note: finalNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*, partners(*)')
        .single();
    }

    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      excel_url: excelLink,
      pdf_url: pdfLink,
      note: finalNote
    });

  } catch (err: any) {
    console.error('Lỗi lưu trữ đơn hàng lên Google Drive:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống khi lưu trữ đơn' }, { status: 500 });
  }
}
