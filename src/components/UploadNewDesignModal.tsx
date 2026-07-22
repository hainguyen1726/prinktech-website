'use client';

import React, { useState } from 'react';
import { UploadCloud, X, Loader2, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  onUploadSuccess: (result: { file_url: string; design_name: string; formatted_file_name: string }) => void;
}

export default function UploadNewDesignModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  customerPhone,
  onUploadSuccess
}: Props) {
  const [designName, setDesignName] = useState('');
  const [productType, setProductType] = useState('tem');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!designName) {
        // Tự động gợi ý tên mẫu từ tên file
        const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
        setDesignName(baseName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designName.trim()) {
      setError('Vui lòng nhập Tên Mẫu Thiết Kế!');
      return;
    }
    if (!file) {
      setError('Vui lòng chọn file thiết kế!');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Đọc file thành Base64 string
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const res = await fetch('/api/v2/customer-designs/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: customerId || null,
            customer_name: customerName || 'Khach_Hang',
            customer_phone: customerPhone || '0000000000',
            design_name: designName.trim(),
            product_type: productType,
            file_name: file.name,
            file_data: base64Data,
            mime_type: file.type || 'application/octet-stream'
          })
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Tải file lên Drive thất bại');
        }

        onUploadSuccess({
          file_url: data.file_url,
          design_name: designName.trim(),
          formatted_file_name: data.formatted_file_name
        });

        setDesignName('');
        setFile(null);
        onClose();
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Upload design error:', err);
      setError(err.message || 'Lỗi xử lý file');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
              <UploadCloud size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">📤 Tải Mẫu Thiết Kế Mới</h3>
              <p className="text-[11px] text-slate-500">Tự động đặt tên & lưu trữ vào Google Drive</p>
            </div>
          </div>
          <button onClick={onClose} disabled={uploading} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Tên Khách Hàng */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs flex justify-between items-center border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 font-medium">Khách hàng nhận file:</span>
            <span className="font-bold text-slate-900 dark:text-white">{customerName || 'Khách lẻ'} ({customerPhone || 'Chưa nhập SĐT'})</span>
          </div>

          {/* Tên Mẫu Thiết Kế */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên Mẫu Thiết Kế *</label>
            <input
              type="text"
              placeholder="Ví dụ: Tem Logo Mũ Bảo Hiểm 3D..."
              value={designName}
              onChange={e => setDesignName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:border-purple-600 focus:outline-none"
            />
          </div>

          {/* Chọn File */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">File thiết kế in gốc *</label>
            <div className="relative border-2 border-dashed border-purple-200 dark:border-purple-900/60 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl p-4 text-center bg-purple-50/30 dark:bg-purple-950/20 transition cursor-pointer">
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-xs">
                  <FileText size={16} />
                  <span className="truncate max-w-[240px]">{file.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud size={24} className="mx-auto text-purple-600" />
                  <div className="text-xs font-bold text-purple-600">Bấm để chọn file từ máy tính</div>
                  <p className="text-[10px] text-slate-400">Hỗ trợ PDF, AI, WebP, PNG, JPG, TIF...</p>
                </div>
              )}
            </div>
          </div>

          {/* Nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang đẩy Drive & Lưu Kho...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Tải Lên & Lưu Kho Mẫu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
