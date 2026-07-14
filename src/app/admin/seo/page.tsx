'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart, ArrowLeft, CheckCircle2, AlertTriangle, Info, Loader2, RefreshCw, 
  Globe, PlusCircle, Check, X, ShieldAlert, ChevronDown, ChevronUp, LogOut,
  FileText, Award, Search, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, ArrowUpRight, HelpCircle, Upload, Edit3, Trash2
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

interface SEOKeyword {
  id: string;
  keyword: string;
  targetUrl: string;
  intent?: string;
  targetRank: number;
  currentRank: number;
  prevRank: number;
  searchVolume: number;
  clicks: number;
  impressions: number;
  ctr: number;
  updatedAt: string;
}

export default function AdminSEOAuditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Active Tab: 'technical' | 'content' | 'keywords'
  const [activeTab, setActiveTab] = useState<'technical' | 'content' | 'keywords'>('technical');

  // Search Queries
  const [techSearch, setTechSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');

  // Pagination States
  const [techPage, setTechPage] = useState(1);
  const [contentPage, setContentPage] = useState(1);
  const [keywordPage, setKeywordPage] = useState(1);
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

  // SEO Keywords States
  const [keywords, setKeywords] = useState<SEOKeyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [showAddKeywordModal, setShowAddKeywordModal] = useState(false);
  const [showGscImportModal, setShowGscImportModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Form add keyword
  const [newKeywordText, setNewKeywordText] = useState('');
  const [newKeywordUrl, setNewKeywordUrl] = useState('');
  const [newKeywordTargetRank, setNewKeywordTargetRank] = useState(1);
  const [newKeywordCurrentRank, setNewKeywordCurrentRank] = useState(100);
  const [newKeywordVolume, setNewKeywordVolume] = useState(0);

  // Quick edit keyword
  const [editingKeywordId, setEditingKeywordId] = useState<string | null>(null);
  const [editTargetRank, setEditTargetRank] = useState(1);
  const [editCurrentRank, setEditCurrentRank] = useState(100);

  // GSC Import
  const [gscImportText, setGscImportText] = useState('');

  // GA4 Analytics States
  const [realtimeUsers, setRealtimeUsers] = useState<number | null>(null);
  const [realtimePages, setRealtimePages] = useState<any[]>([]);
  const [analyticsReport, setAnalyticsReport] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [syncingGsc, setSyncingGsc] = useState(false);

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

  useEffect(() => {
    setKeywordPage(1);
  }, [keywordSearch]);

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

  // Helper: chuẩn hóa URL trang đích thành đường dẫn tương đối
  const getRelativeUrl = (url: string): string => {
    if (!url) return '/';
    try {
      // Nếu đã là relative path, trả về nguyên
      if (url.startsWith('/')) return url;
      const parsed = new URL(url);
      return parsed.pathname || '/';
    } catch {
      return url;
    }
  };

  // Helper: thuật toán phân trang thu gọn thông minh tránh vỡ giao diện khi số trang lớn
  const getPageNumbers = (currentPage: number, totalPages: number): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

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
          'bao-gia-decal-dan-ly-giu-nhiet-si-le': 'in decal ly',
          'bao-gia-in-tem-dan-xe-dien-hoc-sinh': 'in decal dan xe',
          'cac-loi-thuong-gap-khi-xuat-file-pdf-in-uv-dtf': 'in uv dtf',
          'cach-dan-decal-noi-3d-suon-xe-may-khong-bong': 'in decal 3d',
          'cach-dan-logo-len-binh-giu-nhiet-son-tinh-dien': 'dán logo lên ly',
          'cach-dan-logo-mu-bao-hiem-nham-khong-bong': 'in logo dan',
          'cach-dan-sticker-noi-3d-macbook-laptop-gaming': 'in decal 3d',
          'cach-tao-spot-color-spot-varnish-illustrator': 'in decal dán bóng',
          'cach-tao-spot-color-spot-white-photoshop': 'in uv dtf',
          'cong-nghe-in-decal-3d-noi-khoi-doc-dao': 'in decal 3d',
          'dan-logo-phan-quang-va-logo-noi-3d-xe-may': 'in logo dan',
          'dan-tem-noi-3d-may-pha-cafe-may-hut-bui': 'in logo dan',
          'decal-dan-non-bao-hiem-thong-thuong-va-uv-dtf': 'in decal dtf',
          'dia-chi-in-sticker-dan-laptop-theo-yeu-cau-lay-lien': 'in sticker theo yeu cau',
          'dinh-dang-file-in-an-nhan-mac-tot-nhat': 'in logo dan',
          'gia-in-decal-uv-dtf-chi-tiet-moi-nhat': 'in decal dtf',
          'gia-may-in-tem-uv-dtf-va-kinh-nghiem-dau-tu': 'giá in tem uv dtf',
          'huong-dan-chon-sticker-dan-hop-tai-nghe-airpods': 'in decal dán bóng',
          'huong-dan-chon-tem-dan-binh-giu-nhiet-chong-troc-son': 'in logo dan',
          'huong-dan-dan-tem-uv-dtf-dung-cach': 'in uv dtf',
          'huong-dan-thiet-ke-file-in-uv-dtf-ai': 'in decal và dán',
          'huong-dan-xuat-file-in-uv-dtf-coreldraw': 'in uv dtf',
          'in-decal-7-mau-hologram-bat-sang-doc-dao': 'in decal 7 mau',
          'in-decal-dan-ly-su-qua-tang-noi-3d': 'in decal 3d',
          'in-decal-dan-mu-bao-hiem-quang-cao-gia-re': 'in decal rẻ',
          'in-decal-dtf-va-decal-uv-dtf-co-gi-khac-nhau': 'in decal 3d',
          'in-logo-dan-binh-giu-nhiet-qua-tang-dai-hoi': 'in logo dan',
          'in-logo-dan-chai-lo-thuy-tinh-my-pham': 'in logo dan',
          'in-logo-dan-chai-thuy-tinh-nuoc-ep-tra-sua': 'in logo dan',
          'in-logo-dan-hu-nen-thom-thuy-tinh-chiu-nhiet': 'in logo dan',
          'in-logo-dan-ly-su-uong-tra-van-phong': 'in logo dan',
          'in-logo-dan-mu-bao-hiem-chuyen-nghiep-gia-re': 'in logo dan',
          'in-logo-dan-tu-lanh-decal-noi-3d-sang-trong': 'in decal 3d',
          'in-logo-dan-xe-may-decal-uv-dtf-3d-chong-phai-mau': 'in decal 3d',
          'in-logo-dan-xe-may-decal-uv-dtf-noi': 'in decal dan xe',
          'in-logo-decal-dan-ly-nhua-tra-sua-lay-nhanh': 'in decal ly',
          'in-sticker-dan-binh-nuoc-hoc-sinh-chong-nuoc': 'in decal dán chống nước',
          'in-sticker-dan-dien-thoai-thiet-ke-rieng': 'in decal dán sticker',
          'in-sticker-dan-laptop-chong-nuoc-chong-xuoc': 'in decal dán chống nước',
          'in-sticker-dan-mu-bao-hiem-chong-nang-mua': 'in decal dán mũ',
          'in-sticker-dan-non-bao-hiem-nua-dau-san-bong': 'in decal dán bóng',
          'in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re': 'in sticker theo yeu cau',
          'in-tem-dan-chai-ruou-vang-thuy-tinh-3d': 'in logo dan',
          'in-tem-dan-chai-tinh-dau-serum-chong-dau': 'in decal dán chai',
          'in-tem-dan-hu-my-pham-thuy-tinh-handmade': 'in logo dan',
          'in-tem-dan-hu-nen-thom-doc-dao': 'in logo dan',
          'in-tem-dan-ly-giu-nhiet-chong-nuoc-sieu-ben': 'in decal ly',
          'in-tem-dan-ly-giu-nhiet-so-luong-it-lay-ngay': 'in decal ly',
          'in-tem-dan-ly-thuy-tinh-khong-vien': 'in decal ly',
          'in-tem-logo-noi-3d-dan-coc-giu-nhiet': 'in logo dan',
          'in-tem-noi-uv-dtf-phu-bong-varnish-cao-cap': 'in uv dtf',
          'in-uv-dtf-dan-binh-giu-nhiet-qua-tang-doanh-nghiep': 'in uv dtf',
          'kinh-nghiem-in-logo-dan-binh-giu-nhiet-qua-tang': 'in logo dan',
          'loi-sai-he-mau-cmyk-rgb-in-tem-nhan-3d': 'in decal 3d',
          'mau-sticker-dan-coc-thuy-tinh-bat-trend': 'in decal màu dán',
          'mau-sticker-dan-laptop-it-lap-trinh-vien-3d': 'in decal màu dán',
          'mau-sticker-dan-xe-may-cute-ca-tinh-di-phuot': 'in decal dan xe',
          'mau-tem-dan-ly-thuy-tinh-quan-cafe-sang-chanh': 'in decal ly',
          'meo-dan-file-ghep-in-decal-uv-dtf-kho-60cm': 'in decal dtf',
          'meo-dan-trang-ghep-file-in-tem-uv-dtf-kho-30cm': 'in uv dtf',
          'meo-thiet-ke-file-in-uv-dtf-chuan-mau-sac-net': 'in uv dtf',
          'quy-trinh-san-xuat-tem-dan-non-bao-hiem': 'in decal 3d',
          'so-sanh-decal-cat-dan-truyen-thong-va-tem-uv-dtf': 'in decal cắt dán',
          'so-sanh-decal-skin-va-tem-uv-dtf-dien-thoai': 'in decal 3d',
          'so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang': 'in uv dtf',
          'so-sanh-khac-laser-va-dan-tem-uv-dtf-binh-giu-nhiet': 'in uv dtf',
          'sticker-cute-dan-mu-bao-hiem-cuc-chat': 'in decal dán mũ',
          'sticker-dan-binh-nuoc-tu-thiet-ke': 'in decal dán nhãn',
          'sticker-dan-dien-thoai-noi-3d-sang-trong': 'in decal 3d',
          'sticker-dan-hop-qua-tang-go-phu-varnish': 'in logo dan',
          'tem-dan-binh-nuoc-nhua-va-binh-inox': 'in decal và dán',
          'tem-uv-dtf-sieu-ben-ngoai-troi-do-ben-thoi-tiet': 'in uv dtf',
          'top-ly-giu-nhiet-dan-sticker-uv-dtf-dep': 'sticker uv dtf',
          'ung-dung-in-tem-nhan-decal-uv-dtf-doanh-nghiep': 'in decal dtf',
          'xu-huong-in-decal-3d-trang-tri-do-gia-dung-thong-minh': 'in decal 3d',
          'yeu-cau-he-mau-cmyk-in-tem-nhan-san-3d': 'in sticker theo yeu cau',
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

  // 3b. Fetch danh sách từ khóa theo dõi
  const fetchKeywords = async () => {
    setLoadingKeywords(true);
    try {
      const res = await fetch('/api/admin/seo-keywords');
      if (res.ok) {
        const data = await res.json();
        setKeywords(data.keywords || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách từ khóa:', err);
      showToast('Không thể tải danh sách từ khóa SEO', 'error');
    } finally {
      setLoadingKeywords(false);
    }
  };

  // Fetch Google Analytics Data
  const fetchAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      // Gọi Realtime
      const realtimeRes = await fetch('/api/admin/analytics?type=realtime');
      if (realtimeRes.ok) {
        const realtimeData = await realtimeRes.json();
        setRealtimeUsers(realtimeData.activeUsers || 0);
        setRealtimePages(realtimeData.topPages || []);
      }
      
      // Gọi Report
      const reportRes = await fetch('/api/admin/analytics?type=report&days=7');
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setAnalyticsReport(reportData);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleAutoSyncGsc = async () => {
    setSyncingGsc(true);
    try {
      const res = await fetch('/api/admin/seo-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Đồng bộ thành công! Cập nhật ${data.count}/${data.total} từ khóa.`, 'success');
        fetchKeywords();
      } else {
        showToast(data.error || 'Lỗi khi đồng bộ dữ liệu GSC', 'error');
      }
    } catch (err) {
      console.error('Lỗi đồng bộ GSC:', err);
      showToast('Lỗi kết nối khi đồng bộ GSC', 'error');
    } finally {
      setSyncingGsc(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchAudits();
      fetchPosts();
      fetchKeywords();
      fetchAnalyticsData();
      
      // Tự động reload realtime mỗi 30 giây
      const interval = setInterval(() => {
        fetchAnalyticsData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [authorized]);

  // Các hàm tương tác từ khóa SEO
  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordText.trim()) return;

    try {
      const res = await fetch('/api/admin/seo-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: newKeywordText,
          targetUrl: newKeywordUrl,
          targetRank: newKeywordTargetRank,
          currentRank: newKeywordCurrentRank,
          searchVolume: newKeywordVolume
        })
      });

      if (res.ok) {
        const data = await res.json();
        setKeywords(prev => [...prev, data.keyword]);
        setShowAddKeywordModal(false);
        setNewKeywordText('');
        setNewKeywordUrl('');
        setNewKeywordTargetRank(1);
        setNewKeywordCurrentRank(100);
        setNewKeywordVolume(0);
        showToast('Đã thêm từ khóa theo dõi mới!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Lỗi thêm từ khóa', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa từ khóa này khỏi danh sách theo dõi?')) return;
    try {
      const res = await fetch(`/api/admin/seo-keywords?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeywords(prev => prev.filter(kw => kw.id !== id));
        showToast('Đã xóa từ khóa thành công!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Lỗi xóa từ khóa', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  const handleStartQuickEdit = (kw: SEOKeyword) => {
    setEditingKeywordId(kw.id);
    setEditTargetRank(kw.targetRank);
    setEditCurrentRank(kw.currentRank);
  };

  const handleSaveQuickEdit = async (id: string) => {
    try {
      const res = await fetch('/api/admin/seo-keywords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          targetRank: editTargetRank,
          currentRank: editCurrentRank
        })
      });

      if (res.ok) {
        const data = await res.json();
        setKeywords(prev => prev.map(kw => kw.id === id ? data.keyword : kw));
        setEditingKeywordId(null);
        showToast('Đã cập nhật thứ hạng từ khóa!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Lỗi cập nhật thứ hạng', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  const handleImportGscData = async () => {
    if (!gscImportText.trim()) return;

    try {
      const lines = gscImportText.split('\n');
      const parsedKeywords: any[] = [];

      lines.forEach(line => {
        const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
        if (parts.length >= 2) {
          const keyword = parts[0].trim().replace(/^"|"$/g, '');
          if (keyword && 
              keyword.toLowerCase() !== 'query' && 
              keyword.toLowerCase() !== 'từ khóa' && 
              keyword.toLowerCase() !== 'top queries' &&
              keyword.toLowerCase() !== 'từ khóa hàng đầu') {
            const clicks = parseInt(parts[1]) || 0;
            const impressions = parseInt(parts[2]) || 0;
            const ctrRaw = parts[3] ? parts[3].replace('%', '').trim() : '0';
            const ctr = parseFloat(ctrRaw) || 0;
            const currentRankRaw = parts[4] ? parts[4].trim() : '100';
            const currentRank = Math.round(parseFloat(currentRankRaw)) || 100;

            parsedKeywords.push({
              keyword,
              clicks,
              impressions,
              ctr,
              currentRank
            });
          }
        }
      });

      if (parsedKeywords.length === 0) {
        showToast('Không nhận diện được dữ liệu. Hãy đảm bảo copy đúng các cột từ GSC.', 'error');
        return;
      }

      const res = await fetch('/api/admin/seo-keywords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          keywords: parsedKeywords
        })
      });

      if (res.ok) {
        const data = await res.json();
        await fetchKeywords();
        setShowGscImportModal(false);
        setGscImportText('');
        showToast(`Đã đồng bộ thành công ${data.count} từ khóa từ Google Search Console!`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Lỗi nhập dữ liệu GSC', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

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
          <button
            onClick={() => setActiveTab('keywords')}
            className={`py-4 px-4 text-xs font-medium uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
              activeTab === 'keywords'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award size={16} />
            Theo dõi từ khóa SEO
          </button>
        </div>
      </div>

      {/* CONTENT BODY */}
      <main className="max-w-full px-6 mx-auto mt-6 z-10 relative">

        {/* GOOGLE ANALYTICS REALTIME DASHBOARD */}
        {realtimeUsers !== null && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Card 1: Người dùng đang online */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Lượng truy cập Realtime</span>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-extrabold tracking-tight text-white">{realtimeUsers}</span>
                <span className="text-emerald-400 text-xs font-medium">đang online</span>
              </div>
              <div className="border-t border-slate-800/80 pt-3 mt-3">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-2">Thiết bị truy cập</span>
                <div className="flex items-center gap-4 text-xs">
                  {(() => {
                    const devices = realtimePages.reduce((acc: any, curr: any) => {
                      acc[curr.device] = (acc[curr.device] || 0) + curr.activeUsers;
                      return acc;
                    }, {});
                    const total = Object.values(devices).reduce((a: any, b: any) => Number(a) + Number(b), 0) || 1;
                    return ['DESKTOP', 'MOBILE', 'TABLET'].map(dev => {
                      const count = devices[dev] || 0;
                      const percent = Math.round((Number(count) / Number(total)) * 100);
                      if (count === 0 && dev !== 'MOBILE' && dev !== 'DESKTOP') return null;
                      return (
                        <div key={dev} className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${dev === 'DESKTOP' ? 'bg-blue-500' : dev === 'MOBILE' ? 'bg-purple-500' : 'bg-amber-500'}`}></span>
                          <span className="text-slate-300 capitalize text-[11px]">{dev.toLowerCase()}: <strong className="text-white font-medium">{percent}%</strong></span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Card 2: Các trang được xem nhiều nhất */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-lg">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-3">Trang đang được xem nhiều nhất</span>
              <div className="space-y-2.5">
                {realtimePages.length === 0 ? (
                  <span className="text-slate-500 text-xs">Chưa có dữ liệu trang hoạt động</span>
                ) : (
                  realtimePages.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-300 truncate max-w-[200px]" title={item.page}>
                        {item.page.replace(' - PrinK Tech', '').replace(' | PrinK Tech', '')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">{item.device.toLowerCase()}</span>
                        <strong className="text-emerald-400 font-semibold">{item.activeUsers}</strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Card 3: Biểu đồ Lượng truy cập 7 ngày qua (Vẽ bằng CSS) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-lg flex flex-col justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-3">Lượt truy cập 7 ngày qua (Users)</span>
              {analyticsReport && analyticsReport.chartData ? (
                <div className="flex items-end justify-between h-20 px-2 pt-2 gap-2">
                  {(() => {
                    const maxVal = Math.max(...analyticsReport.chartData.map((d: any) => Number(d.users || 0)), 1);
                    return analyticsReport.chartData.map((day: any, idx: number) => {
                      const heightPercent = Math.max(5, Math.round((Number(day.users || 0) / maxVal) * 100));
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 group relative">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-1 bg-slate-800 text-[10px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50">
                            {day.users} users
                          </div>
                          {/* Cột biểu đồ */}
                          <div 
                            style={{ height: `${heightPercent}%` }} 
                            className="w-full bg-blue-500/80 group-hover:bg-blue-400 rounded-t-sm transition-all duration-300 cursor-pointer"
                          ></div>
                          <span className="text-[9px] text-slate-500 mt-1.5">{day.date}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 text-slate-500 text-xs gap-1.5">
                  <Loader2 className="animate-spin" size={14} />
                  Đang tải báo cáo tuần...
                </div>
              )}
            </div>
          </div>
        )}
        
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
                          {getPageNumbers(techPage, totalTechPages).map((page, i) => (
                            <button
                              key={i}
                              disabled={page === '...'}
                              onClick={() => typeof page === 'number' && setTechPage(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                                page === '...' ? 'cursor-default text-slate-400' : 'cursor-pointer'
                              } ${
                                techPage === page 
                                  ? 'bg-blue-600 text-white shadow-sm font-medium' 
                                  : page === '...' ? 'bg-transparent' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'
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
                      {getPageNumbers(contentPage, totalContentPages).map((page, i) => (
                        <button
                          key={i}
                          disabled={page === '...'}
                          onClick={() => typeof page === 'number' && setContentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                            page === '...' ? 'cursor-default text-slate-400' : 'cursor-pointer'
                          } ${
                            contentPage === page 
                              ? 'bg-blue-600 text-white shadow-sm font-medium' 
                              : page === '...' ? 'bg-transparent' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'
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

        {/* 3. TAB: THEO DÕI TỪ KHÓA SEO */}
        {activeTab === 'keywords' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-base text-slate-900 flex items-center gap-2">
                  <Award size={20} className="text-blue-600" />
                  Mục tiêu từ khóa SEO & Kết quả thực tế
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Quản lý danh sách từ khóa mục tiêu, thứ hạng mong muốn và đồng bộ dữ liệu thực tế từ Google Search Console.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative w-full sm:w-60 shrink-0">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm từ khóa..."
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleAutoSyncGsc}
                  disabled={syncingGsc}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 font-medium text-xs transition cursor-pointer disabled:opacity-50"
                  title="Tự động đồng bộ thứ hạng, clicks, impressions từ Google Search Console API"
                >
                  {syncingGsc ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Đang đồng bộ...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Đồng bộ GSC
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowGscImportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs transition cursor-pointer"
                >
                  <Upload size={14} /> Import GSC Data
                </button>

                <button
                  onClick={() => setShowHelpModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs transition cursor-pointer"
                  title="Xem hướng dẫn đồng bộ Search Console"
                >
                  <HelpCircle size={14} /> Hướng dẫn
                </button>

                <button
                  onClick={() => setShowAddKeywordModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition cursor-pointer"
                >
                  <PlusCircle size={14} /> Thêm từ khóa
                </button>
              </div>
            </div>

            {loadingKeywords ? (
              <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-xs font-medium">Đang tải danh sách từ khóa...</span>
              </div>
            ) : (
              (() => {
                const filteredKeywords = keywords.filter(kw =>
                  kw.keyword.toLowerCase().includes(keywordSearch.toLowerCase())
                );
                const totalKeywordPages = Math.ceil(filteredKeywords.length / pageSize);
                const paginatedKeywords = filteredKeywords.slice(
                  (keywordPage - 1) * pageSize,
                  keywordPage * pageSize
                );

                if (filteredKeywords.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                      Không tìm thấy từ khóa nào phù hợp với tìm kiếm.
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-base">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-xs">
                        <th className="p-4 w-12 text-center font-medium">STT</th>
                        <th className="p-4 w-52">Từ khóa mục tiêu</th>
                        <th className="p-4 w-24 text-center">Intent</th>
                        <th className="p-4">Trang đích (URL)</th>
                        <th className="p-4 w-28 text-center">Volume</th>
                        <th className="p-4 w-28 text-center">Clicks / Imp</th>
                        <th className="p-4 w-24 text-center">CTR</th>
                        <th className="p-4 w-32 text-center">Mục tiêu</th>
                        <th className="p-4 w-36 text-center">Thực tế</th>
                        <th className="p-4 w-28 text-center">Trạng thái</th>
                        <th className="p-4 w-24 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedKeywords.map((kw, idx) => {
                          const isEditing = editingKeywordId === kw.id;
                          const reached = kw.currentRank <= kw.targetRank;
                          const closeToGoal = !reached && (kw.currentRank - kw.targetRank <= 5);
                          
                          // Biến động hạng
                          const rankDiff = kw.prevRank - kw.currentRank;
                          const globalIdx = (keywordPage - 1) * pageSize + idx + 1;
                          
                          return (
                            <tr key={kw.id} className="hover:bg-slate-50/50 transition text-slate-700 text-sm">
                              <td className="p-4 text-center text-slate-400 font-mono text-xs">{globalIdx}</td>
                              <td className="p-4 font-bold text-slate-900">{kw.keyword}</td>
                              <td className="p-4 text-center">
                                <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  kw.intent === 'Transactional' ? 'bg-green-50 text-green-700 border border-green-200'
                                  : kw.intent === 'Informational' ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : 'bg-violet-50 text-violet-700 border border-violet-200'
                                }`}>
                                  {kw.intent === 'Transactional' ? 'Trans' : kw.intent === 'Informational' ? 'Info' : 'Com'}
                                </span>
                              </td>
                              <td className="p-4">
                                <a 
                                  href={getRelativeUrl(kw.targetUrl)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 truncate max-w-xs text-xs font-normal"
                                  title={getRelativeUrl(kw.targetUrl)}
                                >
                                  {getRelativeUrl(kw.targetUrl)}
                                  <ArrowUpRight size={10} className="shrink-0" />
                                </a>
                              </td>
                              <td className="p-4 text-center font-mono tabular-nums text-xs text-slate-650">
                                {kw.searchVolume || '—'}
                              </td>
                              <td className="p-4 text-center font-mono text-xs text-slate-655">
                                {kw.clicks !== undefined ? (
                                  <div>
                                    <span className="font-bold text-slate-800">{kw.clicks}</span>
                                    <span className="text-slate-450 mx-1">/</span>
                                    <span>{kw.impressions}</span>
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="p-4 text-center font-mono text-xs text-slate-650">
                                {kw.ctr !== undefined ? `${kw.ctr.toFixed(1)}%` : '—'}
                              </td>
                              <td className="p-4 text-center">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={editTargetRank}
                                    onChange={(e) => setEditTargetRank(Number(e.target.value))}
                                    className="w-16 bg-white border border-slate-350 rounded px-1.5 py-0.5 text-center text-xs font-bold"
                                  />
                                ) : (
                                  <span className="font-bold text-slate-800 text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                    TOP {kw.targetRank}
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={editCurrentRank}
                                      onChange={(e) => setEditCurrentRank(Number(e.target.value))}
                                      className="w-16 bg-white border border-slate-350 rounded px-1.5 py-0.5 text-center text-xs font-bold"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className={`font-black text-sm ${reached ? 'text-emerald-600' : closeToGoal ? 'text-amber-500' : 'text-slate-600'}`}>
                                        {kw.currentRank >= 100 ? 'Chưa có' : `TOP ${kw.currentRank}`}
                                      </span>
                                      
                                      {/* Rank change indicator */}
                                      {kw.prevRank && rankDiff !== 0 && kw.currentRank <= 99 && (
                                        <span className={`flex items-center text-[10px] font-bold ${rankDiff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                          {rankDiff > 0 ? (
                                            <><TrendingUp size={10} className="mr-0.5" />+{rankDiff}</>
                                          ) : (
                                            <><TrendingDown size={10} className="mr-0.5" />{rankDiff}</>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <span className="text-[9px] text-slate-400">
                                    Cập nhật: {new Date(kw.updatedAt).toLocaleDateString('vi-VN')}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  kw.currentRank >= 100
                                    ? 'bg-slate-50 text-slate-500 border border-slate-200'
                                    : reached 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' 
                                    : closeToGoal 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-250' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-250'
                                }`}>
                                  {kw.currentRank >= 100 ? 'Cần đo' : reached ? 'Đạt mục tiêu' : closeToGoal ? 'Gần đạt' : 'Cần đạt'}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button 
                                        onClick={() => handleSaveQuickEdit(kw.id)}
                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition cursor-pointer"
                                        title="Lưu"
                                      >
                                        <Check size={14} strokeWidth={3} />
                                      </button>
                                      <button 
                                        onClick={() => setEditingKeywordId(null)}
                                        className="p-1 text-slate-400 hover:bg-slate-100 rounded transition cursor-pointer"
                                        title="Hủy"
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => handleStartQuickEdit(kw)}
                                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                                        title="Sửa nhanh thứ hạng"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteKeyword(kw.id)}
                                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                                        title="Xóa từ khóa"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION BAR FOR KEYWORDS */}
                {totalKeywordPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <span className="text-xs text-slate-500 font-medium">
                      Hiển thị {(keywordPage - 1) * pageSize + 1} - {Math.min(keywordPage * pageSize, filteredKeywords.length)} trong tổng số {filteredKeywords.length} từ khóa
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setKeywordPage(p => Math.max(1, p - 1))}
                        disabled={keywordPage === 1}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50 transition cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {getPageNumbers(keywordPage, totalKeywordPages).map((page, i) => (
                        <button
                          key={i}
                          disabled={page === '...'}
                          onClick={() => typeof page === 'number' && setKeywordPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                            page === '...' ? 'cursor-default text-slate-400' : 'cursor-pointer'
                          } ${
                            keywordPage === page 
                              ? 'bg-blue-600 text-white shadow-sm font-medium' 
                              : page === '...' ? 'bg-transparent' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setKeywordPage(p => Math.min(totalKeywordPages, p + 1))}
                        disabled={keywordPage === totalKeywordPages}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50 transition cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
                );
              })()
            )}

            {/* Hướng dẫn tĩnh đã được di chuyển vào Modal để giao diện sạch sẽ */}

          </div>
        )}

      </main>

      {/* ADD KEYWORD MODAL */}
      {showAddKeywordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                <PlusCircle size={16} className="text-blue-500" />
                Thêm từ khóa mục tiêu mới
              </h3>
              <button 
                onClick={() => setShowAddKeywordModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAddKeyword} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Từ khóa mục tiêu *</label>
                <input 
                  type="text" 
                  value={newKeywordText}
                  onChange={(e) => setNewKeywordText(e.target.value)}
                  placeholder="Ví dụ: in uv dtf nổi 3d"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Trang đích URL</label>
                <input 
                  type="text" 
                  value={newKeywordUrl}
                  onChange={(e) => setNewKeywordUrl(e.target.value)}
                  placeholder="Ví dụ: /cam-nang/ten-bai-viet-slug"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Mục tiêu (TOP) *</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={newKeywordTargetRank}
                    onChange={(e) => setNewKeywordTargetRank(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Thứ hạng hiện tại</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={newKeywordCurrentRank}
                    onChange={(e) => setNewKeywordCurrentRank(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Search Volume (Tháng)</label>
                <input 
                  type="number" 
                  min="0"
                  value={newKeywordVolume}
                  onChange={(e) => setNewKeywordVolume(Number(e.target.value))}
                  placeholder="Ví dụ: 480"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddKeywordModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition"
                >
                  <Check size={12} />
                  Thêm từ khóa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GSC IMPORT MODAL */}
      {showGscImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                <Upload size={16} className="text-blue-500" />
                Đồng bộ số liệu từ Google Search Console (GSC)
              </h3>
              <button 
                onClick={() => setShowGscImportModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                  Dán nội dung copy từ file CSV hoặc bảng dữ liệu GSC *
                </label>
                <textarea 
                  value={gscImportText}
                  onChange={(e) => setGscImportText(e.target.value)}
                  placeholder="Ví dụ dán dữ liệu copy từ file CSV:
in uv dtf nổi 3d&#9;120&#9;1500&#9;8%&#9;3
in uv dtf bình giữ nhiệt&#9;95&#9;850&#9;11.18%&#9;1
..."
                  rows={8}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono resize-none"
                  required
                />
              </div>

              <div className="text-xs text-slate-500 bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-2 leading-relaxed font-normal">
                <p className="font-bold text-blue-800 flex items-center gap-1">
                  <Info size={14} /> Quy tắc đọc dữ liệu của hệ thống:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Dòng dữ liệu được phân tách bằng phím Tab hoặc dấu phẩy (CSV).</li>
                  <li>Cột 1: Từ khóa | Cột 2: Clicks | Cột 3: Hiển thị (Impressions) | Cột 4: CTR (%) | Cột 5: Thứ hạng thực tế (Vị trí).</li>
                  <li>Nếu từ khóa dán vào khớp với từ khóa đang theo dõi trên website, website sẽ cập nhật tự động các số liệu thực tế này.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGscImportModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleImportGscData}
                  disabled={!gscImportText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs disabled:opacity-50 transition"
                >
                  <Check size={12} />
                  Đồng bộ dữ liệu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                <HelpCircle size={16} className="text-blue-500" />
                Hướng dẫn Đồng bộ Số liệu Thứ hạng và Clicks từ Google
              </h3>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed font-normal">
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-850 flex items-center gap-1">
                    Cách 1: Sử dụng File Export từ Google Search Console (Nhanh & Tiện)
                  </h5>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Đăng nhập vào <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Search Console</a>.</li>
                    <li>Chọn trang web của bạn (ví dụ: `https://prinktech.vn`).</li>
                    <li>Vào mục <strong>Hiệu suất (Performance)</strong> → tab <strong>Cụm từ tìm kiếm (Queries)</strong>.</li>
                    <li>Chỉnh bộ lọc thời gian mong muốn (ví dụ: 28 ngày qua).</li>
                    <li>Click nút <strong>Xuất (Export)</strong> ở góc trên bên phải → Chọn <strong>Tải xuống tệp CSV</strong>.</li>
                    <li>Mở file CSV đã tải, copy toàn bộ nội dung dữ liệu (Cột: Từ khóa, Clicks, Impressions, CTR, Vị trí).</li>
                    <li>Quay lại website, click nút <strong>Import GSC Data</strong> ở góc phải phía trên bảng này, dán nội dung đã copy vào và click <strong>Đồng bộ dữ liệu</strong>.</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h5 className="font-bold text-slate-850 flex items-center gap-1">
                    Cách 2: Tự động hóa qua Search Console API (Lập trình)
                  </h5>
                  <p>
                    Để đồng bộ tự động 100% hàng ngày không cần copy-paste, bạn cần setup một Service Account Google Cloud và chạy một script backend để kéo dữ liệu từ Google Search Console API.
                  </p>
                  <p className="bg-slate-900 text-slate-350 p-3 rounded-lg font-mono text-[10px] overflow-x-auto whitespace-pre leading-normal">
{`# 1. Tạo Google Cloud project, bật Search Console API
# 2. Tạo Service Account, tải file JSON credentials về máy
# 3. Phân quyền cho Email Service Account làm 'Viewer' trong GSC
# 4. Chạy script NodeJS hàng ngày để đồng bộ:

const { google } = require('googleapis');
const searchconsole = google.searchconsole('v1');
// Nạp Service Account credentials & gọi API
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
});`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition"
                >
                  Đóng hướng dẫn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
