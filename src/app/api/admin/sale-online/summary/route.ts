import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// Printing schema: đọc retail_orders + orders
const printingSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'printing' } }
);

// Marketing schema: đọc sale_expenses
const mktSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'marketing' } }
);

// ─── Chuẩn hóa tên kênh ─────────────────────────────
function normalizeChannel(src: string | null): string {
  const s = (src || '').toLowerCase().trim();
  if (!s || s === 'website' || s === 'web') return 'website';
  if (s === 'fb' || s === 'facebook') return 'facebook';
  if (s === 'shopee') return 'shopee';
  if (s === 'tiktok') return 'tiktok';
  if (s === 'youtube') return 'youtube';
  if (s === 'admin' || s === 'manual') return 'other';
  return 'other';
}

// ─── Trích xuất kênh từ tags (orders table) ──────────
function channelFromTags(tags: string[] | null): string {
  if (!Array.isArray(tags)) return 'other';
  const found = tags.find(t => t.toLowerCase().startsWith('nguồn:') || t.toLowerCase().startsWith('nguon:'));
  if (!found) return 'other';
  const src = found.replace(/^nguồn:\s*/i, '').replace(/^nguon:\s*/i, '').trim();
  return normalizeChannel(src);
}

// ─── Date range helpers ───────────────────────────────
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
    case 'this_year': return { from: `${now.getFullYear()}-01-01`, to: toDay };
    case 'last_year': {
      const y = now.getFullYear() - 1;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    case 'all': {
      return { from: '2026-01-01', to: toDay };
    }
    case 'custom': {
      return { from: paramFrom || '2026-01-01', to: paramTo || toDay };
    }
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

// ─── Tổng hợp doanh thu từ retail_orders + orders ────
interface NormalizedOrder {
  date: string;
  channel: string;
  total: number;         // Tổng tiền khách trả (bao gồm ship)
  subtotal: number;      // Tiền hàng (chưa ship)
  shipping: number;      // Phí ship
  has_vat: boolean;
  order_count: number;
}

async function fetchRevenues(from: string, to: string): Promise<NormalizedOrder[]> {
  const fromTs = `${from}T00:00:00.000Z`;
  const toTs = `${to}T23:59:59.999Z`;

  // 1. retail_orders: đơn website + đơn admin tạo thủ công qua form online
  const [retailRes, ordersRes] = await Promise.all([
    printingSupabase
      .from('retail_orders')
      .select('id, created_at, source, total, subtotal, shipping_fee, request_vat, status')
      .gte('created_at', fromTs)
      .lte('created_at', toTs)
      .neq('status', 'cancelled'),

    // 2. orders: đơn xưởng in cho đối tác (bao gồm Sale Online làm khách)
    // Chỉ lấy đơn có tag 'prinktech' (Sale Online) hoặc partner_type = 'standard'
    printingSupabase
      .from('orders')
      .select('id, created_at, tags, total_amount, shipping_cost, discount_amount, status, partners(partner_type)')
      .gte('created_at', fromTs)
      .lte('created_at', toTs)
      .neq('status', 'cancelled'),
  ]);

  const result: NormalizedOrder[] = [];

  // Normalize retail_orders
  for (const o of (retailRes.data || [])) {
    result.push({
      date: o.created_at.slice(0, 10),
      channel: normalizeChannel(o.source),
      total: Number(o.total) || 0,
      subtotal: Number(o.subtotal) || 0,
      shipping: Number(o.shipping_fee) || 0,
      has_vat: Boolean(o.request_vat),
      order_count: 1,
    });
  }

  // Normalize orders (chỉ lấy đơn có tag 'prinktech' = Sale Online là khách)
  for (const o of (ordersRes.data || [])) {
    const tags: string[] = Array.isArray(o.tags) ? o.tags : [];
    const isPrinktech = tags.some((t: string) => t.toLowerCase() === 'prinktech');
    const isStandard = (o.partners as any)?.partner_type === 'standard';
    if (!isPrinktech && !isStandard) continue; // Bỏ qua đơn B2B thuần túy

    const subtotal = Number(o.total_amount) || 0;
    const shipping = Number(o.shipping_cost) || 0;
    const discount = Number(o.discount_amount) || 0;
    const total = subtotal + shipping - discount;
    const has_vat = tags.some((t: string) => t.toLowerCase().includes('vat'));
    const channel = channelFromTags(tags);

    result.push({
      date: o.created_at.slice(0, 10),
      channel,
      total,
      subtotal,
      shipping,
      has_vat,
      order_count: 1,
    });
  }

  return result;
}

// ─── GET /api/admin/sale-online/summary ───────────────
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
  const CATEGORIES = ['shipping', 'ads', 'cost', 'platform_fee', 'other'];

  // Fetch dữ liệu song song
  const [revenues, prevRevenues, expRes, prevExpRes] = await Promise.all([
    fetchRevenues(from, to),
    fetchRevenues(prev.from, prev.to),
    mktSupabase.from('sale_expenses').select('*').gte('date', from).lte('date', to),
    mktSupabase.from('sale_expenses').select('*').gte('date', prev.from).lte('date', prev.to),
  ]);

  // Filter theo kênh nếu cần
  const filteredRevenues = channel === 'all' ? revenues : revenues.filter(r => r.channel === channel);
  const filteredPrevRevenues = channel === 'all' ? prevRevenues : prevRevenues.filter(r => r.channel === channel);

  const expenses = expRes.data || [];
  const prevExpenses = prevExpRes.data || [];
  const filteredExpenses = channel === 'all' ? expenses : expenses.filter((e: any) => e.channel === channel || e.channel === 'all');
  const filteredPrevExpenses = channel === 'all' ? prevExpenses : prevExpenses.filter((e: any) => e.channel === channel || e.channel === 'all');

  // ─── KPIs kỳ hiện tại ─────────────────────────────
  const totalRevenue = filteredRevenues.reduce((s, r) => s + r.total, 0);
  const totalExpenses = filteredExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalOrders = filteredRevenues.reduce((s, r) => s + r.order_count, 0);
  const avgRevPerOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;

  // ─── KPIs kỳ trước ────────────────────────────────
  const prevTotalRevenue = filteredPrevRevenues.reduce((s, r) => s + r.total, 0);
  const prevTotalExpenses = filteredPrevExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const prevTotalProfit = prevTotalRevenue - prevTotalExpenses;
  const prevTotalOrders = filteredPrevRevenues.reduce((s, r) => s + r.order_count, 0);
  const prevAvgRevPerOrder = prevTotalOrders > 0 ? Math.round(prevTotalRevenue / prevTotalOrders) : 0;
  const prevProfitMargin = prevTotalRevenue > 0 ? Math.round((prevTotalProfit / prevTotalRevenue) * 1000) / 10 : 0;

  // ─── Breakdown theo kênh ──────────────────────────
  const revenueByChannel = CHANNELS.map(ch => ({
    channel: ch,
    value: filteredRevenues.filter(r => r.channel === ch).reduce((s, r) => s + r.total, 0),
    orders: filteredRevenues.filter(r => r.channel === ch).reduce((s, r) => s + r.order_count, 0),
  }));

  // VAT breakdown
  const vatRevenue = filteredRevenues.filter(r => r.has_vat).reduce((s, r) => s + r.subtotal, 0);
  const nonVatRevenue = filteredRevenues.filter(r => !r.has_vat).reduce((s, r) => s + r.subtotal, 0);
  const shippingRevenue = filteredRevenues.reduce((s, r) => s + r.shipping, 0);

  // Expense breakdown
  const expenseByChannel = CHANNELS.map(ch => ({
    channel: ch,
    value: expenses.filter((e: any) => e.channel === ch).reduce((s: number, e: any) => s + Number(e.amount), 0),
  }));
  const expenseByCategory = CATEGORIES.map(cat => ({
    category: cat,
    value: filteredExpenses.filter((e: any) => e.category === cat).reduce((s: number, e: any) => s + Number(e.amount), 0),
  }));

  // ─── Chart data theo ngày ─────────────────────────
  const dateMap: Record<string, { date: string; revenue: number; expense: number; orders: number }> = {};
  const addDays = (d: string, n: number) => {
    const dt = new Date(d); dt.setDate(dt.getDate() + n);
    return dt.toISOString().slice(0, 10);
  };
  let cur = from;
  while (cur <= to) {
    dateMap[cur] = { date: cur, revenue: 0, expense: 0, orders: 0 };
    cur = addDays(cur, 1);
  }
  filteredRevenues.forEach(r => {
    if (dateMap[r.date]) {
      dateMap[r.date].revenue += r.total;
      dateMap[r.date].orders += r.order_count;
    }
  });
  filteredExpenses.forEach((e: any) => {
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
    // Metadata: cho user biết nguồn dữ liệu
    dataSource: {
      revenues: 'retail_orders + orders (printing schema, status ≠ cancelled)',
      expenses: 'sale_expenses (marketing schema, nhập thủ công)',
    },
  });
}
