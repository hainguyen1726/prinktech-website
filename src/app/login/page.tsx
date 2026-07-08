'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      // Đăng nhập thành công, điều hướng sang trang quản trị website
      const role = data.user.role;
      if (role === 'partner') {
        setError('Tài khoản đối tác không có quyền truy cập quản trị website.');
        // Đăng xuất ngay lập tức
        await fetch('/api/auth/logout', { method: 'POST' });
      } else {
        router.push('/admin/website');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative min-h-screen bg-[#080d1a]">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-card p-8 relative z-10 shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/logo-horizontal.png" alt="PrinK Tech" className="h-16 object-contain" />
          </div>
          <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-widest font-bold">
            Portal Quản trị Nội dung Website
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs px-4 py-2.5 rounded-xl text-center font-bold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="loginEmail" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-3.5 text-slate-500" aria-hidden="true" />
              <input
                id="loginEmail"
                name="email"
                type="text"
                autoComplete="username"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ví dụ: admin@netslive.com…"
                disabled={loading}
                className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 custom-input transition duration-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="loginPassword" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Mật khẩu
              </label>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-500" aria-hidden="true" />
              <input
                id="loginPassword"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn…"
                disabled={loading}
                className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 custom-input transition duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 py-3 rounded-xl font-bold text-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Đang xác thực…
              </>
            ) : (
              'Đăng nhập hệ thống'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-slate-900/60">
          <p className="text-[10px] text-slate-500">
            Dành cho quản trị viên và nhân viên vận hành xưởng
          </p>
        </div>
      </div>
    </div>
  );
}
