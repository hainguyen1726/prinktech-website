import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import GalleryContent from '@/components/GalleryContent';

export const metadata: Metadata = {
  title: 'Thư Viện Ảnh Mẫu Sản Phẩm Thực Tế | In UV DTF PrinK Tech',
  description: 'Kho lưu trữ toàn bộ ảnh chụp sản phẩm mẫu in tem UV DTF nổi 3D dán ly, cốc, mũ bảo hiểm, xe máy, bình giữ nhiệt thực tế tại xưởng PrinK Tech.',
  alternates: {
    canonical: 'https://prinktech.netslive.com/thu-vien-anh',
  },
};

interface SampleItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
}

export default async function ThuVienAnhPage() {
  let samples: SampleItem[] = [];

  try {
    const manifestPath = path.join(process.cwd(), 'public', 'images', 'samples', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const fileContent = fs.readFileSync(manifestPath, 'utf-8');
      samples = JSON.parse(fileContent);
    }
  } catch (err) {
    console.error('Lỗi đọc manifest ảnh mẫu thực tế:', err);
  }

  return <GalleryContent initialSamples={samples} />;
}
