// Pricing config cho PrinK Tech UV DTF 3D
// Dùng chung cho calculator, order form, và báo giá
// Cập nhật: 09/07/2026 - Giá mới + Khuyến mại 145k/m (10/07/2026 - 31/07/2027)

export type ProductType = 'cuon' | 'a4' | 'a3' | 'tem-nho' | 'tem-tb' | 'tem-lon';

export type TierPrice = {
  min: number;
  max: number | null;
  price: number;
  label: string;
};

export type Product = {
  type: ProductType;
  label: string;
  shortLabel: string;
  unit: string;
  unitLabel: string;
  minQty: number;
  icon: string;
  description: string;
  tiers: TierPrice[];
  note?: string;
  promotion?: {
    startDate: string;
    endDate: string;
    message: string;
  };
};

export const PRODUCTS: Product[] = [
  {
    type: 'cuon',
    label: 'In cuộn mét dài (Khổ 60cm)',
    shortLabel: 'In cuộn 60cm',
    unit: 'mét',
    unitLabel: 'mét dài',
    minQty: 0.5,
    icon: '🧵',
    description: 'Khách tự ghép file, xưởng in theo mét dài khổ rộng 60cm',
    tiers: [
      { min: 1,    max: 1.9,  price: 290000, label: '1 – 1.9 mét' },
      { min: 2,    max: 5,    price: 250000, label: '2 – 5 mét' },
      { min: 6,    max: 20,   price: 190000, label: '6 – 20 mét' },
      { min: 21,   max: 30,   price: 170000, label: '21 – 30 mét' },
      { min: 30,   max: 49,   price: 160000, label: '30 – 49 mét' },
      { min: 50,   max: null, price: 145000, label: 'Từ 50 mét trở lên' },
    ],
    note: 'Ghép file vào khổ 58cm (film 60cm). Khoảng cách bế tối thiểu 5mm.',
  },
  {
    type: 'a4',
    label: 'In tờ khổ A4 (20×28cm)',
    shortLabel: 'Tờ A4',
    unit: 'tờ',
    unitLabel: 'tờ',
    minQty: 1,
    icon: '📄',
    description: 'In sẵn theo tờ A4, xưởng dàn trang tối ưu',
    tiers: [
      { min: 1, max: 4, price: 45000, label: '1 – 4 tờ' },
      { min: 5, max: 49, price: 39000, label: '5 – 49 tờ' },
      { min: 50, max: null, price: 28000, label: '≥ 50 tờ' },
    ],
    note: '1 mét cuộn 60cm xếp được ~10 tờ A4',
  },
  {
    type: 'a3',
    label: 'In tờ khổ A3 (29×40cm)',
    shortLabel: 'Tờ A3',
    unit: 'tờ',
    unitLabel: 'tờ',
    minQty: 1,
    icon: '🗒️',
    description: 'In sẵn theo tờ A3 kích thước lớn',
    tiers: [
      { min: 1, max: 4, price: 80000, label: '1 – 4 tờ' },
      { min: 5, max: 49, price: 65000, label: '5 – 49 tờ' },
      { min: 50, max: null, price: 50000, label: '≥ 50 tờ' },
    ],
    note: '1 mét cuộn 60cm xếp được ~5 tờ A3',
  },
  {
    type: 'tem-nho',
    label: 'Tem nhỏ đã bế sẵn (≤3×3cm)',
    shortLabel: 'Tem nhỏ ≤3cm',
    unit: 'chiếc',
    unitLabel: 'chiếc',
    minQty: 20,
    icon: '🏷️',
    description: 'Tem nhỏ cắt bế sẵn từng con, kích thước ≤3×3cm',
    tiers: [
      { min: 20, max: 49, price: 2500, label: '20 – 49 chiếc' },
      { min: 50, max: 100, price: 1600, label: '50 – 100 chiếc' },
      { min: 200, max: 999, price: 1100, label: '200 – 999 chiếc' },
      { min: 1000, max: null, price: 500, label: '≥ 1.000 chiếc' },
    ],
    note: 'MOQ tối thiểu 20 chiếc. Giá / 1 chiếc tem đã bế sẵn.',
  },
  {
    type: 'tem-tb',
    label: 'Tem trung bình (4×4 – 5×5cm)',
    shortLabel: 'Tem 4–5cm',
    unit: 'chiếc',
    unitLabel: 'chiếc',
    minQty: 20,
    icon: '✨',
    description: 'Tem đã bế sẵn kích thước 4×4cm đến 5×5cm — nổi 3D đẹp',
    tiers: [
      { min: 20, max: 49, price: 4000, label: '20 – 49 chiếc' },
      { min: 50, max: 199, price: 2800, label: '50 – 199 chiếc' },
      { min: 200, max: 999, price: 1900, label: '200 – 999 chiếc' },
      { min: 1000, max: null, price: 1300, label: 'Từ 1.000 chiếc' },
    ],
    note: 'Độ gờ nổi 3D sờ gân rõ, sướng tay. MOQ 20 chiếc.',
  },
  {
    type: 'tem-lon',
    label: 'Tem lớn đã bế sẵn (6×6 – 8×8cm)',
    shortLabel: 'Tem lớn 6–8cm',
    unit: 'chiếc',
    unitLabel: 'chiếc',
    minQty: 20,
    icon: '🌟',
    description: 'Tem kích thước lớn 6–8cm, đẹp trên mũ bảo hiểm và vali',
    tiers: [
      { min: 20, max: 49, price: 7000, label: '20 – 49 chiếc' },
      { min: 50, max: 199, price: 4800, label: '50 – 199 chiếc' },
      { min: 200, max: 999, price: 3200, label: '200 – 999 chiếc' },
      { min: 1000, max: null, price: 2400, label: 'Từ 1.000 chiếc' },
    ],
    note: 'Đẹp trên mũ bảo hiểm, vali, bình giữ nhiệt. MOQ 20 chiếc.',
  },
];

export const FREE_SHIP_THRESHOLD = 300000;
export const SHIPPING_FEE_STANDARD = 35000;

export function convertPriceItemsToProducts(priceItems: any[]): Product[] {
  if (!Array.isArray(priceItems) || priceItems.length === 0) {
    return PRODUCTS;
  }

  return priceItems.map((item) => {
    const material = item.material_name || '';
    const unit = item.unit || 'cái';
    const isMet = material.toLowerCase().includes('mét');
    const isA4 = material.toUpperCase().includes('A4');
    const isA3 = material.toUpperCase().includes('A3');
    const isTemNho = material.toLowerCase().includes('nhỏ');
    const isTemTB = material.toLowerCase().includes('trung bình');
    const isTemLon = material.toLowerCase().includes('lớn');

    let type: ProductType = 'cuon';
    let icon = '🧵';
    let shortLabel = material;
    let description = 'Sản phẩm in UV DTF 3D PrinK Tech';
    let note = '';
    let minQty = 1;

    if (isMet) {
      type = 'cuon';
      shortLabel = 'In cuộn 60cm';
      icon = '🧵';
      description = 'Khách tự ghép file, xưởng in theo mét dài khổ rộng 60cm';
      note = 'Ghép file vào khổ 58cm (film 60cm). Khoảng cách bế tối thiểu 5mm.';
      minQty = 0.5;
    } else if (isA4) {
      type = 'a4';
      shortLabel = 'Tờ A4';
      icon = '📄';
      description = 'In sẵn theo tờ A4, xưởng dàn trang tối ưu';
      note = '1 mét cuộn 60cm xếp được ~10 tờ A4';
      minQty = 1;
    } else if (isA3) {
      type = 'a3';
      shortLabel = 'Tờ A3';
      icon = '🗒️';
      description = 'In sẵn theo tờ A3 kích thước lớn';
      note = '1 mét cuộn 60cm xếp được ~5 tờ A3';
      minQty = 1;
    } else if (isTemNho) {
      type = 'tem-nho';
      shortLabel = 'Tem nhỏ ≤3cm';
      icon = '🏷️';
      description = 'Tem nhỏ cắt bế sẵn từng con, kích thước ≤3×3cm';
      note = 'MOQ tối thiểu 20 chiếc. Giá / 1 chiếc tem đã bế sẵn.';
      minQty = 20;
    } else if (isTemTB) {
      type = 'tem-tb';
      shortLabel = 'Tem 4–5cm';
      icon = '✨';
      description = 'Tem đã bế sẵn kích thước 4×4cm đến 5×5cm — nổi 3D đẹp';
      note = 'Độ gờ nổi 3D sờ gân rõ, sướng tay. MOQ 20 chiếc.';
      minQty = 20;
    } else if (isTemLon) {
      type = 'tem-lon';
      shortLabel = 'Tem lớn 6–8cm';
      icon = '🌟';
      description = 'Tem kích thước lớn 6–8cm, đẹp trên mũ bảo hiểm và vali';
      note = 'Đẹp trên mũ bảo hiểm, vali, bình giữ nhiệt. MOQ 20 chiếc.';
      minQty = 20;
    }

    const priceSheet = Array.isArray(item.price_sheet)
      ? item.price_sheet
      : (typeof item.price_sheet === 'string' ? JSON.parse(item.price_sheet) : []);

    const tiers: TierPrice[] = priceSheet.map((r: any) => {
      const min = Number(r.min) || 0;
      const max = (r.max === null || r.max === undefined || r.max === '' || Number(r.max) >= 99999 || String(r.max).toLowerCase() === 'max')
        ? null
        : Number(r.max);

      let label = '';
      if (max === null) {
        label = min <= 1 ? 'Mọi số lượng' : isMet ? `Từ ${min} mét trở lên` : `≥ ${min.toLocaleString('vi-VN')} ${unit}`;
      } else if (min === max) {
        label = `${min} ${unit}`;
      } else {
        label = isMet ? `Từ ${min} – ${max} m` : `${min} – ${max}`;
      }

      return {
        min,
        max,
        price: Number(r.price) || 0,
        label
      };
    });

    return {
      type,
      label: item.material_name || shortLabel,
      shortLabel,
      unit,
      unitLabel: isMet ? 'mét dài' : unit,
      minQty,
      icon,
      description,
      tiers,
      note
    };
  });
}

export function getUnitPrice(product: Product, quantity: number): number {
  const tier = product.tiers.find(t => {
    const aboveMin = quantity >= t.min;
    const belowMax = t.max === null || quantity <= t.max;
    return aboveMin && belowMax;
  });
  return tier?.price ?? 0;
}

export function calcSubtotal(product: Product, quantity: number): number {
  return getUnitPrice(product, quantity) * quantity;
}

export function getActiveTier(product: Product, quantity: number): TierPrice | null {
  return product.tiers.find(t => {
    const aboveMin = quantity >= t.min;
    const belowMax = t.max === null || quantity <= t.max;
    return aboveMin && belowMax;
  }) ?? null;
}

export function formatCurrency(amount: any): string {
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_file:     { label: 'Chờ file thiết kế', color: 'text-amber-800 bg-amber-50 border-amber-200 font-extrabold' },
  pending:          { label: 'Chờ xác nhận',      color: 'text-yellow-800 bg-yellow-50 border-yellow-200 font-extrabold' },
  processing:       { label: 'Đang xử lý',        color: 'text-blue-800 bg-blue-50 border-blue-200 font-extrabold' },
  confirmed:        { label: 'Đã xác nhận',       color: 'text-indigo-800 bg-indigo-50 border-indigo-200 font-extrabold' },
  printing:         { label: 'Đang in',           color: 'text-purple-800 bg-purple-50 border-purple-200 font-extrabold' },
  pending_delivery: { label: 'Chờ giao hàng',     color: 'text-sky-800 bg-sky-50 border-sky-200 font-extrabold' },
  delivering:       { label: 'Đang giao hàng',    color: 'text-cyan-800 bg-cyan-50 border-cyan-200 font-extrabold' },
  shipped:          { label: 'Đã giao ship',      color: 'text-teal-800 bg-teal-50 border-teal-200 font-extrabold' },
  delivered:        { label: 'Hoàn thành',        color: 'text-emerald-800 bg-emerald-50 border-emerald-200 font-extrabold' },
  completed:        { label: 'Hoàn thành',        color: 'text-emerald-800 bg-emerald-50 border-emerald-200 font-extrabold' },
  cancelled:        { label: 'Đã huỷ',            color: 'text-red-800 bg-red-50 border-red-200 font-extrabold' },
};

export type OrderItem = {
  product_type: ProductType;
  product_label: string;
  size_label: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  image_url: string | null;
  design_url: string | null;
  note: string | null;
};

export type Order = {
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
  status: string;
  payment_method: string;
  payment_status: string;
  design_url: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  converted_length?: number;
  cost_amount?: number;
  packaging_fee?: number;
  source?: string;
  has_vat?: boolean;
  tags?: string[];
  note?: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};