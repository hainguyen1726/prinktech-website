'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, ShoppingCart, BarChart2, Percent,
  Package, RefreshCw, AlertCircle, Check, X, Info
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
  { value: 'all', label: 'Tất cả thời gian' },
  { value: 'custom', label: '📅 Tùy chọn' }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 10_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
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
          <span>{pct !== null ? (pct > 0 ? '+' : '') + pct + '%' : '0%'}</span>
          <span className="text-slate-400 dark:text-slate-500 font-medium">so kỳ trước</span>
        </div>
      )}
    </div>
  );
}

// Custom Bar Chart (SVG-based)
function BarChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-slate-400 text-xs">Chưa có dữ liệu thống kê</div>;

  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expense)), 1000);
  const chartHeight = 160;
  const barWidth = 14;
  const gap = 16;
  const paddingLeft = 45;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;
  const viewWidth = paddingLeft + paddingRight + data.length * (barWidth * 2 + gap);

  return (
    <div className="overflow-x-auto scrollbar-none">
      <svg width={Math.max(viewWidth, 500)} height={chartHeight + paddingTop + paddingBottom} className="mx-auto font-sans">
        {/* Y Axis Grid Lines & Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const val = maxVal * r;
          const y = paddingTop + chartHeight * (1 - r);
          return (
            <g key={i} className="opacity-40">
              <line x1={paddingLeft} y1={y} x2="100%" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" className="dark:stroke-slate-800" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500">{fmt(val)}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const groupWidth = barWidth * 2 + gap;
          const xGroup = paddingLeft + i * groupWidth;
          const revHeight = (d.revenue / maxVal) * chartHeight;
          const expHeight = (d.expense / maxVal) * chartHeight;

          const yRev = paddingTop + chartHeight - revHeight;
          const yExp = paddingTop + chartHeight - expHeight;

          return (
            <g key={i} className="group">
              {/* Revenue Bar */}
              <rect x={xGroup} y={yRev} width={barWidth} height={revHeight} rx={3} fill="#10b981" className="hover:opacity-85 transition-opacity" />
              {/* Expense Bar */}
              <rect x={xGroup + barWidth + 2} y={yExp} width={barWidth} height={expHeight} rx={3} fill="#ef4444" className="hover:opacity-85 transition-opacity" />

              {/* X Axis Label */}
              <text x={xGroup + barWidth} y={paddingTop + chartHeight + 15} textAnchor="middle" className="text-[9px] font-bold fill-slate-400 dark:fill-slate-500">
                {fmtDate(d.date)}
              </text>

              {/* Tooltip on hover */}
              <title>{`Ngày: ${d.date}\nDoanh thu: ${fmtFull(d.revenue)}\nChi phí: ${fmtFull(d.expense)}\nĐơn hàng: ${d.orders} đơn`}</title>
            </g>
          );
        })}
        
        {/* Bottom Line */}
        <line x1={paddingLeft} y1={paddingTop + chartHeight} x2="100%" y2={paddingTop + chartHeight} stroke="#cbd5e1" className="dark:stroke-slate-700" />
      </svg>
    </div>
  );
}

// Donut Chart
function DonutChart({ data, total, colors }: { data: { label: string; value: number; color?: string }[]; total: number; colors?: string[] }) {
  if (total === 0) return <div className="h-32 flex items-center justify-center text-slate-400 text-xs">Chưa có dữ liệu phân tích</div>;

  const size = 120;
  const radius = 45;
  const circum = 2 * Math.PI * radius;
  const strokeWidth = 14;
  const center = size / 2;

  let accumulatedAngle = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-2">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth={strokeWidth} className="dark:stroke-slate-800" />
          {data.map((d, i) => {
            const percentage = d.value / total;
            const strokeDashoffset = circum * (1 - percentage);
            const strokeDasharray = `${circum} ${circum}`;
            const rotation = (accumulatedAngle / total) * 360;
            accumulatedAngle += d.value;

            return (
              <circle
                key={i} cx={center} cy={center} r={radius} fill="transparent"
                stroke={colors?.[i] || d.color || '#3b82f6'} strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                transform={`rotate(${rotation} ${center} ${center})`}
                className="transition-all duration-500 hover:opacity-90"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng cộng</span>
          <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{fmt(total)}</span>
        </div>
      </div>

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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaleOnlinePage() {
  const [preset, setPreset] = useState('this_month');
  const [channel, setChannel] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'revenue' | 'expense'>('revenue');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams: Record<string, string> = {
        preset,
        channel
      };

      if (preset === 'custom') {
        if (customFrom) queryParams.from = customFrom;
        if (customTo) queryParams.to = customTo;
      }

      const params = new URLSearchParams(queryParams);
      const sumRes = await fetch(`/api/admin/sale-online/summary?${params.toString()}`);
      if (sumRes.ok) {
        setSummary(await sumRes.json());
      } else {
        showToast('Lỗi tải dữ liệu báo cáo', 'error');
      }
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally { setLoading(false); }
  }, [preset, channel, customFrom, customTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const kpis = summary?.kpis;
  const breakdown = summary?.breakdown;
  const chartData = summary?.chartData || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">📊 Sale Online Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi phân tích doanh thu bán lẻ đa kênh & đối chiếu chi phí thực tế</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300 disabled:opacity-50 w-fit">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        {/* Preset buttons */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Thời gian:</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.value} onClick={() => setPreset(p.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${preset === p.value ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300 hover:text-sky-600'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2 pt-1 animate-slide-down">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-400">Từ:</span>
              <input 
                type="date" 
                value={customFrom} 
                onChange={e => setCustomFrom(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs bg-white dark:bg-slate-900 text-foreground"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-400">Đến:</span>
              <input 
                type="date" 
                value={customTo} 
                onChange={e => setCustomTo(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs bg-white dark:bg-slate-900 text-foreground"
              />
            </div>
          </div>
        )}

        {/* Channel filter */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">Kênh lọc:</span>
          {CHANNELS.map(c => (
            <button key={c.value} onClick={() => setChannel(c.value)}
              className={`px-3 py-1 text-xs font-bold rounded-full border transition ${channel === c.value ? 'text-white border-transparent shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:opacity-80'}`}
              style={channel === c.value ? { background: c.color, borderColor: c.color } : {}}>
              {c.label}
            </button>
          ))}
        </div>
        
        {summary?.period && (
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            📅 Khoảng dữ liệu: {summary.period.from} ➔ {summary.period.to}
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
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
