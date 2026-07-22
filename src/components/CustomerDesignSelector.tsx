'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, FolderCheck, ExternalLink, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';

export interface CustomerDesign {
  id: string;
  customer_id: string;
  design_name: string;
  file_name: string;
  drive_file_id?: string;
  drive_file_url: string;
  preview_image_url?: string;
  product_type?: string;
  use_count: number;
}

interface Props {
  customerId?: string | null;
  customerName?: string;
  onSelectDesign: (design: CustomerDesign) => void;
  selectedDesignName?: string;
}

export default function CustomerDesignSelector({ customerId, customerName, onSelectDesign, selectedDesignName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [designs, setDesigns] = useState<CustomerDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchDesigns();
    }
  }, [isOpen, customerId]);

  const fetchDesigns = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/customer-designs?customer_id=${customerId}`);
      const data = await res.json();
      if (data.designs) {
        setDesigns(data.designs);
      }
    } catch (err) {
      console.error('Lỗi tải kho mẫu thiết kế:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDesigns = designs.filter(d => 
    d.design_name.toLowerCase().includes(query.toLowerCase()) ||
    d.file_name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          if (!customerId) {
            alert('Vui lòng chọn Khách hàng trước để xem Kho Mẫu Thiết Kế của họ!');
            return;
          }
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg border transition ${
          selectedDesignName 
            ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300' 
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-300'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <FolderCheck size={14} className={selectedDesignName ? 'text-purple-600' : 'text-slate-400'} />
          <span className="truncate">
            {selectedDesignName ? `Mẫu: ${selectedDesignName}` : '📚 Chọn mẫu cũ trong Kho của khách...'}
          </span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
          {designs.length > 0 ? `${designs.length} mẫu` : 'Kho mẫu'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden p-2">
          {/* Input Tìm kiếm */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder={`Tìm mẫu của ${customerName || 'khách'}...`}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Danh sách Mẫu */}
          <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
            {loading ? (
              <div className="py-6 flex items-center justify-center text-xs text-slate-400 gap-2">
                <Loader2 size={14} className="animate-spin text-purple-600" />
                <span>Đang tải kho mẫu...</span>
              </div>
            ) : filteredDesigns.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {query ? 'Không tìm thấy mẫu thiết kế khớp từ khóa' : 'Khách hàng này chưa lưu mẫu thiết kế nào'}
              </div>
            ) : (
              filteredDesigns.map(design => (
                <div
                  key={design.id}
                  onClick={() => {
                    onSelectDesign(design);
                    setIsOpen(false);
                  }}
                  className="group flex items-center justify-between p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {design.preview_image_url ? (
                      <img src={design.preview_image_url} alt={design.design_name} className="w-8 h-8 rounded object-cover border shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon size={14} />
                      </div>
                    )}
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 truncate">
                        {design.design_name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {design.file_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      In {design.use_count} lần
                    </span>
                    <a
                      href={design.drive_file_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1 text-slate-400 hover:text-purple-600"
                      title="Mở Google Drive"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
