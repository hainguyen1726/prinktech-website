'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingDown, Plus, Trash2, RefreshCw, 
  DollarSign, Clock, Info, ExternalLink, Calendar,
  ChevronLeft, ChevronRight, AlertCircle, Check
} from 'lucide-react';

interface Expense {
  id: string;
  date: string;
  channel: string;
  category: string;
  amount: number;
  description?: string;
  note?: string;
  created_at: string;
}

const CHANNELS = [
  { value: 'website', label: '🌐 Website', color: '#3b82f6' },
  { value: 'shopee', label: '🛍️ Shopee', color: '#f97316' },
  { value: 'facebook', label: '📘 Facebook', color: '#6366f1' },
  { value: 'tiktok', label: '🎵 TikTok', color: '#ec4899' },
  { value: 'youtube', label: '🎥 YouTube', color: '#ef4444' },
  { value: 'other', label: '❓ Khác', color: '#94a3b8' },
  { value: 'all', label: '🌍 Tất cả kênh', color: '#64748b' }
];

const EXPENSE_CATEGORIES = [
  { value: 'shipping', label: 'Phí vận chuyển', icon: '🚚', color: '#3b82f6' },
  { value: 'ads', label: 'Chi phí Ads', icon: '📣', color: '#ec4899' },
  { value: 'cost', label: 'Giá vốn (trả xưởng in)', icon: '🏭', color: '#10b981' },
  { value: 'platform_fee', label: 'Phí sàn sàn TMĐT', icon: '💳', color: '#f97316' },
  { value: 'other', label: 'Chi phí khác', icon: '📦', color: '#64748b' }
];

const PRESETS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'this_week', label: 'Tuần này' },
  { value: 'last_week', label: 'Tuần trước' },
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'this_year', label: 'Năm nay' },
  { value: 'last_year', label: 'Năm trước' },
  { value: 'all', label: 'Tất cả thời gian' },
  { value: 'custom', label: '📅 Tùy chọn' }
];

export default function ChiPhiPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sumAmount, setSumAmount] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Date filter states
  const [datePreset, setDatePreset] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Search & Other filters
  const [channelFilter, setChannelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(30);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    channel: 'facebook',
    category: 'ads',
    amount: '',
    description: '',
    note: ''
  });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const calculateDateRange = useCallback((preset: string, fromVal: string, toVal: string) => {
    const now = new Date();
    const toDay = now.toISOString().slice(0, 10);
    
    const getYesterdayStr = () => {
      const y = new Date(); y.setDate(now.getDate() - 1);
      return y.toISOString().slice(0, 10);
    };

    switch (preset) {
      case 'today':
        return { from: toDay, to: toDay };
      case 'yesterday':
        const yest = getYesterdayStr();
        return { from: yest, to: yest };
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
      case 'this_year':
        return { from: `${now.getFullYear()}-01-01`, to: toDay };
      case 'last_year': {
        const y = now.getFullYear() - 1;
        return { from: `${y}-01-01`, to: `${y}-12-31` };
      }
      case 'custom':
        return { from: fromVal, to: toVal };
      case 'all':
      default:
        return { from: undefined, to: undefined };
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = calculateDateRange(datePreset, customFrom, customTo);
      const queryParams: Record<string, string> = {
        limit: String(limit),
        offset: String((page - 1) * limit)
      };
      if (from) queryParams.from = from;
      if (to) queryParams.to = to;
      if (channelFilter !== 'all') queryParams.channel = channelFilter;
      if (categoryFilter !== 'all') queryParams.category = categoryFilter;
      if (searchTerm.trim() !== '') queryParams.search = searchTerm;

      const params = new URLSearchParams(queryParams);
      const res = await fetch(`/api/admin/sale-online/expenses?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setExpenses(result.data || []);
        setTotal(result.total || 0);
        setSumAmount(result.sumAmount || 0);
      }
    } catch (e) {
      showToast('Lỗi tải dữ liệu chi phí', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, datePreset, customFrom, customTo, channelFilter, categoryFilter, searchTerm, calculateDateRange]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [datePreset, customFrom, customTo, channelFilter, categoryFilter, searchTerm]);

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) {
      showToast('Vui lòng nhập số tiền chi phí', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/admin/sale-online/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount)
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Lỗi lưu chi phí', 'error');
        return;
      }
      
      showToast('Đã ghi nhận chi phí mới ✓');
      setShowForm(false);
      setForm({
        date: today,
        channel: 'facebook',
        category: 'ads',
        amount: '',
        description: '',
        note: ''
      });
      fetchExpenses();
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Xác nhận xóa chi phí này? Thao tác này sẽ ghi nhận lại lịch sử hệ thống.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/sale-online/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Đã xóa chi phí thành công');
        fetchExpenses();
      } else {
        showToast('Không thể xóa chi phí', 'error');
      }
    } catch {
      showToast('Lỗi kết nối mạng', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const fmtFull = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  const catLabel = (val: string) => EXPENSE_CATEGORIES.find(c => c.value === val)?.label || val;
  const catColor = (val: string) => EXPENSE_CATEGORIES.find(c => c.value === val)?.color || '#64748b';
  const channelLabel = (val: string) => CHANNELS.find(c => c.value === val)?.label || val;
  const channelColor = (val: string) => CHANNELS.find(c => c.value === val)?.color || '#64748b';

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="text-red-500" size={24} /> Quản lý Chi phí
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Nhập và theo dõi các khoản chi phí phát sinh của mảng Sale Online đa kênh
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-sm"
          >
            <Plus size={14} /> Thêm chi phí mới
          </button>
          <button 
            onClick={fetchExpenses} 
            disabled={loading} 
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="glass-card bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Chọn thời gian</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button 
                key={p.value} 
                onClick={() => setDatePreset(p.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                  datePreset === p.value 
                    ? 'bg-red-500 text-white border-red-500 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-red-300 hover:text-red-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 pt-2 animate-slide-down">
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

        {/* Thanh tìm kiếm và bộ lọc nâng cao */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Tìm theo mô tả hoặc ghi chú chi phí..."
              value={localSearchTerm}
              onChange={e => setLocalSearchTerm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setSearchTerm(localSearchTerm); }}
              className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-foreground text-xs font-semibold focus:outline-none focus:border-red-500"
            />
            <button
              onClick={() => setSearchTerm(localSearchTerm)}
              className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
            >
              Tìm kiếm
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-foreground text-xs font-bold focus:outline-none focus:border-red-500"
            >
              <option value="all">Tất cả kênh</option>
              {CHANNELS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-foreground text-xs font-bold focus:outline-none focus:border-red-500"
            >
              <option value="all">Tất cả loại chi phí</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800/80 font-medium">
          <span className="text-slate-400">
            Khoảng thời gian: {calculateDateRange(datePreset, customFrom, customTo).from || 'Bắt đầu'} → {calculateDateRange(datePreset, customFrom, customTo).to || 'Hiện tại'}
          </span>
          <div className="text-right">
            Tổng chi phí kỳ này: <span className="font-black text-red-600 dark:text-red-400 text-sm ml-1">{fmtFull(sumAmount)}</span>
          </div>
        </div>
      </div>

      {/* Form Add Expense */}
      {showForm && (
        <form onSubmit={saveExpense} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-5 space-y-4 animate-scale-up">
          <h4 className="font-bold text-red-700 dark:text-red-300 text-sm flex items-center gap-1.5">
            <TrendingDown size={15} /> Nhập chi phí phát sinh mới
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Ngày chi *</label>
              <input 
                type="date" 
                required
                value={form.date} 
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-1 focus:ring-red-500" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Kênh áp dụng *</label>
              <select 
                value={form.channel} 
                onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {CHANNELS.filter(c => c.value !== 'all').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                <option value="all">🌍 Tất cả kênh chung</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Loại chi phí *</label>
              <select 
                value={form.category} 
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Số tiền chi (đ) *</label>
              <input 
                type="number" 
                min={0}
                required
                placeholder="0"
                value={form.amount} 
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-1 focus:ring-red-500" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Mô tả mục đích</label>
              <input 
                type="text"
                placeholder="VD: Trả tiền quảng cáo Facebook Ads tháng 7"
                value={form.description} 
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-1 focus:ring-red-500" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Ghi chú thêm</label>
              <input 
                type="text"
                placeholder="Phân bổ chi phí, hóa đơn, hoặc số chứng từ"
                value={form.note} 
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-1 focus:ring-red-500" 
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={13} /> Lưu chi phí
            </button>
          </div>
        </form>
      )}

      {/* Main Expenses Table */}
      <div className="glass-card bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ngày chi</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Phân loại chi phí</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kênh áp dụng</th>
                <th className="py-3 px-4 text-right font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Số tiền</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Mô tả</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Ghi chú</th>
                <th className="py-3 px-4 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-slate-350" />
                    Đang tải danh sách chi phí...
                  </td>
                </tr>
              ) : expenses.map(e => (
                <tr 
                  key={e.id} 
                  className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {e.date}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-bold" style={{ color: catColor(e.category) }}>
                    {catLabel(e.category)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-semibold" style={{ color: channelColor(e.channel) }}>
                    {channelLabel(e.channel)}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-red-600 dark:text-red-400 tabular-nums whitespace-nowrap">
                    {fmtFull(Number(e.amount))}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                    {e.description || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-medium max-w-[150px] truncate">
                    {e.note || '—'}
                  </td>
                  <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => deleteExpense(e.id)} 
                      disabled={deleting === e.id}
                      className="p-1.5 text-red-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition disabled:opacity-40"
                    >
                      {deleting === e.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && expenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">
                    <Info className="mx-auto text-slate-350 mb-2" size={32} />
                    Chưa có khoản chi phí nào ghi nhận trong khoảng thời gian này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-40 transition"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <span className="text-xs font-semibold text-slate-500">
              Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} trên {total} chi phí
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= total}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-40 transition"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Custom Toast alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white font-bold text-xs ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}>
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
