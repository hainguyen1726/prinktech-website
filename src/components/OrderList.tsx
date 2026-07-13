'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  Order,
  ORDER_STATUS_LABELS,
  formatCurrency,
} from '@/lib/pricing';

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const totalPages = Math.ceil(totalOrders / 20);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<'tech' | 'elegant'>('elegant');

  // Helper cho phân trang thu gọn thông minh
  const getPageNumbers = (currentPage: number, totalPages: number): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };


  // Load theme từ localStorage
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

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchTerm,
        page: String(page),
        limit: '20',
      });
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Không thể tải danh sách đơn hàng');
      }
      const data = await res.json();
      setOrders(data.data || []);
      setTotalOrders(data.total || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = () => {
    setSearchTerm(localSearchTerm);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };


  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Cập nhật thất bại');
      const updated = await res.json();
      
      // Update state
      setOrders(prev => prev.map(o => o.id === orderId ? updated.data : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated.data);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePaymentStatusChange = async (orderId: string, newPayStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newPayStatus }),
      });
      if (!res.ok) throw new Error('Cập nhật thất bại');
      const updated = await res.json();
      
      // Update state
      setOrders(prev => prev.map(o => o.id === orderId ? updated.data : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated.data);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="admin-panel min-h-screen bg-[#f1f5f9] text-slate-900 transition-colors duration-300">
      {/* Header Admin Nav */}
      <nav className="sticky top-0 z-40 border-b border-card-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/website" className="text-text-muted hover:text-foreground transition-colors text-sm font-semibold">
              ← Trang Admin
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-foreground font-semibold text-sm">Admin Quản lý đơn hàng</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
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
              href="/admin/khach-hang"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-card-border text-foreground hover:bg-block-bg hover:text-[var(--accent)] transition-all cursor-pointer"
            >
              👥 Khách hàng & Đơn
            </Link>
            <Link
              href="/admin/website"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-card-border text-foreground hover:bg-block-bg hover:text-[var(--accent)] transition-all cursor-pointer"
            >
              🖥️ Quản lý Website
            </Link>
            <Link
              href="/admin/viet-bai"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-card-border text-foreground hover:bg-block-bg hover:text-[var(--accent)] transition-all cursor-pointer"
            >
              ✍️ Viết bài mới
            </Link>
            <Link
              href="/bao-gia"
              className="hidden sm:inline-block px-3.5 py-1.5 rounded-xl text-xs font-bold border border-card-border text-text-muted hover:bg-block-bg transition-all"
            >
              Báo giá
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">Danh Sách Đơn Hàng</h1>
            <p className="text-text-muted text-sm mt-1">
              Quản lý toàn bộ đơn hàng đặt in tem UV DTF 3D nổi của xưởng PrinK Tech.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-4 mb-6 flex flex-col sm:flex-row gap-3 shadow-sm">
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, hoặc mã đơn..."
              value={localSearchTerm}
              onChange={e => setLocalSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)] font-semibold"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-semibold focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="all" className="bg-card-bg text-slate-900">Tất cả trạng thái</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-card-bg text-slate-900">{v.label}</option>
            ))}
          </select>
          <button
            onClick={handleSearchSubmit}
            className="h-10 px-5 rounded-xl bg-purple-650 hover:bg-purple-550 text-white text-sm font-bold transition-all shrink-0 cursor-pointer"
          >
            Lọc / Tìm kiếm
          </button>
        </div>


        {/* Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          
          {/* Main List */}
          <div className="rounded-2xl border border-card-border bg-card-bg p-5 overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 text-center">
                <span className="inline-block w-8 h-8 border-4 border-purple-500/30 border-t-purple-550 rounded-full animate-spin" />
                <p className="text-text-muted mt-2 text-sm">Đang tải đơn hàng...</p>
              </div>
            ) : error ? (
              <div className="py-10 text-center text-red-400">
                <p>⚠ {error}</p>
                <button onClick={fetchOrders} className="mt-4 px-4 py-2 bg-block-bg rounded-xl text-sm text-text-muted font-bold">Tải lại</button>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-20 text-center text-text-muted text-sm font-medium">
                Không tìm thấy đơn hàng nào khớp với bộ lọc.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-card-border text-xs uppercase tracking-wider text-text-muted">
                      <th className="pb-3 pr-2 font-bold">Mã đơn</th>
                      <th className="pb-3 font-bold">Khách hàng</th>
                      <th className="pb-3 text-right font-bold">Tổng tiền</th>
                      <th className="pb-3 text-center font-bold">Trạng thái</th>
                      <th className="pb-3 text-right font-bold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, i) => {
                      const status = ORDER_STATUS_LABELS[order.status] || { label: order.status, color: '' };
                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`border-b border-card-border/40 last:border-0 hover:bg-block-bg transition-colors cursor-pointer
                            ${selectedOrder?.id === order.id ? 'bg-[var(--accent-glow)] font-semibold' : i % 2 === 1 ? 'bg-block-bg/20' : ''}`}
                        >
                          <td className="py-3.5 pr-2 font-mono font-bold text-[var(--accent)]">
                            {order.order_number}
                          </td>
                          <td className="py-3.5">
                            <p className="font-semibold text-foreground">{order.customer_name}</p>
                            <p className="text-xs text-text-muted font-medium">{order.customer_phone}</p>
                          </td>
                          <td className="py-3.5 text-right font-bold text-foreground tabular-nums">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="py-3.5 text-right" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="text-xs text-text-muted hover:text-red-400 transition-colors p-1 cursor-pointer font-semibold"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalOrders > 20 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-card-border text-xs text-text-muted font-medium gap-3">
                <span>Hiển thị {(page - 1) * 20 + 1} - {Math.min(page * 20, totalOrders)} trong tổng số {totalOrders} đơn hàng</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-card-border hover:bg-block-bg disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {getPageNumbers(page, totalPages).map((pNo, i) => (
                    <button
                      key={i}
                      disabled={pNo === '...'}
                      onClick={() => typeof pNo === 'number' && setPage(pNo)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                        pNo === '...' ? 'cursor-default text-text-muted/40 bg-transparent' : 'cursor-pointer'
                      } ${
                        page === pNo 
                          ? 'bg-purple-650 text-white shadow-sm font-bold border-transparent' 
                          : pNo === '...' ? 'border-transparent' : 'border border-card-border hover:bg-block-bg'
                      }`}
                    >
                      {pNo}
                    </button>
                  ))}
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-card-border hover:bg-block-bg disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Detail panel */}
          <div className="lg:sticky lg:top-20">
            {selectedOrder ? (
              <div className="rounded-2xl border border-card-border bg-card-bg p-5 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Chi tiết đơn hàng
                  </h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs text-text-muted hover:text-foreground font-bold transition-colors cursor-pointer"
                  >
                    Đóng [x]
                  </button>
                </div>

                <div className="border-b border-card-border pb-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted font-medium">Mã đơn</span>
                    <span className="font-mono font-bold text-[var(--accent)]">{selectedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted font-medium">Ngày đặt</span>
                    <span className="text-foreground font-semibold">
                      {new Date(selectedOrder.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="border-b border-card-border pb-4 space-y-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Khách hàng</h3>
                  <div className="text-sm">
                    <p className="font-bold text-foreground">{selectedOrder.customer_name}</p>
                    <p className="text-text-muted mt-1 font-semibold">📞 {selectedOrder.customer_phone}</p>
                    <p className="text-text-muted mt-1 font-medium">📍 {selectedOrder.customer_address}</p>
                    {selectedOrder.customer_email && <p className="text-text-muted mt-1 font-medium">✉ {selectedOrder.customer_email}</p>}
                    {selectedOrder.customer_note && (
                      <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg p-2.5 border border-amber-500/25 mt-2 font-medium">
                        💬 <strong>Ghi chú:</strong> {selectedOrder.customer_note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Product List */}
                <div className="border-b border-card-border pb-4 space-y-3">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Sản phẩm đặt in</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, i) => (
                      <div key={i} className="text-xs p-2.5 rounded-lg bg-block-bg border border-card-border space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-foreground">{item.product_label}</span>
                          <span className="font-bold text-[var(--accent)] tabular-nums">{formatCurrency(item.subtotal)}</span>
                        </div>
                        <p className="text-text-muted font-medium">
                          {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
                        </p>
                        {item.note && <p className="text-text-muted italic">Ghi chú: {item.note}</p>}
                        
                        {/* File Links */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.image_url && (
                            <a
                              href={item.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-2.5 py-0.5 rounded bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] font-semibold transition border border-[var(--accent)]/20"
                            >
                              🖼 Xem ảnh mẫu
                            </a>
                          )}
                          {item.design_url && (
                            <a
                              href={item.design_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-2.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-semibold transition border border-blue-550/20"
                            >
                              📁 Tải file thiết kế
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Design File (Global) */}
                {selectedOrder.design_url && (
                  <div className="border-b border-card-border pb-4">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">File thiết kế chung</h3>
                    <a
                      href={selectedOrder.design_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-9 rounded-xl border border-card-border bg-block-bg hover:bg-block-bg/80 transition flex items-center justify-center text-xs text-blue-500 font-bold"
                    >
                      📁 Mở link file thiết kế
                    </a>
                  </div>
                )}

                {/* Billing Summary */}
                <div className="border-b border-card-border pb-4 space-y-2">
                  <div className="flex justify-between text-xs text-text-muted font-medium">
                    <span>Tạm tính</span>
                    <span className="tabular-nums text-foreground font-semibold">{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-muted font-medium">
                    <span>Phí ship</span>
                    <span className="tabular-nums text-foreground font-semibold">
                      {selectedOrder.free_shipping ? 'Miễn phí' : formatCurrency(selectedOrder.shipping_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span className="text-foreground">Tổng cộng</span>
                    <span className="text-[var(--accent)] tabular-nums">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* Order actions (Status Update) */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1.5">Cập nhật trạng thái đơn</label>
                    <select
                      value={selectedOrder.status}
                      disabled={updatingId === selectedOrder.id}
                      onChange={e => handleStatusChange(selectedOrder.id, e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-foreground text-sm font-semibold focus:outline-none focus:border-[var(--accent)]"
                    >
                      {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k} className="bg-card-bg text-foreground">{v.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1.5">Cập nhật thanh toán</label>
                    <select
                      value={selectedOrder.payment_status}
                      disabled={updatingId === selectedOrder.id}
                      onChange={e => handlePaymentStatusChange(selectedOrder.id, e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-foreground text-sm font-semibold focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="unpaid" className="bg-card-bg text-foreground">❌ Chưa thanh toán</option>
                      <option value="paid" className="bg-card-bg text-foreground">✅ Đã thanh toán</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-card-border p-10 text-center text-text-muted text-sm font-semibold bg-block-bg/50">
                Chọn một đơn hàng để xem chi tiết
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
