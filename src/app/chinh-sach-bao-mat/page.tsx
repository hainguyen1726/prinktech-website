import { Metadata } from 'next';
import ChinhSachBaoMatPage from './ChinhSachBaoMatPage';

const BASE_URL = 'https://prinktech.netslive.com';

export const metadata: Metadata = {
  title: 'Chính Sách Bảo Mật Dữ Liệu | PrinK Tech',
  description:
    'PrinK Tech cam kết bảo vệ thông tin cá nhân của khách hàng theo Nghị định 13/2023/NĐ-CP. Tìm hiểu cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.',
  keywords: [
    'chính sách bảo mật PrinK Tech',
    'bảo vệ dữ liệu cá nhân',
    'quyền riêng tư khách hàng',
    'Nghị định 13/2023',
    'bảo mật thông tin in ấn',
  ],
  alternates: {
    canonical: `${BASE_URL}/chinh-sach-bao-mat`,
  },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/chinh-sach-bao-mat`,
    title: 'Chính Sách Bảo Mật Dữ Liệu | PrinK Tech',
    description:
      'PrinK Tech cam kết bảo vệ thông tin cá nhân của khách hàng theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân tại Việt Nam.',
    siteName: 'PrinK Tech – Xưởng In UV DTF',
  },
};

export default function Page() {
  return <ChinhSachBaoMatPage />;
}
