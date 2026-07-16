import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const mktSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'marketing' } }
);

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const toDay = now.toISOString().slice(0, 10);

  switch (preset) {
    case 'today': {
      return { from: toDay, to: toDay };
    }
    case 'this_week': {
      const day = now.getDay() || 7;
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
      const sun = new Date(now); sun.setDate(now.getDate() - day + 7);
      return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) };
    }
    case 'last_week': {
      const day = now.getDay() || 7;
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1 - 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) };
    }
    case 'this_month': {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { from, to: toDay };
    }
    case 'last_month': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lme = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: lm.toISOString().slice(0, 10), to: lme.toISOString().slice(0, 10) };
    }
    case 'this_year': {
      return { from: `${now.getFullYear()}-01-01`, to: toDay };
    }
    case 'last_year': {
      const y = now.getFullYear() - 1;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    default:
      return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to: toDay };
  }
}

function getPrevRange(from: string, to: string): { from: string; to: string } {
  const f = new Date(from);
  const t = new Date(to);
  const days = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
  const pf = new Date(f); pf.setDate(f.getDate() - days);
  const pt = new Date(f); pt.setDate(f.getDate() - 1);
  return { from: pf.toISOString().slice(0, 10), to: pt.toISOString().slice(0, 10) };
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

// GET /api/admin/sale-online/summary
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const { searchParams } = new URL(req.url);
  const preset = searchParams.get('preset') || 'this_month';
  const channel = searchParams.get('channel') || 'all';
  let from = searchParams.get('from');
  let to = searchParams.get('to');

  if (!from || !to) {
    const range = getDateRange(preset);
    from = range.from; to = range.to;
  }

  const prev = getPrevRange(from, to);

  // Build queries
  let revQ = mktSupabase.from('sale_revenues').select('*').gte('date', from).lte('date', to);
  let expQ = mktSupabase.from('sale_expenses').select('*').gte('date', from).lte('date', to);
  let prevRevQ = mktSupabase.from('sale_revenues').select('*').gte('date', prev.from).lte('date', prev.to);
  let prevExpQ = mktSupabase.from('sale_expenses').select('*').gte('date', prev.from).lte('date', prev.to);

  if (channel !== 'all') {
    revQ = revQ.eq('channel', channel);
    expQ = expQ.filter('channel', 'eq', channel);
    prevRevQ = prevRevQ.eq('channel', channel);
    prevExpQ = prevExpQ.filter('channel', 'eq', channel);
  }

  const [revRes, expRes, prevRevRes, prevExpRes] = await Promise.all([revQ, expQ, prevRevQ, prevExpQ]);

  if (revRes.error) return NextResponse.json({ error: revRes.error.message }, { status: 500 });
  if (expRes.error) return NextResponse.json({ error: expRes.error.message }, { status: 500 });

  const revenues = revRes.data || [];
  const expenses = expRes.data || [];
  const prevRevenues = prevRevRes.data || [];
  const prevExpenses = prevExpRes.data || [];

  // Aggregate KPIs
  const totalRevenue = revenues.reduce((s, r) => s + Number(r.amount_excl_vat) + Number(r.vat_amount) + Number(r.shipping_fee_collected), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalOrders = revenues.reduce((s, r) => s + (r.order_count || 1), 0);
  const avgRevPerOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;

  const prevTotalRevenue = prevRevenues.reduce((s, r) => s + Number(r.amount_excl_vat) + Number(r.vat_amount) + Number(r.shipping_fee_collected), 0);
  const prevTotalExpenses = prevExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const prevTotalProfit = prevTotalRevenue - prevTotalExpenses;
  const prevTotalOrders = prevRevenues.reduce((s, r) => s + (r.order_count || 1), 0);
  const prevAvgRevPerOrder = prevTotalOrders > 0 ? Math.round(prevTotalRevenue / prevTotalOrders) : 0;
  const prevProfitMargin = prevTotalRevenue > 0 ? Math.round((prevTotalProfit / prevTotalRevenue) * 1000) / 10 : 0;

  // Revenue breakdown
  const CHANNELS = ['website', 'shopee', 'facebook', 'tiktok', 'youtube', 'other'];
  const revenueByChannel = CHANNELS.map(ch => ({
    channel: ch,
    value: revenues.filter(r => r.channel === ch).reduce((s, r) => s + Number(r.amount_excl_vat) + Number(r.vat_amount) + Number(r.shipping_fee_collected), 0)
  }));

  const vatRevenue = revenues.filter(r => r.has_vat).reduce((s, r) => s + Number(r.amount_excl_vat) + Number(r.vat_amount), 0);
  const nonVatRevenue = revenues.filter(r => !r.has_vat).reduce((s, r) => s + Number(r.amount_excl_vat), 0);
  const shippingRevenue = revenues.filter(r => r.has_shipping).reduce((s, r) => s + Number(r.shipping_fee_collected), 0);

  // Expense breakdown
  const expenseByChannel = CHANNELS.map(ch => ({
    channel: ch,
    value: expenses.filter(e => e.channel === ch || e.channel === 'all').reduce((s, e) => s + Number(e.amount), 0)
  }));
  const CATEGORIES = ['shipping', 'ads', 'cost', 'platform_fee', 'other'];
  const expenseByCategory = CATEGORIES.map(cat => ({
    category: cat,
    value: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
  }));

  // Chart data: group by date
  const dateMap: Record<string, { date: string; revenue: number; expense: number }> = {};
  const addDays = (d: string, n: number) => {
    const dt = new Date(d); dt.setDate(dt.getDate() + n);
    return dt.toISOString().slice(0, 10);
  };
  let cur = from;
  while (cur <= to) {
    dateMap[cur] = { date: cur, revenue: 0, expense: 0 };
    cur = addDays(cur, 1);
  }
  revenues.forEach(r => {
    if (dateMap[r.date]) dateMap[r.date].revenue += Number(r.amount_excl_vat) + Number(r.vat_amount) + Number(r.shipping_fee_collected);
  });
  expenses.forEach(e => {
    if (dateMap[e.date]) dateMap[e.date].expense += Number(e.amount);
  });
  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    period: { from, to, prev },
    kpis: {
      revenue: { value: totalRevenue, prev: prevTotalRevenue, pct: pct(totalRevenue, prevTotalRevenue) },
      expenses: { value: totalExpenses, prev: prevTotalExpenses, pct: pct(totalExpenses, prevTotalExpenses) },
      profit: { value: totalProfit, prev: prevTotalProfit, pct: pct(totalProfit, prevTotalProfit) },
      orders: { value: totalOrders, prev: prevTotalOrders, pct: pct(totalOrders, prevTotalOrders) },
      avgRevPerOrder: { value: avgRevPerOrder, prev: prevAvgRevPerOrder, pct: pct(avgRevPerOrder, prevAvgRevPerOrder) },
      profitMargin: { value: profitMargin, prev: prevProfitMargin, pct: pct(profitMargin, prevProfitMargin) },
    },
    breakdown: {
      revenueByChannel,
      vatRevenue,
      nonVatRevenue,
      shippingRevenue,
      expenseByChannel,
      expenseByCategory,
    },
    chartData,
  });
}
