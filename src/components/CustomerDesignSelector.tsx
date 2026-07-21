'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, FileText, Image as ImageIcon, ExternalLink, Check, Trash2, X } from 'lucide-react';

export type CustomerDesign = {
  id: string;
  partner_id: string;
  name: string;
  size_label: string;
  sticker_type: string;
  file_url: string | null;
  preview_url: string | null;
  unit_price: number;
  print_count?: number;
  note: string | null;
  created_at: string;
  partners?: {
    name: string;
    phone: string;
    address: string;
  };
};

type CustomerDesignSelectorProps = {
  partnerId?: string;
  partnerPhone?: string;
  customerName?: string;
  onSelectDesign: (design: CustomerDesign) => void;
  buttonClassName?: string;
  buttonText?: string;
};

export default function CustomerDesignSelector({
  partnerId,
  partnerPhone,
  customerName,
  onSelectDesign,
  buttonClassName,
  buttonText = "🎨 Chọn từ Kho Mẫu Thiết Kế Cũ"
}: CustomerDesignSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [designs, setDesigns] = useState<CustomerDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  // Modal thêm mẫu mới
  const [showAddNew, setShowAddNew] = useState(false);
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignSize, setNewDesignSize] = useState('');
  const [newDesignPrice, setNewDesignPrice] = useState('');
  const [newDesignFileUrl, setNewDesignFileUrl] = useState('');
  const [newDesignNote, setNewDesignNote] = useState('');
  const [submittingNew, setSubmittingNew] = useState(false);

  const fetchDesigns = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (partnerId) params.append('partner_id', partnerId);
      if (partnerPhone) params.append('partner_phone', partnerPhone);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/admin/customer-designs?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setDesigns(json.data);
      }
    } catch (err) {
      console.error('Lỗi tải kho thiết kế:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, partnerId, partnerPhone, searchTerm]);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const handleAddNewDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId || !newDesignName.trim()) return;

    setSubmittingNew(true);
    try {
      const res = await fetch('/api/admin/customer-designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerId,
          name: newDesignName.trim(),
          size_label: newDesignSize.trim(),
          unit_price: Number(newDesignPrice) || 0,
          file_url: newDesignFileUrl.trim() || null,
          note: newDesignNote.trim() || null,
        })
      });

      const json = await res.json();
      if (json.data) {
        setDesigns(prev => [json.data, ...prev]);
        setShowAddNew(false);
        setNewDesignName('');
        setNewDesignSize('');
        setNewDesignPrice('');
        setNewDesignFileUrl('');
        setNewDesignNote('');
      }
    } catch (err) {
      console.error('Lỗi tạo mẫu thiết kế:', err);
    } finally {
      setSubmittingNew(false);
    }
  };

  const handleSelect = (design: CustomerDesign) => {
    setSelectedDesignId(design.id);
    onSelectDesign(design);
    setTimeout(() => {
      setIsOpen(false);
      setSelectedDesignId(null);
    }, 250);
  };

  const formatVND = (n: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName || "inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition shadow-sm cursor-pointer"}
      >
        <span>🎨</span>
        <span>{buttonText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card-bg border border-card-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-4 border-b border-card-border flex items-center justify-between bg-block-bg/50">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <span>🎨</span> Kho Mẫu Thiết Kế {customerName ? `— ${customerName}` : ''}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Tra cứu file thiết kế cũ của khách hàng và chèn trực tiếp vào lệnh in mới
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-foreground hover:bg-block-bg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Add Bar */}
            <div className="p-4 border-b border-card-border flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Gõ tên tệp thiết kế, kích thước (Ví dụ: Bát Tràng, 13x13...)..."
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-card-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {partnerId && (
                <button
                  type="button"
                  onClick={() => setShowAddNew(prev => !prev)}
                  className="h-10 px-3.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddNew ? 'Đóng' : 'Thêm mẫu mới'}</span>
                </button>
              )}
            </div>

            {/* Form Thêm Mẫu Mới (Expandable) */}
            {showAddNew && (
              <form onSubmit={handleAddNewDesign} className="p-4 bg-purple-50/40 dark:bg-purple-950/20 border-b border-card-border space-y-3">
                <p className="text-xs font-bold text-purple-700 dark:text-purple-300">➕ Thêm tệp thiết kế mới vào Kho khách hàng</p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newDesignName}
                    onChange={e => setNewDesignName(e.target.value)}
                    placeholder="Tên mẫu tem (VD: Tem Logo Bát Tràng Gờ Nổi)"
                    className="h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={newDesignSize}
                    onChange={e => setNewDesignSize(e.target.value)}
                    placeholder="Kích thước (VD: 13x13cm)"
                    className="h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                  />
                  <input
                    type="number"
                    value={newDesignPrice}
                    onChange={e => setNewDesignPrice(e.target.value)}
                    placeholder="Đơn giá mẫu (VD: 15000)"
                    className="h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={newDesignFileUrl}
                    onChange={e => setNewDesignFileUrl(e.target.value)}
                    placeholder="Link Google Drive file in AI/PDF (nếu có)"
                    className="h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddNew(false)}
                    className="h-8 px-3 rounded-lg border border-card-border text-xs font-bold text-text-muted"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingNew}
                    className="h-8 px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-bold disabled:opacity-50"
                  >
                    {submittingNew ? 'Đang lưu...' : 'Lưu mẫu mới'}
                  </button>
                </div>
              </form>
            )}

            {/* Design List / Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="py-12 text-center text-xs text-text-muted font-medium">
                  Đang tải kho mẫu thiết kế...
                </div>
              ) : designs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-3xl">🎨</p>
                  <p className="text-sm font-bold text-foreground">Chưa tìm thấy mẫu thiết kế nào</p>
                  <p className="text-xs text-text-muted">
                    {searchTerm ? 'Thử tìm kiếm với từ khoá khác' : 'Thêm mẫu thiết kế mới cho khách hàng này'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {designs.map(design => {
                    const isSelected = selectedDesignId === design.id;
                    return (
                      <div
                        key={design.id}
                        className={`p-3.5 rounded-xl border transition-all space-y-2.5 relative flex flex-col justify-between
                          ${isSelected 
                            ? 'border-[var(--accent)] bg-[var(--accent-glow)] ring-2 ring-[var(--accent)]/30' 
                            : 'border-card-border bg-block-bg hover:border-[var(--accent)]/50'
                          }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-foreground leading-snug line-clamp-2">
                              {design.name}
                            </span>
                            {design.size_label && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                                {design.size_label}
                              </span>
                            )}
                          </div>

                          {design.partners && !partnerId && (
                            <p className="text-[10px] text-text-muted font-medium">
                              👤 {design.partners.name} · 📞 {design.partners.phone}
                            </p>
                          )}

                          {design.unit_price > 0 && (
                            <p className="text-xs font-bold text-[var(--accent)] tabular-nums mt-1">
                              Đơn giá mẫu: {formatVND(design.unit_price)}
                            </p>
                          )}

                          {design.note && (
                            <p className="text-[11px] text-text-muted italic line-clamp-1">
                              * {design.note}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-card-border/60">
                          {design.file_url ? (
                            <a
                              href={design.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <span>📁 File in AI/PDF</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">Chưa gắn link file</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSelect(design)}
                            className="h-8 px-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Chèn vào đơn in</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-card-border bg-block-bg/50 flex justify-between items-center text-xs text-text-muted">
              <span>Hiển thị {designs.length} mẫu thiết kế</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-card-border font-bold hover:bg-block-bg transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
