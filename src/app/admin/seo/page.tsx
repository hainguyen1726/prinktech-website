'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart, ArrowLeft, CheckCircle2, AlertTriangle, Info, Loader2, RefreshCw, 
  Globe, PlusCircle, Check, X, ShieldAlert, ChevronDown, ChevronUp, LogOut,
  FileText, Award, Search, ChevronLeft, ChevronRight
} from 'lucide-react';

interface SEOIssue {
  id: string;
  severity: 'Critical' | 'Warning' | 'Info';
  area: string;
  title: string;
  evidence: string;
  recommendation: string;
  resolved: boolean;
  resolvedAt?: string;
}

interface SEOAudit {
  id: string;
  createdAt: string;
  targetUrl: string;
  score: number;
  summary: string;
  issues: SEOIssue[];
}

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image: string;
  status: 'draft' | 'published';
  author: string;
  created_at: string;
  target_keyword?: string;
}

export default function AdminSEOAuditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Active Tab: 'technical' | 'content'
  const [activeTab, setActiveTab] = useState<'technical' | 'content'>('technical');

  // Search Queries
  const [techSearch, setTechSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');

  // Pagination States
  const [techPage, setTechPage] = useState(1);
  const [contentPage, setContentPage] = useState(1);
  const pageSize = 10;

  // Technical Audit States
  const [audits, setAudits] = useState<SEOAudit[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, unresolved, resolved
  const [expandedIssues, setExpandedIssues] = useState<{ [key: string]: boolean }>({});

  // Content Audit States (Posts)
  const [posts, setPosts] = useState<Post[]>([]);
  const [postKeywords, setPostKeywords] = useState<{ [key: string]: string }>({});
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({});
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Create New Audit States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTargetUrl, setNewTargetUrl] = useState('https://prinktech.netslive.com/');
  const [newSummary, setNewSummary] = useState('');
  const [newScore, setNewScore] = useState(70);
  const [actionLoading, setActionLoading] = useState(false);

  // Toast Feedback State
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 3000);
  };

  // Reset pagination when filter changes
  useEffect(() => {
    setTechPage(1);
  }, [filterSeverity, filterStatus, techSearch]);

  useEffect(() => {
    setContentPage(1);
  }, [contentSearch]);

  // 1. Xác thực Admin Auth
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role !== 'admin') {
            router.push('/login');
          } else {
            setAdminUser(data.user);
            setAuthorized(true);
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Lỗi xác thực:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // 2. Fetch danh sách Audits từ API
  const fetchAudits = async () => {
    try {
      const res = await fetch('/api/admin/seo-audits');
      if (res.ok) {
        const data = await res.json();
        setAudits(data.audits || []);
        if (data.audits && data.audits.length > 0 && !selectedAuditId) {
          setSelectedAuditId(data.audits[0].id);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách audit:', err);
      showToast('Không thể tải lịch sử SEO Audit', 'error');
    }
  };

  // 3. Fetch danh sách bài viết phục vụ Content SEO Audit
  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch('/api/web/posts?all=true');
      if (res.ok) {
        const data = await res.json();
        const fetchedPosts = data.posts || [];
        setPosts(fetchedPosts);

        const defaultKeywords: { [key: string]: string } = {
          'tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet': 'tem uv dtf ngoài trời',
          'meo-thiet-ke-file-in-uv-dtf-chuan-mau-sac-net': 'thiết kế file in uv dtf',
          'in-uv-dtf-dan-binh-giu-nhiet-qua-tang-doanh-nghiep': 'in uv dtf bình giữ nhiệt',
          'huong-dan-dan-tem-uv-dtf-dung-cach': 'hướng dẫn dán tem uv dtf',
          'so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang': 'in uv dtf nổi 3d'
        };

        const initialKeywords: { [key: string]: string } = {};
        fetchedPosts.forEach((post: Post) => {
          initialKeywords[post.id] = defaultKeywords[post.slug] || 'tem uv dtf';
        });
        setPostKeywords(initialKeywords);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách bài viết:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchAudits();
      fetchPosts();
    }
  }, [authorized]);

  const selectedAudit = audits.find(a => a.id === selectedAuditId);

  // 4. Đánh dấu hoàn thành / chưa hoàn thành đề xuất
  const handleToggleIssue = async (issueId: string, currentResolved: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedAuditId) return;
    
    try {
      const res = await fetch('/api/admin/seo-audits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: selectedAuditId,
          issueId,
          resolved: !currentResolved
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAudits(prevAudits => prevAudits.map(audit => 
          audit.id === selectedAuditId ? data.audit : audit
        ));
        showToast(
          !currentResolved ? 'Đã khắc phục lỗi thành công!' : 'Đã mở lại trạng thái lỗi.', 
          'success'
        );
      } else {
        const err = await res.json();
        showToast(err.error || 'Lỗi cập nhật trạng thái', 'error');
      }
    } catch (err) {
      console.error('Lỗi cập nhật issue:', err);
      showToast('Không thể kết nối đến máy chủ', 'error');
    }
  };

  // 5. Tạo một phiên Audit mới
  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const baseIssues = selectedAudit ? selectedAudit.issues.map(i => ({
      ...i,
      resolved: false,
      resolvedAt: undefined
    })) : [];

    try {
      const res = await fetch('/api/admin/seo-audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: newTargetUrl,
          score: newScore,
          summary: newSummary,
          issues: baseIssues.length > 0 ? baseIssues : [
            {
              severity: 'Critical',
              area: 'Technical',
              title: 'Lỗi nạp dữ liệu động trang chủ',
              evidence: 'Bot cào nhận HTML trống',
              recommendation: 'Chuyển sang Next.js SSR',
              resolved: false
            }
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAudits(prev => [data.audit, ...prev]);
        setSelectedAuditId(data.audit.id);
        setShowCreateModal(false);
        setNewSummary('');
        showToast('Đã khởi tạo phiên SEO Audit mới!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Lỗi tạo phiên audit', 'error');
      }
    } catch (err) {
      console.error('Lỗi tạo audit:', err);
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Helpers for string manipulation
  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const countWords = (text: string): number => {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  };

  // 6. THUẬT TOÁN TỰ ĐỘNG CHẤM ĐIỂM SEO BÀI VIẾT (Content SEO Audit Engine)
  const calcPostSEOScore = (post: Post, targetKeyword: string) => {
    const kw = targetKeyword.toLowerCase().trim();
    const titleLower = post.title.toLowerCase();
    const summaryLower = post.summary.toLowerCase();
    const contentText = stripHtml(post.content).toLowerCase();
    const wordCount = countWords(contentText);

    const checks = [
      {
        id: 'title-kw',
        label: 'Từ khóa xuất hiện trong Tiêu đề',
        ok: kw.length > 0 && titleLower.includes(kw),
        info: 'Từ khóa nên xuất hiện tự nhiên trong tiêu đề bài viết.',
        impact: 15
      },
      {
        id: 'title-len',
        label: 'Độ dài Tiêu đề lý tưởng (50–65 ký tự)',
        ok: post.title.length >= 50 && post.title.length <= 65,
        info: `Hiện tại: ${post.title.length} ký tự.`,
        impact: 10
      },
      {
        id: 'summary-kw',
        label: 'Từ khóa xuất hiện trong Mô tả tóm tắt (Meta Desc)',
        ok: kw.length > 0 && summaryLower.includes(kw),
        info: 'Từ khóa mục tiêu nên có trong phần tóm tắt hiển thị trên SERP.',
        impact: 15
      },
      {
        id: 'summary-len',
        label: 'Độ dài Tóm tắt chuẩn (120–165 ký tự)',
        ok: post.summary.length >= 120 && post.summary.length <= 165,
        info: `Hiện tại: ${post.summary.length} ký tự.`,
        impact: 10
      },
      {
        id: 'content-kw',
        label: 'Từ khóa xuất hiện trong Nội dung bài viết',
        ok: kw.length > 0 && contentText.includes(kw),
        info: 'Nội dung bài viết cần lồng ghép từ khóa chính.',
        impact: 15
      },
      {
        id: 'word-count',
        label: 'Độ sâu nội dung (Độ dài >= 500 từ)',
        ok: wordCount >= 500,
        info: `Hiện tại: ${wordCount} từ. Bài viết dài được Google đánh giá cao hơn.`,
        impact: 15
      },
      {
        id: 'has-images',
        label: 'Chèn hình ảnh trực quan trong bài viết',
        ok: post.content.includes('<img') || post.content.includes('img_scope'),
        info: 'Bài viết hướng dẫn cần hình ảnh minh họa để tăng trải nghiệm người dùng (UX).',
        impact: 10
      },
      {
        id: 'internal-links',
        label: 'Có liên kết nội bộ (Internal Links)',
        ok: post.content.includes('href="/cam-nang') || post.content.includes('href="/bao-gia') || post.content.includes('href="/san-pham'),
        info: 'Liên kết chéo giúp lan truyền sức mạnh trang và giữ chân người đọc.',
        impact: 10
      }
    ];

    const passedChecks = checks.filter(c => c.ok);
    const score = passedChecks.reduce((sum, c) => sum + c.impact, 0);

    return {
      score,
      checks,
      wordCount
    };
  };

  // Toggle Expand/Collapse for issues and posts
  const toggleExpandIssue = (issueId: string) => {
    setExpandedIssues(prev => ({ ...prev, [issueId]: !prev[issueId] }));
  };

  const toggleExpandPost = (postId: string) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleKeywordChange = (postId: string, val: string) => {
    setPostKeywords(prev => ({ ...prev, [postId]: val }));
  };

  // Xử lý Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9] text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Đang xác thực thông tin admin...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  // LỌC DỮ LIỆU TECHNICAL ISSUES & TÌM KIẾM
  const filteredIssues = selectedAudit 
    ? selectedAudit.issues.filter(issue => {
        const matchSeverity = filterSeverity === 'all' || issue.severity.toLowerCase() === filterSeverity.toLowerCase();
        const matchStatus = filterStatus === 'all' 
          || (filterStatus === 'resolved' && issue.resolved) 
          || (filterStatus === 'unresolved' && !issue.resolved);
        const matchSearch = techSearch.trim() === '' 
          || issue.title.toLowerCase().includes(techSearch.toLowerCase())
          || issue.area.toLowerCase().includes(techSearch.toLowerCase())
          || issue.recommendation.toLowerCase().includes(techSearch.toLowerCase());
        return matchSeverity && matchStatus && matchSearch;
      })
    : [];

  // Phân trang Technical Issues
  const totalTechPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const paginatedIssues = filteredIssues.slice((techPage - 1) * pageSize, techPage * pageSize);

  // LỌC DỮ LIỆU BÀI VIẾT & TÌM KIẾM
  const filteredPosts = posts.filter(post => {
    const matchSearch = contentSearch.trim() === ''
      || post.title.toLowerCase().includes(contentSearch.toLowerCase())
      || post.slug.toLowerCase().includes(contentSearch.toLowerCase());
    return matchSearch;
  });

  // Phân trang Bài viết
  const totalContentPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const paginatedPosts = filteredPosts.slice((contentPage - 1) * pageSize, contentPage * pageSize);

  const totalIssues = selectedAudit ? selectedAudit.issues.length : 0;
  const resolvedIssues = selectedAudit ? selectedAudit.issues.filter(i => i.resolved).length : 0;
  const unresolvedIssues = totalIssues - resolvedIssues;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans antialiased pb-24 relative">
      {/* Background Glow Decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Toast Alert */}
      {toast.text && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl border shadow-xl bg-white border-slate-200 text-slate-800">
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-rose-600" />}
          <span className="text-xs font-bold">{toast.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="rounded-none border-0 border-b border-slate-800 py-4 px-6 sticky top-0 z-30 bg-[#0d1117] flex justify-between items-center w-full shadow-md text-slate-200">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/website" 
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition"
            title="Quay lại trang quản trị chính"
          >
            <ArrowLeft size={16} />
          </Link>
          <img src="/logo-horizontal.png" alt="PrinK Tech" className="h-10 object-contain" />
          <span className="h-4 w-px bg-slate-750"></span>
          <h2 className="font-medium text-sm tracking-wider text-white uppercase flex items-center gap-1.5">
            <BarChart size={18} className="text-teal-400" />
            SEO Audit Center
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-slate-300">
            Chào, <strong className="text-white font-medium">{adminUser?.name || 'Admin'}</strong>
          </span>
          <Link href="/" target="_blank" className="text-xs font-medium text-teal-400 hover:text-teal-300 transition flex items-center gap-1">
            <Globe size={14} /> Xem Website
          </Link>
          <button 
            onClick={handleLogout} 
            className="p-2 bg-slate-850 hover:bg-slate-800 text-rose-400 border border-slate-700 rounded-lg transition cursor-pointer" 
            title="Đăng xuất"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* TABS NAVIGATION BAR */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-[73px] z-20">
        <div className="max-w-full px-6 mx-auto flex items-center gap-4">
          <button
            onClick={() => setActiveTab('technical')}
            className={`py-4 px-4 text-xs font-medium uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
              activeTab === 'technical'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart size={16} />
            SEO Technical & Cấu trúc
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`py-4 px-4 text-xs font-medium uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
              activeTab === 'content'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={16} />
            Chấm điểm SEO Bài viết
          </button>
        </div>
      </div>

      {/* CONTENT BODY */}
      <main className="max-w-full px-6 mx-auto mt-6 z-10 relative">
        
        {/* 1. TAB: SEO TECHNICAL & CẤU TRÚC */}
        {activeTab === 'technical' && (
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Sidebar lịch sử phiên audit */}
            <aside className="w-full lg:w-64 shrink-0">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-xs text-slate-800 uppercase tracking-wider">Lịch sử Audit</h3>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="p-1 hover:bg-slate-100 text-blue-600 hover:text-blue-700 rounded-lg transition animate-pulse"
                    title="Chạy phiên audit mới"
                  >
                    <PlusCircle size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto pr-1">
                  {audits.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">Chưa có phiên audit nào.</p>
                  ) : (
                    audits.map((audit) => {
                      const active = audit.id === selectedAuditId;
                      const dateStr = new Date(audit.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <button
                          key={audit.id}
                          onClick={() => setSelectedAuditId(audit.id)}
                          className={`text-left p-3 rounded-lg border text-xs transition ${
                            active 
                              ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium shadow-sm' 
                              : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                              audit.score >= 90 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : audit.score >= 70 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              Score: {audit.score}
                            </span>
                            <span className="text-[9px] text-slate-400">{dateStr}</span>
                          </div>
                          <p className="truncate font-normal">{audit.targetUrl}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>

            {/* Vùng chi tiết Technical Audit */}
            <div className="flex-1 flex flex-col gap-6">
              {selectedAudit ? (
                <>
                  {/* Điểm số và tóm tắt */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center gap-6">
                    
                    <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" className="stroke-slate-200" strokeWidth="6" fill="transparent" />
                          <circle 
                            cx="48" cy="48" r="40" 
                            className={`${
                              selectedAudit.score >= 90 
                                ? 'stroke-emerald-500' 
                                : selectedAudit.score >= 70 
                                ? 'stroke-yellow-500' 
                                : 'stroke-rose-500'
                            } transition-all duration-500`}
                            strokeWidth="6" fill="transparent" 
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * selectedAudit.score) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-black text-slate-800">{selectedAudit.score}</span>
                          <span className="text-[8px] font-medium text-slate-400 uppercase tracking-widest">SEO Score</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-base text-slate-900">Báo cáo tối ưu hóa cấu trúc & Technical</h3>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono">
                            {selectedAudit.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-505 text-slate-500 leading-relaxed font-normal">
                          {selectedAudit.summary || 'Chưa có mô tả tóm tắt cho phiên kiểm tra này.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100 max-w-md">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Tổng lỗi</span>
                          <span className="text-base font-normal text-slate-800">{totalIssues}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Đã sửa</span>
                          <span className="text-base font-normal text-emerald-600">{resolvedIssues}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Chưa sửa</span>
                          <span className="text-base font-normal text-rose-600">{unresolvedIssues}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* BỘ LỌC VÀ Ô TÌM KIẾM (Search Bar) */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-6 flex-1">
                      
                      {/* Search Input */}
                      <div className="relative w-full max-w-xs shrink-0">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                          <Search size={14} />
                        </span>
                        <input
                          type="text"
                          placeholder="Tìm kiếm lỗi..."
                          value={techSearch}
                          onChange={(e) => setTechSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Độ nghiêm trọng:</span>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          {['all', 'critical', 'warning'].map(sev => (
                            <button
                              key={sev}
                              onClick={() => setFilterSeverity(sev)}
                              className={`text-xs px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                                filterSeverity === sev 
                                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                                {sev === 'all' ? 'Tất cả' : sev}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Trạng thái:</span>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          {[
                            { id: 'all', label: 'Tất cả' },
                            { id: 'unresolved', label: 'Chưa sửa' },
                            { id: 'resolved', label: 'Đã sửa' }
                          ].map(st => (
                            <button
                              key={st.id}
                              onClick={() => setFilterStatus(st.id)}
                              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                                filterStatus === st.id 
                                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Bảng lỗi Technical - TĂNG LÊN CỠ CHỮ TO text-base (16px), BỎ BOLD TIÊU ĐỀ */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-base">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-xs">
                            <th className="p-4 w-14 text-center">Sửa</th>
                            <th className="p-4 w-28 whitespace-nowrap">Nghiêm trọng</th>
                            <th className="p-4 w-32 whitespace-nowrap">Khu vực</th>
                            <th className="p-4">Tiêu đề vấn đề</th>
                            <th className="p-4 w-32 text-right whitespace-nowrap">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {paginatedIssues.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-10 text-center text-slate-400 italic">
                                Không tìm thấy vấn đề nào phù hợp.
                              </td>
                            </tr>
                          ) : (
                            paginatedIssues.map((issue) => {
                              const isExpanded = !!expandedIssues[issue.id];
                              return (
                                <React.Fragment key={issue.id}>
                                  <tr 
                                    onClick={() => toggleExpandIssue(issue.id)}
                                    className={`hover:bg-slate-50/80 cursor-pointer transition ${
                                      issue.resolved ? 'bg-slate-50/30 text-slate-400' : 'text-slate-800 font-normal'
                                    }`}
                                  >
                                    <td className="p-4 text-center">
                                      <button
                                        onClick={(e) => handleToggleIssue(issue.id, issue.resolved, e)}
                                        className={`flex items-center justify-center w-5.5 h-5.5 mx-auto rounded border transition-all ${
                                          issue.resolved 
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-650 text-emerald-600' 
                                            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-100 bg-white'
                                        }`}
                                      >
                                        {issue.resolved && <Check size={12} strokeWidth={3} />}
                                      </button>
                                    </td>
                                    <td className="p-4">
                                      <span className={`inline-block text-[9px] font-medium px-2 py-0.5 rounded tracking-wide uppercase ${
                                        issue.severity === 'Critical' 
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                          : 'bg-yellow-100 text-yellow-800 border border-yellow-250'
                                      }`}>
                                        {issue.severity}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <span className="font-normal text-xs text-slate-650 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                                        {issue.area}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      {/* Cỡ chữ to text-base và bỏ font-bold đi */}
                                      <span className={`text-base leading-normal font-normal ${
                                        issue.resolved ? 'text-slate-400 line-through' : 'text-slate-900'
                                      }`}>
                                        {issue.title}
                                      </span>
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                      <button className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition font-normal text-xs whitespace-nowrap">
                                        {isExpanded ? <>Thu gọn <ChevronUp size={12} /></> : <>Chi tiết <ChevronDown size={12} /></>}
                                      </button>
                                    </td>
                                  </tr>

                                  {isExpanded && (
                                    <tr className="bg-slate-50/50">
                                      <td colSpan={5} className="p-5 border-t border-slate-200/40">
                                        <div className="space-y-4 max-w-full">
                                          {issue.evidence && (
                                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider block mb-1">Hiện trạng / Bằng chứng lâm sàng</span>
                                              <p className="text-sm text-slate-700 font-mono break-all font-normal">{issue.evidence}</p>
                                            </div>
                                          )}
                                          {issue.recommendation && (
                                            <div className="border-l-3 border-blue-500 pl-4">
                                              <span className="text-[9px] font-medium text-blue-500 uppercase tracking-wider block mb-1">Đề xuất giải pháp khắc phục</span>
                                              <p className="text-base text-slate-800 font-normal leading-relaxed">{issue.recommendation}</p>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINATION BAR FOR TECHNICAL ISSUES */}
                    {totalTechPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <span className="text-xs text-slate-500 font-medium">
                          Hiển thị {(techPage - 1) * pageSize + 1} - {Math.min(techPage * pageSize, filteredIssues.length)} trong tổng số {filteredIssues.length} vấn đề
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setTechPage(p => Math.max(1, p - 1))}
                            disabled={techPage === 1}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50 transition cursor-pointer"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          {Array.from({ length: totalTechPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setTechPage(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-medium transition cursor-pointer ${
                                techPage === page 
                                  ? 'bg-blue-600 text-white shadow-sm font-medium' 
                                  : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setTechPage(p => Math.min(totalTechPages, p + 1))}
                            disabled={techPage === totalTechPages}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50 transition cursor-pointer"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-20 text-center shadow-sm">
                  <ShieldAlert size={48} className="mx-auto text-slate-400 mb-3" />
                  <h3 className="font-medium text-slate-700 text-sm">Chưa có dữ liệu SEO Audit</h3>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. TAB: CHẤM ĐIỂM SEO CHI TIẾT BÀI VIẾT (Content SEO Audit Workspace) */}
        {activeTab === 'content' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-base text-slate-900 flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  Đánh giá chất lượng SEO On-page của các bài viết
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Hệ thống tự động chấm điểm bài viết dựa trên Checklist chuẩn SEO mới nhất của Google (E-E-A-T và Mật độ từ khóa).
                </p>
              </div>

              {/* Search Bar for Posts */}
              <div className="relative w-full max-w-xs shrink-0">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm bài viết..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {loadingPosts ? (
              <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-xs font-medium">Đang tải và chấm điểm các bài viết...</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                Không tìm thấy bài viết nào phù hợp.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                {/* Bảng chấm điểm bài viết - Tăng lên text-base, bỏ bold cho tiêu đề bài viết */}
                <table className="w-full text-left border-collapse text-base">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-xs">
                      <th className="p-4 w-12 text-center font-medium">STT</th>
                      <th className="p-4">Bài viết cẩm nang</th>
                      <th className="p-4 w-56 whitespace-nowrap">Từ khóa đích (Focus Keyword)</th>
                      <th className="p-4 w-36 text-right whitespace-nowrap">Số lượng từ</th>
                      <th className="p-4 w-40 text-center whitespace-nowrap">Điểm SEO</th>
                      <th className="p-4 w-32 text-right whitespace-nowrap">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPosts.map((post, idx) => {
                      const keyword = postKeywords[post.id] || 'tem uv dtf';
                      const { score, checks, wordCount } = calcPostSEOScore(post, keyword);
                      const isExpanded = !!expandedPosts[post.id];
                      const globalIdx = (contentPage - 1) * pageSize + idx + 1;

                      return (
                        <React.Fragment key={post.id}>
                          <tr 
                            onClick={() => toggleExpandPost(post.id)}
                            className="hover:bg-slate-50 cursor-pointer font-normal text-slate-700"
                          >
                            <td className="p-4 text-center text-slate-400">{globalIdx}</td>
                            <td className="p-4">
                              {/* Cỡ chữ to text-base và bỏ font-bold */}
                              <div className="font-normal text-base text-slate-900 leading-normal">{post.title}</div>
                              <div className="text-[10px] text-slate-400 mt-1 font-mono">{post.slug}</div>
                            </td>
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={keyword}
                                onChange={(e) => handleKeywordChange(post.id, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500/50"
                                placeholder="Nhập từ khóa đích..."
                                title="Nhấp để thay đổi từ khóa đích chấm điểm"
                              />
                            </td>
                            <td className="p-4 text-right font-mono text-slate-900 font-medium tabular-nums text-xs">{wordCount} từ</td>
                            <td className="p-4 text-center">
                              <span className={`inline-block font-medium text-xs px-3 py-1 rounded-full ${
                                score >= 80 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : score >= 60 
                                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-250' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {score} / 100
                              </span>
                            </td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <button className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition font-normal text-xs whitespace-nowrap">
                                {isExpanded ? <>Thu gọn <ChevronUp size={12} /></> : <>Checklist <ChevronDown size={12} /></>}
                              </button>
                            </td>
                          </tr>

                          {/* Dòng expand chấm điểm chi tiết bài viết */}
                          {isExpanded && (
                            <tr className="bg-slate-50/40">
                              <td colSpan={6} className="p-5 border-t border-slate-200/50">
                                <div className="space-y-4 max-w-full">
                                  <div className="font-medium text-xs text-slate-850 border-b border-slate-200/60 pb-2 flex items-center gap-1.5">
                                    <Award size={16} className="text-amber-500" />
                                    Bảng phân tích SEO On-page chi tiết bài viết:
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {checks.map((check) => (
                                      <div 
                                        key={check.id} 
                                        className={`flex items-start gap-3 p-3 rounded-xl border bg-white ${
                                          check.ok 
                                            ? 'border-emerald-200/60 shadow-sm' 
                                            : 'border-rose-100 hover:border-rose-200'
                                        }`}
                                      >
                                        <div className={`mt-0.5 rounded-full p-0.5 ${check.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                          {check.ok ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                                        </div>
                                        <div>
                                          <div className={`font-normal text-sm ${check.ok ? 'text-slate-800' : 'text-rose-800'}`}>
                                            {check.label}
                                          </div>
                                          <div className="text-[10px] text-slate-500 mt-1 leading-normal font-normal">
                                            {check.info}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {/* PAGINATION BAR FOR POSTS */}
                {totalContentPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <span className="text-xs text-slate-500 font-medium">
                      Hiển thị {(contentPage - 1) * pageSize + 1} - {Math.min(contentPage * pageSize, filteredPosts.length)} trong tổng số {filteredPosts.length} bài viết
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setContentPage(p => Math.max(1, p - 1))}
                        disabled={contentPage === 1}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50 transition cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: totalContentPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setContentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition cursor-pointer ${
                            contentPage === page 
                              ? 'bg-blue-600 text-white shadow-sm font-medium' 
                              : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setContentPage(p => Math.min(totalContentPages, p + 1))}
                        disabled={contentPage === totalContentPages}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50 transition cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* CREATE NEW AUDIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                <RefreshCw size={16} className="text-blue-500" />
                Khởi tạo phiên Audit mới
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAudit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Target URL</label>
                <input 
                  type="text" 
                  value={newTargetUrl}
                  onChange={(e) => setNewTargetUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Điểm SEO ban đầu</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Tóm tắt phiên kiểm tra</label>
                <textarea 
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Ví dụ: Chạy audit lần 2 sau khi cập nhật nội dung cho các bài viết và thêm Spot Color CMYK..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                  required
                />
                <span className="text-[9px] text-slate-400 mt-1 block leading-normal">
                  * Hệ thống sẽ tự động nhân bản danh sách lỗi cũ làm bản nháp cho phiên mới để bạn tiếp tục tối ưu hóa.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs disabled:opacity-50 transition"
                >
                  {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Khởi tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
