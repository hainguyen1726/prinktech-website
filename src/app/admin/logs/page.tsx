'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, ShieldAlert, User, Clock, 
  Settings, RefreshCw, ChevronLeft, ChevronRight,
  Database, Plus, Pencil, Trash2, CheckCircle2, Key
} from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  target_type: string;
  target_id: string | null;
  description: string;
  details: any | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  'create_order': '➕ Tạo đơn hàng B2B',
  'create_customer_order': '🛍️ Tạo đơn bán lẻ',
  'update_status': '🔄 Đổi trạng thái đơn',
  'delete_order': '❌ Xóa đơn hàng',
  'change_price': '💰 Thay đổi cấu hình giá',
  'create_expense': '💸 Thêm chi phí',
  'delete_expense': '🗑️ Xóa chi phí',
  'login': '🔑 Đăng nhập',
  'update_partner_price': '📈 Đổi đơn giá đối tác'
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  'order': 'Đơn hàng B2B',
  'customer_order': 'Đơn bán lẻ online',
  'partner': 'Đối tác',
  'expense': 'Chi phí Sale Online',
  'price': 'Bảng giá Sticker',
  'auth': 'Hệ thống Xác thực'
};

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(30);
  
  const [actionFilter, setActionFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/logs?limit=${limit}&offset=${offset}&action=${actionFilter}&target_type=${targetFilter}`);
      if (res.ok) {
        const result = await res.json();
        setLogs(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (err) {
      console.error('Lỗi tải activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [offset, limit, actionFilter, targetFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filter changes
  useEffect(() => {
    setOffset(0);
  }, [actionFilter, targetFilter]);

  const handlePrevPage = () => {
    if (offset >= limit) {
      setOffset(prev => prev - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(prev => prev + limit);
    }
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-purple-600" size={24} /> Nhật ký Hoạt động (Logs)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lịch sử theo dõi thao tác nghiệp vụ, đơn hàng, cấu hình giá và chi phí
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading} 
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300 disabled:opacity-50 w-fit"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hành động</label>
          <select 
            value={actionFilter} 
            onChange={e => setActionFilter(e.target.value)}
            className="text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-600"
          >
            <option value="all">Tất cả hành động</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đối tượng tác động</label>
          <select 
            value={targetFilter} 
            onChange={e => setTargetFilter(e.target.value)}
            className="text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-600"
          >
            <option value="all">Tất cả đối tượng</option>
            {Object.entries(TARGET_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
          Tổng số log ghi nhận: <span className="text-purple-600 dark:text-purple-400 font-bold">{total}</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Thời gian</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Người thực hiện</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Hành động</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Loại đối tượng</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Mô tả chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr 
                  key={log.id} 
                  className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      {log.user_name}
                      <span className="text-[9px] px-1 bg-slate-100 dark:bg-slate-850 rounded text-slate-500 ml-1">
                        {log.user_id === 'website-admin-thanh' ? 'Thanh' : 'Admin'}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {TARGET_TYPE_LABELS[log.target_type] || log.target_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                    {log.description}
                    {log.details && (
                      <details className="mt-1 opacity-60 cursor-pointer hover:opacity-100">
                        <summary className="text-[10px] text-purple-600 dark:text-purple-400 font-bold select-none">Xem payload chi tiết JSON</summary>
                        <pre className="mt-1 p-2 rounded bg-slate-900 text-[10px] text-purple-300 overflow-x-auto whitespace-pre font-mono leading-normal">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">
                    <Database className="mx-auto text-slate-300 mb-2" size={32} />
                    Chưa ghi nhận logs hệ thống nào khớp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10">
            <button
              onClick={handlePrevPage}
              disabled={offset === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-40 transition"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <span className="text-xs font-semibold text-slate-500">
              Hiển thị {offset + 1} - {Math.min(offset + limit, total)} trên {total} logs
            </span>
            <button
              onClick={handleNextPage}
              disabled={offset + limit >= total}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-40 transition"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
