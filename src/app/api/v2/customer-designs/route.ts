import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const printingSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'printing' } }
);

// GET /api/v2/customer-designs?customer_id=...&query=...
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get('customer_id');
    const query = searchParams.get('query');

    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id là bắt buộc' }, { status: 400 });
    }

    let q = printingSupabase
      .from('v2_customer_designs')
      .select('*')
      .eq('customer_id', customer_id)
      .order('use_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (query && query.trim()) {
      q = q.ilike('design_name', `%${query.trim()}%`);
    }

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ designs: data || [] });
  } catch (err: any) {
    console.error('Lỗi lấy kho mẫu thiết kế:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
