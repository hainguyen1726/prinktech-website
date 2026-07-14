'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { X, MessageCircle, Truck, MapPin, Clock, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';

interface OrderItem {
  product_type: string;
  product_label: string;
  size_label: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  image_url: string | null;
  design_url: string | null;
  note: string | null;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_email: string | null;
  customer_note: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  free_shipping: boolean;
  status: 'pending' | 'confirmed' | 'printing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: 'cod' | 'transfer';
  payment_status: 'unpaid' | 'paid';
  shipping_carrier: string | null;
  tracking_number: string | null;
  design_url: string | null;
  created_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  request_vat: boolean;
  vat_company_name: string | null;
  vat_tax_code: string | null;
  vat_company_address: string | null;
  vat_email: string | null;
}

const CARRIER_LABELS: Record<string, { label: string; link: (num: string) => string }> = {
  ghtk: { label: 'Giao Hàng Tiết Kiệm (GHTK)', link: (num) => `https://i.ghtk.vn/${num}` },
  viettelpost: { label: 'Viettel Post', link: (num) => `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don-hang?billCode=${num}` },
  spx: { label: 'SPX Express (Shopee Express)', link: () => `https://spx.vn/vi` },
  ahamove: { label: 'Ahamove', link: () => '#' },
  grab: { label: 'Grab Express', link: () => '#' },
  self_pickup: { label: 'Khách tự lấy tại xưởng', link: () => '#' },
  other: { label: 'Vận chuyển khác', link: () => '#' }
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Chờ xác nhận', desc: 'Đơn hàng mới được tạo và chờ kiểm tra.' },
  { key: 'confirmed', label: 'Đã xác nhận', desc: 'Xưởng đã nhận đơn và chốt file in.' },
  { key: 'printing', label: 'Đang sản xuất', desc: 'Sản phẩm đang được in UV DTF 3D.' },
  { key: 'shipped', label: 'Đang giao hàng', desc: 'Đơn hàng đã bàn giao cho đơn vị vận chuyển.' },
  { key: 'delivered', label: 'Đã hoàn thành', desc: 'Đơn hàng giao thành công.' }
];


interface TrackingLogItem {
  status_name: string;
  status_detail: string;
  locate: string;
  time: string;
}

function TrackingLogs({ carrier, trackingNumber }: { carrier: string; trackingNumber: string }) {
  const [logs, setLogs] = useState<TrackingLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!carrier || !trackingNumber) return;

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/tracking-proxy?carrier=${carrier}&code=${trackingNumber}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Không thể lấy hành trình từ đơn vị vận chuyển');
        }
        setLogs(data.logs || []);
      } catch (err: any) {
        setError(err.message || 'Lỗi kết nối đơn vị vận chuyển');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [carrier, trackingNumber]);

  if (!carrier || !trackingNumber) return null;

  return (
    <div className="mt-4 border border-card-border/60 rounded-xl bg-block-bg/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-text-muted hover:text-foreground hover:bg-block-bg/20 transition-all cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Truck size={14} className="text-purple-500 animate-pulse" />
          HÀNH TRÌNH VẬN CHUYỂN THỰC TẾ ({carrier.toUpperCase()})
        </span>
        <span className="flex items-center gap-1">
          {loading ? (
            <RefreshCw size={12} className="animate-spin text-purple-500" />
          ) : isOpen ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-card-border/40 text-xs space-y-4">
          {loading && (
            <div className="py-6 text-center text-text-muted/65 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              Đang đồng bộ hành trình thời gian thực...
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-yellow-500/10 bg-yellow-500/5 text-yellow-600 dark:text-yellow-450 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Tạm thời chưa lấy được hành trình tự động</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Bạn có thể nhấn nút "Theo dõi hành trình" ở trên để kiểm tra trực tiếp tại trang chủ {carrier.toUpperCase()}.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && logs.length === 0 && (
            <div className="py-4 text-center text-text-muted">
              Chưa có dữ liệu hành trình mới cập nhật từ {carrier.toUpperCase()}. Vui lòng quay lại sau.
            </div>
          )}

          {!loading && !error && logs.length > 0 && (
            <div className="relative pl-4 border-l-2 border-purple-500/20 space-y-5 py-1">
              {logs.map((log, idx) => {
                const isNewest = idx === 0;
                return (
                  <div key={idx} className="relative group">
                    <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border transition-all duration-300
                      ${isNewest 
                        ? 'bg-purple-500 border-purple-500 scale-125 shadow shadow-purple-500/50' 
                        : 'bg-background border-card-border/80'
                      }`} 
                    />

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold ${isNewest ? 'text-purple-400' : 'text-foreground/80'}`}>
                          {log.status_name}
                        </span>
                        {log.locate && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-block-bg border border-card-border/40 font-semibold text-text-muted flex items-center gap-1">
                            <MapPin size={10} /> {log.locate}
                          </span>
                        )}
                      </div>
                      {log.status_detail && (
                        <p className="text-text-muted/80 mt-1 leading-relaxed">{log.status_detail}</p>
                      )}
                      <p className="text-[10px] text-text-muted/60 mt-1 flex items-center gap-1">
                        <Clock size={10} /> {log.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraCuuContent() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);
  const [activeTheme, setActiveTheme] = useState<'tech' | 'creative' | 'elegant'>('elegant');

  // Load theme từ localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('prinktech-theme') || 'elegant';
    setActiveTheme(savedTheme as any);
    
    document.documentElement.classList.remove('theme-tech', 'theme-creative');
    document.body.classList.remove('theme-tech', 'theme-creative');
    if (savedTheme === 'tech') {
      document.documentElement.classList.add('theme-tech');
      document.body.classList.add('theme-tech');
    } else if (savedTheme === 'creative') {
      document.documentElement.classList.add('theme-creative');
      document.body.classList.add('theme-creative');
    }
  }, []);

  const changeTheme = (theme: 'tech' | 'creative' | 'elegant') => {
    setActiveTheme(theme);
    localStorage.setItem('prinktech-theme', theme);
    document.documentElement.classList.remove('theme-tech', 'theme-creative');
    document.body.classList.remove('theme-tech', 'theme-creative');
    if (theme === 'tech') {
      document.documentElement.classList.add('theme-tech');
      document.body.classList.add('theme-tech');
    } else if (theme === 'creative') {
      document.documentElement.classList.add('theme-creative');
      document.body.classList.add('theme-creative');
    }
  };

  // Đọc params từ URL và tự động search
  useEffect(() => {
    const p = searchParams.get('phone') || '';
    const o = searchParams.get('order') || searchParams.get('order_number') || '';
    
    if (p) setPhone(p);
    if (o) setOrderNumber(o);

    if (p.trim().length >= 9) {
      triggerSearch(p, o);
    }
  }, [searchParams]);

  const triggerSearch = async (phoneVal: string, orderVal: string) => {
    const phoneClean = phoneVal.trim().replace(/[^0-9]/g, '');
    if (!phoneClean || phoneClean.length < 9) {
      setError('Vui lòng nhập Số điện thoại hợp lệ để xác thực và bảo mật đơn hàng');
      return;
    }

    setLoading(true);
    setError(null);
    setOrders([]);
    setSearched(true);

    try {
      const params = new URLSearchParams({
        phone: phoneClean,
        order_number: orderVal.trim().toUpperCase()
      });
      const res = await fetch(`/api/orders/track?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đã xảy ra lỗi khi tìm kiếm đơn hàng');
      }

      setOrders(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(phone, orderNumber);
  };

  const getStatusIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return STATUS_STEPS.findIndex(s => s.key === status);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* ── Header Nav đầy đủ ── */}
      <Header activeTheme={activeTheme} setActiveTheme={changeTheme} />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-3xl font-black tracking-tight">
            Theo dõi{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">
              Hành trình đơn hàng
            </span>
          </h1>
          <p className="text-text-muted text-xs max-w-md mx-auto leading-relaxed">
            Để bảo mật thông tin khách hàng, vui lòng nhập **Số điện thoại** đã đặt hàng và **Mã đơn hàng** (tùy chọn) để tra cứu trạng thái sản xuất.
          </p>
        </div>

        {/* Form tra cứu */}
        <form onSubmit={handleSearch} className="mb-10 p-5 rounded-2xl border border-card-border bg-card-bg shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SĐT */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Số điện thoại *</label>
              <input
                type="tel"
                required
                placeholder="Nhập SĐT đặt hàng (ví dụ: 0987654321)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-card-border bg-block-bg text-foreground text-sm font-semibold placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Mã đơn */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Mã đơn hàng (tùy chọn)</label>
              <input
                type="text"
                placeholder="Ví dụ: PK-20260708-4122"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-card-border bg-block-bg text-foreground text-sm font-semibold placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 h-11 rounded-xl btn-primary text-sm font-bold shadow-md transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang tìm kiếm...' : 'Tra cứu hành trình 🔍'}
            </button>
          </div>
        </form>

        {/* Kết quả */}
        <div className="space-y-8">
          {loading && (
            <div className="py-20 text-center">
              <span className="inline-block w-8 h-8 border-4 border-purple-500/30 border-t-purple-550 rounded-full animate-spin" />
              <p className="text-text-muted mt-2 text-sm font-medium">Đang truy vấn dữ liệu từ xưởng...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-semibold text-center shadow-inner">
              ⚠ Lỗi: {error}
            </div>
          )}

          {searched && !loading && !error && orders.length === 0 && (
            <div className="py-16 text-center rounded-2xl border border-dashed border-card-border bg-card-bg/40">
              <p className="text-text-muted text-sm font-semibold">Không tìm thấy thông tin đơn hàng nào khớp với thông tin đã nhập.</p>
              <p className="text-text-muted/60 text-xs mt-1">Vui lòng kiểm tra lại Số điện thoại hoặc Mã đơn hàng của bạn.</p>
            </div>
          )}

          {orders.map((order) => {
            const statusIndex = getStatusIndex(order.status);
            const isCancelled = order.status === 'cancelled';

            return (
              <div key={order.id} className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-md space-y-6 transition-all hover:border-[var(--accent)]/30 duration-300 animate-fadeIn">
                
                {/* Header đơn */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-card-border/60 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Mã đơn hàng</span>
                    <h2 className="text-lg font-black text-[var(--accent)] font-mono">{order.order_number}</h2>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Ngày đặt hàng</span>
                    <p className="text-sm font-semibold text-foreground/80">
                      {new Date(order.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Trạng thái */}
                {isCancelled ? (
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-semibold flex items-center gap-2">
                    🚫 Đơn hàng này đã bị hủy bỏ.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase font-bold text-text-muted tracking-wider">Hành trình sản xuất & Giao hàng</h3>
                    
                    {/* Progress Bar - Desktop */}
                    <div className="hidden md:block relative pt-4 pb-8">
                      <div className="absolute top-7 left-0 right-0 h-1 bg-card-border/50 rounded-full" />
                      <div 
                        className="absolute top-7 left-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500" 
                        style={{ width: `${(statusIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                      />

                      <div className="relative flex justify-between">
                        {STATUS_STEPS.map((step, idx) => {
                          const isCompleted = idx <= statusIndex;
                          const isActive = idx === statusIndex;

                          return (
                            <div key={step.key} className="flex flex-col items-center group">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold z-10 border transition-all duration-300
                                ${isActive 
                                  ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white border-transparent scale-110 shadow-lg shadow-purple-500/30' 
                                  : isCompleted 
                                    ? 'bg-purple-650/10 text-purple-400 border-purple-500/35' 
                                    : 'bg-background text-text-muted/50 border-card-border/80'
                                }`}
                              >
                                {isCompleted && !isActive ? '✓' : idx + 1}
                              </div>
                              <span className={`text-[10px] font-bold mt-2 text-center max-w-[80px] absolute translate-y-7 transition-colors
                                ${isActive ? 'text-foreground' : isCompleted ? 'text-text-muted' : 'text-text-muted/40'}`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress Timeline - Mobile (Vertical) */}
                    <div className="md:hidden relative pl-6 border-l-2 border-card-border/60 space-y-6 py-2 ml-3">
                      {STATUS_STEPS.map((step, idx) => {
                        const isCompleted = idx <= statusIndex;
                        const isActive = idx === statusIndex;

                        return (
                          <div key={step.key} className="relative flex items-start gap-4">
                            {/* Point circle */}
                            <div className={`absolute -left-[35px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold z-10 border transition-all duration-300
                              ${isActive 
                                ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white border-transparent scale-110 shadow shadow-purple-500/30' 
                                : isCompleted 
                                  ? 'bg-purple-650/10 text-purple-400 border-purple-500/35' 
                                  : 'bg-background text-text-muted/40 border-card-border/60'
                              }`}
                            >
                              {isCompleted && !isActive ? '✓' : idx + 1}
                            </div>
                            
                            {/* Text content */}
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-bold ${isActive ? 'text-foreground' : isCompleted ? 'text-text-muted' : 'text-text-muted/40'}`}>
                                {step.label}
                              </h4>
                              <p className={`text-[11px] mt-0.5 leading-normal ${isActive ? 'text-text-muted' : 'text-text-muted/40'}`}>
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Vận chuyển */}
                {(order.shipping_carrier || order.tracking_number) && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-card-border bg-block-bg/50 space-y-2">
                      <h4 className="text-xs uppercase font-bold text-text-muted tracking-wider">Thông tin vận chuyển</h4>
                      <div className="text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-foreground/90">
                            📦 Đơn vị: <span className="font-bold text-foreground">{CARRIER_LABELS[order.shipping_carrier || '']?.label || 'Đang xử lý'}</span>
                          </p>
                          {order.tracking_number && (
                            <p className="text-text-muted mt-1 text-xs">
                              Mã vận đơn: <span className="font-mono font-bold text-foreground/80">{order.tracking_number}</span>
                            </p>
                          )}
                        </div>
                        {order.tracking_number && CARRIER_LABELS[order.shipping_carrier || '']?.link(order.tracking_number) !== '#' && (
                          <a
                            href={CARRIER_LABELS[order.shipping_carrier || '']?.link(order.tracking_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-lg bg-purple-650 hover:bg-purple-550 text-white text-xs font-bold shadow transition-all duration-150 inline-block text-center cursor-pointer"
                          >
                            Theo dõi hành trình 🌐
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Hiển thị hành trình chi tiết đồng bộ từ API Proxy */}
                    {order.tracking_number && (order.shipping_carrier === 'ghtk' || order.shipping_carrier === 'viettelpost') && (
                      <TrackingLogs carrier={order.shipping_carrier} trackingNumber={order.tracking_number} />
                    )}
                  </div>
                )}

                {/* Khách hàng nhận */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-4 rounded-xl border border-card-border/50 bg-block-bg/25">
                  <div className="space-y-1">
                    <span className="text-text-muted font-medium">Khách hàng nhận</span>
                    <p className="font-bold text-foreground">{order.customer_name}</p>
                    <p className="text-text-muted font-semibold">📞 {order.customer_phone}</p>
                    <p className="text-text-muted font-medium">📍 {order.customer_address}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-text-muted font-medium">Thanh toán</span>
                    <p className="font-bold text-foreground">
                      {order.payment_method === 'cod' ? '💵 COD (Thanh toán khi nhận)' : '🏦 Chuyển khoản trước'}
                    </p>
                    <p className={`font-bold inline-block px-2 py-0.5 rounded text-[10px] uppercase border mt-1
                      ${order.payment_status === 'paid' 
                        ? 'bg-emerald-550/15 text-green-600 border-green-500/20' 
                        : 'bg-rose-550/15 text-rose-500 border-rose-500/20'
                      }`}
                    >
                      {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </p>
                  </div>
                </div>

                {/* Thông tin hóa đơn VAT nếu khách yêu cầu */}
                {order.request_vat && (
                  <div className="p-4 rounded-xl border border-purple-550/20 bg-purple-500/5 text-xs space-y-2">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1">
                      📄 THÔNG TIN XUẤT HÓA ĐƠN VAT (GTGT)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-text-muted">
                      <p className="sm:col-span-2">
                        Tên công ty: <strong className="text-foreground">{order.vat_company_name}</strong>
                      </p>
                      <p>
                        Mã số thuế: <strong className="text-foreground">{order.vat_tax_code}</strong>
                      </p>
                      <p>
                        Email hóa đơn: <strong className="text-foreground">{order.vat_email}</strong>
                      </p>
                      <p className="sm:col-span-2">
                        Địa chỉ: <strong className="text-foreground">{order.vat_company_address}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Sản phẩm */}
                <div className="space-y-2.5">
                  <h3 className="text-xs uppercase font-bold text-text-muted tracking-wider">Sản phẩm trong đơn</h3>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-3 rounded-xl border border-card-border bg-block-bg/20">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">{item.product_label}</p>
                          <p className="text-text-muted text-[11px] font-semibold mt-0.5">
                            Số lượng: {item.quantity} {item.unit}
                            {item.size_label ? ` · Cỡ: ${item.size_label}` : ''}
                          </p>
                          {item.note && <p className="text-amber-600 italic text-[11px] mt-0.5">Ghi chú: {item.note}</p>}
                        </div>
                        <span className="font-black text-foreground shrink-0 pl-3">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-card-border/40 flex flex-col items-end text-xs space-y-1 font-semibold text-text-muted">
                    <div className="flex justify-between w-full sm:max-w-[240px]">
                      <span>Tạm tính:</span>
                      <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between w-full sm:max-w-[240px]">
                      <span>Vận chuyển:</span>
                      <span className="text-foreground">{order.free_shipping ? 'Miễn phí' : formatCurrency(order.shipping_fee)}</span>
                    </div>
                    <div className="flex justify-between w-full sm:max-w-[240px] text-sm font-black pt-1.5 border-t border-card-border text-[var(--accent)]">
                      <span>Tổng cộng:</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TraCuuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-550 rounded-full animate-spin" />
      </div>
    }>
      <TraCuuContent />
    </Suspense>
  );
}
