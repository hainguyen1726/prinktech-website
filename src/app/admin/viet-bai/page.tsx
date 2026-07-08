'use client';

import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Eye, Globe, X, CheckCircle, AlertCircle,
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2,
  Heading3, Link as LinkIcon, Image as ImageIcon, Quote, Code,
  Loader2, RefreshCw, Sparkles, Search, BarChart2
} from 'lucide-react';

// =================== HELPERS ===================
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// =================== SEO SCORE ===================
function calcSeoScore(data: {
  title: string; metaDesc: string; slug: string;
  content: string; keyword: string; coverImage: string; summary: string;
}): { score: number; checks: { label: string; ok: boolean; info: string }[] } {
  const kw = data.keyword.toLowerCase().trim();
  const titleLower = data.title.toLowerCase();
  const contentText = stripHtml(data.content).toLowerCase();
  const checks = [
    {
      label: 'Tiêu đề chứa từ khóa chính',
      ok: kw.length > 0 && titleLower.includes(kw),
      info: 'Từ khóa nên xuất hiện trong tiêu đề bài viết',
    },
    {
      label: 'Độ dài tiêu đề (50–60 ký tự)',
      ok: data.title.length >= 50 && data.title.length <= 65,
      info: `Hiện tại: ${data.title.length} ký tự`,
    },
    {
      label: 'Mô tả SEO (150–160 ký tự)',
      ok: data.metaDesc.length >= 120 && data.metaDesc.length <= 165,
      info: `Hiện tại: ${data.metaDesc.length} ký tự`,
    },
    {
      label: 'Mô tả SEO chứa từ khóa',
      ok: kw.length > 0 && data.metaDesc.toLowerCase().includes(kw),
      info: 'Từ khóa nên xuất hiện trong meta description',
    },
    {
      label: 'Slug chuẩn URL (kebab-case)',
      ok: data.slug.length > 0 && /^[a-z0-9-]+$/.test(data.slug),
      info: 'URL chỉ dùng chữ thường và dấu gạch ngang',
    },
    {
      label: 'Nội dung >= 600 từ',
      ok: countWords(contentText) >= 300,
      info: `Hiện tại: ${countWords(contentText)} từ (nên có ≥600 từ cho bài SEO)`,
    },
    {
      label: 'Từ khóa trong nội dung',
      ok: kw.length > 0 && contentText.includes(kw),
      info: 'Từ khóa chính nên xuất hiện tự nhiên trong bài',
    },
    {
      label: 'Có ảnh bìa (cover image)',
      ok: data.coverImage.trim().length > 0,
      info: 'Ảnh bìa giúp tăng CTR khi hiển thị trên Google',
    },
    {
      label: 'Có mô tả ngắn (excerpt)',
      ok: data.summary.trim().length >= 50,
      info: 'Tóm tắt giúp người đọc biết nội dung bài trước khi click',
    },
  ];
  const passed = checks.filter(c => c.ok).length;
  return { score: Math.round((passed / checks.length) * 100), checks };
}

// =================== TOOLBAR ===================
function ToolbarBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" title={title} onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
    >
      {children}
    </button>
  );
}

// =================== MAIN CONTENT ===================
function VietBaiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const editorRef = useRef<HTMLDivElement>(null);

  // Auth
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Bài viết
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [author, setAuthor] = useState('PrinK Tech');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [content, setContent] = useState('');

  // SEO
  const [keyword, setKeyword] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [metaDescManual, setMetaDescManual] = useState(false);

  // UI
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [activePanel, setActivePanel] = useState<'seo' | 'settings'>('seo');

  // Auth check
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user && d.user.role === 'admin') { setAuthorized(true); } else { router.push('/login'); }
    }).catch(() => router.push('/login')).finally(() => setAuthLoading(false));
  }, [router]);

  // Load bài cũ khi edit
  useEffect(() => {
    if (!editId || !authorized) return;
    fetch(`/api/web/posts/${editId}`).then(r => r.json()).then(d => {
      const p = d.post;
      if (!p) return;
      setTitle(p.title || '');
      setSlug(p.slug || '');
      setSlugManual(true);
      setSummary(p.summary || '');
      setCoverImage(p.cover_image || '');
      setAuthor(p.author || 'PrinK Tech');
      setStatus(p.status || 'draft');
      setContent(p.content || '');
      setMetaDesc(p.summary || '');
      if (editorRef.current) editorRef.current.innerHTML = p.content || '';
    });
  }, [editId, authorized]);

  // Auto slug từ title
  useEffect(() => {
    if (!slugManual && title) setSlug(slugify(title));
  }, [title, slugManual]);

  // Auto meta desc từ summary
  useEffect(() => {
    if (!metaDescManual && summary) setMetaDesc(summary.slice(0, 160));
  }, [summary, metaDescManual]);

  // Sync content từ editor
  const handleEditorInput = useCallback(() => {
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  }, []);

  // Toolbar actions
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    handleEditorInput();
  };

  const insertBlock = (tag: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const el = document.createElement(tag);
    el.innerHTML = sel.toString() || 'Nội dung';
    range.deleteContents();
    range.insertNode(el);
    handleEditorInput();
  };

  const insertLink = () => {
    const url = prompt('Nhập URL liên kết:');
    if (url) exec('createLink', url);
  };

  // Lưu bài
  const handleSave = async (publishNow = false) => {
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề bài viết!'); return; }
    if (!slug.trim()) { setError('Vui lòng nhập slug URL!'); return; }
    setSaving(true); setError('');
    const finalContent = editorRef.current?.innerHTML || content;
    const payload: any = {
      title, slug, summary,
      cover_image: coverImage,
      content: finalContent,
      author, status: publishNow ? 'published' : status,
    };
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `/api/web/posts/${editId}` : '/api/web/posts';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu bài');
      setSaved(true);
      if (publishNow) setStatus('published');
      setTimeout(() => setSaved(false), 3000);
      if (!editId && data.post?.id) {
        router.replace(`/admin/viet-bai?id=${data.post.id}`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const seo = calcSeoScore({ title, metaDesc, slug, content, keyword, coverImage, summary });
  const scoreColor = seo.score >= 75 ? 'text-emerald-400' : seo.score >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = seo.score >= 75 ? 'bg-emerald-500' : seo.score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  if (authLoading) return (
    <div className="min-h-screen bg-[#080d1a] flex items-center justify-center">
      <Loader2 className="animate-spin text-sky-400" size={32} />
    </div>
  );
  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 flex flex-col">

      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-[#0a0f1e]/95 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/website" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-sm font-black text-white">
                {editId ? '✏️ Chỉnh sửa bài viết' : '✍️ Viết bài mới'}
              </h1>
              <p className="text-[10px] text-slate-500">
                {status === 'published' ? '🟢 Đã đăng' : '🟡 Bản nháp'} · {countWords(stripHtml(content))} từ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* SEO score badge */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800`}>
              <BarChart2 size={13} className={scoreColor} />
              <span className={`text-xs font-black ${scoreColor}`}>{seo.score}%</span>
              <span className="text-[10px] text-slate-500">SEO</span>
            </div>

            <button onClick={() => setShowPreview(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-bold transition">
              <Eye size={14} /> Xem trước
            </button>

            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-bold transition disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? 'Đã lưu ✓' : 'Lưu nháp'}
            </button>

            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition disabled:opacity-50 shadow-lg shadow-sky-500/20">
              <Globe size={14} /> Đăng bài
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-2 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">

        {/* === CENTER: Editor === */}
        <main className="flex-1 min-w-0 flex flex-col">

          {/* Cover image preview */}
          {coverImage && (
            <div className="relative h-48 overflow-hidden border-b border-slate-800/60">
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent" />
            </div>
          )}

          <div className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full space-y-6">
            {/* Tiêu đề bài */}
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tiêu đề bài viết (nên chứa từ khóa chính)…"
              rows={2}
              className="w-full bg-transparent text-3xl md:text-4xl font-black text-white placeholder-slate-700 border-none outline-none resize-none leading-tight"
            />

            {/* Tóm tắt */}
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Tóm tắt bài viết (excerpt) — 120–160 ký tự, hiển thị dưới title trên Google…"
              rows={2}
              className="w-full bg-transparent text-sm text-slate-400 placeholder-slate-700 border-b border-slate-800/60 pb-4 outline-none resize-none leading-relaxed"
            />

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-1.5 rounded-xl bg-slate-900/60 border border-slate-800/60 sticky top-16 z-10">
              <ToolbarBtn title="In đậm" onClick={() => exec('bold')}><Bold size={15} /></ToolbarBtn>
              <ToolbarBtn title="In nghiêng" onClick={() => exec('italic')}><Italic size={15} /></ToolbarBtn>
              <ToolbarBtn title="Gạch chân" onClick={() => exec('underline')}><Underline size={15} /></ToolbarBtn>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <ToolbarBtn title="Heading H2" onClick={() => insertBlock('h2')}><Heading2 size={15} /></ToolbarBtn>
              <ToolbarBtn title="Heading H3" onClick={() => insertBlock('h3')}><Heading3 size={15} /></ToolbarBtn>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <ToolbarBtn title="Danh sách gạch đầu dòng" onClick={() => exec('insertUnorderedList')}><List size={15} /></ToolbarBtn>
              <ToolbarBtn title="Danh sách số" onClick={() => exec('insertOrderedList')}><ListOrdered size={15} /></ToolbarBtn>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <ToolbarBtn title="Trích dẫn" onClick={() => insertBlock('blockquote')}><Quote size={15} /></ToolbarBtn>
              <ToolbarBtn title="Code" onClick={() => insertBlock('code')}><Code size={15} /></ToolbarBtn>
              <ToolbarBtn title="Thêm liên kết" onClick={insertLink}><LinkIcon size={15} /></ToolbarBtn>
              <div className="ml-auto text-[10px] text-slate-600 pr-2">
                {countWords(stripHtml(content))} từ
              </div>
            </div>

            {/* Content Editor */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              data-placeholder="Bắt đầu viết nội dung bài viết tại đây…&#10;&#10;💡 Gợi ý cấu trúc bài chuẩn SEO:&#10;• H2: Giới thiệu vấn đề / từ khóa chính&#10;• H2: Nội dung chi tiết (chia nhỏ thành H3)&#10;• H2: Lợi ích / So sánh&#10;• H2: FAQ (câu hỏi thường gặp)&#10;• H2: Kết luận + CTA"
              className={`min-h-[500px] outline-none text-sm text-slate-200 leading-relaxed
                [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3
                [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-6 [&_h3]:mb-2
                [&_p]:mb-4 [&_p]:leading-relaxed
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1
                [&_blockquote]:border-l-4 [&_blockquote]:border-sky-500/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400 [&_blockquote]:my-4
                [&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sky-400 [&_code]:text-xs
                [&_a]:text-sky-400 [&_a]:underline
                [&_strong]:text-white [&_strong]:font-bold
                empty:before:content-[attr(data-placeholder)] empty:before:text-slate-700 empty:before:whitespace-pre-wrap empty:before:pointer-events-none`}
            />
          </div>
        </main>

        {/* === RIGHT: SEO Panel === */}
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 border-l border-slate-800/60 bg-[#080d1a]/60 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">

          {/* Panel tabs */}
          <div className="flex border-b border-slate-800/60">
            {(['seo', 'settings'] as const).map(tab => (
              <button key={tab} onClick={() => setActivePanel(tab)}
                className={`flex-1 py-3 text-xs font-bold transition ${activePanel === tab ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {tab === 'seo' ? '🔍 SEO' : '⚙️ Cài đặt'}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-5 flex-1">
            {activePanel === 'seo' ? (
              <>
                {/* SEO Score */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Điểm SEO</span>
                    <span className={`text-2xl font-black ${scoreColor}`}>{seo.score}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${scoreBg}`} style={{ width: `${seo.score}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {seo.score >= 75 ? '🟢 Tốt — Bài viết đã tối ưu SEO' : seo.score >= 50 ? '🟡 Trung bình — Cần cải thiện thêm' : '🔴 Yếu — Cần tối ưu nhiều hơn'}
                  </p>
                </div>

                {/* Từ khóa chính */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Từ khóa chính (Focus keyword)</label>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={keyword} onChange={e => setKeyword(e.target.value)}
                      placeholder="vd: in uv dtf nổi 3d"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-sky-500/50 transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-600">Từ khóa cần xuất hiện trong tiêu đề, mô tả và nội dung</p>
                </div>

                {/* Meta title preview */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                    <span>Tiêu đề SEO (Title tag)</span>
                    <span className={title.length > 65 ? 'text-red-400' : title.length >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
                      {title.length}/65
                    </span>
                  </label>
                </div>

                {/* Meta description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                    <span>Meta Description</span>
                    <span className={metaDesc.length > 165 ? 'text-red-400' : metaDesc.length >= 120 ? 'text-emerald-400' : 'text-amber-400'}>
                      {metaDesc.length}/160
                    </span>
                  </label>
                  <textarea
                    value={metaDesc}
                    onChange={e => { setMetaDesc(e.target.value); setMetaDescManual(true); }}
                    rows={3}
                    placeholder="Mô tả hiển thị trên Google (150–160 ký tự)…"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500/50 transition resize-none"
                  />
                </div>

                {/* Google SERP Preview */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Google Preview</label>
                  <div className="p-3 rounded-xl bg-white/5 border border-slate-800/60 space-y-1">
                    <p className="text-[11px] text-slate-500">https://prinktech.netslive.com/cam-nang/<span className="text-emerald-400">{slug || 'tieu-de-bai-viet'}</span></p>
                    <p className="text-sm text-sky-400 font-medium leading-snug hover:underline cursor-pointer">
                      {title || 'Tiêu đề bài viết của bạn sẽ hiển thị ở đây'} | PrinK Tech
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {metaDesc || 'Mô tả meta sẽ hiển thị ở đây. Nên viết 150–160 ký tự mô tả hấp dẫn, chứa từ khóa chính.'}
                    </p>
                  </div>
                </div>

                {/* SEO Checklist */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Checklist SEO</label>
                  <div className="space-y-1.5">
                    {seo.checks.map((c, i) => (
                      <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-[10px] ${c.ok ? 'bg-emerald-500/5 text-emerald-300' : 'bg-slate-900/40 text-slate-500'}`}>
                        {c.ok
                          ? <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                          : <AlertCircle size={12} className="text-slate-600 shrink-0 mt-0.5" />
                        }
                        <div>
                          <p className="font-semibold">{c.label}</p>
                          <p className="opacity-70">{c.info}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Settings tab */}
                <div className="space-y-4">
                  {/* Slug */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Slug URL</label>
                    <div className="flex gap-1">
                      <input
                        value={slug} onChange={e => { setSlug(slugify(e.target.value)); setSlugManual(true); }}
                        placeholder="tieu-de-bai-viet"
                        className="flex-1 bg-slate-950/60 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500/50 transition"
                      />
                      <button onClick={() => { setSlug(slugify(title)); setSlugManual(false); }}
                        title="Tạo lại từ tiêu đề"
                        className="p-2 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition">
                        <RefreshCw size={13} />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-600">/cam-nang/<span className="text-sky-400">{slug || '...'}</span></p>
                  </div>

                  {/* Ảnh bìa */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">URL Ảnh bìa</label>
                    <input
                      value={coverImage} onChange={e => setCoverImage(e.target.value)}
                      placeholder="https://... (link ảnh)"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500/50 transition"
                    />
                    {coverImage && (
                      <img src={coverImage} alt="Cover" className="w-full h-28 object-cover rounded-lg border border-slate-800" onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                  </div>

                  {/* Tác giả */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tác giả</label>
                    <input
                      value={author} onChange={e => setAuthor(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500/50 transition"
                    />
                  </div>

                  {/* Trạng thái */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trạng thái</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['draft', 'published'] as const).map(s => (
                        <button key={s} onClick={() => setStatus(s)}
                          className={`py-2 rounded-lg text-xs font-bold border transition ${status === s ? 'border-sky-500 bg-sky-500/10 text-sky-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                          {s === 'draft' ? '🟡 Nháp' : '🟢 Đã đăng'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Xem trước trên web */}
                  {editId && status === 'published' && slug && (
                    <a href={`/cam-nang/${slug}`} target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 hover:border-sky-500/50 text-slate-400 hover:text-sky-400 text-xs font-bold transition">
                      <Globe size={13} /> Xem bài đăng trên web
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto p-4 pt-10">
          <div className="w-full max-w-3xl bg-[#080d1a] rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Xem trước bài viết</span>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-8">
              {coverImage && <img src={coverImage} alt={title} className="w-full h-48 object-cover rounded-xl mb-6" />}
              <h1 className="text-2xl font-black text-white mb-3">{title || 'Tiêu đề bài viết'}</h1>
              {summary && <p className="text-slate-400 italic border-l-4 border-sky-500/50 pl-4 mb-6">{summary}</p>}
              <div
                className="prose prose-invert prose-slate max-w-none text-sm [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-white [&_h2]:mt-6 [&_h3]:font-bold [&_h3]:text-slate-100"
                dangerouslySetInnerHTML={{ __html: content || '<p class="text-slate-500">Chưa có nội dung...</p>' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =================== EXPORT WITH SUSPENSE ===================
export default function VietBaiPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080d1a] flex items-center justify-center">
        <Loader2 className="animate-spin text-sky-400" size={32} />
      </div>
    }>
      <VietBaiContent />
    </Suspense>
  );
}
