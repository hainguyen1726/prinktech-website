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
import AdminGuard from '@/components/AdminGuard';
import { PRODUCTS, getUnitPrice } from '@/lib/pricing';

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
  unpaid: { label: 'Chưa thu', color: '#ef4444' },
  partial: { label: 'Cọc 1 phần', color: '#f59e0b' },
  paid: { label: 'Đã thu', color: '#10b981' },
  refunded: { label: 'Hoàn tiền', color: '#6b7280' },
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
  
  const [activeCreateForm, setActiveCreateForm] = useState<string | null>(null);
  const [createFormData, setCreateFormData] = useState({
    product_type: 'cuon',
    product_label: 'In cuộn khổ 60cm',
    size_label: 'Khổ 60cm',
    quantity: 200,
    meters: 1.0,
    rate_excl_vat: 134259,
    shipping_fee: 30000,
    design_link: '',
    note: '',
  });
  const [submittingOrder, setSubmittingOrder] = useState<string | null>(null);

  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [activeOrderTabs, setActiveOrderTabs] = useState<Record<string, 'details' | 'items' | 'links' | 'history'>>({});
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

  const handleProductChange = (type: string) => {
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

    setCreateFormData({
      product_type: type,
      product_label: label,
      size_label: size,
      quantity: defaultQty,
      meters: defaultMeters,
      rate_excl_vat: priceExclVat,
      shipping_fee: 30000,
      design_link: '',
      note: '',
    });
  };

  const handleQtyChange = (qty: number) => {
    const type = createFormData.product_type;
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

  const handleCreateOrderSubmit = async (customerId: string) => {
    if (!createFormData.design_link?.trim()) {
      if (!confirm('Bạn chưa nhập link thiết kế chung (Google Drive). Vẫn muốn tiếp tục tạo đơn?')) {
        return;
      }
    }

    setSubmittingOrder(customerId);
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
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Tạo đơn hàng thất bại');
      }

      alert(`Tạo đơn hàng thành công!\nMã đơn: ${result.order_code}\nĐã upload báo giá và chia sẻ Drive.`);
      
      setActiveCreateForm(null);
      
      const custRes = await fetch(`/api/customers/${customerId}`);
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(prev =>
          prev.map(c => (c.id === customerId ? { ...c, orders: custData.orders || [] } : c))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống');
    } finally {
      setSubmittingOrder(null);
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

  // Helper render order detail block for both desktop & mobile to reduce code duplication
  const renderOrderDetailBlock = (order: CustomerOrder, customer: Customer) => {
    const activeTab = activeOrderTabs[order.id] || 'details';
    return (
      <div className="border-t border-slate-200 bg-white">
        {/* Order Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 text-[11px] font-bold">
          <button
            onClick={() => setOrderTab(order.id, 'details')}
            className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'border-amber-700 text-amber-700 bg-white font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            📋 Chi Tiết
          </button>
          <button
            onClick={() => setOrderTab(order.id, 'items')}
            className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'items'
                ? 'border-amber-700 text-amber-700 bg-white font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            🏷️ Mẫu Tem ({order.items ? order.items.length : 0})
          </button>
          <button
            onClick={() => setOrderTab(order.id, 'links')}
            className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'links'
                ? 'border-amber-700 text-amber-700 bg-white font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            🔗 Drive / PDF / Excel
          </button>
          <button
            onClick={() => setOrderTab(order.id, 'history')}
            className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-700 text-amber-700 bg-white font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            📜 Lịch Sử ({order.history ? order.history.length : 0})
          </button>
        </div>

        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 border border-slate-200 p-3 rounded-xl bg-slate-50/50">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                  Cập Nhật Trạng Thái & Vận Đơn
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái xử lý:</span>
                  <select
                    value={order.status}
                    onChange={e =>
                      handleUpdateOrderField(order.id, customer.id, {
                        status: e.target.value,
                      })
                    }
                    disabled={savingOrder[order.id]}
                    className="font-bold px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                  >
                    {Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Thanh toán:</span>
                  <select
                    value={order.payment_status}
                    onChange={e =>
                      handleUpdateOrderField(order.id, customer.id, {
                        payment_status: e.target.value,
                      })
                    }
                    disabled={savingOrder[order.id]}
                    className="font-bold px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                  >
                    {Object.entries(PAYMENT_STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Mã vận đơn:</span>
                  <input
                    type="text"
                    placeholder="Nhập mã..."
                    defaultValue={order.tracking_code || ''}
                    onBlur={e => {
                      if (e.target.value !== (order.tracking_code || '')) {
                        handleUpdateOrderField(order.id, customer.id, {
                          tracking_code: e.target.value.trim(),
                        });
                      }
                    }}
                    className="px-2 py-1 rounded border border-slate-300 bg-white font-mono w-36"
                  />
                </div>
              </div>

              <div className="space-y-2 border border-slate-200 p-3 rounded-xl bg-slate-50/50">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                  Địa Chỉ & Chi Phí
                </div>
                <div>
                  <span className="text-slate-500">Địa chỉ giao: </span>
                  <span className="font-semibold text-slate-800">
                    {order.shipping_address || customer.address || '—'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Tiền in tem: {formatCurrency(order.subtotal)}</span>
                  <span>Phí ship: {formatCurrency(order.shipping_fee)}</span>
                </div>
                <div className="text-right font-black text-sm text-amber-700">
                  Tổng cộng: {formatCurrency(order.total)}
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="p-3 rounded-xl bg-amber-55/60 border border-amber-200 text-slate-850">
                <span className="font-bold text-amber-900">Ghi chú đơn hàng: </span>{' '}
                {order.notes}
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
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-2 px-3">Tên sản phẩm</th>
                      <th className="py-2 px-3">Kích thước</th>
                      <th className="py-2 px-3 text-center">Số lượng</th>
                      <th className="py-2 px-3 text-right">Đơn giá</th>
                      <th className="py-2 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2 px-3 font-semibold">
                          {item.name || item.title || `Sản phẩm #${idx + 1}`}
                        </td>
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
              <div className="text-slate-400 italic py-4 text-center">
                Chưa có chi tiết danh sách từng mẫu tem trong hệ thống.
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
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 gap-2"
              >
                <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">{item.label}</span>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-amber-700 font-bold hover:underline shrink-0 text-[11px]"
                  >
                    Mở link <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="text-slate-400 italic text-[11px] shrink-0">Chưa gắn link</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: HISTORY */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-3 text-xs">
            {order.history && order.history.length > 0 ? (
              <div className="space-y-2 border-l-2 border-amber-600/30 pl-3">
                {order.history.map(hist => (
                  <div key={hist.id} className="relative pb-2">
                    <div className="font-semibold text-slate-850">{hist.description}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>{formatDate(hist.created_at)}</span>
                      <span>• bởi {hist.created_by}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 italic py-4 text-center">
                Chưa có lịch sử cập nhật cho đơn hàng này.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCreateOrderForm = (customer: Customer) => {
    if (activeCreateForm !== customer.id) return null;

    return (
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-500/5 space-y-4 mb-4 text-slate-800">
        <div className="flex justify-between items-center border-b border-amber-200 pb-2">
          <h5 className="font-black text-amber-900 text-xs uppercase tracking-wide">
            Tạo đơn hàng & Tự động tạo Báo giá mới
          </h5>
          <button
            onClick={() => setActiveCreateForm(null)}
            className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
          >
            Đóng [x]
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
          {/* Loại sản phẩm */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Loại sản phẩm</label>
            <select
              value={createFormData.product_type}
              onChange={e => handleProductChange(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white font-semibold"
            >
              {PRODUCTS.map(p => (
                <option key={p.type} value={p.type}>{p.shortLabel}</option>
              ))}
            </select>
          </div>

          {/* Cỡ tem / Quy cách */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cỡ tem / Quy cách</label>
            <input
              type="text"
              value={createFormData.size_label}
              onChange={e => setCreateFormData(prev => ({ ...prev, size_label: e.target.value }))}
              className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white font-semibold"
              placeholder="Ví dụ: 5x5cm, Khổ 60cm"
            />
          </div>

          {/* Số lượng */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Số lượng (Cái/Tờ)</label>
            <input
              type="number"
              value={createFormData.quantity}
              onChange={e => handleQtyChange(Number(e.target.value))}
              className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white font-semibold"
            />
          </div>

          {/* Mét dài (chỉ hiển thị nếu type = cuon) */}
          {createFormData.product_type === 'cuon' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Độ dài (mét dài)</label>
              <input
                type="number"
                step="0.01"
                value={createFormData.meters}
                onChange={e => setCreateFormData(prev => ({ ...prev, meters: Number(e.target.value) }))}
                className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white font-semibold"
              />
            </div>
          )}

          {/* Đơn giá chưa VAT */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Đơn giá trước VAT (VND)</label>
            <input
              type="number"
              value={createFormData.rate_excl_vat}
              onChange={e => setCreateFormData(prev => ({ ...prev, rate_excl_vat: Number(e.target.value) }))}
              className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
            />
          </div>

          {/* Phí ship */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Phí vận chuyển (Ship)</label>
            <input
              type="number"
              value={createFormData.shipping_fee}
              onChange={e => setCreateFormData(prev => ({ ...prev, shipping_fee: Number(e.target.value) }))}
              className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white font-mono font-semibold"
            />
          </div>

          {/* Link thiết kế Google Drive */}
          <div className="sm:col-span-2 md:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">Link file thiết kế khách gửi (nếu có)</label>
            <input
              type="url"
              value={createFormData.design_link}
              onChange={e => setCreateFormData(prev => ({ ...prev, design_link: e.target.value }))}
              className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white font-mono"
              placeholder="https://drive.google.com/..."
            />
          </div>

          {/* Ghi chú */}
          <div className="sm:col-span-2 md:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">Ghi chú đơn hàng</label>
            <textarea
              value={createFormData.note}
              onChange={e => setCreateFormData(prev => ({ ...prev, note: e.target.value }))}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
              rows={2}
              placeholder="Ví dụ: Giao hàng COD về địa chỉ Anh Đặng Khoa Sinh. Điện thoại: 0768 598 540. Phí ship 30k."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-amber-200">
          <button
            type="button"
            onClick={() => setActiveCreateForm(null)}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-650 cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={submittingOrder === customer.id}
            onClick={() => handleCreateOrderSubmit(customer.id)}
            className="px-5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {submittingOrder === customer.id ? (
              <>
                <RefreshCw className="animate-spin" size={14} />
                Đang tạo đơn & sync Drive...
              </>
            ) : (
              "Tạo đơn & Sinh file báo giá 🚀"
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <AdminGuard>
      <div className="admin-panel min-h-screen bg-[#f8fafc] text-slate-900 transition-colors duration-300">
      {/* Header Admin Nav */}
      <nav className="admin-header sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/website"
              className="flex items-center gap-1.5 text-slate-600 hover:text-amber-700 transition-colors text-sm font-semibold"
            >
              ← <span className="hidden sm:inline">Trang Admin</span><span className="inline sm:hidden">Admin</span>
            </Link>
            <span className="hidden sm:inline text-slate-300">/</span>
            <span className="hidden sm:inline text-slate-950 font-black text-sm">Khách hàng</span>
          </div>

          {/* Top Admin Quick Navigation Menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden md:flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1 mr-1">
              <button
                onClick={() => changeTheme('tech')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  activeTheme === 'tech'
                    ? 'bg-purple-650 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tối
              </button>
              <button
                onClick={() => changeTheme('elegant')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  activeTheme === 'elegant'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sáng
              </button>
            </div>

            <Link
              href="/admin/website"
              className="hidden md:inline-flex px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
            >
              🖥️ <span className="hidden sm:inline">Website</span>
            </Link>
            <Link
              href="/admin/khach-hang"
              className="hidden md:inline-flex px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white shadow-xs transition-all"
            >
              👥 <span className="hidden sm:inline">Khách</span>
            </Link>
            <Link
              href="/admin/don-hang"
              className="hidden md:inline-flex px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
            >
              📦 <span className="hidden sm:inline">Đơn Web</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Quản Lý Khách Hàng</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
              Khách hàng đặt tem trực tiếp qua Website PrinK Tech.
            </p>
          </div>
          <button
            onClick={() => alert('Tính năng thêm mới khách hàng đang được phát triển')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer w-full md:w-auto"
          >
            <Plus size={16} /> Thêm khách hàng mới
          </button>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 mb-6 flex flex-col sm:flex-row gap-3 shadow-xs">
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm khách hàng theo tên, số điện thoại..."
              value={localSearchTerm}
              onChange={e => setLocalSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setSearchTerm(localSearchTerm);
                  setPage(1);
                }
              }}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-amber-600 font-medium"
            />
          </div>
          <button
            onClick={() => {
              setSearchTerm(localSearchTerm);
              setPage(1);
            }}
            className="h-10 px-5 rounded-xl bg-slate-850 hover:bg-slate-950 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer w-full sm:w-auto"
          >
            Tìm kiếm
          </button>
        </div>

        {/* Loading / Error states */}
        {loading && (
          <div className="text-center py-16 text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin text-amber-700" size={20} /> Đang tải danh sách khách hàng...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm mb-6 font-medium">
            Lỗi kết nối: {error}
          </div>
        )}

        {!loading && customers.length === 0 && (
          <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-bold">
            Chưa có dữ liệu khách hàng.
          </div>
        )}

        {/* 1. MOBILE RESPONSIVE CARD VIEW (block md:hidden) */}
        {!loading && customers.length > 0 && (
          <div className="block md:hidden space-y-4">
            {customers.map(customer => {
              const isExpanded = expandedCustomers.has(customer.id);
              return (
                <div
                  key={customer.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden"
                >
                  {/* Customer Card Summary Clickable */}
                  <div
                    onClick={() => toggleCustomer(customer.id)}
                    className="p-4 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-purple-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                          {customer.name ? customer.name[0].toUpperCase() : 'K'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                            {customer.name}
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-mono font-bold text-slate-500">
                              {customer.customer_code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-2 space-y-1">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={10} className="text-slate-400" /> {customer.phone}
                              </span>
                            )}
                            {customer.address && (
                              <span className="flex items-start gap-1">
                                <MapPin size={10} className="text-slate-400 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{customer.address}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs text-slate-400 font-semibold">Tích lũy</div>
                        <div className="font-black text-slate-900 text-xs sm:text-sm mt-0.5">
                          {formatCurrency(customer.total_spent)}
                        </div>
                        <div className="mt-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            {customer.total_orders} đơn
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-800 border-t border-slate-100 pt-2.5">
                      {isExpanded ? 'Đóng thông tin ▲' : 'Xem danh sách đơn hàng ▼'}
                    </div>
                  </div>

                  {/* Customer Expanded Area */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-3 space-y-3">
                      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="font-bold text-xs text-slate-750">Đơn hàng của khách</span>
                        <button
                          onClick={() => {
                            if (activeCreateForm === customer.id) {
                              setActiveCreateForm(null);
                            } else {
                              setActiveCreateForm(customer.id);
                              handleProductChange('cuon');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] transition-all cursor-pointer"
                        >
                          {activeCreateForm === customer.id ? 'Đóng Form [-]' : '➕ Tạo đơn & Báo giá'}
                        </button>
                      </div>

                      {renderCreateOrderForm(customer)}

                      {!customer.orders && (
                        <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <RefreshCw className="animate-spin text-amber-700" size={14} /> Đang nạp đơn hàng...
                        </div>
                      )}

                      {customer.orders && customer.orders.length === 0 && (
                        <div className="py-4 text-center text-xs text-slate-400 italic bg-white border border-slate-200 rounded-xl">
                          Chưa có lịch sử đơn hàng.
                        </div>
                      )}

                      {customer.orders &&
                        customer.orders.map(order => {
                          const isOrderExpanded = expandedOrders.has(order.id);
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
                              className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                            >
                              <div
                                onClick={() => toggleOrder(order.id)}
                                className="p-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-2"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-slate-900 font-mono text-xs">
                                      {order.order_number}
                                    </span>
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                      style={{ color: statusConfig.color, backgroundColor: statusConfig.bg }}
                                    >
                                      {statusConfig.label}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {formatDate(order.created_at)}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded border mr-2 inline-block"
                                    style={{ color: payConfig.color, borderColor: payConfig.color }}
                                  >
                                    {payConfig.label}
                                  </span>
                                  <span className="font-extrabold text-slate-950 text-xs">
                                    {formatCurrency(order.total)}
                                  </span>
                                </div>
                              </div>

                              {isOrderExpanded && renderOrderDetailBlock(order, customer)}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 2. TABLE VIEW FOR DESKTOP (hidden md:block) */}
        {!loading && customers.length > 0 && (
          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4">Mã KH</th>
                    <th className="py-3.5 px-4">Tên Khách Hàng</th>
                    <th className="py-3.5 px-4">Số Điện Thoại</th>
                    <th className="py-3.5 px-4">Địa Chỉ</th>
                    <th className="py-3.5 px-4 text-center">Số Đơn</th>
                    <th className="py-3.5 px-4 text-right">Tổng Tích Lũy</th>
                    <th className="py-3.5 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {customers.map(customer => {
                    const isExpanded = expandedCustomers.has(customer.id);
                    return (
                      <tr key={customer.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td colSpan={8} className="p-0 border-b border-slate-100">
                          {/* Row Summary */}
                          <div
                            onClick={() => toggleCustomer(customer.id)}
                            className="flex items-center py-3.5 px-4 cursor-pointer select-none"
                          >
                            {/* Col 1: Chevron toggle */}
                            <div className="w-12 flex justify-center text-slate-400 group-hover:text-amber-700 transition-colors">
                              {isExpanded ? (
                                <ChevronDown size={18} className="text-amber-700 font-bold" />
                              ) : (
                                <ChevronRight size={18} />
                              )}
                            </div>

                            {/* Col 2: Customer Code */}
                            <div className="w-24 font-mono font-bold text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                                {customer.customer_code}
                              </span>
                            </div>

                            {/* Col 3: Customer Name & Avatar */}
                            <div className="flex-1 min-w-[200px] flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-purple-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                                {customer.name ? customer.name[0].toUpperCase() : 'K'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 group-hover:text-amber-800 text-sm">
                                  {customer.name}
                                </span>
                              </div>
                            </div>

                            {/* Col 4: Phone */}
                            <div className="w-36 font-semibold text-slate-700 flex items-center gap-1">
                              <Phone size={12} className="text-slate-400" />
                              {customer.phone || '—'}
                            </div>

                            {/* Col 5: Address */}
                            <div className="w-64 truncate text-slate-500 pr-4">
                              {customer.address ? (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin size={12} className="text-slate-400 shrink-0" />
                                  {customer.address}
                                </span>
                              ) : (
                                '—'
                              )}
                            </div>

                            {/* Col 6: Orders Count Badge */}
                            <div className="w-20 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                {customer.total_orders || (customer.orders ? customer.orders.length : 0)} đơn
                              </span>
                            </div>

                            {/* Col 7: Total Spent */}
                            <div className="w-32 text-right font-black text-slate-900 text-sm">
                              {formatCurrency(customer.total_spent)}
                            </div>

                            {/* Col 8: Actions */}
                            <div className="w-28 text-right">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleCustomer(customer.id);
                                }}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold text-[11px] transition-all cursor-pointer"
                              >
                                {isExpanded ? 'Đóng ▲' : 'Xem Đơn ▼'}
                              </button>
                            </div>
                          </div>

                          {/* Sub-row Expanded Area */}
                          {isExpanded && (
                            <div className="bg-slate-50/90 border-t border-slate-200 p-4 space-y-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                  <Package size={14} className="text-amber-700" /> Danh Sách Đơn Hàng Đã Đặt (
                                  {customer.orders ? customer.orders.length : 0})
                                </h4>
                                <button
                                  onClick={() => {
                                    if (activeCreateForm === customer.id) {
                                      setActiveCreateForm(null);
                                    } else {
                                      setActiveCreateForm(customer.id);
                                      handleProductChange('cuon');
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer"
                                >
                                  {activeCreateForm === customer.id ? 'Đóng Form [-]' : '➕ Tạo đơn & Báo giá mới'}
                                </button>
                              </div>

                              {renderCreateOrderForm(customer)}

                              {!customer.orders && (
                                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                  <RefreshCw className="animate-spin text-amber-700" size={14} /> Đang nạp danh sách đơn hàng...
                                </div>
                              )}

                              {customer.orders && customer.orders.length === 0 && (
                                <div className="py-4 text-center text-xs text-slate-400 italic bg-white border border-slate-200 rounded-xl">
                                  Khách hàng này chưa có lịch sử đơn hàng nào.
                                </div>
                              )}

                              {customer.orders &&
                                customer.orders.map(order => {
                                  const isOrderExpanded = expandedOrders.has(order.id);
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
                                      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                                    >
                                      <div
                                        onClick={() => toggleOrder(order.id)}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors gap-2"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <span className="text-slate-400">
                                            {isOrderExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                          </span>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-black text-slate-900 font-mono text-xs">
                                                {order.order_number}
                                              </span>
                                              <span
                                                className="px-2 py-0.5 rounded text-[11px] font-bold"
                                                style={{ color: statusConfig.color, backgroundColor: statusConfig.bg }}
                                              >
                                                {statusConfig.label}
                                              </span>
                                              <span
                                                className="text-[11px] font-bold px-1.5 py-0.5 rounded border"
                                                style={{ color: payConfig.color, borderColor: payConfig.color }}
                                              >
                                                {payConfig.label}
                                              </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                              Ngày khởi tạo: {formatDate(order.created_at)}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-4 self-end sm:self-auto">
                                          <div className="text-right">
                                            <span className="text-xs text-slate-400">Thanh toán: </span>
                                            <span className="font-extrabold text-slate-900 text-sm">
                                              {formatCurrency(order.total)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {isOrderExpanded && renderOrderDetailBlock(order, customer)}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
    </AdminGuard>
  );
}
