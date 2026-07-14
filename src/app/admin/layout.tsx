'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

function AdminLayoutSelector({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role !== 'admin') {
            router.push('/login');
          } else {
            setAuthorized(true);
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Lỗi xác thực layout admin:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b13] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
        <Loader2 className="animate-spin text-sky-500" size={36} />
        <p className="mt-4 text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Đang xác thực quyền Admin...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b13] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
        <Loader2 className="animate-spin text-sky-500" size={36} />
        <p className="mt-4 text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Đang nạp phân hệ Admin...</p>
      </div>
    }>
      <AdminLayoutSelector>{children}</AdminLayoutSelector>
    </Suspense>
  );
}
