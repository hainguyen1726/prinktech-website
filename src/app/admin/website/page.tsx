'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, Layers, Calculator, PhoneCall, Plus, Edit2, Trash2, Save, LogOut, Globe,
  CheckCircle, Loader2, X, PlusCircle, ArrowUpRight, Check, RefreshCw, AlertCircle, Video,
  BarChart, ShoppingBag, PenTool, Search, ChevronLeft, ChevronRight, Users
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  category: 'standard' | 'embossed' | 'others';
  is_featured: boolean;
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
}

interface PriceRange {
  min: number;
  max: number;
  price: number;
}

interface PriceItem {
  id: string;
  material_name: string;
  unit: string;
  price_sheet: PriceRange[];
  sort_order: number;
}

interface QuoteRequest {
  id: string;
  customer_name: string;
  phone: string;
  email?: string;
  material_type?: string;
  quantity?: number;
  dimensions?: string;
  notes?: string;
  status: 'pending' | 'contacted' | 'completed';
  created_at: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  platform: 'youtube' | 'reels' | 'tiktok';
  video_url: string;
  cover_image: string;
  display_order: number;
  is_visible: boolean;
  created_at: string;
}

export default function AdminWebsitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Tabs: 'posts' | 'products' | 'pricing' | 'quotes' | 'videos'
  const [activeTab, setActiveTab] = useState<'posts' | 'products' | 'pricing' | 'quotes' | 'videos'>('posts');

  // Content States
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search & Pagination States
  const [postsSearch, setPostsSearch] = useState('');
  const [postsPage, setPostsPage] = useState(1);

  const [productsSearch, setProductsSearch] = useState('');
  const [productsPage, setProductsPage] = useState(1);

  const [quotesSearch, setQuotesSearch] = useState('');
  const [quotesStatus, setQuotesStatus] = useState('all');
  const [quotesPage, setQuotesPage] = useState(1);

  const [videosSearch, setVideosSearch] = useState('');
  const [videosPage, setVideosPage] = useState(1);

  const pageSize = 10;

  // Helper cho phân trang thu gọn thông minh
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


  // Drawer Panel Control States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'post' | 'product' | 'video'>('post');
  const [editId, setEditId] = useState<string | null>(null);

  // Form States (Post)
  const [postTitle, setPostTitle] = useState('');
  const [postSlug, setPostSlug] = useState('');
  const [postSummary, setPostSummary] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCoverImage, setPostCoverImage] = useState('');
  const [postStatus, setPostStatus] = useState<'draft' | 'published'>('draft');

  // Form States (Product)
  const [prodName, setProdName] = useState('');
  const [prodSlug, setProdSlug] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodCategory, setProdCategory] = useState<'standard' | 'embossed' | 'others'>('standard');
  const [prodIsFeatured, setProdIsFeatured] = useState(false);

  // Form States (Video)
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoPlatform, setVideoPlatform] = useState<'youtube' | 'reels' | 'tiktok'>('youtube');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCoverImage, setVideoCoverImage] = useState('');
  const [videoDisplayOrder, setVideoDisplayOrder] = useState(0);
  const [videoIsVisible, setVideoIsVisible] = useState(true);

  // Action feedback states
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState({ text: '', type: '' });

  // Verification/Auth Check
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

  // Load Tab Content Data
  useEffect(() => {
    if (!authorized) return;

    async function loadData() {
      try {
        if (activeTab === 'posts') {
          const res = await fetch('/api/web/posts?all=true');
          const data = await res.json();
          setPosts(data.posts || []);
        } else if (activeTab === 'products') {
          const res = await fetch('/api/web/products');
          const data = await res.json();
          setProducts(data.products || []);
        } else if (activeTab === 'pricing') {
          const res = await fetch('/api/web/price-items');
          const data = await res.json();
          setPriceItems(data.priceItems || []);
        } else if (activeTab === 'quotes') {
          const res = await fetch('/api/web/quote-requests');
          const data = await res.json();
          setQuotes(data.requests || []);
        } else if (activeTab === 'videos') {
          const res = await fetch('/api/web/videos?admin=true');
          const data = await res.json();
          setVideos(data.videos || []);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu tab:', err);
      }
    }
    loadData();
  }, [activeTab, authorized, refreshKey]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg({ text: '', type: '' }), 3000);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    return null;
  };

  const getAdminVideoThumbnail = (video: Video) => {
    // Nếu là youtube, ưu tiên lấy trực tiếp thumbnail từ YouTube
    if (video.platform === 'youtube') {
      const id = getYoutubeId(video.video_url);
      if (id) {
        return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      }
    }

    // Nếu có ảnh cover_image và không phải là link trang ibb.co (không trực tiếp)
    if (video.cover_image && !video.cover_image.includes('ibb.co/')) {
      return video.cover_image;
    }
    if (video.cover_image && video.cover_image.includes('i.ibb.co')) {
      return video.cover_image;
    }

    if (video.platform === 'reels') {
      return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80';
  };

  // Auto Generate Slugs
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Open Drawer for New Post
  const handleNewPost = () => {
    setDrawerMode('post');
    setEditId(null);
    setPostTitle('');
    setPostSlug('');
    setPostSummary('');
    setPostContent('');
    setPostCoverImage('');
    setPostStatus('draft');
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit Post
  const handleEditPost = (post: Post) => {
    setDrawerMode('post');
    setEditId(post.id);
    setPostTitle(post.title);
    setPostSlug(post.slug);
    setPostSummary(post.summary || '');
    setPostContent(post.content || '');
    setPostCoverImage(post.cover_image || '');
    setPostStatus(post.status);
    setIsDrawerOpen(true);
  };

  // Save Post
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postSlug) {
      showToast('Vui lòng nhập đầy đủ Tiêu đề và Slug', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const url = editId ? `/api/web/posts/${editId}` : '/api/web/posts';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postTitle,
          slug: postSlug,
          summary: postSummary,
          content: postContent,
          cover_image: postCoverImage,
          status: postStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lưu thất bại');

      showToast(editId ? 'Cập nhật bài viết thành công' : 'Đăng bài viết mới thành công', 'success');
      setIsDrawerOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Post
  const handleDeletePost = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;
    try {
      const res = await fetch(`/api/web/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Xóa bài viết thành công', 'success');
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Open Drawer for New Product
  const handleNewProduct = () => {
    setDrawerMode('product');
    setEditId(null);
    setProdName('');
    setProdSlug('');
    setProdDesc('');
    setProdPrice(0);
    setProdImageUrl('');
    setProdCategory('standard');
    setProdIsFeatured(false);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit Product
  const handleEditProduct = (prod: Product) => {
    setDrawerMode('product');
    setEditId(prod.id);
    setProdName(prod.name);
    setProdSlug(prod.slug);
    setProdDesc(prod.description || '');
    setProdPrice(prod.price);
    setProdImageUrl(prod.image_url || '');
    setProdCategory(prod.category);
    setProdIsFeatured(prod.is_featured);
    setIsDrawerOpen(true);
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodSlug) {
      showToast('Vui lòng nhập tên và slug sản phẩm', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const url = editId ? `/api/web/products/${editId}` : '/api/web/products';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prodName,
          slug: prodSlug,
          description: prodDesc,
          price: prodPrice,
          image_url: prodImageUrl,
          category: prodCategory,
          is_featured: prodIsFeatured
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lưu thất bại');

      showToast(editId ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công', 'success');
      setIsDrawerOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    try {
      const res = await fetch(`/api/web/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Xóa sản phẩm thành công', 'success');
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Quote Request actions
  const handleUpdateQuoteStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/web/quote-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast('Cập nhật trạng thái yêu cầu thành công', 'success');
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa yêu cầu báo giá này không?')) return;
    try {
      const res = await fetch(`/api/web/quote-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Xóa yêu cầu thành công', 'success');
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Video Library actions
  const handleNewVideo = () => {
    setDrawerMode('video');
    setEditId(null);
    setVideoTitle('');
    setVideoDesc('');
    setVideoPlatform('youtube');
    setVideoUrl('');
    setVideoCoverImage('');
    setVideoDisplayOrder(0);
    setVideoIsVisible(true);
    setIsDrawerOpen(true);
  };

  const handleEditVideo = (video: Video) => {
    setDrawerMode('video');
    setEditId(video.id);
    setVideoTitle(video.title);
    setVideoDesc(video.description || '');
    setVideoPlatform(video.platform);
    setVideoUrl(video.video_url);
    setVideoCoverImage(video.cover_image || '');
    setVideoDisplayOrder(video.display_order || 0);
    setVideoIsVisible(video.is_visible);
    setIsDrawerOpen(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle || !videoUrl) {
      showToast('Tiêu đề và đường dẫn video là bắt buộc', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const url = editId ? `/api/web/videos/${editId}` : '/api/web/videos';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoTitle,
          description: videoDesc,
          platform: videoPlatform,
          video_url: videoUrl,
          cover_image: videoCoverImage,
          display_order: Number(videoDisplayOrder) || 0,
          is_visible: videoIsVisible
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lưu video thất bại');

      showToast(editId ? 'Cập nhật video thành công' : 'Thêm video thành công', 'success');
      setIsDrawerOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa video này?')) return;
    try {
      const res = await fetch(`/api/web/videos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Xóa video thành công', 'success');
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const detectPlatform = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      setVideoPlatform('youtube');
    } else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('/reel/')) {
      setVideoPlatform('reels');
    } else if (url.includes('tiktok.com')) {
      setVideoPlatform('tiktok');
    }
  };

  // Pricing Config actions
  const handleAddPriceRange = (idx: number) => {
    const updated = [...priceItems];
    const item = updated[idx];
    const sheets = [...item.price_sheet];
    const lastRange = sheets[sheets.length - 1];
    
    sheets.push({
      min: lastRange ? lastRange.max + 1 : 1,
      max: lastRange ? lastRange.max + 10 : 10,
      price: lastRange ? Math.max(0, lastRange.price - 5000) : 50000
    });
    
    updated[idx] = { ...item, price_sheet: sheets };
    setPriceItems(updated);
  };

  const handleRemovePriceRange = (itemIdx: number, rangeIdx: number) => {
    const updated = [...priceItems];
    const item = updated[itemIdx];
    const sheets = [...item.price_sheet];
    sheets.splice(rangeIdx, 1);
    updated[itemIdx] = { ...item, price_sheet: sheets };
    setPriceItems(updated);
  };

  const handlePriceValueChange = (itemIdx: number, rangeIdx: number, field: keyof PriceRange, val: number) => {
    const updated = [...priceItems];
    const item = updated[itemIdx];
    const sheets = [...item.price_sheet];
    sheets[rangeIdx] = { ...sheets[rangeIdx], [field]: val };
    updated[itemIdx] = { ...item, price_sheet: sheets };
    setPriceItems(updated);
  };

  const handleSavePricing = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/web/price-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceItems })
      });
      if (res.ok) {
        showToast('Lưu cấu hình bảng giá in thành công', 'success');
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="animate-spin text-sky-500" size={36} />
        <p className="mt-4 text-[10px] uppercase font-bold tracking-wider text-slate-500">Đang xác thực thông tin admin...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="admin-panel flex-1 flex flex-col min-h-screen bg-[#f1f5f9] text-slate-900 relative">
      {/* Glow decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Toast Notification */}
      {toastMsg.text && (
        <div className={`fixed top-6 right-6 z-50 border p-4 rounded-xl shadow-2xl flex items-center gap-2.5 animate-slideIn ${
          toastMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertCircle size={16} />
          <span className="text-xs font-bold">{toastMsg.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="glass-card rounded-none border-0 border-b border-slate-200 py-4 px-6 sticky top-0 z-30 bg-white/90 backdrop-blur-md flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <img src="/logo-horizontal-dark-text.png" alt="PrinK Tech" className="h-10 object-contain" />
          <span className="h-4 w-px bg-slate-200"></span>
          <h2 className="font-bold text-sm tracking-wider text-slate-800 uppercase">Quản trị Website PrinK Tech</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-600">Chào, <strong className="text-slate-900">{adminUser?.name || 'Admin'}</strong></span>
          <Link href="/" target="_blank" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1">
            <Globe size={14} /> Xem Website
          </Link>
          <button onClick={handleLogout} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition cursor-pointer" title="Đăng xuất">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto p-4 lg:p-6 gap-6 z-10">
        
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-60 shrink-0">
          <div className="glass-card p-3 lg:p-4 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 lg:gap-1.5 bg-slate-950/20 scrollbar-none whitespace-nowrap">
            <Link
              href="/admin/don-hang"
              className="w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent transition cursor-pointer"
            >
              <ShoppingBag size={16} className="text-emerald-400" /> Quản lý Đơn hàng
            </Link>

            <Link
              href="/admin/khach-hang"
              className="w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent transition cursor-pointer"
            >
              <Users size={16} className="text-purple-400" /> Quản lý Khách hàng
            </Link>

            <span className="hidden lg:block h-px bg-slate-800/80 my-2"></span>

            <button
              onClick={() => setActiveTab('posts')}
              className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                activeTab === 'posts'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <FileText size={16} /> Quản lý Bài viết
            </button>

            <Link
              href="/admin/viet-bai"
              className="w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent transition cursor-pointer"
            >
              <PenTool size={16} className="text-amber-400" /> Viết bài (Công cụ SEO)
            </Link>

            <Link
              href="/admin/seo"
              className="w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent transition cursor-pointer"
            >
              <BarChart size={16} className="text-teal-400" /> SEO Audit Center
            </Link>


            <button
              onClick={() => setActiveTab('products')}
              className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <Layers size={16} /> Quản lý Sản phẩm
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                activeTab === 'pricing'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <Calculator size={16} /> Cấu hình Bảng giá
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                activeTab === 'quotes'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <PhoneCall size={16} /> Yêu cầu Báo giá
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                activeTab === 'videos'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <Video size={16} /> Quản lý Video
            </button>

            <span className="hidden lg:block h-px bg-slate-800/80 my-2"></span>
            
            <Link
              href="/marketing"
              className="w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left text-slate-400 hover:text-slate-250 hover:bg-slate-900/30 border border-transparent transition cursor-pointer"
            >
              <BarChart size={16} className="text-sky-400" /> Kênh Marketing Ads
            </Link>
          </div>
        </aside>

        {/* Main Section */}
        <main className="flex-1 min-w-0">
          
          {/* TAB 1: POSTS */}
          {activeTab === 'posts' && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Quản lý Bài viết / Cẩm nang in ấn</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Viết các cẩm nang, hướng dẫn dán tem nhãn UV DTF thường & nổi.</p>
                </div>
                <Link
                  href="/admin/viet-bai"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus size={14} /> Viết bài mới
                </Link>
              </div>
              {/* Search Bar for Posts */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="relative w-full max-w-xs">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm bài viết..."
                    value={postsSearch}
                    onChange={(e) => {
                      setPostsSearch(e.target.value);
                      setPostsPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-white text-slate-900"
                  />
                </div>
              </div>

              {(() => {
                const filteredPosts = posts.filter(post =>
                  post.title.toLowerCase().includes(postsSearch.toLowerCase()) ||
                  post.slug.toLowerCase().includes(postsSearch.toLowerCase()) ||
                  (post.summary && post.summary.toLowerCase().includes(postsSearch.toLowerCase()))
                );
                const totalPostsPages = Math.ceil(filteredPosts.length / pageSize);
                const paginatedPosts = filteredPosts.slice((postsPage - 1) * pageSize, postsPage * pageSize);

                return (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                            <th className="p-3">Bài viết</th>
                            <th className="p-3">Đường dẫn (Slug)</th>
                            <th className="p-3">Trạng thái</th>
                            <th className="p-3">Tác giả</th>
                            <th className="p-3">Ngày tạo</th>
                            <th className="p-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedPosts.map(post => (
                            <tr key={post.id} className="hover:bg-slate-50 text-slate-700">
                              <td className="p-3 font-semibold text-slate-900 max-w-[200px] truncate">{post.title}</td>
                              <td className="p-3 text-slate-500">{post.slug}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  post.status === 'published' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {post.status === 'published' ? 'Đã đăng' : 'Bản nháp'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500">{post.author}</td>
                              <td className="p-3 text-slate-400">{new Date(post.created_at).toLocaleDateString('vi-VN')}</td>
                              <td className="p-3 text-right flex justify-end gap-2">
                                <Link href={`/admin/viet-bai?id=${post.id}`} className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 rounded transition cursor-pointer flex items-center justify-center">
                                  <Edit2 size={12} />
                                </Link>
                                <button onClick={() => handleDeletePost(post.id)} className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded transition cursor-pointer">
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredPosts.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400">Không tìm thấy bài viết nào.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar for Posts */}
                    {totalPostsPages > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500 font-semibold gap-3">
                        <span>Hiển thị {(postsPage - 1) * pageSize + 1} - {Math.min(postsPage * pageSize, filteredPosts.length)} trong {filteredPosts.length} bài viết</span>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={postsPage === 1}
                            onClick={() => setPostsPage(p => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-white"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          {getPageNumbers(postsPage, totalPostsPages).map((pNo, i) => (
                            <button
                              key={i}
                              disabled={pNo === '...'}
                              onClick={() => typeof pNo === 'number' && setPostsPage(pNo)}
                              className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                                pNo === '...' ? 'cursor-default text-slate-400 bg-transparent' : 'cursor-pointer'
                              } ${
                                postsPage === pNo 
                                  ? 'bg-blue-600 text-white shadow-sm font-bold border-transparent' 
                                  : pNo === '...' ? 'border-transparent' : 'border border-slate-200 hover:bg-slate-100 bg-white text-slate-700'
                              }`}
                            >
                              {pNo}
                            </button>
                          ))}
                          <button
                            disabled={postsPage === totalPostsPages}
                            onClick={() => setPostsPage(p => Math.min(totalPostsPages, p + 1))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-white"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Quản lý danh sách sản phẩm</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Trưng bày các mẫu sản phẩm in tiêu biểu tại xưởng.</p>
                </div>
                <button
                  onClick={handleNewProduct}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus size={14} /> Thêm sản phẩm
                </button>
              </div>

              {/* Search Bar for Products */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="relative w-full max-w-xs">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={productsSearch}
                    onChange={(e) => {
                      setProductsSearch(e.target.value);
                      setProductsPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-white text-slate-900"
                  />
                </div>
              </div>

              {(() => {
                const filteredProducts = products.filter(prod =>
                  prod.name.toLowerCase().includes(productsSearch.toLowerCase()) ||
                  prod.slug.toLowerCase().includes(productsSearch.toLowerCase()) ||
                  (prod.description && prod.description.toLowerCase().includes(productsSearch.toLowerCase()))
                );
                const totalProductsPages = Math.ceil(filteredProducts.length / pageSize);
                const paginatedProducts = filteredProducts.slice((productsPage - 1) * pageSize, productsPage * pageSize);

                return (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                            <th className="p-3">Sản phẩm</th>
                            <th className="p-3">Phân loại</th>
                            <th className="p-3 text-right">Đơn giá khởi điểm</th>
                            <th className="p-3 text-center">Nổi bật</th>
                            <th className="p-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedProducts.map(prod => (
                            <tr key={prod.id} className="hover:bg-slate-50 text-slate-700">
                              <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                                {prod.image_url && (
                                  <img src={prod.image_url} alt={prod.name} className="w-8 h-8 rounded object-cover border border-slate-200" />
                                )}
                                <span>{prod.name}</span>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                  {prod.category === 'standard' ? 'UV DTF Thường' : prod.category === 'embossed' ? 'UV DTF Nổi 3D' : 'Khác'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-blue-600 tabular-nums">{Number(prod.price).toLocaleString()}đ / A3</td>
                              <td className="p-3 text-center">
                                {prod.is_featured ? (
                                  <span className="inline-flex items-center justify-center p-1 bg-blue-50 text-blue-600 rounded-full">
                                    <Check size={12} />
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-3 text-right flex justify-end gap-2">
                                <button onClick={() => handleEditProduct(prod)} className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 rounded transition cursor-pointer">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => handleDeleteProduct(prod.id)} className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded transition cursor-pointer">
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredProducts.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-400">Không tìm thấy sản phẩm nào.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar for Products */}
                    {totalProductsPages > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500 font-semibold gap-3">
                        <span>Hiển thị {(productsPage - 1) * pageSize + 1} - {Math.min(productsPage * pageSize, filteredProducts.length)} trong {filteredProducts.length} sản phẩm</span>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={productsPage === 1}
                            onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-white"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          {getPageNumbers(productsPage, totalProductsPages).map((pNo, i) => (
                            <button
                              key={i}
                              disabled={pNo === '...'}
                              onClick={() => typeof pNo === 'number' && setProductsPage(pNo)}
                              className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                                pNo === '...' ? 'cursor-default text-slate-400 bg-transparent' : 'cursor-pointer'
                              } ${
                                productsPage === pNo 
                                  ? 'bg-blue-600 text-white shadow-sm font-bold border-transparent' 
                                  : pNo === '...' ? 'border-transparent' : 'border border-slate-200 hover:bg-slate-100 bg-white text-slate-700'
                              }`}
                            >
                              {pNo}
                            </button>
                          ))}
                          <button
                            disabled={productsPage === totalProductsPages}
                            onClick={() => setProductsPage(p => Math.min(totalProductsPages, p + 1))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-white"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 3: PRICING CONFIG */}
          {activeTab === 'pricing' && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Cấu hình Bảng giá dịch vụ in</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Cấu hình giá in tự động cho calculator ngoài trang chủ.</p>
                </div>
                <button
                  onClick={handleSavePricing}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                  Lưu thay đổi bảng giá
                </button>
              </div>

              <div className="space-y-6">
                {priceItems.map((item, itemIdx) => (
                  <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-xs uppercase tracking-wide">{item.material_name}</strong>
                        <span className="text-[10px] text-slate-400">Đơn vị: {item.unit}</span>
                      </div>
                      <button
                        onClick={() => handleAddPriceRange(itemIdx)}
                        className="px-2 py-1 border border-slate-200 hover:border-blue-500 text-slate-500 hover:text-blue-600 rounded text-[10px] font-bold bg-white flex items-center gap-1 transition cursor-pointer"
                      >
                        <PlusCircle size={12} /> Thêm khoảng số lượng
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {item.price_sheet && item.price_sheet.map((range, rangeIdx) => (
                        <div key={rangeIdx} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs shadow-sm">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={range.min}
                              onChange={e => handlePriceValueChange(itemIdx, rangeIdx, 'min', Number(e.target.value))}
                              className="w-12 bg-white border border-slate-200 rounded p-1.5 text-center font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 tabular-nums transition"
                              placeholder="Min"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                              type="number"
                              value={range.max}
                              onChange={e => handlePriceValueChange(itemIdx, rangeIdx, 'max', Number(e.target.value))}
                              className="w-16 bg-white border border-slate-200 rounded p-1.5 text-center font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 tabular-nums transition"
                              placeholder="Max"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={range.price}
                              onChange={e => handlePriceValueChange(itemIdx, rangeIdx, 'price', Number(e.target.value))}
                              className="w-20 bg-white border border-slate-200 rounded p-1.5 text-right font-black text-blue-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 tabular-nums transition"
                              placeholder="Giá"
                            />
                            <span className="text-slate-400">đ</span>
                            <button
                              onClick={() => handleRemovePriceRange(itemIdx, rangeIdx)}
                              className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                              title="Xóa"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUOTE REQUESTS */}
          {activeTab === 'quotes' && (
            <div className="glass-card p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-bold text-base text-slate-900">Yêu cầu báo giá từ Website</h3>
                <p className="text-[10px] text-slate-400 mt-1">Thông tin liên hệ của khách hàng vãng lai gửi yêu cầu báo giá.</p>
              </div>

              {/* Search & Filter Bar for Quotes */}
              <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="relative w-full max-w-xs">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm tên, SĐT, email, ghi chú..."
                    value={quotesSearch}
                    onChange={(e) => {
                      setQuotesSearch(e.target.value);
                      setQuotesPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-white text-slate-900"
                  />
                </div>
                <select
                  value={quotesStatus}
                  onChange={(e) => {
                    setQuotesStatus(e.target.value);
                    setQuotesPage(1);
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-white text-slate-700 font-semibold"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="contacted">Đã liên hệ</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>

              {(() => {
                const filteredQuotes = quotes.filter(req => {
                  const matchesSearch = 
                    req.customer_name.toLowerCase().includes(quotesSearch.toLowerCase()) ||
                    req.phone.includes(quotesSearch) ||
                    (req.email && req.email.toLowerCase().includes(quotesSearch.toLowerCase())) ||
                    (req.notes && req.notes.toLowerCase().includes(quotesSearch.toLowerCase())) ||
                    (req.material_type && req.material_type.toLowerCase().includes(quotesSearch.toLowerCase()));
                  
                  const matchesStatus = quotesStatus === 'all' || req.status === quotesStatus;
                  return matchesSearch && matchesStatus;
                });

                const totalQuotesPages = Math.ceil(filteredQuotes.length / pageSize);
                const paginatedQuotes = filteredQuotes.slice((quotesPage - 1) * pageSize, quotesPage * pageSize);

                return (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                            <th className="p-3">Khách hàng</th>
                            <th className="p-3">Số điện thoại</th>
                            <th className="p-3">Sản phẩm / Số lượng</th>
                            <th className="p-3">Ghi chú yêu cầu</th>
                            <th className="p-3">Trạng thái</th>
                            <th className="p-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedQuotes.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50 text-slate-700">
                              <td className="p-3">
                                <strong className="text-slate-900 block">{req.customer_name}</strong>
                                <span className="text-[10px] text-slate-400">{req.email || 'Không có email'}</span>
                              </td>
                              <td className="p-3 font-semibold text-slate-700 tabular-nums">
                                <a href={`tel:${req.phone}`} className="hover:underline text-blue-600" aria-label={`Gọi điện cho ${req.customer_name} qua số ${req.phone}`}>{req.phone}</a>
                              </td>
                              <td className="p-3">
                                <span className="text-slate-800 font-medium block">{req.material_type}</span>
                                <span className="text-[10px] text-slate-400">Số lượng: <span className="tabular-nums font-semibold text-slate-700">{req.quantity}</span> {req.dimensions}</span>
                              </td>
                              <td className="p-3 max-w-[200px] truncate text-slate-600" title={req.notes || ''}>
                                {req.notes || '-'}
                              </td>
                              <td className="p-3">
                                <select
                                  value={req.status}
                                  onChange={e => handleUpdateQuoteStatus(req.id, e.target.value)}
                                  className="bg-white border border-slate-200 rounded p-1 text-[10px] text-slate-700 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="pending" className="text-amber-600 font-bold">Chờ xử lý</option>
                                  <option value="contacted" className="text-sky-600 font-bold">Đã liên hệ</option>
                                  <option value="completed" className="text-emerald-600 font-bold">Hoàn thành</option>
                                </select>
                              </td>
                              <td className="p-3 text-right">
                                <button onClick={() => handleDeleteQuote(req.id)} className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded transition cursor-pointer">
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredQuotes.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400">Không tìm thấy yêu cầu báo giá nào.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar for Quotes */}
                    {totalQuotesPages > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500 font-semibold gap-3">
                        <span>Hiển thị {(quotesPage - 1) * pageSize + 1} - {Math.min(quotesPage * pageSize, filteredQuotes.length)} trong {filteredQuotes.length} yêu cầu</span>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={quotesPage === 1}
                            onClick={() => setQuotesPage(p => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-white"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          {getPageNumbers(quotesPage, totalQuotesPages).map((pNo, i) => (
                            <button
                              key={i}
                              disabled={pNo === '...'}
                              onClick={() => typeof pNo === 'number' && setQuotesPage(pNo)}
                              className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                                pNo === '...' ? 'cursor-default text-slate-400 bg-transparent' : 'cursor-pointer'
                              } ${
                                quotesPage === pNo 
                                  ? 'bg-blue-600 text-white shadow-sm font-bold border-transparent' 
                                  : pNo === '...' ? 'border-transparent' : 'border border-slate-200 hover:bg-slate-100 bg-white text-slate-700'
                              }`}
                            >
                              {pNo}
                            </button>
                          ))}
                          <button
                            disabled={quotesPage === totalQuotesPages}
                            onClick={() => setQuotesPage(p => Math.min(totalQuotesPages, p + 1))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-white"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 5: VIDEOS */}
          {activeTab === 'videos' && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Quản lý Kho thư viện Video thực tế</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Quản lý danh sách các video YouTube, Reels, TikTok hiển thị ngoài trang chủ.</p>
                </div>
                <button
                  onClick={handleNewVideo}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus size={14} /> Thêm Video mới
                </button>
              </div>

              {/* Search Bar for Videos */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="relative w-full max-w-xs">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm video..."
                    value={videosSearch}
                    onChange={(e) => {
                      setVideosSearch(e.target.value);
                      setVideosPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-white text-slate-900"
                  />
                </div>
              </div>

              {(() => {
                const filteredVideos = videos.filter(video =>
                  video.title.toLowerCase().includes(videosSearch.toLowerCase()) ||
                  video.video_url.toLowerCase().includes(videosSearch.toLowerCase()) ||
                  video.platform.toLowerCase().includes(videosSearch.toLowerCase())
                );
                const totalVideosPages = Math.ceil(filteredVideos.length / pageSize);
                const paginatedVideos = filteredVideos.slice((videosPage - 1) * pageSize, videosPage * pageSize);

                return (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                            <th className="p-3">Video</th>
                            <th className="p-3">Nền tảng</th>
                            <th className="p-3">Đường dẫn URL</th>
                            <th className="p-3 text-center">Thứ tự</th>
                            <th className="p-3 text-center">Trạng thái</th>
                            <th className="p-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedVideos.map(video => (
                            <tr key={video.id} className="hover:bg-slate-50 text-slate-700">
                              <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                                {getAdminVideoThumbnail(video) ? (
                                  <img src={getAdminVideoThumbnail(video)} alt={video.title} className="w-12 h-8 rounded object-cover border border-slate-200" />
                                ) : (
                                  <div className="w-12 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                    <Video size={14} />
                                  </div>
                                )}
                                <span className="max-w-[200px] truncate text-slate-900" title={video.title}>{video.title}</span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  video.platform === 'youtube'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : video.platform === 'reels'
                                    ? 'bg-pink-50 text-pink-700 border border-pink-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {video.platform === 'youtube' ? 'YouTube' : video.platform === 'reels' ? 'Reels' : 'TikTok'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 truncate max-w-[200px]" title={video.video_url}>
                                <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600 flex items-center gap-1">
                                  {video.video_url} <ArrowUpRight size={10} />
                                </a>
                              </td>
                              <td className="p-3 text-center font-semibold tabular-nums">{video.display_order}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  video.is_visible
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                                }`}>
                                  {video.is_visible ? 'Hiển thị' : 'Ẩn'}
                                </span>
                              </td>
                              <td className="p-3 text-right flex justify-end gap-2">
                                <button onClick={() => handleEditVideo(video)} className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 rounded transition cursor-pointer">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => handleDeleteVideo(video.id)} className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded transition cursor-pointer">
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredVideos.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400">Không tìm thấy video nào.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar for Videos */}
                    {totalVideosPages > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500 font-semibold gap-3">
                        <span>Hiển thị {(videosPage - 1) * pageSize + 1} - {Math.min(videosPage * pageSize, filteredVideos.length)} trong {filteredVideos.length} video</span>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={videosPage === 1}
                            onClick={() => setVideosPage(p => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-white"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          {getPageNumbers(videosPage, totalVideosPages).map((pNo, i) => (
                            <button
                              key={i}
                              disabled={pNo === '...'}
                              onClick={() => typeof pNo === 'number' && setVideosPage(pNo)}
                              className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                                pNo === '...' ? 'cursor-default text-slate-400 bg-transparent' : 'cursor-pointer'
                              } ${
                                videosPage === pNo 
                                  ? 'bg-blue-600 text-white shadow-sm font-bold border-transparent' 
                                  : pNo === '...' ? 'border-transparent' : 'border border-slate-200 hover:bg-slate-100 bg-white text-slate-700'
                              }`}
                            >
                              {pNo}
                            </button>
                          ))}
                          <button
                            disabled={videosPage === totalVideosPages}
                            onClick={() => setVideosPage(p => Math.min(totalVideosPages, p + 1))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center justify-center bg-white"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

        </main>
      </div>

      {/* DYNAMIC SIDE DRAWER PANEL (Tạo/Sửa Bài viết & Sản phẩm) */}
      <div className={`side-drawer-backdrop ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)}></div>
      
      <div className={`side-drawer flex flex-col transition-all duration-300 ease-out transform ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ display: isDrawerOpen ? 'flex' : 'none' }}>
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-sm uppercase text-slate-900">
            {drawerMode === 'post' 
              ? (editId ? 'Sửa bài viết / Cẩm nang' : 'Đăng bài viết mới')
              : (editId ? 'Cấu hình chi tiết sản phẩm' : 'Thêm sản phẩm mới')}
          </h3>
          <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Drawer Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          
          {/* POST FORM */}
          {drawerMode === 'post' && (
            <form onSubmit={handleSavePost} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tiêu đề bài viết *</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={e => {
                    setPostTitle(e.target.value);
                    if (!editId) setPostSlug(generateSlug(e.target.value));
                  }}
                  placeholder="Ví dụ: Hướng dẫn dán tem nhãn bền lâu…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Đường dẫn tĩnh (Slug) *</label>
                <input
                  type="text"
                  required
                  value={postSlug}
                  onChange={e => setPostSlug(e.target.value)}
                  placeholder="huong-dan-dan-tem-nhan-ben-lau"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Mô tả tóm tắt</label>
                <textarea
                  value={postSummary}
                  onChange={e => setPostSummary(e.target.value)}
                  rows={2}
                  placeholder="Tóm tắt nội dung bài đăng…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition resize-none"
                ></textarea>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Ảnh đại diện (URL)</label>
                <input
                  type="text"
                  value={postCoverImage}
                  onChange={e => setPostCoverImage(e.target.value)}
                  placeholder="Ví dụ: https://images.unsplash.com/photo-…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nội dung chi tiết</label>
                <textarea
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  rows={8}
                  placeholder="Nội dung bài viết hỗ trợ Markdown…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                ></textarea>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Trạng thái xuất bản</label>
                <select
                  value={postStatus}
                  onChange={e => setPostStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                >
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="published">Công khai (Published)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                Lưu bài viết
              </button>
            </form>
          )}

          {/* PRODUCT FORM */}
          {drawerMode === 'product' && (
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={e => {
                    setProdName(e.target.value);
                    if (!editId) setProdSlug(generateSlug(e.target.value));
                  }}
                  placeholder="Ví dụ: Tem nổi dán ly cốc…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Đường dẫn tĩnh (Slug) *</label>
                <input
                  type="text"
                  required
                  value={prodSlug}
                  onChange={e => setProdSlug(e.target.value)}
                  placeholder="tem-noi-dan-ly-coc"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Phân loại in</label>
                <select
                  value={prodCategory}
                  onChange={e => setProdCategory(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                >
                  <option value="standard">UV DTF Thường (Standard)</option>
                  <option value="embossed">UV DTF Nổi 3D (Embossed)</option>
                  <option value="others">Khác (Others)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Đơn giá cơ bản (đ) / A3</label>
                <input
                  type="number"
                  value={prodPrice}
                  onChange={e => setProdPrice(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Ảnh minh họa (URL)</label>
                <input
                  type="text"
                  value={prodImageUrl}
                  onChange={e => setProdImageUrl(e.target.value)}
                  placeholder="Ví dụ: https://images.unsplash.com/photo-…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Mô tả sản phẩm</label>
                <textarea
                  value={prodDesc}
                  onChange={e => setProdDesc(e.target.value)}
                  rows={4}
                  placeholder="Mô tả đặc điểm sản phẩm, quy cách keo dán…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition resize-none"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="prodIsFeatured"
                  checked={prodIsFeatured}
                  onChange={e => setProdIsFeatured(e.target.checked)}
                  className="border border-slate-300 rounded focus:ring-blue-500 text-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="prodIsFeatured" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Trưng bày nổi bật trên Trang chủ
                </label>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                Lưu sản phẩm
              </button>
            </form>
          )}

          {/* VIDEO FORM */}
          {drawerMode === 'video' && (
            <form onSubmit={handleSaveVideo} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tiêu đề Video *</label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="Ví dụ: Quy trình dán tem lên bình giữ nhiệt…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Đường dẫn Video URL *</label>
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={e => {
                    setVideoUrl(e.target.value);
                    detectPlatform(e.target.value);
                  }}
                  placeholder="YouTube, Reels hoặc TikTok URL…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nền tảng</label>
                <select
                  value={videoPlatform}
                  onChange={e => setVideoPlatform(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                >
                  <option value="youtube">YouTube</option>
                  <option value="reels">Facebook Reels</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Ảnh đại diện cover (tùy chọn)</label>
                <input
                  type="text"
                  value={videoCoverImage}
                  onChange={e => setVideoCoverImage(e.target.value)}
                  placeholder="Mặc định lấy thumbnail YouTube nếu dán link YouTube…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Thứ tự hiển thị</label>
                <input
                  type="number"
                  value={videoDisplayOrder}
                  onChange={e => setVideoDisplayOrder(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Mô tả video</label>
                <textarea
                  value={videoDesc}
                  onChange={e => setVideoDesc(e.target.value)}
                  rows={3}
                  placeholder="Nhập mô tả ngắn gọn về nội dung video…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition resize-none"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="videoIsVisible"
                  checked={videoIsVisible}
                  onChange={e => setVideoIsVisible(e.target.checked)}
                  className="border border-slate-300 rounded focus:ring-blue-500 text-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="videoIsVisible" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Hiển thị công khai ngoài trang chủ
                </label>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                Lưu Video
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  );
}
