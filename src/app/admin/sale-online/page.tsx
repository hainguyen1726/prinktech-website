'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, ShoppingCart, BarChart2, Percent,
  Package, Plus, Trash2, X, Check,
  RefreshCw, AlertCircle, ExternalLink, Info
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface KPI { value: number; prev: number; pct: number | null; }
interface ChartPoint { date: string; revenue: number; expense: number; orders: number; }
interface ChannelBreakdown { channel: string; value: number; orders?: number; }
interface CategoryBreakdown { category: string; value: number; }
interface SummaryData {
  period: { from: string; to: string };
  kpis: { revenue: KPI; expenses: KPI; profit: KPI; orders: KPI; avgRevPerOrder: KPI; profitMargin: KPI; };
  breakdown: {
    revenueByChannel: ChannelBreakdown[];
    vatRevenue: number; nonVatRevenue: number; shippingRevenue: number;
    expenseByChannel: ChannelBreakdown[];
    expenseByCategory: CategoryBreakdown[];
  };
  chartData: ChartPoint[];
}
interface Revenue {
  id: string; date: string; channel: string;
  amount_excl_vat: number; vat_amount: number; shipping_fee_collected: number;
  has_vat: boolean; has_shipping: boolean; order_count: number;
  order_ref?: string; note?: string; created_at: string;
}
interface Expense {
  id: string; date: string; channel: string; category: string;
  amount: number; description?: string; note?: string; created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHANNELS = [
  { value: 'all', label: 'Tất cả kênh', color: '#64748b' },
  { value: 'website', label: 'Website', color: '#3b82f6' },
  { value: 'shopee', label: 'Shopee', color: '#f97316' },
  { value: 'facebook', label: 'Facebook', color: '#6366f1' },
  { value: 'tiktok', label: 'TikTok', color: '#ec4899' },
  { value: 'youtube', label: 'YouTube', color: '#ef4444' },
  { value: 'other', label: 'Khác', color: '#94a3b8' },
];
const EXPENSE_CATEGORIES = [
  { value: 'shipping', label: 'Phí vận chuyển', icon: '🚚', color: '#3b82f6' },
  { value: 'ads', label: 'Quảng cáo (Ads)', icon: '📢', color: '#f59e0b' },
  { value: 'cost', label: 'Giá vốn (Xưởng in)', icon: '🏭', color: '#8b5cf6' },
  { value: 'platform_fee', label: 'Phí sàn', icon: '💳', color: '#ec4899' },
  { value: 'other', label: 'Khác', icon: '📦', color: '#94a3b8' },
];
const PRESETS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'this_week', label: 'Tuần này' },
  { value: 'this_month', label: 'Tháng này' },
  { value: 'this_year', label: 'Năm này' },
  { value: 'last_week', label: 'Tuần trước' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'last_year', label: 'Năm trước' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return n.toLocaleString('vi-VN');
}
function fmtFull(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function channelLabel(ch: string) { return CHANNELS.find(c => c.value === ch)?.label || ch; }
function channelColor(ch: string) { return CHANNELS.find(c => c.value === ch)?.color || '#64748b'; }
function catLabel(cat: string) { return EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat; }
function catColor(cat: string) { return EXPENSE_CATEGORIES.find(c => c.value === cat)?.color || '#64748b'; }

// ─── Sub-components ───────────────────────────────────────────────────────────

// Toast
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-bottom-4 ${type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200'}`}>
      {type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// KPI Card
function KPICard({ label, value, pct, icon, format = 'currency', color }: {
  label: string; value: number; pct: number | null;
  icon: React.ReactNode; format?: 'currency' | 'count' | 'percent'; color: string;
}) {
  const displayVal = format === 'currency' ? fmt(value) + 'đ'
    : format === 'percent' ? value.toFixed(1) + '%'
    : value.toLocaleString('vi-VN');

  const trend = pct === null ? null : pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';

  return (
    <div className="glass-card bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 lg:p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{displayVal}</div>
      {trend !== null && (
        <div className={`flex items-center gap-1.5 text-xs font-bold ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
          {trend === 'up' ? <TrendingUp size={13} /> : trend === 'down' ? <TrendingDown size={13} /> : <Minus size={13} />}
          {pct !== null ? (Math.abs(pct).toFixed(1) + '% so kỳ trước') : 'Không có dữ liệu'}
        </div>
      )}
    </div>
  );
}

// Bar Chart
function BarChart({ data }: { data: ChartPoint[] }) {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  if (!data.length) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Không có dữ liệu</div>;

  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expense)), 1);
  const barW = Math.max(8, Math.min(36, Math.floor(560 / data.length / 2.5)));
  const gap = Math.max(4, barW * 0.3);

  return (
    <div className="relative overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(600, data.length * (barW * 2 + gap + 8) + 60)} 200`}
        className="w-full min-w-[500px]"
        style={{ height: 200 }}
        onMouseLeave={() => setTooltip(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map(r => (
          <line key={r} x1="40" y1={180 - r * 160} x2="99%" y2={180 - r * 160}
            stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} className="text-slate-600" />
        ))}
        {data.map((d, i) => {
          const x = 48 + i * (barW * 2 + gap + 8);
          const rh = Math.max(2, (d.revenue / maxVal) * 160);
          const eh = Math.max(2, (d.expense / maxVal) * 160);
          return (
            <g key={d.date}
              onMouseEnter={e => setTooltip({ idx: i, x: e.clientX, y: e.clientY })}
              style={{ cursor: 'pointer' }}>
              {/* Revenue bar */}
              <rect x={x} y={180 - rh} width={barW} height={rh} rx={3} fill="#10b981" opacity={0.85} />
              {/* Expense bar */}
              <rect x={x + barW + 3} y={180 - eh} width={barW} height={eh} rx={3} fill="#ef4444" opacity={0.75} />
              {/* Date label */}
              {i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
                <text x={x + barW} y={197} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.4} className="text-slate-600">
                  {fmtDate(d.date)}
                </text>
              )}
            </g>
          );
        })}
        {/* Y axis labels */}
        {[0, 0.5, 1].map(r => (
          <text key={r} x={36} y={180 - r * 160 + 4} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.4} className="text-slate-600">
            {fmt(maxVal * r)}
          </text>
        ))}
      </svg>
      {/* Tooltip */}
      {tooltip !== null && data[tooltip.idx] && (
        <div className="absolute bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none z-10"
          style={{ top: 8, left: Math.min(tooltip.idx * 50 + 60, 400) }}>
          <div className="font-bold mb-1">{data[tooltip.idx].date}</div>
          <div className="text-emerald-400">Doanh thu: {fmtFull(data[tooltip.idx].revenue)}</div>
          <div className="text-red-400">Chi phí: {fmtFull(data[tooltip.idx].expense)}</div>
          <div className={data[tooltip.idx].revenue - data[tooltip.idx].expense >= 0 ? 'text-blue-400' : 'text-orange-400'}>
            Lợi nhuận: {fmtFull(data[tooltip.idx].revenue - data[tooltip.idx].expense)}
          </div>
        </div>
      )}
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 justify-center text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Doanh thu</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Chi phí</span>
      </div>
    </div>
  );
}

// Simple donut chart via SVG
function DonutChart({ data, total, colors }: { data: { label: string; value: number; color: string }[]; total: number; colors?: string[] }) {
  if (total === 0) return <div className="text-center text-slate-400 text-xs py-4">Không có dữ liệu</div>;
  const r = 48; const cx = 60; const cy = 60;
  let cum = 0;
  const arcs = data.filter(d => d.value > 0).map((d, i) => {
    const startAngle = (cum / total) * 2 * Math.PI - Math.PI / 2;
    cum += d.value;
    const endAngle = (cum / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = (d.value / total) > 0.5 ? 1 : 0;
    return { ...d, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: colors?.[i] || d.color };
  });
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg viewBox="0 0 120 120" className="w-24 h-24 shrink-0">
        {arcs.map((arc, i) => <path key={i} d={arc.d} fill={arc.color} opacity={0.85} />)}
        <circle cx={cx} cy={cy} r={28} fill="white" className="dark:fill-[#0f172a]" />
      </svg>
      <div className="flex flex-col gap-1.5 text-xs">
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors?.[i] || d.color }} />
            <span className="text-slate-600 dark:text-slate-300 font-medium">{d.label}</span>
            <span className="font-bold text-slate-900 dark:text-white ml-auto">{fmt(d.value)}đ</span>
            <span className="text-slate-400">({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}



// Expense form
function ExpenseForm({ onSave, onCancel, today }: { onSave: (d: Partial<Expense>) => void; onCancel: () => void; today: string }) {
  const [form, setForm] = useState({ date: today, channel: 'facebook', category: 'ads', amount: '', description: '', note: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-5 space-y-4">
      <h4 className="font-bold text-red-700 dark:text-red-300 text-sm flex items-center gap-2"><TrendingDown size={15} /> Nhập chi phí mới</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Ngày *</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Kênh</label>
          <select value={form.channel} onChange={e => set('channel', e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500">
            {[...CHANNELS.filter(c => c.value !== 'all'), { value: 'all', label: 'Tất cả kênh', color: '#64748b' }].map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Loại chi phí *</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500">
            {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Số tiền *</label>
          <input type="number" min={0} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Mô tả</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="VD: Facebook Ads tháng 7/2026" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Ghi chú</label>
          <input value={form.note} onChange={e => set('note', e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">Hủy</button>
        <button onClick={() => onSave({ date: form.date, channel: form.channel, category: form.category, amount: Number(form.amount) || 0, description: form.description, note: form.note })} className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center gap-2">
          <Check size={13} /> Lưu chi phí
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SaleOnlinePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [preset, setPreset] = useState('this_month');
  const [channel, setChannel] = useState('all');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'revenue' | 'expense' | 'entry'>('revenue');
  const [showRevForm, setShowRevForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, revRes, expRes] = await Promise.all([
        fetch(`/api/admin/sale-online/summary?preset=${preset}&channel=${channel}`),
        fetch(`/api/admin/sale-online/revenues?limit=100`),
        fetch(`/api/admin/sale-online/expenses?limit=100`),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (revRes.ok) { const d = await revRes.json(); setRevenues(d.data || []); }
      if (expRes.ok) { const d = await expRes.json(); setExpenses(d.data || []); }
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally { setLoading(false); }
  }, [preset, channel]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveRevenue = async (data: Partial<Revenue>) => {
    try {
      const res = await fetch('/api/admin/sale-online/revenues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); showToast(e.error || 'Lỗi lưu doanh thu', 'error'); return; }
      showToast('Đã lưu doanh thu ✓');
      setShowRevForm(false);
      fetchAll();
    } catch { showToast('Lỗi kết nối', 'error'); }
  };

  const saveExpense = async (data: Partial<Expense>) => {
    try {
      const res = await fetch('/api/admin/sale-online/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); showToast(e.error || 'Lỗi lưu chi phí', 'error'); return; }
      showToast('Đã lưu chi phí ✓');
      setShowExpForm(false);
      fetchAll();
    } catch { showToast('Lỗi kết nối', 'error'); }
  };

  const deleteRevenue = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/sale-online/revenues/${id}`, { method: 'DELETE' });
      if (!res.ok) { showToast('Lỗi xóa doanh thu', 'error'); return; }
      showToast('Đã xóa doanh thu');
      fetchAll();
    } catch { showToast('Lỗi kết nối', 'error'); } finally { setDeleting(null); }
  };

  const deleteExpense = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/sale-online/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) { showToast('Lỗi xóa chi phí', 'error'); return; }
      showToast('Đã xóa chi phí');
      fetchAll();
    } catch { showToast('Lỗi kết nối', 'error'); } finally { setDeleting(null); }
  };

  const kpis = summary?.kpis;
  const breakdown = summary?.breakdown;
  const chartData = summary?.chartData || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">📊 Sale Online Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi doanh thu & chi phí theo kênh bán hàng</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300 disabled:opacity-50 w-fit">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.value} onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${preset === p.value ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300 hover:text-sky-600'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Channel filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Kênh:</span>
          {CHANNELS.map(c => (
            <button key={c.value} onClick={() => setChannel(c.value)}
              className={`px-3 py-1 text-xs font-bold rounded-full border transition ${channel === c.value ? 'text-white border-transparent shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:opacity-80'}`}
              style={channel === c.value ? { background: c.color, borderColor: c.color } : {}}>
              {c.label}
            </button>
          ))}
        </div>
        {summary?.period && (
          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            📅 {summary.period.from} → {summary.period.to}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard label="Doanh thu" value={kpis?.revenue.value || 0} pct={kpis?.revenue.pct ?? null} icon={<DollarSign size={17} />} color="#10b981" />
        <KPICard label="Chi phí" value={kpis?.expenses.value || 0} pct={kpis?.expenses.pct ?? null} icon={<TrendingDown size={17} />} color="#ef4444" />
        <KPICard label="Lợi nhuận" value={kpis?.profit.value || 0} pct={kpis?.profit.pct ?? null} icon={<BarChart2 size={17} />} color="#6366f1" />
        <KPICard label="Số đơn" value={kpis?.orders.value || 0} pct={kpis?.orders.pct ?? null} icon={<ShoppingCart size={17} />} format="count" color="#f59e0b" />
        <KPICard label="TB/đơn" value={kpis?.avgRevPerOrder.value || 0} pct={kpis?.avgRevPerOrder.pct ?? null} icon={<Package size={17} />} color="#8b5cf6" />
        <KPICard label="Biên lợi nhuận" value={kpis?.profitMargin.value || 0} pct={kpis?.profitMargin.pct ?? null} icon={<Percent size={17} />} format="percent" color="#0ea5e9" />
      </div>

      {/* Bar Chart */}
      <div className="glass-card bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-4">Biểu đồ Doanh thu & Chi phí</h3>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            <RefreshCw size={20} className="animate-spin mr-2" /> Đang tải...
          </div>
        ) : <BarChart data={chartData} />}
      </div>

      {/* Detail Tabs */}
      <div className="glass-card bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {/* Tab headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {([
            { key: 'revenue', label: '📈 Phân tích Doanh thu' },
            { key: 'expense', label: '💸 Phân tích Chi phí' },
            { key: 'entry', label: '✏️ Nhập liệu' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-5 py-3.5 text-xs font-bold transition border-b-2 -mb-px ${activeTab === t.key ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 space-y-6">

          {/* Revenue Tab */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* By channel */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Theo kênh bán</h4>
                  {breakdown && (
                    <DonutChart
                      data={breakdown.revenueByChannel.filter(d => d.value > 0).map(d => ({ label: channelLabel(d.channel), value: d.value, color: channelColor(d.channel) }))}
                      total={kpis?.revenue.value || 0}
                    />
                  )}
                </div>
                {/* VAT + Shipping breakdown */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Theo VAT</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Đơn có VAT</span>
                        <span className="font-bold">{fmtFull(breakdown?.vatRevenue || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Đơn chưa VAT</span>
                        <span className="font-bold">{fmtFull(breakdown?.nonVatRevenue || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Phí ship thu từ khách</h4>
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400">{fmtFull(breakdown?.shippingRevenue || 0)}</div>
                  </div>
                </div>
              </div>
              {/* Revenue table */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Chi tiết theo kênh</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        {['Kênh', 'Doanh thu', 'Tỷ lệ'].map(h => <th key={h} className="py-2 px-3 text-left font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(breakdown?.revenueByChannel || []).filter(d => d.value > 0).map(d => (
                        <tr key={d.channel} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold" style={{ color: channelColor(d.channel) }}>{channelLabel(d.channel)}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{fmtFull(d.value)}</td>
                          <td className="py-2.5 px-3 text-slate-500">{kpis?.revenue.value ? Math.round((d.value / kpis.revenue.value) * 100) + '%' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Expense Tab */}
          {activeTab === 'expense' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Theo loại chi phí</h4>
                  {breakdown && (
                    <DonutChart
                      data={(breakdown.expenseByCategory || []).filter(d => d.value > 0).map(d => ({ label: catLabel(d.category), value: d.value, color: catColor(d.category) }))}
                      total={kpis?.expenses.value || 0}
                    />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Theo kênh</h4>
                  {breakdown && (
                    <DonutChart
                      data={(breakdown.expenseByChannel || []).filter(d => d.value > 0).map(d => ({ label: channelLabel(d.channel), value: d.value, color: channelColor(d.channel) }))}
                      total={kpis?.expenses.value || 0}
                    />
                  )}
                </div>
              </div>
              {/* Expense category table */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Chi tiết loại chi phí</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        {['Loại', 'Kênh', 'Số tiền', 'Tỷ lệ'].map(h => <th key={h} className="py-2 px-3 text-left font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(breakdown?.expenseByCategory || []).filter(d => d.value > 0).map(d => (
                        <tr key={d.category} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold" style={{ color: catColor(d.category) }}>{catLabel(d.category)}</td>
                          <td className="py-2.5 px-3 text-slate-500">—</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{fmtFull(d.value)}</td>
                          <td className="py-2.5 px-3 text-slate-500">{kpis?.expenses.value ? Math.round((d.value / kpis.expenses.value) * 100) + '%' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Data Entry Tab */}
          {activeTab === 'entry' && (
            <div className="space-y-6">
              {/* Info panel */}
              <div className="flex gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-850 text-xs text-sky-850 dark:text-sky-300">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Hệ thống Doanh thu tự động</p>
                  <p>Doanh thu của mảng Sale Online được đồng bộ tự động 100% từ danh sách đơn hàng bán lẻ và đơn hàng B2B (các đơn có tag prinktech hoặc nguồn cụ thể).</p>
                  <div className="pt-1.5">
                    <Link href="/admin/don-hang" className="font-bold inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline">
                      Đi đến trang Quản lý đơn hàng để thêm/sửa đơn hàng <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Expense form section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chi phí phát sinh (nhập thủ công)</h4>
                  {!showExpForm && (
                    <button onClick={() => setShowExpForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                      <Plus size={12} /> Thêm chi phí
                    </button>
                  )}
                </div>
                {showExpForm && <ExpenseForm onSave={saveExpense} onCancel={() => setShowExpForm(false)} today={today} />}
                {/* Expense history */}
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        {['Ngày', 'Loại', 'Kênh', 'Số tiền', 'Mô tả', 'Ghi chú', ''].map(h => (
                          <th key={h} className="py-2 px-2 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.slice(0, 35).map(e => (
                        <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-2 font-semibold whitespace-nowrap">{e.date}</td>
                          <td className="py-2 px-2" style={{ color: catColor(e.category) }}><b>{catLabel(e.category)}</b></td>
                          <td className="py-2 px-2" style={{ color: channelColor(e.channel) }}>{channelLabel(e.channel)}</td>
                          <td className="py-2 px-2 font-bold text-red-600">{fmtFull(Number(e.amount))}</td>
                          <td className="py-2 px-2 text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{e.description || '—'}</td>
                          <td className="py-2 px-2 text-slate-400 max-w-[80px] truncate">{e.note || '—'}</td>
                          <td className="py-2 px-2">
                            <button onClick={() => { if (confirm('Xóa chi phí này?')) deleteExpense(e.id); }} disabled={deleting === e.id} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition">
                              {deleting === e.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-400">Chưa có chi phí nào được nhập</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
