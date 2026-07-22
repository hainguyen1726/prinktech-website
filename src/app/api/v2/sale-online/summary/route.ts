import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const printingSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'printing' } }
);

const mktSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'marketing' } }
);

function getDateRange(preset: string, paramFrom?: string | null, paramTo?: string | null): { from: string; to: string } {
  const now = new Date();
  const toDay = now.toISOString().slice(0, 10);

  switch (preset) {
    case 'today': return { from: toDay, to: toDay };
    case 'this_week': {
      const day = now.getDay() || 7;
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
      const sun = new Date(now); sun.setDate(now.getDate() - day + 7);
      return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) };
    }
    case 'this_month': {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { from, to: toDay };
    }
    case 'all': return { from: '2026-01-01', to: toDay };
    case 'custom': return { from: paramFrom || '2026-01-01', to: paramTo || toDay };
    default: {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { from, to: toDay };
    }
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

// GET /api/v2/sale-online/summary — Báo cáo Sale Online Siêu Tốc từ v2_orders
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const { searchParams } = new URL(req.url);
  const preset = searchParams.get('preset') || 'this_month';
  const channel = searchParams.get('channel') || 'all';
  let from = searchParams.get('from');
  let to = searchParams.get('to');

  if (!from || !to || preset !== 'custom') {
    const range = getDateRange(preset, from, to);
    from = range.from; to = range.to;
  }

  const prev = getPrevRange(from, to);
  const CHANNELS = ['website', 'shopee', 'facebook', 'tiktok', 'youtube', 'other'];

  const fromTs = `${from}T00:00:00.000Z`;
  const toTs = `${to}T23:59:59.999Z`;
  const prevFromTs = `${prev.from}T00:00:00.000Z`;
  const prevToTs = `${prev.to}T23:59:59.999Z`;

  // Query kỳ hiện tại
  let queryCurrent = printingSupabase
    .from('v2_orders')
    .select('id, created_at, channel, total_amount, subtotal, shipping_fee, has_vat, status, actual_meters')
    .gte('created_at', fromTs)
    .lte('created_at', toTs)
    .neq('status', 'cancelled');

  if (channel !== 'all') queryCurrent = queryCurrent.eq('channel', channel);

  // Query kỳ trước
  let queryPrev = printingSupabase
    .from('v2_orders')
    .select('id, created_at, channel, total_amount, subtotal, shipping_fee, has_vat, status, actual_meters')
    .gte('created_at', prevFromTs)
    .lte('created_at', prevToTs)
    .neq('status', 'cancelled');

  if (channel !== 'all') queryPrev = queryPrev.eq('channel', channel);

  // Query Chi phí từ Marketing Schema
  const [currOrdersRes, prevOrdersRes, expRes, prevExpRes] = await Promise.all([
    queryCurrent,
    queryPrev,
    mktSupabase.from('sale_expenses').select('*').gte('date', from).lte('date', to),
    mktSupabase.from('sale_expenses').select('*').gte('date', prev.from).lte('date', prev.to),
  ]);

  const currOrders = currOrdersRes.data || [];
  const prevOrders = prevOrdersRes.data || [];
  const currExp = expRes.data || [];
  const prevExp = prevExpRes.data || [];

  // Tính KPIs
  const totalRevenue = currOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const prevTotalRevenue = prevOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const totalExpenses = currExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const prevTotalExpenses = prevExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const totalProfit = totalRevenue - totalExpenses;
  const prevTotalProfit = prevTotalRevenue - prevTotalExpenses;

  const totalOrders = currOrders.length;
  const prevTotalOrders = prevOrders.length;

  const totalMeters = currOrders.reduce((s, o) => s + Number(o.actual_meters || 0), 0);
  const prevTotalMeters = prevOrders.reduce((s, o) => s + Number(o.actual_meters || 0), 0);

  const avgRevPerOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const prevAvgRevPerOrder = prevTotalOrders > 0 ? Math.round(prevTotalRevenue / prevTotalOrders) : 0;

  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;
  const prevProfitMargin = prevTotalRevenue > 0 ? Math.round((prevTotalProfit / prevTotalRevenue) * 1000) / 10 : 0;

  // Breakdown theo Kênh
  const revenueByChannel = CHANNELS.map(ch => {
    const channelOrders = currOrders.filter(o => o.channel === ch);
    return {
      channel: ch,
      value: channelOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
      orders: channelOrders.length
    };
  });

  return NextResponse.json({
    period: { from, to, prev },
    kpis: {
      revenue: { value: totalRevenue, prev: prevTotalRevenue, pct: pct(totalRevenue, prevTotalRevenue) },
      expenses: { value: totalExpenses, prev: prevTotalExpenses, pct: pct(totalExpenses, prevTotalExpenses) },
      profit: { value: totalProfit, prev: prevTotalProfit, pct: pct(totalProfit, prevTotalProfit) },
      orders: { value: totalOrders, prev: prevTotalOrders, pct: pct(totalOrders, prevTotalOrders) },
      meters: { value: totalMeters, prev: prevTotalMeters, pct: pct(totalMeters, prevTotalMeters) },
      avgRevPerOrder: { value: avgRevPerOrder, prev: prevAvgRevPerOrder, pct: pct(avgRevPerOrder, prevAvgRevPerOrder) },
      profitMargin: { value: profitMargin, prev: prevProfitMargin, pct: pct(profitMargin, prevProfitMargin) },
    },
    breakdown: {
      revenueByChannel
    },
    dataSource: {
      revenues: 'v2_orders (printing schema, high-performance query)',
      expenses: 'sale_expenses (marketing schema)',
    }
  });
}
