'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect về trang quản lý website chính
    router.replace('/admin/website');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080d1a]">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-sm">Đang chuyển hướng đến trang quản trị...</p>
      </div>
    </div>
  );
}
