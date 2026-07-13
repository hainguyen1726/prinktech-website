import type { Metadata } from 'next';
import CustomerList from '@/components/CustomerList';

export const metadata: Metadata = {
  title: 'Quản Lý Khách Hàng & Đơn Hàng | Admin PrinK Tech',
  description: 'Quản lý thông tin khách hàng, chi tiết đơn đặt hàng và link thiết kế của xưởng in PrinK Tech.',
};

export default function AdminKhachHangPage() {
  return <CustomerList />;
}
