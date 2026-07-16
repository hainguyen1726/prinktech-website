'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  Order,
  ORDER_STATUS_LABELS,
  formatCurrency,
  PRODUCTS,
  getUnitPrice,
} from '@/lib/pricing';
import AdminGuard from '@/components/AdminGuard';

const renderFormattedNote = (note: string | null) => {
  if (!note) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = note.split(urlRegex);
  return (
    <div className="space-y-1 whitespace-pre-wrap break-words leading-relaxed text-xs">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          let label = "🔗 Liên kết";
          let colorClass = "text-blue-600 hover:text-blue-800 bg-blue-50 border-blue-200";
          if (part.includes('docs.google.com/spreadsheets')) {
            label = "📊 File Excel Báo giá (Google Sheet)";
            colorClass = "text-emerald-700 hover:text-emerald-800 bg-emerald-50 border-emerald-250 font-bold";
          } else if (part.includes('drive.google.com/file') || part.includes('drive.google.com/drive')) {
            if (part.toLowerCase().includes('pdf') || part.toLowerCase().includes('.pdf')) {
              label = "📄 File PDF Báo giá (Google Drive)";
              colorClass = "text-rose-600 hover:text-rose-800 bg-rose-50 border-rose-250 font-bold";
            } else {
              label = "📁 Thư mục thiết kế (Google Drive)";
              colorClass = "text-blue-600 hover:text-blue-800 bg-blue-50 border-blue-250 font-bold";
            }
          }
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm transition-all my-1 break-all hover:scale-[1.02] cursor-pointer ${colorClass}`}
            >
              {label}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const totalPages = Math.ceil(totalOrders / 20);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<'tech' | 'elegant'>('elegant');

  // States cho cập nhật vận chuyển
  const [shippingCarrierInput, setShippingCarrierInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  useEffect(() => {
    if (selectedOrder) {
      setShippingCarrierInput(selectedOrder.shipping_carrier || '');
      setTrackingNumberInput(selectedOrder.tracking_number || '');
    } else {
      setShippingCarrierInput('');
      setTrackingNumberInput('');
    }
  }, [selectedOrder]);

  // States cho Form tạo đơn hàng mới
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customerTab, setCustomerTab] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', email: '' });
  const [createFormData, setCreateFormData] = useState({
    product_type: 'cuon',
    product_label: 'In cuộn mét dài (Khổ 60cm)',
    size_label: 'Khổ 60cm',
    quantity: 200,
    meters: 1.0,
    rate_excl_vat: 134259,
    shipping_fee: 30000,
    design_link: '',
    note: '',
    order_source: 'website',
  });
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [submittingForm, setSubmittingForm] = useState(false);

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

  useEffect(() => {
    const fetchCustomersList = async () => {
      try {
        const res = await fetch('/api/customers?limit=100');
        if (res.ok) {
          const data = await res.json();
          setCustomersList(data.data || []);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách khách hàng:', err);
      }
    };
    if (showCreateForm) {
      fetchCustomersList();
    }
  }, [showCreateForm]);

  const handleProductChange = (type: string) => {
    if (type === 'other') {
      setCreateFormData(prev => ({
        product_type: 'other' as any,
        product_label: '',
        size_label: 'cái',
        quantity: 1,
        meters: 0,
        rate_excl_vat: 0,
        shipping_fee: 30000,
        design_link: '',
        note: '',
        order_source: prev.order_source || 'website',
      }));
      return;
    }

    const defaultQty = type.startsWith('tem-') ? 200 : (type === 'cuon' ? 200 : 5);
    const defaultMeters = type === 'cuon' ? 1.0 : 0;
    
    const prod = PRODUCTS.find(p => p.type === type);
    const label = prod?.label || 'In tem';
    const size = type === 'cuon' ? 'Khổ 60cm' : (type === 'a4' ? 'Tờ A4' : (type === 'a3' ? 'Tờ A3' : 'Cỡ ~5cm'));
    
    let priceInclVat = 0;
    if (type === 'cuon') {
      priceInclVat = 145000;
    } else {
      priceInclVat = getUnitPrice(prod!, defaultQty);
    }
    const priceExclVat = Math.round(priceInclVat / 1.08);

    setCreateFormData(prev => ({
      product_type: type,
      product_label: label,
      size_label: size,
      quantity: defaultQty,
      meters: defaultMeters,
      rate_excl_vat: priceExclVat,
      shipping_fee: 30000,
      design_link: '',
      note: '',
      order_source: prev.order_source || 'website',
    }));
  };

  const handleQtyChange = (qty: number) => {
    const type = createFormData.product_type;
    if (type === 'other') {
      setCreateFormData(prev => ({
        ...prev,
        quantity: qty,
      }));
      return;
    }

    const prod = PRODUCTS.find(p => p.type === type);
    if (!prod) return;

    let priceInclVat = 0;
    if (type === 'cuon') {
      priceInclVat = 145000;
    } else {
      priceInclVat = getUnitPrice(prod, qty);
    }
    const priceExclVat = Math.round(priceInclVat / 1.08);

    setCreateFormData(prev => ({
      ...prev,
      quantity: qty,
      rate_excl_vat: priceExclVat,
    }));
  };

  const handleCreateOrderSubmit = async () => {
    let customerId = selectedCustomerId;

    if (customerTab === 'new') {
      if (!newCustomer.name.trim()) {
        alert('Vui lòng nhập tên khách hàng mới.');
        return;
      }
      if (!newCustomer.phone.trim()) {
        alert('Vui lòng nhập số điện thoại khách hàng.');
        return;
      }
      if (!newCustomer.address.trim()) {
        alert('Vui lòng nhập địa chỉ giao hàng.');
        return;
      }

      setSubmittingForm(true);
      try {
        const cRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCustomer.name.trim(),
            phone: newCustomer.phone.trim(),
            address: newCustomer.address.trim(),
            email: newCustomer.email?.trim() || null,
          }),
        });

        const cData = await cRes.json();
        if (!cRes.ok) {
          throw new Error(cData.error || 'Tạo khách hàng mới thất bại');
        }
        customerId = cData.data.id;
        setCustomersList(prev => [cData.data, ...prev]);
      } catch (err: any) {
        alert(err.message || 'Lỗi tạo khách hàng');
        setSubmittingForm(false);
        return;
      }
    } else {
      if (!customerId) {
        alert('Vui lòng chọn khách hàng lẻ từ danh sách.');
        return;
      }
    }

    if (createFormData.product_type === 'other' && !createFormData.product_label.trim()) {
      alert('Vui lòng nhập tên sản phẩm custom.');
      return;
    }

    if (!createFormData.design_link?.trim()) {
      if (!confirm('Bạn chưa nhập link thiết kế chung (Google Drive). Vẫn muốn tiếp tục tạo đơn?')) {
        setSubmittingForm(false);
        return;
      }
    }

    setSubmittingForm(true);
    try {
      const res = await fetch('/api/customer-orders/create-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          product_type: createFormData.product_type,
          product_label: createFormData.product_label,
          size_label: createFormData.size_label,
          quantity: createFormData.quantity,
          meters: createFormData.product_type === 'cuon' ? createFormData.meters : undefined,
          rate_excl_vat: createFormData.rate_excl_vat,
          shipping_fee: createFormData.shipping_fee,
          note: createFormData.note,
          design_link: createFormData.design_link,
          order_source: createFormData.order_source,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Tạo đơn hàng thất bại');
      }

      alert(`Tạo đơn hàng thành công!\nMã đơn: ${result.order_code}\nĐã upload báo giá và chia sẻ Drive.`);
      
      setShowCreateForm(false);
      setNewCustomer({ name: '', phone: '', address: '', email: '' });
      setSelectedCustomerId('');
      setCreateFormData({
        product_type: 'cuon',
        product_label: 'In cuộn mét dài (Khổ 60cm)',
        size_label: 'Khổ 60cm',
        quantity: 200,
        meters: 1.0,
        rate_excl_vat: 134259,
        shipping_fee: 30000,
        design_link: '',
        note: '',
        order_source: 'website',
      });
      
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống');
    } finally {
      setSubmittingForm(false);
    }
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
        source: sourceFilter,
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
  }, [statusFilter, sourceFilter, searchTerm, page]);

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
      
      // Update state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
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
      
      // Update state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: newPayStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, payment_status: newPayStatus } : null);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleShippingUpdate = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_carrier: shippingCarrierInput || null,
          tracking_number: trackingNumberInput || null
        }),
      });
      if (!res.ok) throw new Error('Cập nhật vận chuyển thất bại');
      
      // Update state
      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        shipping_carrier: shippingCarrierInput || null, 
        tracking_number: trackingNumberInput || null 
      } : o));
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { 
          ...prev, 
          shipping_carrier: shippingCarrierInput || null, 
          tracking_number: trackingNumberInput || null 
        } : null);
      }
      alert('Cập nhật thông tin vận chuyển thành công!');
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
    <div className="w-full">

      <div className="max-w-full px-2 sm:px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">Danh Sách Đơn Hàng</h1>
            <p className="text-text-muted text-sm mt-1">
              Quản lý toàn bộ đơn hàng đặt in tem UV DTF 3D nổi của xưởng PrinK Tech.
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto text-white ${
              showCreateForm ? 'bg-[#dc2626] hover:bg-[#b91c1c]' : 'bg-[#7c3aed] hover:bg-[#6d28d9]'
            }`}
          >
            {showCreateForm ? '❌ Hủy tạo đơn' : '➕ Tạo đơn lẻ mới'}
          </button>
        </div>

        {/* Bảng tạo đơn hàng lẻ mới (Expand/Collapse) */}
        {showCreateForm && (
          <div className="rounded-2xl border border-card-border bg-white p-6 mb-6 shadow-lg space-y-6 transition-all duration-300">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                ✍️ Tạo đơn hàng mới & Tự động tạo File Báo giá
              </h2>
              <span className="text-[11px] font-bold text-purple-650 bg-purple-50 px-2.5 py-1 rounded-full">
                Đồng bộ Google Drive & Supabase
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 text-slate-900">
              
              {/* Cột trái: Khách hàng & Sản phẩm */}
              <div className="space-y-6">
                
                {/* 1. Chọn / Thêm Khách Hàng */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-card-border pb-1.5 flex items-center gap-1.5">
                    👥 Thông tin khách hàng lẻ
                  </h3>
                  
                  <div className="flex gap-2 p-1 bg-black/5 rounded-lg max-w-xs">
                    <button
                      type="button"
                      onClick={() => setCustomerTab('existing')}
                      className={`flex-1 py-1.5 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                        customerTab === 'existing'
                          ? 'bg-white text-purple-650 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Khách sẵn có
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerTab('new')}
                      className={`flex-1 py-1.5 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                        customerTab === 'new'
                          ? 'bg-white text-purple-650 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tạo khách mới
                    </button>
                  </div>

                  {customerTab === 'existing' ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">Chọn khách hàng</label>
                      <select
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-semibold focus:outline-none focus:border-purple-650"
                      >
                        <option value="">-- Chọn khách hàng lẻ từ danh sách --</option>
                        {customersList.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} - 📱 {c.phone} {c.address ? `(${c.address})` : ''}
                          </option>
                        ))}
                      </select>
                      {customersList.length === 0 && (
                        <p className="text-[11px] text-slate-500">Đang tải hoặc chưa có danh sách khách hàng lẻ.</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">Họ và tên *</label>
                        <input
                          type="text"
                          placeholder="Tên khách hàng"
                          value={newCustomer.name}
                          onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm focus:outline-none focus:border-purple-650 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">Số điện thoại *</label>
                        <input
                          type="text"
                          placeholder="SĐT liên hệ"
                          value={newCustomer.phone}
                          onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm focus:outline-none focus:border-purple-650 font-semibold"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <label className="block text-xs font-bold text-slate-600">Địa chỉ giao hàng *</label>
                        <input
                          type="text"
                          placeholder="Địa chỉ nhận hàng (ghi vào báo giá/đơn)"
                          value={newCustomer.address}
                          onChange={e => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm focus:outline-none focus:border-purple-650 font-semibold"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <label className="block text-xs font-bold text-slate-600">Email (Tùy chọn)</label>
                        <input
                          type="email"
                          placeholder="Địa chỉ email"
                          value={newCustomer.email}
                          onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm focus:outline-none focus:border-purple-650"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Chọn sản phẩm in & Số lượng */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-card-border pb-1.5 flex items-center gap-1.5">
                    🏷️ Chi tiết sản phẩm đặt in
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Loại sản phẩm in</label>
                      <select
                        value={createFormData.product_type}
                        onChange={e => handleProductChange(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-semibold focus:outline-none focus:border-purple-650"
                      >
                        {PRODUCTS.map(p => (
                          <option key={p.type} value={p.type}>
                            {p.icon} {p.label}
                          </option>
                        ))}
                        <option value="other">🎨 Khác (Tự nhập thông tin & đơn giá)</option>
                      </select>
                    </div>

                    {/* Tên sản phẩm custom nếu chọn Khác */}
                    {createFormData.product_type === 'other' && (
                      <div className="space-y-1 col-span-1 sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-600">Tên sản phẩm custom *</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: In tem phản quang 5x5cm, In bạt quảng cáo..."
                          value={createFormData.product_label}
                          onChange={e => setCreateFormData(prev => ({ ...prev, product_label: e.target.value }))}
                          className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-bold focus:outline-none focus:border-purple-650"
                        />
                      </div>
                    )}

                    {createFormData.product_type === 'other' ? (
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">Đơn vị tính (Quy cách)</label>
                        <input
                          type="text"
                          placeholder="cái, mét, tờ, tấm..."
                          value={createFormData.size_label}
                          onChange={e => setCreateFormData(prev => ({ ...prev, size_label: e.target.value }))}
                          className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-bold focus:outline-none focus:border-purple-650"
                        />
                      </div>
                    ) : null}

                    {createFormData.product_type === 'cuon' ? (
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">Nhập số mét dài *</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          value={createFormData.meters}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0.5;
                            setCreateFormData(prev => ({ ...prev, meters: val, quantity: Math.ceil(val * 200) }));
                          }}
                          className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm focus:outline-none focus:border-purple-650 font-bold"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600">Số lượng ({createFormData.product_type === 'other' ? createFormData.size_label || 'cái' : 'cái/tờ'}) *</label>
                        <input
                          type="number"
                          min="1"
                          value={createFormData.quantity}
                          onChange={e => handleQtyChange(parseInt(e.target.value) || 1)}
                          className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm focus:outline-none focus:border-purple-650 font-bold"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">
                        {createFormData.product_type === 'other' ? 'Đơn giá trước VAT (VND) *' : 'Đơn giá trước VAT (tính tự động)'}
                      </label>
                      <input
                        type={createFormData.product_type === 'other' ? 'number' : 'text'}
                        disabled={createFormData.product_type !== 'other'}
                        value={createFormData.product_type === 'other' ? createFormData.rate_excl_vat : formatCurrency(createFormData.rate_excl_vat)}
                        onChange={e => {
                          if (createFormData.product_type === 'other') {
                            setCreateFormData(prev => ({ ...prev, rate_excl_vat: parseInt(e.target.value) || 0 }));
                          }
                        }}
                        className={`w-full h-10 px-3 rounded-xl border border-card-border text-sm font-bold focus:outline-none ${
                          createFormData.product_type === 'other' ? 'bg-background text-slate-900 focus:border-purple-650' : 'bg-slate-100 text-slate-600'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Phí vận chuyển (VND)</label>
                      <input
                        type="number"
                        value={createFormData.shipping_fee}
                        onChange={e => setCreateFormData(prev => ({ ...prev, shipping_fee: parseInt(e.target.value) || 0 }))}
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-bold focus:outline-none focus:border-purple-650"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cột phải: Ghi chú, link thiết kế & Tổng cộng chi phí */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-card-border pb-1.5 flex items-center gap-1.5">
                    🔗 Liên kết & Báo giá
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Link file thiết kế (Google Drive)</label>
                      <input
                        type="text"
                        placeholder="Nhập đường dẫn Google Drive của file thiết kế"
                        value={createFormData.design_link}
                        onChange={e => setCreateFormData(prev => ({ ...prev, design_link: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-xs focus:outline-none focus:border-purple-650 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Nguồn đơn hàng *</label>
                      <select
                        value={createFormData.order_source}
                        onChange={e => setCreateFormData(prev => ({ ...prev, order_source: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-semibold focus:outline-none focus:border-purple-650"
                      >
                        <option value="website">🌐 Website</option>
                        <option value="fb">📘 Facebook (Mạng xã hội)</option>
                        <option value="shopee">🛍️ Shopee</option>
                        <option value="tiktok">🎵 Tiktok</option>
                        <option value="other">❓ Khác</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Ghi chú đơn hàng</label>
                      <textarea
                        rows={2}
                        placeholder="Ghi chú về đóng gói, ship hàng, yêu cầu VAT..."
                        value={createFormData.note}
                        onChange={e => setCreateFormData(prev => ({ ...prev, note: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-card-border bg-background text-slate-900 text-xs focus:outline-none focus:border-purple-650 resize-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Tóm tắt chi phí */}
                  <div className="bg-slate-50 border border-card-border rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1">💰 Tóm tắt chi phí báo giá</h4>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Tạm tính trước VAT:</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(
                          createFormData.product_type === 'cuon'
                            ? createFormData.rate_excl_vat * createFormData.meters
                            : createFormData.rate_excl_vat * createFormData.quantity
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>VAT (8%):</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(
                          Math.round(
                            (createFormData.product_type === 'cuon'
                              ? createFormData.rate_excl_vat * createFormData.meters
                              : createFormData.rate_excl_vat * createFormData.quantity) * 0.08
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Phí ship:</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(createFormData.shipping_fee)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-black border-t border-dashed border-slate-200 pt-2 text-purple-650">
                      <span>Tổng thanh toán (có VAT):</span>
                      <span className="tabular-nums">
                        {formatCurrency(
                          Math.round(
                            (createFormData.product_type === 'cuon'
                              ? createFormData.rate_excl_vat * createFormData.meters
                              : createFormData.rate_excl_vat * createFormData.quantity) * 1.08
                          ) + createFormData.shipping_fee
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={submittingForm}
                    onClick={handleCreateOrderSubmit}
                    className="w-full h-11 bg-purple-650 hover:bg-purple-550 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingForm ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang tạo đơn & upload Drive...
                      </>
                    ) : (
                      '🚀 Xác nhận Tạo đơn & Báo giá'
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

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
          <select
            value={sourceFilter}
            onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-semibold focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="all" className="bg-card-bg text-slate-900">Tất cả nguồn đơn</option>
            <option value="website" className="bg-card-bg text-slate-900">🌐 Website</option>
            <option value="fb" className="bg-card-bg text-slate-900">📘 Facebook</option>
            <option value="shopee" className="bg-card-bg text-slate-900">🛍️ Shopee</option>
            <option value="tiktok" className="bg-card-bg text-slate-900">🎵 Tiktok</option>
            <option value="admin" className="bg-card-bg text-slate-900">👤 Admin tạo (Chưa phân loại)</option>
            <option value="other" className="bg-card-bg text-slate-900">❓ Khác</option>
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
              <>
                {/* Mobile list view */}
                <div className="block md:hidden space-y-3">
                  {orders.map((order) => {
                    const status = ORDER_STATUS_LABELS[order.status] || { label: order.status, color: '' };
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--accent-glow)] border-[var(--accent)] font-semibold'
                            : 'bg-white border-card-border hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono font-bold text-xs text-[var(--accent)]">{order.order_number}</span>
                            <div className="mt-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                order.source === 'website' || order.source === 'web'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : order.source === 'fb' || order.source === 'facebook'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : order.source === 'shopee'
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : order.source === 'tiktok'
                                  ? 'bg-slate-50 text-slate-800 border-slate-300'
                                  : order.source === 'other' || order.source === 'khác'
                                  ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}>
                                {order.source === 'website' || order.source === 'web' ? '🌐 Website' :
                                 order.source === 'fb' || order.source === 'facebook' ? '📘 Facebook' :
                                 order.source === 'shopee' ? '🛍️ Shopee' :
                                 order.source === 'tiktok' ? '🎵 Tiktok' :
                                 order.source === 'other' || order.source === 'khác' ? '❓ Khác' : '👤 Admin tạo'}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-foreground mt-1">{order.customer_name}</h4>
                            <p className="text-xs text-text-muted mt-0.5">{order.customer_phone}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${status.color}`}>
                              {status.label}
                            </span>
                            <div className="font-extrabold text-slate-900 text-sm mt-2">{formatCurrency(order.total)}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-card-border/50 text-[10px] text-text-muted">
                          <span>{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(order.id);
                            }}
                            className="text-red-500 font-bold hover:underline"
                          >
                            Xóa đơn
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block overflow-x-auto">
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
                            <td className="py-3.5 pr-2 font-mono font-bold">
                              <span className="text-[var(--accent)]">{order.order_number}</span>
                              <div className="mt-1">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold border shadow-sm ${
                                  order.source === 'website' || order.source === 'web'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : order.source === 'fb' || order.source === 'facebook'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : order.source === 'shopee'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                                    : order.source === 'tiktok'
                                    ? 'bg-slate-50 text-slate-800 border-slate-300'
                                    : order.source === 'other' || order.source === 'khác'
                                    ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                 }`}>
                                  {order.source === 'website' || order.source === 'web' ? '🌐 Website' :
                                   order.source === 'fb' || order.source === 'facebook' ? '📘 Facebook' :
                                   order.source === 'shopee' ? '🛍️ Shopee' :
                                   order.source === 'tiktok' ? '🎵 Tiktok' :
                                   order.source === 'other' || order.source === 'khác' ? '❓ Khác' : '👤 Admin tạo'}
                                 </span>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <div className="flex flex-col gap-1 min-w-[150px]">
                                <span className="font-bold text-slate-800 text-sm leading-tight">{order.customer_name}</span>
                                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">📱 {order.customer_phone}</span>
                              </div>
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
                                className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all font-bold text-xs cursor-pointer inline-flex items-center gap-1 shadow-sm"
                              >
                                🗑️ Xóa
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
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
                      <div className="text-xs text-amber-900 bg-amber-50 rounded-xl p-3 border border-amber-200/80 mt-3 shadow-sm">
                        <div className="font-bold text-amber-800 mb-1 flex items-center gap-1">💬 Ghi chú của khách:</div>
                        <div className="font-medium">{renderFormattedNote(selectedOrder.customer_note)}</div>
                      </div>
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

                {/* Báo giá Excel / PDF (chỉ hiển thị nếu có) */}
                {((selectedOrder as any).quote_excel_url || (selectedOrder as any).quote_pdf_url) && (
                  <div className="border-b border-card-border pb-4 space-y-2">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">File Báo giá</h3>
                    <div className="flex gap-2">
                      {(selectedOrder as any).quote_excel_url && (
                        <a
                          href={(selectedOrder as any).quote_excel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 h-9 rounded-xl border border-card-border bg-block-bg hover:bg-block-bg/80 transition flex items-center justify-center text-xs text-emerald-655 font-bold"
                        >
                          📊 File Excel
                        </a>
                      )}
                      {(selectedOrder as any).quote_pdf_url && (
                        <a
                          href={(selectedOrder as any).quote_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 h-9 rounded-xl border border-card-border bg-block-bg hover:bg-block-bg/80 transition flex items-center justify-center text-xs text-rose-555 font-bold"
                        >
                          📄 File PDF
                        </a>
                      )}
                    </div>
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

                {/* Đối soát Xưởng in & Lợi nhuận gộp (Nội bộ Admin) */}
                {selectedOrder.converted_length !== undefined && selectedOrder.converted_length !== null && (
                  <div className="rounded-xl border border-dashed border-emerald-350 bg-emerald-50/20 dark:bg-emerald-950/10 p-3.5 space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                      📊 Đối soát Xưởng & Lợi nhuận ròng
                    </h4>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-text-muted">
                        <span>Mét in thực tế (Xưởng):</span>
                        <span className="font-bold text-foreground font-mono">{selectedOrder.converted_length} m</span>
                      </div>
                      <div className="flex justify-between text-text-muted">
                        <span>Giá vốn in trả xưởng (150k/m):</span>
                        <span className="font-bold text-foreground font-mono">
                          {formatCurrency(selectedOrder.converted_length * 150000)}
                        </span>
                      </div>
                      <div className="flex justify-between text-text-muted">
                        <span>Phí ship khách trả:</span>
                        <span className="font-bold text-foreground font-mono">
                          {formatCurrency(selectedOrder.shipping_fee)}
                        </span>
                      </div>
                      <div className="flex justify-between text-text-muted">
                        <span>Phí đóng gói định mức:</span>
                        <span className="font-bold text-foreground font-mono">
                          {formatCurrency(5000)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-emerald-250 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                        <span>Lợi nhuận ròng tạm tính:</span>
                        <span className="font-mono">
                          {formatCurrency(
                            selectedOrder.total - 
                            (selectedOrder.converted_length * 150000) - 
                            5000
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shipping Details Update (Admin controls) */}
                <div className="border-b border-card-border pb-4 space-y-3">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Vận chuyển & Giao nhận</h3>
                  
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Đơn vị vận chuyển</label>
                      <select
                        value={shippingCarrierInput}
                        onChange={e => setShippingCarrierInput(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:border-[var(--accent)]"
                      >
                        <option value="">⚡ Chưa chọn đơn vị vận chuyển</option>
                        <option value="ghtk">Giao Hàng Tiết Kiệm (GHTK)</option>
                        <option value="viettelpost">Viettel Post</option>
                        <option value="spx">SPX Express (Shopee Express)</option>
                        <option value="ahamove">Ahamove</option>
                        <option value="grab">Grab Express</option>
                        <option value="self_pickup">Khách tự lấy tại xưởng</option>
                        <option value="other">Vận chuyển khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Mã vận đơn</label>
                      <input
                        type="text"
                        value={trackingNumberInput}
                        onChange={e => setTrackingNumberInput(e.target.value)}
                        placeholder="Nhập mã vận đơn (VD: GHTK...)"
                        className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:border-[var(--accent)]"
                      />
                      {selectedOrder.tracking_number && (
                        <div className="text-[11px] font-medium text-text-muted mt-1.5 flex items-center gap-1">
                          <span>Tra cứu: </span>
                          {selectedOrder.shipping_carrier === 'ghtk' && (
                            <a
                              href={`https://i.ghtk.vn/${selectedOrder.tracking_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline font-bold"
                            >
                              🔗 GHTK ({selectedOrder.tracking_number})
                            </a>
                          )}
                          {selectedOrder.shipping_carrier === 'viettelpost' && (
                            <a
                              href={`https://viettelpost.com.vn/tra-cuu-hanh-trinh-don-hang?billCode=${selectedOrder.tracking_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline font-bold"
                            >
                              🔗 Viettel Post ({selectedOrder.tracking_number})
                            </a>
                          )}
                          {selectedOrder.shipping_carrier === 'spx' && (
                            <a
                              href="https://spx.vn/vi"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline font-bold"
                            >
                              🔗 SPX Express ({selectedOrder.tracking_number})
                            </a>
                          )}
                          {['ghtk', 'viettelpost', 'spx'].indexOf(selectedOrder.shipping_carrier || '') === -1 && (
                            <span className="font-bold text-foreground">{selectedOrder.tracking_number}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleShippingUpdate(selectedOrder.id)}
                      disabled={updatingId === selectedOrder.id}
                      className="w-full h-9 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      📦 Cập nhật vận chuyển
                    </button>
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
