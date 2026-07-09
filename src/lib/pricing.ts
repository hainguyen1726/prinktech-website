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
      { min: 0, max: null, price: 145000, label: 'Đồng giá 145.000đ/m' },
    ],
    note: 'Ghép file vào khổ 58cm (film 60cm). Khoảng cách bế tối thiểu 5mm.',
    promotion: {
      startDate: '2026-07-10',
      endDate: '2027-07-31',
      message: '🎉 KHUYẾN MẠI ĐẶC BIỆT (10/07/2026 - 31/07/2027): Đồng giá 145.000đ/m cho mọi số lượng!',
    },
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
      { min: 20, max: 50, price: 4000, label: '20 – 49 chiếc' },
      { min: 50, max: 200, price: 2800, label: '50 – 199 chiếc' },
      { min: 200, max: 1000, price: 1900, label: '200 – 999 chiếc' },
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
      { min: 20, max: 50, price: 7000, label: '20 – 49 chiếc' },
      { min: 50, max: 200, price: 4800, label: '50 – 199 chiếc' },
      { min: 200, max: 1000, price: 3200, label: '200 – 999 chiếc' },
      { min: 1000, max: null, price: 2400, label: 'Từ 1.000 chiếc' },
    ],
    note: 'Đẹp trên mũ bảo hiểm, vali, bình giữ nhiệt. MOQ 20 chiếc.',
  },
];

export const FREE_SHIP_THRESHOLD = 150000;
export const SHIPPING_FEE_STANDARD = 35000;

export function getUnitPrice(product: Product, quantity: number): number {
  const tier = product.tiers.find(t => {
    const aboveMin = quantity >= t.min;
    const belowMax = t.max === null || quantity < t.max;
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
    const belowMax = t.max === null || quantity < t.max;
    return aboveMin && belowMax;
  }) ?? null;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Chờ xác nhận', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  confirmed: { label: 'Đã xác nhận',  color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  printing:  { label: 'Đang in',      color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  shipped:   { label: 'Đã giao ship', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30' },
  delivered: { label: 'Hoàn thành',   color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  cancelled: { label: 'Đã huỷ',       color: 'text-red-400 bg-red-400/10 border-red-400/30' },
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
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};
