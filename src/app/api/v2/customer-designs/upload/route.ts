import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import { getOrCreateCustomerDesignFolder, uploadDesignToDrive, removeAccents } from '@/lib/driveDesignUploader';

const printingSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'printing' } }
);

// POST /api/v2/customer-designs/upload
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

    const body = await req.json();
    const {
      customer_id,
      customer_name,
      customer_phone,
      design_name,
      product_type,
      file_name,
      file_data, // base64 string
      mime_type,
      preview_image_url
    } = body;

    if (!design_name || !file_data || !file_name) {
      return NextResponse.json({ error: 'design_name, file_name và file_data là bắt buộc' }, { status: 400 });
    }

    // Trích xuất phần mở rộng file (ext)
    const extMatch = file_name.match(/\.([^.]+)$/);
    const ext = extMatch ? extMatch[1] : 'pdf';

    // Đặt tên file theo đúng chuẩn quy định: [Tên Mẫu]_[Tên Khách]_[SĐT].[ext]
    const cleanDesign = removeAccents(design_name);
    const cleanCust = removeAccents(customer_name || 'Khach_Hang');
    const cleanPhone = removeAccents(customer_phone || '0000000000');
    const formattedFileName = `${cleanDesign}_${cleanCust}_${cleanPhone}.${ext}`;

    // 1. Tìm hoặc tạo thư mục 01_Mau_Thiet_Ke trong Folder khách hàng trên Google Drive
    const targetFolderId = await getOrCreateCustomerDesignFolder(customer_id, customer_name, customer_phone);

    // 2. Upload file trực tiếp lên Drive vào thư mục đó
    const buffer = Buffer.from(file_data, 'base64');
    const { fileId, fileUrl } = await uploadDesignToDrive(targetFolderId, formattedFileName, buffer, mime_type);

    // 3. Nếu có customer_id, lưu hoặc cập nhật bản ghi trong v2_customer_designs
    let savedDesign = null;
    if (customer_id) {
      // Kiểm tra xem đã có mẫu tên này của khách chưa
      const { data: existing } = await printingSupabase
        .from('v2_customer_designs')
        .select('*')
        .eq('customer_id', customer_id)
        .eq('design_name', design_name)
        .maybeSingle();

      if (existing) {
        // Cập nhật lại link file mới và tăng use_count
        const { data: updated } = await printingSupabase
          .from('v2_customer_designs')
          .update({
            file_name: formattedFileName,
            drive_file_id: fileId,
            drive_file_url: fileUrl,
            preview_image_url: preview_image_url || existing.preview_image_url,
            product_type: product_type || existing.product_type,
            use_count: (existing.use_count || 1) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        savedDesign = updated;
      } else {
        // Thêm mẫu thiết kế mới vào kho
        const { data: inserted } = await printingSupabase
          .from('v2_customer_designs')
          .insert({
            customer_id,
            design_name,
            file_name: formattedFileName,
            drive_file_id: fileId,
            drive_file_url: fileUrl,
            preview_image_url: preview_image_url || null,
            product_type: product_type || 'tem',
            use_count: 1
          })
          .select()
          .single();

        savedDesign = inserted;
      }
    }

    return NextResponse.json({
      success: true,
      file_id: fileId,
      file_url: fileUrl,
      formatted_file_name: formattedFileName,
      design: savedDesign
    });
  } catch (err: any) {
    console.error('Lỗi upload file mẫu thiết kế:', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý upload' }, { status: 500 });
  }
}
