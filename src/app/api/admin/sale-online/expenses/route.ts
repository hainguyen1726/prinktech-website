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
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '30');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Query chính có phân trang
  let q = mktSupabase
    .from('sale_expenses')
    .select('*', { count: 'exact' });

  if (from) q = q.gte('date', from);
  if (to) q = q.lte('date', to);
  if (channel && channel !== 'all') q = q.eq('channel', channel);
  if (category && category !== 'all') q = q.eq('category', category);
  
  if (search && search.trim() !== '') {
    q = q.or(`description.ilike.%${search}%,note.ilike.%${search}%`);
  }

  // Sắp xếp và phân trang
  q = q.order('date', { ascending: false }).range(offset, offset + limit - 1);

  // Tính tổng số tiền (không phân trang)
  let sumQ = mktSupabase.from('sale_expenses').select('amount');
  if (from) sumQ = sumQ.gte('date', from);
  if (to) sumQ = sumQ.lte('date', to);
  if (channel && channel !== 'all') sumQ = sumQ.eq('channel', channel);
  if (category && category !== 'all') sumQ = sumQ.eq('category', category);
  if (search && search.trim() !== '') {
    sumQ = sumQ.or(`description.ilike.%${search}%,note.ilike.%${search}%`);
  }

  const [resList, resSum] = await Promise.all([q, sumQ]);

  if (resList.error) return NextResponse.json({ error: resList.error.message }, { status: 500 });
  if (resSum.error) return NextResponse.json({ error: resSum.error.message }, { status: 500 });

  const total = resList.count || 0;
  const sumAmount = (resSum.data || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return NextResponse.json({ 
    data: resList.data || [], 
    total, 
    sumAmount 
  });
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
