import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// POST /api/customers/merge — thực hiện gộp khách hàng trùng lặp theo số điện thoại
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const { phone, merge_all } = body;

    if (!phone && !merge_all) {
      return NextResponse.json({ error: 'Vui lòng cung cấp số điện thoại hoặc cờ merge_all' }, { status: 400 });
    }

    // 1. Xác định danh sách các số điện thoại cần xử lý gộp
    let phonesToMerge: string[] = [];

    if (phone) {
      phonesToMerge = [phone.trim()];
    } else if (merge_all) {
      // Tìm tất cả các số điện thoại bị trùng lặp của khách standard
      const { data: duplicatePhones, error: dupErr } = await supabaseAdmin.rpc('run_sql', {
        sql: `
          SELECT phone
          FROM printing.partners
          WHERE partner_type = 'standard' AND phone IS NOT NULL AND phone != ''
          GROUP BY phone
          HAVING COUNT(*) > 1
        `
      });

      if (dupErr) {
        return NextResponse.json({ error: `Lỗi truy vấn số điện thoại trùng: ${dupErr.message}` }, { status: 500 });
      }

      phonesToMerge = (duplicatePhones || []).map((row: any) => row.phone);
    }

    if (phonesToMerge.length === 0) {
      return NextResponse.json({ message: 'Không có khách hàng trùng lặp nào cần gộp', mergedCount: 0 });
    }

    let totalMergedGroups = 0;
    let totalDeletedPartners = 0;

    // 2. Duyệt qua từng số điện thoại để gộp
    for (const targetPhone of phonesToMerge) {
      // Lấy danh sách tất cả các partners trùng số điện thoại này
      const { data: partners, error: pErr } = await supabaseAdmin
        .from('partners')
        .select('*')
        .eq('phone', targetPhone)
        .eq('partner_type', 'standard')
        .order('created_at', { ascending: true }); // Mặc định xếp theo thứ tự cũ trước

      if (pErr) {
        console.error(`Lỗi lấy danh sách partner cho số điện thoại ${targetPhone}:`, pErr.message);
        continue;
      }

      if (!partners || partners.length <= 1) {
        continue; // Không có trùng lặp thực tế
      }

      const partnerIds = partners.map(p => p.id);

      // Đếm số đơn hàng thực tế của từng partner trong bảng orders
      const { data: orderCounts, error: oErr } = await supabaseAdmin.rpc('run_sql', {
        sql: `
          SELECT partner_id, COUNT(*) as count
          FROM printing.orders
          WHERE partner_id = ANY(ARRAY[${partnerIds.map(id => `'${id}'::uuid`).join(', ')}])
          GROUP BY partner_id
        `
      });

      if (oErr) {
        console.error(`Lỗi đếm số đơn hàng cho số điện thoại ${targetPhone}:`, oErr.message);
        continue;
      }

      const orderCountMap = new Map<string, number>();
      (orderCounts || []).forEach((row: any) => {
        orderCountMap.set(row.partner_id, parseInt(row.count || '0'));
      });

      // Lựa chọn partner chính (Primary Partner) để giữ lại
      let primaryPartner = partners[0];
      let maxOrders = orderCountMap.get(primaryPartner.id) || 0;

      for (let i = 1; i < partners.length; i++) {
        const currentPartner = partners[i];
        const currentOrders = orderCountMap.get(currentPartner.id) || 0;

        // Ưu tiên partner có nhiều đơn hàng hơn
        if (currentOrders > maxOrders) {
          primaryPartner = currentPartner;
          maxOrders = currentOrders;
        } 
        // Nếu số đơn hàng bằng nhau, ưu tiên partner có đầy đủ thông tin hơn (email hoặc địa chỉ)
        else if (currentOrders === maxOrders) {
          const primaryScore = (primaryPartner.email ? 1 : 0) + (primaryPartner.address ? 1 : 0);
          const currentScore = (currentPartner.email ? 1 : 0) + (currentPartner.address ? 1 : 0);
          if (currentScore > primaryScore) {
            primaryPartner = currentPartner;
          }
        }
      }

      // Danh sách các partner trùng sẽ bị xóa
      const secondaryPartnerIds = partnerIds.filter(id => id !== primaryPartner.id);

      if (secondaryPartnerIds.length === 0) {
        continue;
      }

      // Thực hiện gộp trong database thông qua transaction bằng RPC run_sql
      const sqlArray = [
        `SELECT 1) t;`
      ];

      // 1. Cập nhật partner_id trên các bảng liên kết
      const tablesToUpdate = [
        'orders',
        'partner_api_configs',
        'partner_products',
        'reconciliations',
        'bills',
        'partner_price_history',
        'partner_pricing'
      ];

      const secondaryIdsSql = secondaryPartnerIds.map(id => `'${id}'::uuid`).join(', ');
      
      for (const table of tablesToUpdate) {
        sqlArray.push(
          `UPDATE printing.${table} SET partner_id = '${primaryPartner.id}'::uuid WHERE partner_id IN (${secondaryIdsSql});`
        );
      }

      // 2. Xóa các partner trùng lặp khác
      sqlArray.push(
        `DELETE FROM printing.partners WHERE id IN (${secondaryIdsSql});`
      );

      // Kết thúc transaction injection
      sqlArray.push(`SELECT 1 as res; --`);

      const finalSql = sqlArray.join(' ');

      const { error: txErr } = await supabaseAdmin.rpc('run_sql', { sql: finalSql });

      if (txErr) {
        console.error(`Lỗi thực thi SQL transaction gộp cho số điện thoại ${targetPhone}:`, txErr.message);
        continue;
      }

      totalMergedGroups++;
      totalDeletedPartners += secondaryPartnerIds.length;
    }

    return NextResponse.json({
      message: `Đã gộp thành công ${totalMergedGroups} nhóm trùng lặp, xóa bỏ ${totalDeletedPartners} tài khoản khách hàng thừa.`,
      mergedGroupsCount: totalMergedGroups,
      deletedPartnersCount: totalDeletedPartners
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
