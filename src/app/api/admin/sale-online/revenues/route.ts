import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const mktSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'marketing' } }
);

// GET /api/admin/sale-online/revenues
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const channel = searchParams.get('channel');
  const limit = parseInt(searchParams.get('limit') || '50');

  let q = mktSupabase.from('sale_revenues').select('*').order('date', { ascending: false }).limit(limit);
  if (from) q = q.gte('date', from);
  if (to) q = q.lte('date', to);
  if (channel && channel !== 'all') q = q.eq('channel', channel);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/admin/sale-online/revenues
export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const body = await req.json();
  const { date, channel, amount_excl_vat, vat_amount, shipping_fee_collected, has_vat, has_shipping, order_count, order_ref, note } = body;

  if (!date) return NextResponse.json({ error: 'Thiếu ngày' }, { status: 400 });
  if (!channel) return NextResponse.json({ error: 'Thiếu kênh bán' }, { status: 400 });
  if (amount_excl_vat === undefined) return NextResponse.json({ error: 'Thiếu số tiền doanh thu' }, { status: 400 });

  const { data, error } = await mktSupabase.from('sale_revenues').insert({
    date,
    channel,
    amount_excl_vat: Number(amount_excl_vat) || 0,
    vat_amount: Number(vat_amount) || 0,
    shipping_fee_collected: Number(shipping_fee_collected) || 0,
    has_vat: Boolean(has_vat),
    has_shipping: Boolean(has_shipping),
    order_count: Number(order_count) || 1,
    order_ref: order_ref?.trim() || null,
    note: note?.trim() || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
