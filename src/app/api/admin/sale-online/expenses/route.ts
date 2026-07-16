import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const mktSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'marketing' } }
);

// GET /api/admin/sale-online/expenses
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const channel = searchParams.get('channel');
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '50');

  let q = mktSupabase.from('sale_expenses').select('*').order('date', { ascending: false }).limit(limit);
  if (from) q = q.gte('date', from);
  if (to) q = q.lte('date', to);
  if (channel && channel !== 'all') q = q.eq('channel', channel);
  if (category && category !== 'all') q = q.eq('category', category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/admin/sale-online/expenses
export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const body = await req.json();
  const { date, channel, category, amount, description, note } = body;

  if (!date) return NextResponse.json({ error: 'Thiếu ngày' }, { status: 400 });
  if (!channel) return NextResponse.json({ error: 'Thiếu kênh' }, { status: 400 });
  if (!category) return NextResponse.json({ error: 'Thiếu loại chi phí' }, { status: 400 });
  if (amount === undefined) return NextResponse.json({ error: 'Thiếu số tiền' }, { status: 400 });

  const { data, error } = await mktSupabase.from('sale_expenses').insert({
    date,
    channel,
    category,
    amount: Number(amount) || 0,
    description: description?.trim() || null,
    note: note?.trim() || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
