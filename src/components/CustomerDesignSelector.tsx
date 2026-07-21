'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, FileText, Image as ImageIcon, ExternalLink, Check, Trash2, X, Edit2, Upload, ChevronLeft, ChevronRight, Globe, User, Loader2 } from 'lucide-react';

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

const PAGE_SIZE = 8;

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
  const [scope, setScope] = useState<'customer' | 'all'>('customer');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  // Quick edit state for a row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState<number | string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal thêm mẫu mới
  const [showAddNew, setShowAddNew] = useState(false);
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignSize, setNewDesignSize] = useState('');
  const [newDesignPrice, setNewDesignPrice] = useState('');
  const [newDesignFileUrl, setNewDesignFileUrl] = useState('');
  const [newDesignNote, setNewDesignNote] = useState('');
  const [newDesignCustName, setNewDesignCustName] = useState('');
  const [newDesignCustPhone, setNewDesignCustPhone] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [submittingNew, setSubmittingNew] = useState(false);

  // Đồng bộ customerName / partnerPhone khi mở modal
  useEffect(() => {
    if (customerName) setNewDesignCustName(customerName);
    if (partnerPhone) setNewDesignCustPhone(partnerPhone);
  }, [customerName, partnerPhone]);

  const fetchDesigns = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (partnerId) params.append('partner_id', partnerId);
      if (partnerPhone) params.append('partner_phone', partnerPhone);
      if (searchTerm) params.append('search', searchTerm);
      if (scope === 'all') params.append('scope', 'all');

      const res = await fetch(`/api/admin/customer-designs?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setDesigns(json.data);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Lỗi tải kho thiết kế:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, partnerId, partnerPhone, searchTerm, scope]);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  // Xử lý upload file và tự động đổi tên file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newDesignName.trim()) {
      alert('Vui lòng nhập "Tên mẫu tem" trước khi chọn tệp để hệ thống tự động đổi tên file!');
      return;
    }

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Str = (reader.result as string).split(',')[1];
        
        const res = await fetch('/api/admin/customer-designs/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: newDesignCustName || customerName || 'Khach_Hang',
            design_name: newDesignName.trim(),
            size_label: newDesignSize.trim(),
            file_name: file.name,
            file_data: base64Str,
            mime_type: file.type
          })
        });

        const json = await res.json();
        if (json.success && json.file_url) {
          setNewDesignFileUrl(json.file_url);
          setUploadedFileName(json.renamed_filename || file.name);
        } else {
          alert(json.error || 'Upload file thất bại');
        }
        setUploadingFile(false);
      };
    } catch (err) {
      console.error('Lỗi upload file:', err);
      alert('Lỗi khi tải file lên');
      setUploadingFile(false);
    }
  };

  const handleAddNewDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesignName.trim()) {
      alert('Vui lòng nhập tên mẫu thiết kế!');
      return;
    }

    setSubmittingNew(true);
    try {
      const res = await fetch('/api/admin/customer-designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerId || null,
          partner_phone: partnerPhone || newDesignCustPhone.trim() || null,
          customer_name: customerName || newDesignCustName.trim() || null,
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
        setUploadedFileName('');
      } else {
        alert(json.error || 'Lỗi khi thêm mẫu mới');
      }
    } catch (err) {
      console.error('Lỗi tạo mẫu thiết kế:', err);
      alert('Lỗi hệ thống khi thêm mẫu mới');
    } finally {
      setSubmittingNew(false);
    }
  };

  const handleSaveRowEdit = async (designId: string, customUrl?: string) => {
    setSavingEdit(true);
    try {
      const targetUrl = customUrl !== undefined ? customUrl : editFileUrl.trim();
      const targetPrice = editUnitPrice !== '' ? Number(editUnitPrice) : undefined;
      
      const bodyPayload: Record<string, any> = { id: designId, file_url: targetUrl || null };
      if (targetPrice !== undefined && !isNaN(targetPrice)) {
        bodyPayload.unit_price = targetPrice;
      }

      const res = await fetch('/api/admin/customer-designs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const json = await res.json();
      if (json.data) {
        setDesigns(prev => prev.map(d => d.id === designId ? { ...d, file_url: json.data.file_url, unit_price: json.data.unit_price } : d));
        setEditingId(null);
      }
    } catch (err) {
      console.error('Lỗi cập nhật mẫu thiết kế:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRowFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, design: CustomerDesign) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditingId(design.id);
    setSavingEdit(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Str = (reader.result as string).split(',')[1];
        
        const res = await fetch('/api/admin/customer-designs/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: design.partners?.name || customerName || 'Khach_Hang',
            design_name: design.name,
            size_label: design.size_label || '',
            file_name: file.name,
            file_data: base64Str,
            mime_type: file.type
          })
        });

        const json = await res.json();
        if (json.success && json.file_url) {
          await handleSaveRowEdit(design.id, json.file_url);
        } else {
          alert(json.error || 'Upload file thất bại');
          setSavingEdit(false);
          setEditingId(null);
        }
      };
    } catch (err) {
      console.error('Lỗi upload file:', err);
      alert('Lỗi khi tải file lên');
      setSavingEdit(false);
      setEditingId(null);
    }
  };

  const handleDeleteDesign = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa mẫu "${name}" khỏi Kho thiết kế?`)) return;
    try {
      const res = await fetch(`/api/admin/customer-designs?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDesigns(prev => prev.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error('Lỗi xóa mẫu:', err);
    }
  };

  const handleSelect = (design: CustomerDesign) => {
    const cleanPrice = Number(design.unit_price) > 0 ? Number(design.unit_price) : 0;
    const sanitizedDesign = {
      ...design,
      unit_price: cleanPrice
    };
    setSelectedDesignId(design.id);
    onSelectDesign(sanitizedDesign);
    setTimeout(() => {
      setIsOpen(false);
      setSelectedDesignId(null);
    }, 250);
  };

  const formatVND = (n: number | string | undefined | null) => {
    const num = Number(n);
    if (isNaN(num) || num <= 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);
  };

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(designs.length / PAGE_SIZE));
  const paginatedDesigns = designs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName || "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition shadow-sm cursor-pointer"}
      >
        <span>🎨</span>
        <span>{buttonText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
          <div className="bg-card-bg border border-card-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-4 border-b border-card-border flex items-center justify-between bg-block-bg/50">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <span>🎨</span> Kho Mẫu Thiết Kế {customerName ? `— ${customerName}` : ''}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Tra cứu file thiết kế cũ, tải lên file AI/PDF tự động đổi tên và chèn trực tiếp vào lệnh in mới
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-foreground hover:bg-block-bg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Tabs & Search & Add Bar */}
            <div className="p-3.5 border-b border-card-border bg-block-bg/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScope('customer')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    scope === 'customer'
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'bg-background text-text-muted border border-card-border hover:bg-block-bg'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Mẫu của khách này</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    scope === 'all'
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'bg-background text-text-muted border border-card-border hover:bg-block-bg'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Tất cả kho mẫu</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên file, kích thước, ghi chú..."
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-card-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddNew(prev => !prev)}
                  className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddNew ? 'Đóng' : '+ Thêm mẫu mới'}</span>
                </button>
              </div>
            </div>

            {/* Form Thêm Mẫu Mới (Expandable) */}
            {showAddNew && (
              <form onSubmit={handleAddNewDesign} className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border-b border-card-border space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <span>➕ Thêm tệp thiết kế mới vào Kho</span>
                    <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">
                      Tự động đổi tên file theo chuẩn chuẩn hoá
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tên mẫu tem *</label>
                    <input
                      type="text"
                      required
                      value={newDesignName}
                      onChange={e => setNewDesignName(e.target.value)}
                      placeholder="VD: Tem Rượu Cốt Sâm Ngọc Linh"
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Kích thước</label>
                    <input
                      type="text"
                      value={newDesignSize}
                      onChange={e => setNewDesignSize(e.target.value)}
                      placeholder="VD: 5x8cm"
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Đơn giá mẫu (đ)</label>
                    <input
                      type="number"
                      value={newDesignPrice}
                      onChange={e => setNewDesignPrice(e.target.value)}
                      placeholder="VD: 2188"
                      className="w-full h-9 px-3 rounded-lg border border-card-border bg-background text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tải file thiết kế (AI/PDF)</label>
                    <div className="flex gap-1.5 items-center">
                      <label className="h-9 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shrink-0">
                        {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>{uploadingFile ? 'Tải lên...' : 'Tải file'}</span>
                        <input
                          type="file"
                          accept=".pdf,.ai,.psd,.png,.webp,.zip,.rar"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                        />
                      </label>
                      <input
                        type="text"
                        value={newDesignFileUrl}
                        onChange={e => setNewDesignFileUrl(e.target.value)}
                        placeholder="hoặc Dán link Drive..."
                        className="flex-1 h-9 px-2.5 rounded-lg border border-card-border bg-background text-xs"
                      />
                    </div>
                  </div>
                </div>

                {uploadedFileName && (
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <span>✅ File đã tải lên & tự động đổi tên thành:</span>
                    <span className="font-mono underline">{uploadedFileName}</span>
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddNew(false)}
                    className="h-8 px-3 rounded-lg border border-card-border text-xs font-bold text-text-muted hover:bg-block-bg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingNew || uploadingFile}
                    className="h-8 px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {submittingNew ? 'Đang lưu...' : '💾 Lưu mẫu vào Kho'}
                  </button>
                </div>
              </form>
            )}

            {/* Design List — TABLE VIEW */}
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="py-12 text-center text-xs text-text-muted font-medium">
                  Đang tải dữ liệu kho thiết kế...
                </div>
              ) : designs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-3xl">📂</p>
                  <p className="text-sm font-bold text-foreground">Không tìm thấy mẫu thiết kế nào trong kho</p>
                  <p className="text-xs text-text-muted">
                    {searchTerm 
                      ? 'Thử gõ từ khóa khác hoặc bấm nút "Tất cả kho mẫu"' 
                      : scope === 'customer' 
                        ? 'Khách hàng này chưa có mẫu lưu sẵn. Hãy bấm "+ Thêm mẫu mới" ở góc trên hoặc chọn "Tất cả kho mẫu".' 
                        : 'Chưa có mẫu nào trong hệ thống'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddNew(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition cursor-pointer mt-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm mẫu thiết kế mới ngay</span>
                  </button>
                </div>
              ) : (
                <div className="border border-card-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-block-bg/80 text-text-muted border-b border-card-border font-bold">
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Tên mẫu thiết kế</th>
                        <th className="py-2.5 px-3 w-28 text-center">Kích thước</th>
                        <th className="py-2.5 px-3 w-28 text-right">Đơn giá mẫu</th>
                        <th className="py-2.5 px-3 w-40">Khách hàng</th>
                        <th className="py-2.5 px-3">File in (AI/PDF)</th>
                        <th className="py-2.5 px-3 w-32 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {paginatedDesigns.map((design, idx) => {
                        const globalIndex = (currentPage - 1) * PAGE_SIZE + idx + 1;
                        const isSelected = selectedDesignId === design.id;
                        const isEditing = editingId === design.id;

                        return (
                          <tr
                            key={design.id}
                            className={`transition-colors hover:bg-block-bg/40 ${
                              isSelected ? 'bg-purple-500/10' : ''
                            }`}
                          >
                            {/* STT */}
                            <td className="py-2.5 px-3 text-center text-text-muted font-mono font-medium">
                              {globalIndex}
                            </td>

                            {/* Tên mẫu */}
                            <td className="py-2.5 px-3 font-bold text-foreground">
                              <p className="line-clamp-1">{design.name}</p>
                              {design.note && (
                                <p className="text-[10px] font-normal text-text-muted italic line-clamp-1">
                                  * {design.note}
                                </p>
                              )}
                            </td>

                            {/* Kích thước */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              {design.size_label ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                                  {design.size_label}
                                </span>
                              ) : (
                                <span className="text-text-muted/50">—</span>
                              )}
                            </td>

                            {/* Đơn giá */}
                            <td className="py-2.5 px-3 text-right font-bold text-[var(--accent)] tabular-nums">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editUnitPrice}
                                  onChange={e => setEditUnitPrice(e.target.value)}
                                  className="w-20 h-7 px-1.5 border border-card-border rounded text-right text-xs bg-background"
                                />
                              ) : (
                                formatVND(design.unit_price)
                              )}
                            </td>

                            {/* Khách hàng */}
                            <td className="py-2.5 px-3 text-text-muted">
                              {design.partners ? (
                                <div>
                                  <p className="font-semibold text-foreground truncate">{design.partners.name}</p>
                                  <p className="text-[10px] font-mono">{design.partners.phone}</p>
                                </div>
                              ) : (
                                <span className="text-text-muted/50">—</span>
                              )}
                            </td>

                            {/* Link File AI/PDF / Upload / Quick Edit */}
                            <td className="py-2.5 px-3">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editFileUrl}
                                    onChange={e => setEditFileUrl(e.target.value)}
                                    placeholder="Dán link Drive..."
                                    className="flex-1 h-7 px-2 border border-card-border rounded text-xs bg-background"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRowEdit(design.id)}
                                    disabled={savingEdit}
                                    className="h-7 px-2 rounded bg-emerald-600 text-white font-bold text-[11px]"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="h-7 px-1.5 text-text-muted hover:text-foreground text-[11px]"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : design.file_url ? (
                                <div className="flex items-center gap-2">
                                  <a
                                    href={design.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 truncate max-w-[160px]"
                                  >
                                    <span>📄 Link File</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingId(design.id);
                                      setEditFileUrl(design.file_url || '');
                                      setEditUnitPrice(design.unit_price || 0);
                                    }}
                                    className="text-text-muted hover:text-foreground p-1 rounded hover:bg-block-bg"
                                    title="Sửa link file hoặc đơn giá"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingId(design.id);
                                      setEditFileUrl('');
                                      setEditUnitPrice(design.unit_price || 0);
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                    title="Dán đường dẫn URL file"
                                  >
                                    <Globe className="w-3 h-3" />
                                    <span>Dán Link</span>
                                  </button>
                                  <span className="text-text-muted/40">|</span>
                                  <label className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
                                    <Upload className="w-3 h-3" />
                                    <span>Upload File</span>
                                    <input
                                      type="file"
                                      accept=".pdf,.ai,.psd,.cdr,.eps,.png,.jpg,.webp,.zip,.rar"
                                      className="hidden"
                                      onChange={(e) => handleRowFileUpload(e, design)}
                                    />
                                  </label>
                                </div>
                              )}
                            </td>

                            {/* Thao tác */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSelect(design)}
                                  className="h-7 px-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Chèn</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDesign(design.id, design.name)}
                                  className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition cursor-pointer"
                                  title="Xóa mẫu khỏi kho"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer & Pagination */}
            <div className="p-3 border-t border-card-border bg-block-bg/50 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-text-muted">
              <span>Hiển thị {designs.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0} - {Math.min(currentPage * PAGE_SIZE, designs.length)} trong tổng số {designs.length} mẫu</span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-card-border disabled:opacity-30 hover:bg-block-bg transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold font-mono px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-card-border disabled:opacity-30 hover:bg-block-bg transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

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
