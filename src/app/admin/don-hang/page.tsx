import type { Metadata } from 'next';
import OrderList from '@/components/OrderList';

export const metadata: Metadata = {
  title: 'Danh Sách Đơn Hàng | Admin PrinK Tech',
  description: 'Trang quản lý đơn hàng đặt in UV DTF 3D nổi của xưởng in PrinK Tech.',
};

export default function AdminDonHangPage() {
  return <OrderList />;
}
