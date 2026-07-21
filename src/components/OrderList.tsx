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
import CustomerDesignSelector, { CustomerDesign } from '@/components/CustomerDesignSelector';

const getCleanNote = (note: string | null): string => {
  if (!note) return '';
  return note
    .split('\n')
    .filter(line => 
      !line.trim().startsWith('- Excel Báo giá:') &&
      !line.trim().startsWith('- PDF Báo giá:') &&
      !line.trim().startsWith('- File thiết kế khách gửi:') &&
      !line.trim().startsWith('- Dữ liệu sản phẩm JSON:')
    )
    .join('\n')
    .trim();
};

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
  const [vatFilter, setVatFilter] = useState('all'); // all, yes, no
  const [datePreset, setDatePreset] = useState('all'); // Mặc định hiển thị tất cả đơn hàng
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const totalPages = Math.ceil(totalOrders / 20);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    const pageOrderIds = orders.map(o => o.id);
    const allSelected = pageOrderIds.every(id => selectedOrderIds.has(id));
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pageOrderIds.forEach(id => next.delete(id));
      } else {
        pageOrderIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  useEffect(() => {
    setSelectedOrderIds(new Set());
  }, [orders]);

  const selectedOrdersForStats = orders.filter(o => selectedOrderIds.has(o.id));
  const totalMeters = selectedOrdersForStats.reduce((sum, o) => sum + (o.converted_length || 0), 0);
  const totalSubtotal = selectedOrdersForStats.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalShippingFee = selectedOrdersForStats.reduce((sum, o) => sum + (o.shipping_fee || 0), 0);
  const totalPackagingFee = selectedOrdersForStats.reduce((sum, o) => sum + (o.packaging_fee || 0), 0);

  // Helper tính khoảng thời gian theo preset
  const calculateDateRange = (preset: string, fromVal: string, toVal: string) => {
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
  };
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<'tech' | 'elegant'>('elegant');

  // Toast & Confirm states
  interface ToastState {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  interface ConfirmModalState {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  // States cho cập nhật vận chuyển & giá vốn
  const [shippingCarrierInput, setShippingCarrierInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [costAmountInput, setCostAmountInput] = useState<number>(0);
  const [costUnitPriceInput, setCostUnitPriceInput] = useState<number>(150000);

  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      setShippingCarrierInput(selectedOrder.shipping_carrier || '');
      setTrackingNumberInput(selectedOrder.tracking_number || '');
      
      const len = selectedOrder.converted_length || 0;
      const initialCost = selectedOrder.cost_amount !== undefined && selectedOrder.cost_amount !== null
        ? Number(selectedOrder.cost_amount)
        : Math.round(len * 150000);
      setCostAmountInput(initialCost);
      setCostUnitPriceInput(len > 0 ? Math.round(initialCost / len) : 150000);
      
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const res = await fetch(`/api/admin/orders/${selectedOrder.id}/history`);
          if (res.ok) {
            const data = await res.json();
            setOrderHistory(data.data || []);
          } else {
            setOrderHistory([]);
          }
        } catch (err) {
          console.error('Lỗi tải lịch sử đơn hàng:', err);
          setOrderHistory([]);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    } else {
      setShippingCarrierInput('');
      setTrackingNumberInput('');
      setOrderHistory([]);
    }
  }, [selectedOrder]);

  // States cho Form tạo đơn hàng mới
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customerTab, setCustomerTab] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', email: '' });
  const [createFormData, setCreateFormData] = useState({
    product_type: 'other',
    product_label: 'In tem UV DTF tùy chỉnh',
    size_label: 'cái',
    quantity: 100,
    meters: 0,
    rate_excl_vat: 2000,
    shipping_fee: 30000,
    design_link: '',
    note: '',
    order_source: 'website',
    apply_vat: true,
  });
  const [adminDesigns, setAdminDesigns] = useState<any[]>([]);

  const handleAdminFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const base64Body = base64.split(',')[1];
      setAdminDesigns(prev => {
        const list = [...prev];
        list[index] = {
          ...list[index],
          fileName: file.name,
          fileType: file.type,
          fileData: base64Body,
          name: list[index].name || file.name.split('.')[0]
        };
        return list;
      });
    };
    reader.readAsDataURL(file);
  };

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [submittingForm, setSubmittingForm] = useState(false);

  // States cho Modal Sửa Đơn Hàng Đã Tạo
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (order: Order) => {
    const rawItems = Array.isArray(order.items) && order.items.length > 0 ? order.items : [
      {
        product_label: 'In tem UV DTF',
        product_type: (order as any).sticker_type || 'sticker_piece',
        quantity: (order as any).quantity_actual || (order as any).quantity_expected || 100,
        unit: 'cái',
        unit_price: Math.round((order.subtotal || 0) / 100) || 2000,
        subtotal: order.subtotal || 0,
        design_url: order.design_url || ''
      }
    ];

    setEditFormData({
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      customer_address: order.customer_address || '',
      customer_email: order.customer_email || '',
      customer_note: getCleanNote(order.customer_note),
      shipping_carrier: order.shipping_carrier || '',
      tracking_number: order.tracking_number || '',
      shipping_fee: order.shipping_fee || 0,
      discount: order.discount || 0,
      cost_amount: order.cost_amount || 0,
      has_vat: (order as any).has_vat || false,
      items: rawItems.map((it: any) => {
        const q = Number(it.quantity) || 1;
        const price = Number(it.unit_price) > 0 ? Number(it.unit_price) : (Number(it.rate_excl_vat) > 0 ? Number(it.rate_excl_vat) : 0);
        const sub = Number(it.subtotal) > 0 ? Number(it.subtotal) : Math.round(q * price);
        return {
          product_label: it.product_label || it.name || 'Tem UV DTF',
          product_type: it.product_type || (order as any).sticker_type || 'sticker_piece',
          quantity: q,
          width_cm: it.width_cm || '',
          height_cm: it.height_cm || '',
          unit: it.unit || (it.size_label || 'cái'),
          unit_price: price,
          subtotal: sub,
          design_url: it.design_url || it.url || ''
        };
      })
    });
    setShowEditModal(true);
  };

  const handleSaveEditOrder = async () => {
    if (!editFormData) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/orders/${editFormData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: editFormData.customer_name,
          customer_phone: editFormData.customer_phone,
          customer_address: editFormData.customer_address,
          customer_email: editFormData.customer_email,
          customer_note: editFormData.customer_note,
          shipping_carrier: editFormData.shipping_carrier,
          tracking_number: editFormData.tracking_number,
          shipping_fee: Number(editFormData.shipping_fee) || 0,
          discount: Number(editFormData.discount) || 0,
          cost_amount: Number(editFormData.cost_amount) || 0,
          has_vat: editFormData.has_vat,
          items: editFormData.items
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Cập nhật đơn hàng thất bại');
      }

      showToast('Đã cập nhật đơn hàng thành công!', 'success');
      setShowEditModal(false);
      fetchOrders();

      if (selectedOrder && selectedOrder.id === editFormData.id) {
        const newSubtotal = editFormData.items.reduce((s: number, it: any) => s + (Number(it.subtotal) || 0), 0);
        const newTotal = newSubtotal + (Number(editFormData.shipping_fee) || 0) - (Number(editFormData.discount) || 0);
        setSelectedOrder(prev => prev ? {
          ...prev,
          customer_name: editFormData.customer_name,
          customer_phone: editFormData.customer_phone,
          customer_address: editFormData.customer_address,
          customer_email: editFormData.customer_email,
          customer_note: editFormData.customer_note,
          shipping_carrier: editFormData.shipping_carrier,
          tracking_number: editFormData.tracking_number,
          shipping_fee: Number(editFormData.shipping_fee) || 0,
          discount: Number(editFormData.discount) || 0,
          cost_amount: Number(editFormData.cost_amount) || 0,
          subtotal: newSubtotal,
          total: newTotal,
          items: editFormData.items
        } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật đơn hàng');
    } finally {
      setSavingEdit(false);
    }
  };

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
        ...prev,
        product_type: 'other' as any,
        product_label: '',
        size_label: 'cái',
        quantity: 1,
        meters: 0,
        rate_excl_vat: 0,
        shipping_fee: 30000,
        design_link: '',
        note: '',
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
      priceInclVat = 172800;
    } else {
      priceInclVat = getUnitPrice(prod!, defaultQty);
    }
    const priceExclVat = Math.round(priceInclVat / 1.08);

    setCreateFormData(prev => ({
      ...prev,
      product_type: type,
      product_label: label,
      size_label: size,
      quantity: defaultQty,
      meters: defaultMeters,
      rate_excl_vat: priceExclVat,
      shipping_fee: 30000,
      design_link: '',
      note: '',
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
      priceInclVat = 172800;
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
        showToast('Vui lòng chọn khách hàng lẻ từ danh sách.', 'error');
        return;
      }
    }

    if (createFormData.product_type === 'other' && !createFormData.product_label.trim()) {
      showToast('Vui lòng nhập tên sản phẩm custom.', 'error');
      return;
    }

    const executeCreateOrder = async (cid: string) => {
      setSubmittingForm(true);
      try {
        const items = adminDesigns.map(d => {
          const isRoll = createFormData.product_type === 'cuon';
          const qty = Number(d.quantity) > 0 ? Number(d.quantity) : (Number(createFormData.quantity) || 1);
          const met = isRoll ? (Number(d.meters) > 0 ? Number(d.meters) : (Number(createFormData.meters) || 1)) : undefined;
          const rate = Number(d.rate_excl_vat) > 0 ? Number(d.rate_excl_vat) : (Number(createFormData.rate_excl_vat) || 0);
          const sub = isRoll && met ? Math.round(met * rate) : Math.round(qty * rate);
          
          return {
            product_type: createFormData.product_type,
            product_label: d.name || createFormData.product_label,
            size_label: d.size_label || createFormData.size_label,
            quantity: qty,
            meters: met,
            rate_excl_vat: rate,
            subtotal: sub,
            note: d.note || null,
            designs: [{
              name: d.name,
              url: d.url || null,
              fileData: d.fileData || null,
              fileName: d.fileName || null,
              fileType: d.fileType || null
            }]
          };
        });

        const res = await fetch('/api/customer-orders/create-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: cid,
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
            apply_vat: createFormData.apply_vat,
            items: items.length > 0 ? items : undefined,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Tạo đơn hàng thất bại');
        }

        showToast(`Tạo đơn hàng thành công! Mã đơn: ${result.order_code}`, 'success');
        
        setShowCreateForm(false);
        setAdminDesigns([]);
        setNewCustomer({ name: '', phone: '', address: '', email: '' });
        setSelectedCustomerId('');
        setCreateFormData({
          product_type: 'cuon',
          product_label: 'In cuộn mét dài (Khổ 60cm)',
          size_label: 'Khổ 60cm',
          quantity: 200,
          meters: 1.0,
          rate_excl_vat: 160000,
          shipping_fee: 30000,
          design_link: '',
          note: '',
          order_source: 'website',
          apply_vat: true,
        });
        
        fetchOrders();
      } catch (err: any) {
        showToast(err.message || 'Lỗi hệ thống', 'error');
      } finally {
        setSubmittingForm(false);
      }
    };

    if (!createFormData.design_link?.trim()) {
      showConfirm(
        'Xác nhận tạo đơn hàng',
        'Bạn chưa nhập link thiết kế chung (Google Drive). Vẫn muốn tiếp tục tạo đơn hàng và báo giá?',
        () => executeCreateOrder(customerId)
      );
      return;
    }

    executeCreateOrder(customerId);
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
      const { from, to } = calculateDateRange(datePreset, customFrom, customTo);
      
      const queryParams: Record<string, string> = {
        status: statusFilter,
        source: sourceFilter,
        vat: vatFilter,
        search: searchTerm,
        page: String(page),
        limit: '20',
      };

      if (from) queryParams.from = from;
      if (to) queryParams.to = to;

      const params = new URLSearchParams(queryParams);
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
  }, [statusFilter, sourceFilter, vatFilter, searchTerm, page, datePreset, customFrom, customTo]);

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
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || `Cập nhật thất bại (${res.status})`);
      }
      
      // Update state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
      showToast('Cập nhật trạng thái đơn hàng thành công!', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
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
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || `Cập nhật thất bại (${res.status})`);
      }
      
      // Update state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: newPayStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, payment_status: newPayStatus } : null);
      }
      showToast('Cập nhật thanh toán thành công!', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
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
          tracking_number: trackingNumberInput || null,
          cost_amount: Number(costAmountInput) || 0
        }),
      });
      if (!res.ok) throw new Error('Cập nhật thông tin thất bại');
      
      // Update state
      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        shipping_carrier: shippingCarrierInput || null, 
        tracking_number: trackingNumberInput || null,
        cost_amount: Number(costAmountInput) || 0
      } : o));
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { 
          ...prev, 
          shipping_carrier: shippingCarrierInput || null, 
          tracking_number: trackingNumberInput || null,
          cost_amount: Number(costAmountInput) || 0
        } : null);
      }
      showToast('Cập nhật thông tin vận chuyển & giá vốn thành công!', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (orderId: string) => {
    showConfirm(
      'Xác nhận xóa đơn hàng',
      'Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng này không? Hành động này không thể hoàn tác.',
      async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Xóa thất bại');
          showToast('Đã xóa đơn hàng thành công!', 'success');
          setOrders(prev => prev.filter(o => o.id !== orderId));
          if (selectedOrder?.id === orderId) setSelectedOrder(null);
        } catch (err) {
          showToast((err as Error).message, 'error');
        }
      }
    );
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
                        Đơn giá trước VAT (VND) *
                      </label>
                      <input
                        type="number"
                        value={createFormData.rate_excl_vat}
                        onChange={e => setCreateFormData(prev => ({ ...prev, rate_excl_vat: parseInt(e.target.value) || 0 }))}
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-bold focus:outline-none focus:border-purple-650"
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

                    <div className="flex items-center justify-between p-3 rounded-xl border border-card-border bg-slate-50 mt-4">
                      <div>
                        <span className="block text-xs font-bold text-slate-700">Áp dụng thuế VAT (8%)</span>
                        <span className="block text-[10px] text-slate-500 font-semibold">Tự động tính thuế GTGT cho báo giá</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createFormData.apply_vat}
                          onChange={e => setCreateFormData(prev => ({ ...prev, apply_vat: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-650"></div>
                      </label>
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
                    {/* Quản lý nhiều mẫu thiết kế */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-600">Mẫu thiết kế (Có thể thêm từ Kho Mẫu)</label>
                        <div className="flex items-center gap-2">
                          <CustomerDesignSelector
                            partnerId={selectedCustomerId || undefined}
                            partnerPhone={customerTab === 'existing' ? customersList.find(c => c.id === selectedCustomerId)?.phone : newCustomer.phone}
                            customerName={customerTab === 'existing' ? customersList.find(c => c.id === selectedCustomerId)?.name : newCustomer.name}
                            buttonText="🎨 Chọn từ Kho Mẫu"
                            onSelectDesign={(design: CustomerDesign) => {
                              const cleanPrice = Number(design.unit_price) > 0 ? Number(design.unit_price) : (Number(createFormData.rate_excl_vat) || 2000);
                              setAdminDesigns(prev => [
                                ...prev,
                                {
                                  name: design.name,
                                  size_label: design.size_label || 'Tem lẻ',
                                  quantity: createFormData.quantity || 100,
                                  rate_excl_vat: cleanPrice,
                                  url: design.file_url || '',
                                  note: design.note || ''
                                }
                              ]);
                              if (design.file_url && !createFormData.design_link) {
                                setCreateFormData(p => ({ ...p, design_link: design.file_url || '' }));
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setAdminDesigns([...adminDesigns, { name: '', quantity: createFormData.quantity, rate_excl_vat: createFormData.rate_excl_vat, url: '' }])}
                            className="text-[11px] text-purple-600 hover:underline font-bold"
                          >
                            + Thêm mẫu
                          </button>
                        </div>
                      </div>

                      {adminDesigns.length === 0 ? (
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-500">Link thư mục Drive / file thiết kế chung (tùy chọn)</label>
                          <input
                            type="text"
                            placeholder="Nhập đường dẫn Google Drive file thiết kế chung"
                            value={createFormData.design_link}
                            onChange={e => setCreateFormData(prev => ({ ...prev, design_link: e.target.value }))}
                            className="w-full h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-xs focus:outline-none focus:border-purple-650 font-medium"
                          />
                        </div>
                      ) : (
                        <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-card-border max-h-[300px] overflow-y-auto">
                          {adminDesigns.map((d, index) => (
                            <div key={index} className="space-y-2 p-2.5 bg-background rounded-xl border border-card-border shadow-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-slate-500">Mẫu #{index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => setAdminDesigns(prev => prev.filter((_, i) => i !== index))}
                                  className="text-red-500 hover:text-red-700 text-xs font-bold"
                                >
                                  Xóa
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Tên mẫu"
                                  value={d.name}
                                  onChange={e => setAdminDesigns(prev => {
                                    const list = [...prev];
                                    list[index].name = e.target.value;
                                    return list;
                                  })}
                                  className="h-8 px-2.5 rounded-lg border border-card-border bg-background text-slate-900 text-xs font-medium focus:outline-none focus:border-purple-600"
                                />
                                {createFormData.product_type === 'cuon' ? (
                                  <input
                                    type="number"
                                    placeholder="Mét dài"
                                    value={d.meters || ''}
                                    onChange={e => setAdminDesigns(prev => {
                                      const list = [...prev];
                                      list[index].meters = parseFloat(e.target.value) || 0;
                                      list[index].quantity = Math.ceil(list[index].meters * 200); // Gợi ý số lượng cái
                                      return list;
                                    })}
                                    className="h-8 px-2.5 rounded-lg border border-card-border bg-background text-slate-900 text-xs focus:outline-none focus:border-purple-600 font-bold"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    placeholder="Số lượng cái"
                                    value={d.quantity || ''}
                                    onChange={e => setAdminDesigns(prev => {
                                      const list = [...prev];
                                      list[index].quantity = parseInt(e.target.value) || 0;
                                      return list;
                                    })}
                                    className="h-8 px-2.5 rounded-lg border border-card-border bg-background text-slate-900 text-xs focus:outline-none focus:border-purple-600 font-bold"
                                  />
                                )}
                              </div>

                              <div className="flex gap-2 items-center">
                                {d.fileData ? (
                                  <div className="flex-1 text-[11px] text-emerald-600 font-bold truncate flex items-center gap-1">
                                    <span className="truncate">📁 {d.fileName}</span>
                                    <button
                                      type="button"
                                      onClick={() => setAdminDesigns(prev => {
                                        const list = [...prev];
                                        delete list[index].fileData;
                                        delete list[index].fileName;
                                        return list;
                                      })}
                                      className="text-red-500 hover:underline font-normal text-[10px] shrink-0"
                                    >
                                      Xoá
                                    </button>
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Dán link Drive..."
                                    value={d.url || ''}
                                    onChange={e => setAdminDesigns(prev => {
                                      const list = [...prev];
                                      list[index].url = e.target.value;
                                      return list;
                                    })}
                                    className="flex-1 h-8 px-2.5 rounded-lg border border-card-border bg-background text-slate-900 text-xs focus:outline-none focus:border-purple-600"
                                  />
                                )}
                                
                                {!d.url && !d.fileData && (
                                  <label className="h-8 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 text-[11px] font-bold transition flex items-center justify-center cursor-pointer shrink-0 border border-purple-200">
                                    Tải lên file
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={e => handleAdminFileChange(index, e)}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                      <span>VAT ({createFormData.apply_vat ? '8%' : '0%'}):</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(
                          Math.round(
                            (createFormData.product_type === 'cuon'
                              ? createFormData.rate_excl_vat * createFormData.meters
                              : createFormData.rate_excl_vat * createFormData.quantity) * (createFormData.apply_vat ? 0.08 : 0)
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
                      <span>Tổng thanh toán ({createFormData.apply_vat ? 'có VAT' : 'không VAT'}):</span>
                      <span className="tabular-nums">
                        {formatCurrency(
                          Math.round(
                            (createFormData.product_type === 'cuon'
                              ? createFormData.rate_excl_vat * createFormData.meters
                              : createFormData.rate_excl_vat * createFormData.quantity) * (createFormData.apply_vat ? 1.08 : 1.0)
                          ) + createFormData.shipping_fee
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={submittingForm}
                    onClick={handleCreateOrderSubmit}
                    className="w-full h-11 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

        {/* Bộ lọc thời gian đồng bộ */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-4 mb-3 shadow-sm space-y-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Thời gian:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'all', label: 'Tất cả thời gian' },
                { value: 'today', label: 'Hôm nay' },
                { value: 'yesterday', label: 'Hôm qua' },
                { value: 'this_week', label: 'Tuần này' },
                { value: 'last_week', label: 'Tuần trước' },
                { value: 'this_month', label: 'Tháng này' },
                { value: 'last_month', label: 'Tháng trước' },
                { value: 'this_year', label: 'Năm nay' },
                { value: 'last_year', label: 'Năm trước' },
                { value: 'custom', label: '📅 Tùy chọn' }
              ].map(p => (
                <button 
                  key={p.value} 
                  type="button"
                  onClick={() => { setDatePreset(p.value); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                    datePreset === p.value 
                      ? 'bg-purple-650 text-white border-purple-650 shadow-sm' 
                      : 'border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 hover:border-purple-300 hover:text-purple-650'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 pt-1 animate-slide-down">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-400">Từ:</span>
                <input 
                  type="date" 
                  value={customFrom} 
                  onChange={e => { setCustomFrom(e.target.value); setPage(1); }}
                  className="border border-card-border rounded-lg px-2.5 py-1 text-xs bg-background text-foreground"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-400">Đến:</span>
                <input 
                  type="date" 
                  value={customTo} 
                  onChange={e => { setCustomTo(e.target.value); setPage(1); }}
                  className="border border-card-border rounded-lg px-2.5 py-1 text-xs bg-background text-foreground"
                />
              </div>
            </div>
          )}

          {datePreset !== 'all' && (
            <div className="text-[10px] text-slate-400 font-semibold italic">
              📅 Đang lọc đơn từ: {calculateDateRange(datePreset, customFrom, customTo).from || '—'} ➔ {calculateDateRange(datePreset, customFrom, customTo).to || '—'}
            </div>
          )}
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
          <select
            value={vatFilter}
            onChange={e => { setVatFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-xl border border-card-border bg-background text-slate-900 text-sm font-semibold focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="all" className="bg-card-bg text-slate-900">Mọi thuế suất (VAT)</option>
            <option value="yes" className="bg-card-bg text-slate-900">🧾 Đơn có thuế VAT</option>
            <option value="no" className="bg-card-bg text-slate-900">💸 Đơn không thuế VAT</option>
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
                  <div className="flex items-center justify-between px-2 pb-1 text-xs">
                    <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orders.length > 0 && orders.every(o => selectedOrderIds.has(o.id))}
                        onChange={toggleSelectAllOnPage}
                        className="w-4 h-4 rounded border-slate-300 text-purple-650 accent-purple-650 cursor-pointer"
                      />
                      Chọn tất cả trên trang
                    </label>
                    {selectedOrderIds.size > 0 && (
                      <button
                        onClick={() => setSelectedOrderIds(new Set())}
                        className="text-purple-650 dark:text-purple-400 font-extrabold hover:underline cursor-pointer"
                      >
                        Bỏ chọn tất cả ({selectedOrderIds.size})
                      </button>
                    )}
                  </div>

                  {orders.map((order) => {
                    const status = ORDER_STATUS_LABELS[order.status] || { label: order.status, color: '' };
                    const isSelected = selectedOrder?.id === order.id;
                    const isChecked = selectedOrderIds.has(order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-[var(--accent-glow)] border-[var(--accent)] font-semibold'
                            : 'bg-white border-card-border hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex gap-3 items-start">
                          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOrder(order.id)}
                              className="w-4.5 h-4.5 rounded border-slate-300 text-purple-650 focus:ring-purple-550 cursor-pointer accent-purple-650"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
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
                              <div className="text-right flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${status.color}`}>
                                    {status.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePaymentStatusChange(order.id, order.payment_status === 'paid' ? 'unpaid' : 'paid');
                                    }}
                                    disabled={updatingId === order.id}
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                                      order.payment_status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                                        : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
                                    }`}
                                    title="Bấm để đổi trạng thái thanh toán"
                                  >
                                    {order.payment_status === 'paid' ? '✓ Đã' : '✕ Chưa'}
                                  </button>
                                </div>
                                <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-1">{formatCurrency(order.total)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-card-border/50 text-[10px] text-text-muted pl-7.5">
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
                        <th className="pb-3 pr-2 font-bold w-10 text-center">
                          <input
                            type="checkbox"
                            checked={orders.length > 0 && orders.every(o => selectedOrderIds.has(o.id))}
                            onChange={toggleSelectAllOnPage}
                            className="w-4.5 h-4.5 rounded border-slate-300 text-purple-650 accent-purple-650 cursor-pointer"
                          />
                        </th>
                        <th className="pb-3 pr-2 font-bold">Mã đơn</th>
                        <th className="pb-3 font-bold">Khách hàng</th>
                        <th className="pb-3 text-right font-bold">Tổng tiền</th>
                        <th className="pb-3 text-center font-bold">Trạng thái</th>
                        <th className="pb-3 text-center font-bold">Thanh toán</th>
                        <th className="pb-3 text-right font-bold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order, i) => {
                        const status = ORDER_STATUS_LABELS[order.status] || { label: order.status, color: '' };
                        const isChecked = selectedOrderIds.has(order.id);
                        return (
                          <tr
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`border-b border-card-border/40 last:border-0 hover:bg-block-bg transition-colors cursor-pointer
                              ${selectedOrder?.id === order.id ? 'bg-[var(--accent-glow)] font-semibold' : i % 2 === 1 ? 'bg-block-bg/20' : ''}`}
                          >
                            <td className="py-3.5 pr-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectOrder(order.id)}
                                className="w-4.5 h-4.5 rounded border-slate-300 text-purple-650 focus:ring-purple-550 cursor-pointer accent-purple-650"
                              />
                            </td>
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
                            <td className="py-3.5 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handlePaymentStatusChange(order.id, order.payment_status === 'paid' ? 'unpaid' : 'paid')}
                                disabled={updatingId === order.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-xs hover:opacity-85 disabled:opacity-50 ${
                                  order.payment_status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                                    : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
                                }`}
                                title="Bấm để đổi trạng thái thanh toán"
                              >
                                {order.payment_status === 'paid' ? '✓ Đã' : '✕ Chưa'}
                              </button>
                            </td>
                            <td className="py-3.5 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditModal(order)}
                                  className="px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all font-bold text-xs cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                  title="Sửa thông tin đơn hàng này"
                                >
                                  ✏️ Sửa
                                </button>
                                <button
                                  onClick={() => handleDelete(order.id)}
                                  className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all font-bold text-xs cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                >
                                  🗑️ Xóa
                                </button>
                              </div>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(selectedOrder)}
                      className="px-2.5 py-1 rounded-lg bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1 cursor-pointer"
                    >
                      ✏️ Sửa đơn
                    </button>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="text-xs text-text-muted hover:text-foreground font-bold transition-colors cursor-pointer"
                    >
                      Đóng [x]
                    </button>
                  </div>
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
                        <div className="font-medium">{renderFormattedNote(getCleanNote(selectedOrder.customer_note))}</div>
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
                          {item.quantity} {item.unit || (item as any).size_label || 'cái'} × {formatCurrency(item.unit_price ?? (item as any).rate_excl_vat ?? (item.subtotal && item.quantity ? Math.round(item.subtotal / item.quantity) : 0))}
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
                          {((item as any).designs) && ((item as any).designs).length > 0 ? (
                            <div className="w-full mt-1.5 space-y-1 border-t border-card-border pt-1.5">
                              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Mẫu thiết kế riêng:</p>
                              {((item as any).designs).map((d: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                                  <span className="text-text-dark font-medium">• {d.name}</span>
                                  <a
                                    href={d.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-700 font-bold flex items-center gap-0.5"
                                  >
                                    📁 Tải file
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            item.design_url && item.design_url !== selectedOrder.design_url && (
                              <a
                                href={item.design_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-2.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-semibold transition border border-blue-550/20"
                              >
                                📁 Tải file thiết kế
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Design File (Global) -> Đổi thành Thư mục Google Drive đơn hàng & Kho thiết kế */}
                <div className="border-b border-card-border pb-4 space-y-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Thư mục & Kho file thiết kế</h3>
                  {selectedOrder.design_url && (
                    <a
                      href={selectedOrder.design_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-9 rounded-xl border border-card-border bg-block-bg hover:bg-block-bg/80 transition flex items-center justify-center text-xs text-blue-600 font-bold"
                    >
                      📁 Mở thư mục đơn hàng trên Google Drive
                    </a>
                  )}
                  <div className="pt-1">
                    <CustomerDesignSelector
                      partnerPhone={selectedOrder.customer_phone}
                      customerName={selectedOrder.customer_name}
                      buttonText="🎨 Tra cứu Kho File Thiết Kế của Khách"
                      buttonClassName="w-full h-9 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      onSelectDesign={(design: CustomerDesign) => {
                        if (design.file_url) {
                          window.open(design.file_url, '_blank');
                        }
                      }}
                    />
                  </div>
                </div>

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
                {((selectedOrder.converted_length !== undefined && selectedOrder.converted_length !== null) || 
                  (selectedOrder.cost_amount !== undefined && selectedOrder.cost_amount !== null)) && (
                  <div className="rounded-xl border border-dashed border-emerald-350 bg-emerald-50/20 dark:bg-emerald-950/10 p-3.5 space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                      📊 Đối soát Xưởng & Lợi nhuận ròng
                    </h4>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-text-muted">
                        <span>Mét in thực tế (Xưởng):</span>
                        <span className="font-bold text-foreground font-mono">
                          {selectedOrder.converted_length !== undefined && selectedOrder.converted_length !== null 
                            ? `${selectedOrder.converted_length} m` 
                            : '—'}
                        </span>
                      </div>
                      {(() => {
                        const meters = Number((selectedOrder as any).converted_length) || 0;
                        const rawCost = Number(selectedOrder.cost_amount) || 0;
                        const cleanCost = meters > 0 
                          ? (rawCost > 0 ? rawCost : Math.round(meters * 150000))
                          : (rawCost > 0 ? rawCost : 0);
                        const profit = Number(selectedOrder.total || 0) - cleanCost;

                        return (
                          <>
                            <div className="flex justify-between text-text-muted">
                              <span>Giá vốn in trả xưởng:</span>
                              <span className="font-bold text-foreground font-mono">
                                {formatCurrency(cleanCost)}
                              </span>
                            </div>
                            <div className="flex justify-between text-text-muted">
                              <span>Phí ship khách trả:</span>
                              <span className="font-bold text-foreground font-mono">
                                {formatCurrency(selectedOrder.shipping_fee)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-emerald-250 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                              <span>Lợi nhuận ròng thực tế:</span>
                              <span className="font-mono">{formatCurrency(profit)}</span>
                            </div>
                          </>
                        );
                      })()}
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

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted font-semibold">Số mét in thực tế:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {selectedOrder.converted_length !== undefined && selectedOrder.converted_length !== null
                            ? `${selectedOrder.converted_length} m`
                            : '0 m'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Đơn giá Cost (/m)</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={costUnitPriceInput}
                              onChange={e => {
                                const val = Number(e.target.value) || 0;
                                setCostUnitPriceInput(val);
                                setCostAmountInput(Math.round(val * (selectedOrder.converted_length || 0)));
                              }}
                              placeholder="150,000"
                              className="w-full h-9 pl-2 pr-6 rounded-lg border border-card-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:border-[var(--accent)]"
                            />
                            <span className="absolute right-2 inset-y-0 flex items-center text-[9px] text-text-muted font-bold pointer-events-none">đ</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Tổng giá vốn (Cost)</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={costAmountInput}
                              onChange={e => {
                                const val = Number(e.target.value) || 0;
                                setCostAmountInput(val);
                                const len = selectedOrder.converted_length || 0;
                                if (len > 0) {
                                  setCostUnitPriceInput(Math.round(val / len));
                                }
                              }}
                              placeholder="Tự động tính"
                              className="w-full h-9 pl-2 pr-6 rounded-lg border border-card-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:border-[var(--accent)]"
                            />
                            <span className="absolute right-2 inset-y-0 flex items-center text-[9px] text-text-muted font-bold pointer-events-none">đ</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] text-text-muted font-semibold">Nhập đơn giá, hệ thống sẽ tự động nhân với số mét in thực tế của xưởng.</p>
                    </div>

                    <button
                      onClick={() => handleShippingUpdate(selectedOrder.id)}
                      disabled={updatingId === selectedOrder.id}
                      className="w-full h-9 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      📦 Cập nhật Vận chuyển & Giá vốn
                    </button>
                  </div>
                </div>

                {/* Nút Chốt Đơn & Chuyển Xưởng In nhanh */}
                {selectedOrder.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'processing')}
                    disabled={updatingId === selectedOrder.id}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    🚀 Chốt Đơn & Chuyển Xưởng In
                  </button>
                )}

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

                {/* Timeline Lịch sử Thay đổi Đơn hàng */}
                <div className="border-t border-card-border pt-4 mt-4 space-y-3">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    ⏱️ Lịch sử thay đổi đơn hàng
                  </h3>
                  {loadingHistory ? (
                    <div className="text-[11px] text-text-muted font-medium py-3 text-center">
                      Đang tải lịch sử...
                    </div>
                  ) : orderHistory.length > 0 ? (
                    <div className="relative border-l border-slate-200 dark:border-slate-800 ml-2 pl-4 py-1 space-y-4 max-h-60 overflow-y-auto scrollbar-thin">
                      {orderHistory.map((item, index) => {
                        const date = new Date(item.created_at);
                        const timeStr = `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
                        return (
                          <div key={item.id || index} className="relative">
                            <span className="absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[var(--accent)] ring-4 ring-background" />
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-foreground">
                                  {item.description}
                                </span>
                                <span className="text-[9px] text-text-muted whitespace-nowrap">
                                  {timeStr}
                                </span>
                              </div>
                              <div className="text-[10px] text-text-muted font-semibold flex items-center gap-1">
                                <span>Thực hiện bởi:</span>
                                <span className="text-foreground">{item.created_by}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted font-medium py-2 text-center italic">
                      Chưa ghi nhận lịch sử thay đổi nào cho đơn hàng này
                    </p>
                  )}
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

      {/* Toast component */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-short">
          <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-xl text-white font-bold text-sm ${
            toast.type === 'success' ? 'bg-[#10b981]' : 
            toast.type === 'error' ? 'bg-[#ef4444]' : 
            toast.type === 'warning' ? 'bg-[#f59e0b]' : 'bg-[#3b82f6]'
          }`}>
            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>{toast.message}</span>
            <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 font-black hover:opacity-85 text-white/70">✕</button>
          </div>
        </div>
      )}

      {/* Confirm Modal component */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 p-4">
          <div className="bg-white rounded-2xl border border-card-border p-6 max-w-sm w-full shadow-2xl text-slate-900 space-y-4 animate-scale-up">
            <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              ⚠️ {confirmModal.title}
            </h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(prev => ({ ...prev, show: false }));
                  confirmModal.onConfirm();
                }}
                className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-xs cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Summary Bar */}
      {selectedOrderIds.size > 0 && (
        <div className="fixed bottom-6 left-4 right-4 md:left-[280px] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-550 animate-pulse" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Đang chọn: <strong className="text-purple-650 dark:text-purple-400 font-extrabold">{selectedOrderIds.size}</strong> đơn hàng
              </span>
            </div>
            
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-5 gap-y-1.5 text-xs md:text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tổng số m:</span>
                <span className="font-extrabold text-slate-900 dark:text-white font-mono">{totalMeters.toLocaleString('vi-VN')} m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tiền in:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-450 font-mono">{formatCurrency(totalSubtotal)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tiền ship:</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-450 font-mono">{formatCurrency(totalShippingFee)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Đóng gói:</span>
                <span className="font-extrabold text-orange-600 dark:text-orange-450 font-mono">{formatCurrency(totalPackagingFee)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedOrderIds(new Set())}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer self-end md:self-auto text-center"
          >
            Hủy chọn
          </button>
          </div>
        )}

        {/* MODAL SỬA ĐƠN HÀNG ĐÃ TẠO */}
        {showEditModal && editFormData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
          <div className="bg-card-bg border border-card-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-card-border flex items-center justify-between bg-block-bg/50">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <span>✏️</span> Chỉnh sửa Đơn Hàng <span className="font-mono text-purple-600">{editFormData.order_number}</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Cập nhật thông tin khách hàng, chi tiết sản phẩm, giá bán lẻ và kho file thiết kế
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-foreground hover:bg-block-bg transition cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 text-foreground">
              
              {/* 1. Thông tin Khách Hàng */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider border-b border-card-border pb-1">
                  👤 Thông tin khách hàng
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên khách hàng *</label>
                    <input
                      type="text"
                      value={editFormData.customer_name}
                      onChange={e => setEditFormData({ ...editFormData, customer_name: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Số điện thoại *</label>
                    <input
                      type="text"
                      value={editFormData.customer_phone}
                      onChange={e => setEditFormData({ ...editFormData, customer_phone: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Địa chỉ giao hàng</label>
                    <input
                      type="text"
                      value={editFormData.customer_address}
                      onChange={e => setEditFormData({ ...editFormData, customer_address: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Chi tiết Sản Phẩm & Mẫu In */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-card-border pb-1">
                  <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                    🏷️ Chi tiết sản phẩm & Mẫu in trong đơn
                  </h4>
                  <div className="flex items-center gap-2">
                    <CustomerDesignSelector
                      partnerPhone={editFormData.customer_phone}
                      customerName={editFormData.customer_name}
                      buttonText="🎨 Chọn từ Kho Mẫu"
                      onSelectDesign={(design: CustomerDesign) => {
                        const cleanPrice = Number(design.unit_price) > 0 ? Number(design.unit_price) : 2000;
                        setEditFormData((prev: any) => ({
                          ...prev,
                          items: [
                            ...prev.items,
                            {
                              product_label: design.name,
                              product_type: design.sticker_type || 'sticker_piece',
                              quantity: 100,
                              unit: 'cái',
                              unit_price: cleanPrice,
                              subtotal: 100 * cleanPrice,
                              design_url: design.file_url || ''
                            }
                          ]
                        }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setEditFormData((prev: any) => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          {
                            product_label: 'In tem UV DTF tùy chỉnh',
                            product_type: 'sticker_piece',
                            quantity: 100,
                            unit: 'cái',
                            unit_price: 2000,
                            subtotal: 200000,
                            design_url: ''
                          }
                        ]
                      }))}
                      className="text-xs text-purple-600 hover:underline font-bold"
                    >
                      + Thêm dòng sản phẩm
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {editFormData.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-block-bg/60 border border-card-border rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-purple-600">Sản phẩm #{idx + 1}</span>
                        {editFormData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditFormData((prev: any) => ({
                              ...prev,
                              items: prev.items.filter((_: any, i: number) => i !== idx)
                            }))}
                            className="text-rose-500 hover:text-rose-700 font-bold"
                          >
                            🗑️ Xóa dòng này
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2">
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[11px] font-semibold text-text-muted">Tên mẫu tem/sản phẩm *</label>
                          <input
                            type="text"
                            value={item.product_label}
                            onChange={e => {
                              const val = e.target.value;
                              setEditFormData((prev: any) => {
                                const list = [...prev.items];
                                list[idx] = { ...list[idx], product_label: val };
                                return { ...prev, items: list };
                              });
                            }}
                            className="w-full h-8 px-2 rounded border border-card-border bg-background font-bold text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-text-muted">Loại sản phẩm</label>
                          <select
                            value={item.product_type || 'sticker_piece'}
                            onChange={e => {
                              const val = e.target.value;
                              setEditFormData((prev: any) => {
                                const list = [...prev.items];
                                list[idx] = { ...list[idx], product_type: val, unit: val === 'sticker_piece' ? 'chiếc' : (val === 'cuon' ? 'mét' : 'cái') };
                                return { ...prev, items: list };
                              });
                            }}
                            className="w-full h-8 px-2 rounded border border-card-border bg-background font-semibold text-xs"
                          >
                            <option value="sticker_piece">🏷️ Sticker Rời (Chiếc)</option>
                            <option value="dtf_sheet">📄 Tờ tem / A4 / A3</option>
                            <option value="cuon">🧵 In Cuộn (Mét dài)</option>
                            <option value="other">🎨 Khác</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-text-muted">Số lượng ({item.unit || 'cái'})</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => {
                              const q = Number(e.target.value) || 0;
                              setEditFormData((prev: any) => {
                                const list = [...prev.items];
                                const price = list[idx].unit_price || 0;
                                list[idx] = { ...list[idx], quantity: q, subtotal: Math.round(q * price) };
                                return { ...prev, items: list };
                              });
                            }}
                            className="w-full h-8 px-2 rounded border border-card-border bg-background font-bold text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-text-muted">Đơn giá bán lẻ (đ)</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={e => {
                              const p = Number(e.target.value) || 0;
                              setEditFormData((prev: any) => {
                                const list = [...prev.items];
                                const q = list[idx].quantity || 0;
                                list[idx] = { ...list[idx], unit_price: p, subtotal: Math.round(q * p) };
                                return { ...prev, items: list };
                              });
                            }}
                            className="w-full h-8 px-2 rounded border border-card-border bg-background font-bold text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-text-muted">Thành tiền (đ)</label>
                          <input
                            type="number"
                            value={item.subtotal}
                            onChange={e => {
                              const sub = Number(e.target.value) || 0;
                              setEditFormData((prev: any) => {
                                const list = [...prev.items];
                                list[idx] = { ...list[idx], subtotal: sub };
                                return { ...prev, items: list };
                              });
                            }}
                            className="w-full h-8 px-2 rounded border border-card-border bg-background font-bold text-xs text-purple-600"
                          />
                        </div>
                      </div>

                      {/* Kích thước & Link file */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-card-border/50">
                        {item.product_type === 'sticker_piece' && (
                          <div className="flex gap-1 items-center">
                            <span className="text-[11px] text-text-muted font-bold">Kích thước (cm):</span>
                            <input
                              type="number"
                              placeholder="Rộng"
                              value={item.width_cm || ''}
                              onChange={e => {
                                const w = e.target.value;
                                setEditFormData((prev: any) => {
                                  const list = [...prev.items];
                                  list[idx] = { ...list[idx], width_cm: w };
                                  return { ...prev, items: list };
                                });
                              }}
                              className="w-14 h-7 px-1 rounded border border-card-border bg-background text-center font-bold text-xs"
                            />
                            <span>×</span>
                            <input
                              type="number"
                              placeholder="Cao"
                              value={item.height_cm || ''}
                              onChange={e => {
                                const h = e.target.value;
                                setEditFormData((prev: any) => {
                                  const list = [...prev.items];
                                  list[idx] = { ...list[idx], height_cm: h };
                                  return { ...prev, items: list };
                                });
                              }}
                              className="w-14 h-7 px-1 rounded border border-card-border bg-background text-center font-bold text-xs"
                            />
                          </div>
                        )}
                        <div className="sm:col-span-2 flex gap-1 items-center">
                          <span className="text-[11px] text-text-muted shrink-0">Link File thiết kế:</span>
                          <input
                            type="text"
                            placeholder="Dán link Drive file mẫu in..."
                            value={item.design_url || ''}
                            onChange={e => {
                              const url = e.target.value;
                              setEditFormData((prev: any) => {
                                const list = [...prev.items];
                                list[idx] = { ...list[idx], design_url: url };
                                return { ...prev, items: list };
                              });
                            }}
                            className="flex-1 h-7 px-2 rounded border border-card-border bg-background text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Tổng chi phí & Vận chuyển */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider border-b border-card-border pb-1">
                  💰 Thanh toán, Vận chuyển & Ghi chú
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phí ship (đ)</label>
                    <input
                      type="number"
                      value={editFormData.shipping_fee}
                      onChange={e => setEditFormData({ ...editFormData, shipping_fee: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chiết khấu (đ)</label>
                    <input
                      type="number"
                      value={editFormData.discount}
                      onChange={e => setEditFormData({ ...editFormData, discount: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Giá vốn trả xưởng (đ)</label>
                    <input
                      type="number"
                      value={editFormData.cost_amount}
                      onChange={e => setEditFormData({ ...editFormData, cost_amount: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Đơn vị vận chuyển</label>
                    <input
                      type="text"
                      placeholder="VD: SPX Express"
                      value={editFormData.shipping_carrier}
                      onChange={e => setEditFormData({ ...editFormData, shipping_carrier: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mã vận đơn</label>
                    <input
                      type="text"
                      placeholder="VD: SPXVN069747945717"
                      value={editFormData.tracking_number}
                      onChange={e => setEditFormData({ ...editFormData, tracking_number: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ghi chú đơn hàng</label>
                    <input
                      type="text"
                      placeholder="Ghi chú cho xưởng hoặc ghi chú giao hàng..."
                      value={editFormData.customer_note}
                      onChange={e => setEditFormData({ ...editFormData, customer_note: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-card-border bg-block-bg/50 flex justify-between items-center">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tạm tính sản phẩm: <span className="text-purple-600 font-mono font-extrabold">{formatCurrency(editFormData.items.reduce((s: number, it: any) => s + (Number(it.subtotal) || 0), 0))}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-card-border font-bold text-xs hover:bg-block-bg transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditOrder}
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdit ? 'Đang lưu...' : '💾 Lưu thay đổi đơn hàng'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
