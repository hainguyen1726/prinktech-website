'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Phone,
  MapPin,
  Package,
  ExternalLink,
  Plus,
  Clock,
  Truck,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  User,
  Eye,
  RefreshCw,
  Edit2,
  Check,
  X,
} from 'lucide-react';

interface OrderHistoryItem {
  id: string;
  order_id: string;
  event_type: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  description: string;
  created_by: string;
  created_at: string;
}

interface CustomerOrder {
  id: string;
  order_number: string;
  customer_id: string;
  sticker_type: string;
  quantity_items?: number;
  quantity_meters?: number;
  items?: any[];
  design_link?: string;
  nesting_image_url?: string;
  preview_image_url?: string;
  quote_excel_url?: string;
  quote_pdf_url?: string;
  label_link?: string;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  unit_price_per_meter?: number;
  shipping_method: string;
  shipping_carrier?: string;
  tracking_code?: string;
  shipping_address?: string;
  status: string;
  payment_status: string;
  source: string;
  notes?: string;
  nesting_notes?: string;
  created_at: string;
  updated_at: string;
  history?: OrderHistoryItem[];
}

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  source: string;
  customer_type: string;
  notes?: string;
  total_orders: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
  orders?: CustomerOrder[];
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ xác nhận', color: '#f59e0b', bg: '#fef3c7' },
  confirmed: { label: 'Đã xác nhận', color: '#3b82f6', bg: '#dbeafe' },
  designing: { label: 'Đang thiết kế', color: '#8b5cf6', bg: '#ede9fe' },
  printing: { label: 'Đang in', color: '#f97316', bg: '#ffedd5' },
  packing: { label: 'Đang đóng gói', color: '#06b6d4', bg: '#cffafe' },
  shipped: { label: 'Đã giao ship', color: '#10b981', bg: '#d1fae5' },
  delivered: { label: 'Đã hoàn thành', color: '#059669', bg: '#a7f3d0' },
  cancelled: { label: 'Đã hủy', color: '#ef4444', bg: '#fee2e2' },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Chưa thanh toán', color: '#ef4444' },
  partial: { label: 'Đặt cọc 1 phần', color: '#f59e0b' },
  paid: { label: 'Đã thanh toán', color: '#10b981' },
  refunded: { label: 'Đã hoàn tiền', color: '#6b7280' },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTheme, setActiveTheme] = useState<'tech' | 'elegant'>('elegant');

  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [activeOrderTabs, setActiveOrderTabs] = useState<Record<string, 'details' | 'items' | 'links' | 'history'>>({});

  // Inline edit state tracking
  const [editingTracking, setEditingTracking] = useState<Record<string, string>>({});
  const [savingOrder, setSavingOrder] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const savedTheme = localStorage.getItem('prinktech-theme') || 'elegant';
    const finalTheme = savedTheme === 'creative' ? 'elegant' : savedTheme;
    setActiveTheme(finalTheme as any);
    document.documentElement.classList.remove('theme-tech', 'theme-creative');
    document.body.classList.remove('theme-tech', 'theme-creative');
    if (finalTheme === 'tech') {
      document.documentElement.classList.add('theme-tech');
      document.body.classList.add('theme-tech');
    }
  }, []);

  const changeTheme = (theme: 'tech' | 'elegant') => {
    setActiveTheme(theme);
    localStorage.setItem('prinktech-theme', theme);
    document.documentElement.classList.remove('theme-tech', 'theme-creative');
    document.body.classList.remove('theme-tech', 'theme-creative');
    if (theme === 'tech') {
      document.documentElement.classList.add('theme-tech');
      document.body.classList.add('theme-tech');
    }
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        page: String(page),
        limit: '20',
      });
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error('Không thể tải danh sách khách hàng');
      const data = await res.json();
      setCustomers(data.data || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const toggleCustomer = async (customerId: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
      // Fetch details if not already loaded with orders
      const cust = customers.find(c => c.id === customerId);
      if (cust && !cust.orders) {
        try {
          const res = await fetch(`/api/customers/${customerId}`);
          if (res.ok) {
            const data = await res.json();
            setCustomers(prev =>
              prev.map(c => (c.id === customerId ? { ...c, orders: data.orders || [] } : c))
            );
          }
        } catch (err) {
          console.error('Lỗi tải đơn hàng của khách:', err);
        }
      }
    }
    setExpandedCustomers(newExpanded);
  };

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const setOrderTab = (orderId: string, tab: 'details' | 'items' | 'links' | 'history') => {
    setActiveOrderTabs(prev => ({ ...prev, [orderId]: tab }));
  };

  const handleUpdateOrderField = async (orderId: string, customerId: string, payload: Record<string, any>) => {
    setSavingOrder(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`/api/customer-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Cập nhật thất bại');
      
      // Refetch customer details to refresh status & history
      const custRes = await fetch(`/api/customers/${customerId}`);
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(prev =>
          prev.map(c => (c.id === customerId ? { ...c, orders: custData.orders || [] } : c))
        );
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingOrder(prev => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <div className="admin-panel min-h-screen bg-[#f1f5f9] text-slate-900 transition-colors duration-300">
      {/* Header Admin Nav */}
      <nav className="sticky top-0 z-40 border-b border-card-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-text-muted hover:text-foreground transition-colors text-sm">
              ← Trang chủ
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-foreground font-semibold text-sm">Quản lý Khách hàng & Đơn hàng</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-black/10 border border-card-border rounded-lg p-1 backdrop-blur-sm">
              <button
                onClick={() => changeTheme('tech')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                  activeTheme === 'tech'
                    ? 'bg-purple-650 text-white shadow-md'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                Tối
              </button>
              <button
                onClick={() => changeTheme('elegant')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                  activeTheme === 'elegant'
                    ? 'bg-amber-700 text-white shadow-md'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                Sáng
              </button>
            </div>

            <Link
              href="/admin/don-hang"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-card-border text-foreground hover:bg-block-bg hover:text-[var(--accent)] transition-all cursor-pointer"
            >
              📦 Đơn Web
            </Link>
            <Link
              href="/admin/website"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-card-border text-foreground hover:bg-block-bg hover:text-[var(--accent)] transition-all cursor-pointer"
            >
              🖥️ Website
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">Danh Sách Khách Hàng</h1>
            <p className="text-text-muted text-sm mt-1">
              Quản lý khách hàng, theo dõi các đơn đặt in riêng, gắn link Drive và lịch sử xử lý.
            </p>
          </div>
          <button
            onClick={() => alert('Chức năng thêm mới khách hàng trực tiếp đang được cập nhật')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:opacity-90 transition-all cursor-pointer shadow-md self-start md:self-auto"
          >
            <Plus size={16} /> Thêm khách hàng
          </button>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-4 mb-6 flex flex-col sm:flex-row gap-3 shadow-sm">
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên khách hàng, số điện thoại..."
              value={localSearchTerm}
              onChange={e => setLocalSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setSearchTerm(localSearchTerm);
                  setPage(1);
                }
              }}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)] font-semibold"
            />
          </div>
          <button
            onClick={() => {
              setSearchTerm(localSearchTerm);
              setPage(1);
            }}
            className="h-10 px-5 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-all cursor-pointer"
          >
            Tìm kiếm
          </button>
        </div>

        {/* State feedback */}
        {loading && (
          <div className="text-center py-12 text-text-muted flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin" size={18} /> Đang tải danh sách khách hàng...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-6">
            Lỗi: {error}
          </div>
        )}

        {!loading && customers.length === 0 && (
          <div className="text-center py-12 border border-dashed border-card-border rounded-2xl bg-card-bg text-text-muted">
            Chưa tìm thấy khách hàng nào.
          </div>
        )}

        {/* Customer List Expandable */}
        <div className="space-y-4">
          {customers.map(customer => {
            const isExpanded = expandedCustomers.has(customer.id);
            return (
              <div
                key={customer.id}
                className="rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden transition-all"
              >
                {/* Header row */}
                <div
                  onClick={() => toggleCustomer(customer.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-black/5 gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 p-1">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                      {customer.name ? customer.name[0].toUpperCase() : 'K'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-base">{customer.name}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {customer.customer_code}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted flex flex-wrap items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {customer.phone}
                        </span>
                        {customer.address && (
                          <span className="flex items-center gap-1 truncate max-w-[300px]">
                            <MapPin size={12} /> {customer.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs text-text-muted">Tổng tích lũy</div>
                      <div className="font-extrabold text-foreground text-sm">
                        {formatCurrency(customer.total_spent)}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                      {customer.total_orders || (customer.orders ? customer.orders.length : 0)} đơn
                    </span>
                  </div>
                </div>

                {/* Expanded Orders List */}
                {isExpanded && (
                  <div className="border-t border-card-border bg-background/50 p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Danh Sách Đơn Hàng ({customer.orders ? customer.orders.length : 0})
                      </h3>
                    </div>

                    {!customer.orders && (
                      <div className="py-4 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                        <RefreshCw className="animate-spin" size={14} /> Đang nạp đơn hàng...
                      </div>
                    )}

                    {customer.orders && customer.orders.length === 0 && (
                      <div className="py-4 text-center text-xs text-text-muted italic">
                        Khách hàng này chưa có đơn hàng nào lưu trong hệ thống.
                      </div>
                    )}

                    {customer.orders &&
                      customer.orders.map(order => {
                        const isOrderExpanded = expandedOrders.has(order.id);
                        const activeTab = activeOrderTabs[order.id] || 'details';
                        const statusConfig = ORDER_STATUS_CONFIG[order.status] || {
                          label: order.status,
                          color: '#6b7280',
                          bg: '#f3f4f6',
                        };
                        const payConfig = PAYMENT_STATUS_CONFIG[order.payment_status] || {
                          label: order.payment_status,
                          color: '#6b7280',
                        };

                        return (
                          <div
                            key={order.id}
                            className="rounded-xl border border-card-border bg-card-bg overflow-hidden shadow-sm transition-all"
                          >
                            {/* Order Header Summary */}
                            <div
                              onClick={() => toggleOrder(order.id)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 cursor-pointer hover:bg-black/5 gap-2"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400">
                                  {isOrderExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-sm text-foreground">
                                      {order.order_number}
                                    </span>
                                    <span
                                      className="px-2 py-0.5 rounded text-[11px] font-bold"
                                      style={{ color: statusConfig.color, backgroundColor: statusConfig.bg }}
                                    >
                                      {statusConfig.label}
                                    </span>
                                    <span
                                      className="text-[11px] font-bold px-1.5 py-0.5 rounded border border-current"
                                      style={{ color: payConfig.color }}
                                    >
                                      {payConfig.label}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-text-muted mt-0.5">
                                    Ngày tạo: {formatDate(order.created_at)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 self-end sm:self-auto">
                                <div className="text-right">
                                  <span className="text-xs text-text-muted">Tổng thanh toán: </span>
                                  <span className="font-extrabold text-foreground text-sm">
                                    {formatCurrency(order.total)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Order Expanded Body */}
                            {isOrderExpanded && (
                              <div className="border-t border-card-border bg-card-bg">
                                {/* Navigation Tabs */}
                                <div className="flex border-b border-card-border bg-black/5 text-xs font-bold">
                                  <button
                                    onClick={() => setOrderTab(order.id, 'details')}
                                    className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                                      activeTab === 'details'
                                        ? 'border-[var(--accent)] text-[var(--accent)] bg-card-bg'
                                        : 'border-transparent text-text-muted hover:text-foreground'
                                    }`}
                                  >
                                    📋 Chi Tiết
                                  </button>
                                  <button
                                    onClick={() => setOrderTab(order.id, 'items')}
                                    className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                                      activeTab === 'items'
                                        ? 'border-[var(--accent)] text-[var(--accent)] bg-card-bg'
                                        : 'border-transparent text-text-muted hover:text-foreground'
                                    }`}
                                  >
                                    🏷️ Sản Phẩm ({order.items ? order.items.length : 0})
                                  </button>
                                  <button
                                    onClick={() => setOrderTab(order.id, 'links')}
                                    className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                                      activeTab === 'links'
                                        ? 'border-[var(--accent)] text-[var(--accent)] bg-card-bg'
                                        : 'border-transparent text-text-muted hover:text-foreground'
                                    }`}
                                  >
                                    🔗 Links Tài Liệu
                                  </button>
                                  <button
                                    onClick={() => setOrderTab(order.id, 'history')}
                                    className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                                      activeTab === 'history'
                                        ? 'border-[var(--accent)] text-[var(--accent)] bg-card-bg'
                                        : 'border-transparent text-text-muted hover:text-foreground'
                                    }`}
                                  >
                                    📜 Lịch Sử ({order.history ? order.history.length : 0})
                                  </button>
                                </div>

                                {/* TAB 1: DETAILS */}
                                {activeTab === 'details' && (
                                  <div className="p-4 space-y-4 text-xs">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2 border border-card-border p-3 rounded-xl bg-background/50">
                                        <div className="font-bold text-slate-800 border-b border-card-border pb-1">
                                          Cập Nhật Trạng Thái
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-text-muted">Trạng thái đơn:</span>
                                          <select
                                            value={order.status}
                                            onChange={e =>
                                              handleUpdateOrderField(order.id, customer.id, {
                                                status: e.target.value,
                                              })
                                            }
                                            disabled={savingOrder[order.id]}
                                            className="font-bold px-2 py-1 rounded border border-card-border bg-card-bg"
                                          >
                                            {Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => (
                                              <option key={k} value={k}>
                                                {v.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="flex items-center justify-between">
                                          <span className="text-text-muted">Thanh toán:</span>
                                          <select
                                            value={order.payment_status}
                                            onChange={e =>
                                              handleUpdateOrderField(order.id, customer.id, {
                                                payment_status: e.target.value,
                                              })
                                            }
                                            disabled={savingOrder[order.id]}
                                            className="font-bold px-2 py-1 rounded border border-card-border bg-card-bg"
                                          >
                                            {Object.entries(PAYMENT_STATUS_CONFIG).map(([k, v]) => (
                                              <option key={k} value={k}>
                                                {v.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                          <span className="text-text-muted">Mã vận đơn:</span>
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="text"
                                              placeholder="Nhập mã vận đơn..."
                                              defaultValue={order.tracking_code || ''}
                                              onBlur={e => {
                                                if (e.target.value !== (order.tracking_code || '')) {
                                                  handleUpdateOrderField(order.id, customer.id, {
                                                    tracking_code: e.target.value.trim(),
                                                  });
                                                }
                                              }}
                                              className="px-2 py-1 rounded border border-card-border bg-card-bg font-mono w-32"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-2 border border-card-border p-3 rounded-xl bg-background/50">
                                        <div className="font-bold text-slate-800 border-b border-card-border pb-1">
                                          Địa Chỉ & Vận Chuyển
                                        </div>
                                        <div>
                                          <span className="text-text-muted">Địa chỉ nhận: </span>
                                          <span className="font-semibold">{order.shipping_address || customer.address}</span>
                                        </div>
                                        <div>
                                          <span className="text-text-muted">Hình thức ship: </span>
                                          <span className="font-semibold uppercase">{order.shipping_method}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-card-border">
                                          <span>Tiền hàng: {formatCurrency(order.subtotal)}</span>
                                          <span>Phí ship: {formatCurrency(order.shipping_fee)}</span>
                                        </div>
                                        <div className="text-right font-extrabold text-sm text-[var(--accent)]">
                                          Tổng cộng: {formatCurrency(order.total)}
                                        </div>
                                      </div>
                                    </div>

                                    {order.notes && (
                                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-800">
                                        <span className="font-bold">Ghi chú đơn hàng: </span> {order.notes}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* TAB 2: ITEMS */}
                                {activeTab === 'items' && (
                                  <div className="p-4 text-xs">
                                    {order.items && order.items.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                          <thead>
                                            <tr className="border-b border-card-border text-text-muted font-bold">
                                              <th className="py-2 px-3">Tên sản phẩm / Tem</th>
                                              <th className="py-2 px-3">Kích thước</th>
                                              <th className="py-2 px-3 text-center">Số lượng</th>
                                              <th className="py-2 px-3 text-right">Đơn giá</th>
                                              <th className="py-2 px-3 text-right">Thành tiền</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {order.items.map((item: any, idx: number) => (
                                              <tr key={idx} className="border-b border-card-border/50">
                                                <td className="py-2 px-3 font-semibold">{item.name || item.title || `Sản phẩm #${idx+1}`}</td>
                                                <td className="py-2 px-3">{item.size || item.dimensions || '-'}</td>
                                                <td className="py-2 px-3 text-center font-bold">{item.quantity || item.qty}</td>
                                                <td className="py-2 px-3 text-right">{formatCurrency(item.unit_price || item.price || 0)}</td>
                                                <td className="py-2 px-3 text-right font-bold">{formatCurrency((item.quantity || 1) * (item.unit_price || item.price || 0))}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="text-text-muted italic py-4 text-center">
                                        Chưa có chi tiết danh sách từng con tem trong đơn này.
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* TAB 3: LINKS */}
                                {activeTab === 'links' && (
                                  <div className="p-4 space-y-2 text-xs">
                                    {[
                                      { label: '📁 Thư mục Google Drive thiết kế', url: order.design_link },
                                      { label: '🖼️ Ảnh dàn trang cuộn in thực tế', url: order.nesting_image_url },
                                      { label: '👁️ Ảnh preview sản phẩm', url: order.preview_image_url },
                                      { label: '📊 File Excel Báo giá', url: order.quote_excel_url },
                                      { label: '📄 File PDF Báo giá', url: order.quote_pdf_url },
                                      { label: '🏷️ File Label dán thùng hàng', url: order.label_link },
                                    ].map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-2.5 rounded-lg border border-card-border bg-background/50"
                                      >
                                        <span className="font-semibold text-foreground">{item.label}</span>
                                        {item.url ? (
                                          <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[var(--accent)] font-bold hover:underline"
                                          >
                                            Mở link <ExternalLink size={12} />
                                          </a>
                                        ) : (
                                          <span className="text-text-muted italic">Chưa gắn link</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* TAB 4: HISTORY */}
                                {activeTab === 'history' && (
                                  <div className="p-4 space-y-3 text-xs">
                                    {order.history && order.history.length > 0 ? (
                                      <div className="space-y-2 border-l-2 border-purple-500/30 pl-3">
                                        {order.history.map(hist => (
                                          <div key={hist.id} className="relative pb-2">
                                            <div className="font-semibold text-foreground">{hist.description}</div>
                                            <div className="text-[10px] text-text-muted flex items-center gap-2">
                                              <span>{formatDate(hist.created_at)}</span>
                                              <span>• bởi {hist.created_by}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-text-muted italic py-4 text-center">
                                        Chưa có lịch sử cập nhật cho đơn hàng này.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
