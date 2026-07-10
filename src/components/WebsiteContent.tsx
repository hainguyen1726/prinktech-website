'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Facebook, MessageCircle, MapPin, Calculator, BookOpen, Layers, Award,
  Sparkles, ShieldCheck, CheckCircle2, ChevronRight, Zap, RefreshCw, Send, Lock, HelpCircle, Play, ExternalLink, Video, Eye, X } from 'lucide-react';
import Header from '@/components/Header';

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

interface WebsiteContentProps {
  initialTheme: 'tech' | 'creative' | 'elegant';
  hideSwitcher?: boolean;
  initialProducts?: Product[];
  initialPosts?: Post[];
  initialVideos?: Video[];
  initialPriceItems?: PriceItem[];
}

export default function WebsiteContent({
  initialTheme,
  hideSwitcher = false,
  initialProducts = [],
  initialPosts = [],
  initialVideos = [],
  initialPriceItems = [],
}: WebsiteContentProps) {
  const [activeTheme, setActiveTheme] = useState<'tech' | 'creative' | 'elegant'>(initialTheme);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Backend data states - Khởi tạo từ server props để tăng tốc độ FCP và tối ưu SEO
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [priceItems, setPriceItems] = useState<PriceItem[]>(initialPriceItems);
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [loading, setLoading] = useState(initialProducts.length === 0 && initialPosts.length === 0);

  // Universal Video Player modal state (YouTube / Facebook Reels / TikTok)
  const [activeVideo, setActiveVideo] = useState<{ embedUrl: string; platform: string; isVertical?: boolean } | null>(null);

  // States cho kho ảnh mẫu thực tế
  const [samples, setSamples] = useState<{ id: string; title: string; category: string; image_url: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedSampleUrl, setSelectedSampleUrl] = useState<string | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<{
    item: PriceItem;
    label: string;
    badge: string;
    desc: string;
    img: string;
    imgAlt: string;
    lowestPrice: number;
  } | null>(null);
  const [showAllSamples, setShowAllSamples] = useState(false);

  // Khởi tạo theme từ localStorage ở client-side
  useEffect(() => {
    const savedTheme = localStorage.getItem('prinktech-theme') || 'elegant';
    if (savedTheme === 'tech' || savedTheme === 'creative' || savedTheme === 'elegant') {
      setActiveTheme(savedTheme);
    }
  }, []);

  // Apply theme class to body và lưu vào localStorage
  useEffect(() => {
    document.body.className = '';
    localStorage.setItem('prinktech-theme', activeTheme);
    if (activeTheme === 'tech') {
      document.body.classList.add('theme-tech');
    } else if (activeTheme === 'creative') {
      document.body.classList.add('theme-creative');
    }
  }, [activeTheme]);

  // Scroll listener for sticky header effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch backend data (Chỉ fetch samples manifest và fallback client-side nếu server props trống)
  useEffect(() => {
    async function fetchData() {
      try {
        const sampleRes = await fetch('/images/samples/manifest.json').catch(() => null);
        if (sampleRes && sampleRes.ok) {
          const data = await sampleRes.json();
          setSamples(data || []);
        }
      } catch (err) {
        console.error('Lỗi tải manifest ảnh mẫu:', err);
      }

      if (initialProducts.length === 0 && initialPosts.length === 0) {
        try {
          const [prodRes, postRes, priceRes, videoRes] = await Promise.all([
            fetch('/api/web/products'),
            fetch('/api/web/posts'),
            fetch('/api/web/price-items'),
            fetch('/api/web/videos'),
          ]);

          if (prodRes.ok) {
            const data = await prodRes.json();
            setProducts(data.products || []);
          }
          if (postRes.ok) {
            const data = await postRes.json();
            setPosts(data.posts || []);
          }
          if (videoRes && videoRes.ok) {
            const data = await videoRes.json();
            setVideos(data.videos || []);
          }
          if (priceRes.ok) {
            const data = await priceRes.json();
            setPriceItems(data.priceItems || []);
          }
        } catch (err) {
          console.error('Lỗi tải dữ liệu website từ client-side fallback:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    fetchData();
  }, [initialProducts, initialPosts, initialVideos, initialPriceItems]);

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

  const getYoutubeEmbedUrl = (url: string) => {
    const id = getYoutubeId(url);
    if (id) {
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    return null;
  };

  const getReelsEmbedUrl = (url: string) => {
    // Facebook Reels/Video embed via plugins API
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1&width=560`;
  };

  const getTikTokEmbedUrl = (url: string) => {
    // Trích xuất video ID từ URL dạng: https://www.tiktok.com/@user/video/1234567890
    const match = url.match(/\/video\/(\d+)/);
    if (match) {
      return `https://www.tiktok.com/embed/v2/${match[1]}`;
    }
    return null;
  };

  const getVideoThumbnail = (video: Video) => {
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

  const renderThemeBadge = () => {
    if (activeTheme === 'tech') {
      return <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded">MODERN TECH</span>;
    } else if (activeTheme === 'creative') {
      return <span className="px-3 py-0.5 text-[10px] font-bold tracking-wider text-pink-500 bg-pink-500/10 rounded-full">CREATIVE</span>;
    } else {
      return <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest text-stone-500 bg-stone-200 border border-stone-300">ELEGANT</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen relative w-full font-sans">

      {/* Grid background for Tech Theme */}
      {activeTheme === 'tech' && <div className="fixed inset-0 tech-grid-overlay opacity-20 z-0 pointer-events-none"></div>}

      {/* 2. STICKY PUBLIC HEADER */}
      <Header activeTheme={activeTheme} setActiveTheme={setActiveTheme} hideSwitcher={hideSwitcher} />

      {/* Không cần spacer nữa vì Header.tsx đã có spacer nội bộ. Chỉ cần chừa 1px rất nhỏ trên desktop */}
      <div className="hidden md:block md:h-1 flex-shrink-0" aria-hidden="true" />
      <section id="about" className="py-12 md:py-24 px-6 relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-xs font-semibold text-[var(--accent)]">
            <Zap size={14} className="text-[var(--accent)]" /> Giải pháp tem dán thông minh thế hệ mới
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-[var(--foreground)]">
            In UV DTF Nổi 3D & <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-sky-400 via-pink-400 to-emerald-400 bg-clip-text text-transparent">
              Tem Decal Cao Cấp
            </span>
          </h1>
          <p className="text-base text-[var(--text-muted)] max-w-xl leading-relaxed">
            PrinK Tech cung cấp công nghệ in ấn UV DTF hiện đại đột phá. Tem dán dập nổi 3D, phủ bóng gương sắc nét bám dính siêu chắc trên mọi vật liệu cứng. Thiết kế website demo tích hợp 3 mẫu layout độc quyền.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/bao-gia"
              className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition flex items-center ${
                activeTheme === 'elegant'
                  ? 'btn-primary'
                  : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/10'
              }`}
              style={{ borderRadius: 'var(--btn-radius)' }}
            >
              Xem báo giá & Tính giá ngay
            </Link>
            <a
              href="https://zalo.me/0822968412"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl btn-secondary font-bold text-sm transition flex items-center gap-2"
              style={{ borderRadius: 'var(--btn-radius)' }}
            >
              <MessageCircle size={16} className="text-[var(--accent)]" /> Chat Zalo tư vấn
            </a>
          </div>
          
          <div className="grid grid-cols-3 gap-2 sm:gap-6 pt-6 border-t border-[var(--card-border)]/40">
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-[var(--accent)]">100%</h4>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1 leading-tight">Keo bám dính chắc chắn</p>
            </div>
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-[var(--accent)]">3D</h4>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1 leading-tight">Độ nổi dập mịn mượt</p>
            </div>
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-[var(--accent)]">24h</h4>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1 leading-tight">In lấy ngay siêu tốc</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 relative flex justify-center">
          <div className="w-full max-w-[400px] aspect-square relative glass-card p-4 overflow-hidden shadow-2xl flex items-center justify-center">
            <div className="absolute w-64 h-64 bg-[var(--accent-glow)] rounded-full blur-2xl z-0"></div>
            <img 
              src="/images/hero_official_mockup.webp" 
              alt="Tem UV DTF Nổi 3D dán bình giữ nhiệt PrinK Tech" 
              className="w-full h-full object-cover rounded-lg relative z-10 shadow-lg border border-[var(--card-border)]"
            />
            <div className="absolute bottom-6 left-6 right-6 bg-[var(--card-bg)]/90 backdrop-blur-md p-3 border border-[var(--card-border)] rounded-lg z-20 flex items-center gap-3">
              <Award className="text-yellow-500 shrink-0" size={24} />
              <div>
                <h5 className="text-xs font-bold text-[var(--foreground)]">Tem UV DTF Nổi 3D PrinK Tech</h5>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Mực in sắc nét, keo dính siêu bền</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HÌNH THỨC IN — layout quy cách in gốc */}
      <section id="products" className="py-16 px-6 bg-[var(--card-bg)]/10 border-t border-[var(--card-border)]/20 relative z-10 w-full">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)]">Hình thức in</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)]">Chúng tôi in được gì?</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              PrinK Tech chuyên in UV DTF Nổi 3D — tem dán dập nổi bóng gương cao cấp trên mọi vật liệu cứng.<br />
              Đặt hàng theo <strong className="text-[var(--foreground)]">mét dài, tờ A3/A4</strong> hoặc <strong className="text-[var(--foreground)]">tem cắt bế sẵn</strong> — linh hoạt mọi số lượng.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="animate-spin text-[var(--accent)]" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {priceItems.slice(0, 4).map((item) => {
                const validPrices = item.price_sheet
                  ? item.price_sheet.filter((r: any) => r.price > 0).map((r: any) => r.price)
                  : [];
                const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

                const isMet = item.material_name.includes('mét') || item.material_name.includes('Mét');
                const isA4 = item.material_name.includes('A4');
                const isA3 = item.material_name.includes('A3');

                const cfg = isMet ? {
                  label: 'In theo Mét dài',
                  badge: 'Cuộn 60cm',
                  desc: 'In cuộn liên tục khổ 60cm. Tem chuyển nổi 3D không viền nền, bám cực tốt trên chai lọ, ly cốc sần hay nón bảo hiểm.',
                  img: '/images/product_met_dai.png',
                  imgAlt: 'In tem UV DTF theo mét dài cuộn 60cm thực tế tại xưởng PrinK Tech',
                } : isA4 ? {
                  label: 'In tờ A4 (20×28cm)',
                  badge: 'UV DTF Nổi 3D',
                  desc: 'Khổ A4 cắt sẵn chứa nhiều logo. Công nghệ dán chuyển không viền decal nền, dán xong chỉ bám lại phần mực & keo nổi.',
                  img: '/images/product_to_a4.png',
                  imgAlt: 'Tờ tem nhãn in UV DTF A4 20x28cm nổi 3D không viền PrinK Tech',
                } : isA3 ? {
                  label: 'In tờ A3 (29×40cm)',
                  badge: 'UV DTF Nổi 3D',
                  desc: 'Khổ A3 chứa nhiều logo lớn. Keo dính bám chắc, phủ bóng gương nổi 3D sang trọng dán trực tiếp lên hộp quà, hộp cứng.',
                  img: '/images/product_to_a3.png',
                  imgAlt: 'In tem UV DTF tờ A3 29x40cm nổi 3D nhiều logo thương hiệu PrinK Tech',
                } : {
                  label: 'Tem nhỏ (≤3×3cm)',
                  badge: 'Cắt bế sẵn',
                  desc: 'Tem nhỏ cắt sẵn rời từng cái. Dán chuyển nổi 3D không viền, kháng nước 100% chuyên dùng dán ly thủy tinh, đồ gốm sứ.',
                  img: '/images/product_20260710_110649_04_sheet_ad.png',
                  imgAlt: 'Tem nhỏ UV DTF cắt bế sẵn dưới 3x3cm chibi xe đua không viền PrinK Tech',
                };

                return (
                  <div key={item.id} className="glass-card flex flex-col overflow-hidden h-full group">
                    {/* Ảnh */}
                    <div 
                      onClick={() => setSelectedProductDetail({
                        item,
                        label: cfg.label,
                        badge: cfg.badge,
                        desc: cfg.desc,
                        img: cfg.img,
                        imgAlt: cfg.imgAlt,
                        lowestPrice
                      })}
                      className="relative aspect-video w-full overflow-hidden bg-black/10 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`Xem chi tiết ${cfg.label}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedProductDetail({
                            item,
                            label: cfg.label,
                            badge: cfg.badge,
                            desc: cfg.desc,
                            img: cfg.img,
                            imgAlt: cfg.imgAlt,
                            lowestPrice
                          });
                        }
                      }}
                    >
                      <img
                        src={cfg.img}
                        alt={cfg.imgAlt}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-[var(--card-bg)]/90 backdrop-blur-sm border border-[var(--card-border)] rounded px-2.5 py-1 text-[10px] font-bold text-[var(--foreground)]">
                        {cfg.badge}
                      </div>
                    </div>
                    {/* Nội dung */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h4 
                          onClick={() => setSelectedProductDetail({
                            item,
                            label: cfg.label,
                            badge: cfg.badge,
                            desc: cfg.desc,
                            img: cfg.img,
                            imgAlt: cfg.imgAlt,
                            lowestPrice
                          })}
                          className="font-bold text-md text-[var(--foreground)] leading-tight hover:text-[var(--accent)] hover:underline cursor-pointer transition-colors"
                        >
                          {cfg.label}
                        </h4>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">{cfg.desc}</p>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[var(--card-border)]/40">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block">Giá từ</span>
                          <span className="font-black text-sm text-[var(--accent)]">
                            {lowestPrice >= 1000
                              ? `${(lowestPrice / 1000).toFixed(0)}.000`
                              : lowestPrice.toLocaleString('vi-VN')}đ
                            <span className="text-[10px] text-[var(--text-muted)]"> / {item.unit}</span>
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setSelectedProductDetail({
                              item,
                              label: cfg.label,
                              badge: cfg.badge,
                              desc: cfg.desc,
                              img: cfg.img,
                              imgAlt: cfg.imgAlt,
                              lowestPrice
                            })}
                            className="p-2.5 bg-[var(--card-bg)] hover:bg-[var(--accent)] hover:text-white border border-[var(--card-border)] hover:border-[var(--accent)] text-[var(--foreground)] rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 flex items-center justify-center cursor-pointer"
                            title="Xem chi tiết"
                            aria-label={`Xem chi tiết ${cfg.label}`}
                          >
                            <Eye size={16} aria-hidden="true" />
                          </button>
                          <Link
                            href="/bao-gia"
                            className="p-2.5 bg-[var(--card-bg)] hover:bg-[var(--accent)] hover:text-white border border-[var(--card-border)] hover:border-[var(--accent)] text-[var(--foreground)] rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 flex items-center justify-center cursor-pointer"
                            title="Tính giá in"
                            aria-label={`Tính giá ${cfg.label}`}
                          >
                            <Calculator size={16} aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. PROMOTION FOR THE NEW INTERACTIVE CALCULATOR */}
      <section id="price-calc" className="py-16 px-6 relative z-10 w-full max-w-7xl mx-auto">
        <div className={`rounded-3xl border transition-all duration-300 p-8 md:p-12 relative overflow-hidden shadow-2xl ${
          activeTheme === 'elegant'
            ? 'border-amber-500/20 bg-gradient-to-r from-amber-50/60 via-stone-50/70 to-amber-50/45 shadow-stone-200/50'
            : 'border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-purple-950/20'
        }`}>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-fuchsia-500/5 blur-3xl -z-10 pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)]">
                🚀 Tính năng mới cập nhật
              </span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--foreground)] leading-tight">
                Hệ Thống Tính Giá & <br />
                Đặt Hàng Tự Động 24/7
              </h2>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-xl">
                Chúng tôi đã nâng cấp hệ thống đặt in thông minh. Khách hàng giờ đây có thể tự do tùy chọn quy cách (In cuộn 60cm, in tờ A4/A3 hoặc tem cắt bế sẵn), nhập số lượng và xuất file báo giá PDF chuyên nghiệp chỉ trong 3 giây.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/bao-gia"
                  className="px-6 py-3 rounded-xl btn-primary font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center cursor-pointer"
                  style={{ borderRadius: 'var(--btn-radius)' }}
                >
                  📊 Thử tính giá ngay
                </Link>
                <Link
                  href="/dat-hang"
                  className="px-6 py-3 rounded-xl btn-secondary font-bold text-sm transition-all duration-200 flex items-center justify-center"
                  style={{ borderRadius: 'var(--btn-radius)' }}
                >
                  🛒 Đặt hàng trực tiếp →
                </Link>
              </div>
            </div>
            
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative glass-card p-6 border border-[var(--card-border)] max-w-[340px] w-full space-y-4 bg-[var(--card-bg)]/80">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-2xl">
                  🧾
                </div>
                <h3 className="font-bold text-lg text-[var(--foreground)]">Xuất Báo Giá Chuyên Nghiệp</h3>
                <p className="text-xs text-[var(--text-muted)]/80 leading-relaxed">
                  Hỗ trợ xuất báo giá dưới dạng PDF chuẩn A4, hiển thị chính xác bảng giá bậc thang của xưởng kèm chính sách miễn phí vận chuyển cho đơn hàng từ 150.000 ₫.
                </p>
                <Link href="/bao-gia" className="pt-2 flex items-center gap-2 text-xs text-[var(--accent)] font-bold hover:underline">
                  <span>Trải nghiệm ngay</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 5.5. VIDEO SHOWCASE LIBRARY */}
      <section id="videos" className="py-16 px-6 bg-[var(--card-bg)]/20 border-t border-[var(--card-border)]/20 relative z-10 w-full">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)]">Video thực tế</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)]" style={{ textWrap: 'balance' }}>
              Trải nghiệm in ấn & Dán nhãn trực quan
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Theo dõi quá trình gia công bám dính của tem UV DTF nổi 3D trên mọi bề mặt ly cốc cứng qua lăng kính thực tế.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {videos.map(video => (
              <div
                key={video.id}
                onClick={() => {
                  if (video.platform === 'youtube') {
                    const embedUrl = getYoutubeEmbedUrl(video.video_url);
                    const isShorts = video.video_url.includes('/shorts/');
                    if (embedUrl) setActiveVideo({ embedUrl, platform: 'youtube', isVertical: isShorts });
                    else window.open(video.video_url, '_blank');
                  } else if (video.platform === 'reels') {
                    setActiveVideo({ embedUrl: getReelsEmbedUrl(video.video_url), platform: 'reels' });
                  } else if (video.platform === 'tiktok') {
                    const embedUrl = getTikTokEmbedUrl(video.video_url);
                    if (embedUrl) setActiveVideo({ embedUrl, platform: 'tiktok', isVertical: true });
                    else window.open(video.video_url, '_blank');
                  }
                }}
                className="glass-card overflow-hidden flex flex-col h-full group cursor-pointer relative focus-within:ring-2 focus-within:ring-[var(--accent)]"
                role="button"
                tabIndex={0}
                aria-label={`Xem video: ${video.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (video.platform === 'youtube') {
                      const embedUrl = getYoutubeEmbedUrl(video.video_url);
                      const isShorts = video.video_url.includes('/shorts/');
                      if (embedUrl) setActiveVideo({ embedUrl, platform: 'youtube', isVertical: isShorts });
                      else window.open(video.video_url, '_blank');
                    } else if (video.platform === 'reels') {
                      setActiveVideo({ embedUrl: getReelsEmbedUrl(video.video_url), platform: 'reels' });
                    } else if (video.platform === 'tiktok') {
                      const embedUrl = getTikTokEmbedUrl(video.video_url);
                      if (embedUrl) setActiveVideo({ embedUrl, platform: 'tiktok', isVertical: true });
                      else window.open(video.video_url, '_blank');
                    }
                  }
                }}
              >
                {/* Video Image Cover */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/10">
                  <img
                    src={getVideoThumbnail(video)}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  {/* Central Play Overlay */}
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center z-25 group-hover:bg-slate-950/50 transition">
                    <div className="w-11 h-11 rounded-full bg-[var(--accent)] text-slate-950 flex items-center justify-center shadow-lg shadow-[var(--accent)]/30 transform group-hover:scale-110 transition duration-300">
                      <Play size={16} className="fill-current ml-0.5" aria-hidden="true" />
                    </div>
                  </div>
                  {/* Platform Badge */}
                  <div className="absolute top-3 left-3 z-30">
                    {video.platform === 'youtube' && (
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-red-650 text-white shadow-md">
                        YouTube
                      </span>
                    )}
                    {video.platform === 'reels' && (
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md">
                        Reels
                      </span>
                    )}
                    {video.platform === 'tiktok' && (
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-black text-white border border-stone-800 shadow-md">
                        TikTok
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Title & Desc */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs md:text-sm text-[var(--foreground)] line-clamp-2 leading-snug">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]/80 font-medium pt-2 border-t border-[var(--card-border)]/40">
                    <span>Xem video ngay</span>
                    <Play size={10} className="fill-current" aria-hidden="true" />
                  </div>
                </div>
              </div>
            ))}
            {videos.length === 0 && (
              <div className="col-span-full py-12 text-center text-[var(--text-muted)] text-xs font-medium">
                Chưa có video nào được đăng tải.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5.5. REAL PRODUCT SAMPLES GALLERY SECTION — dạng rút gọn trên trang chủ */}
      <section id="gallery" className="py-16 px-6 bg-background border-t border-card-border/60 relative z-10 w-full">
        <div className="max-w-7xl mx-auto w-full space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)]">Mẫu in thực tế tại xưởng</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Hình Ảnh Sản Phẩm Thực Tế</h2>
            <p className="text-xs text-text-muted">Tham khảo các sản phẩm in ấn nhãn tem nổi 3D sắc nét bám dính siêu chắc trên mọi chất liệu cứng.</p>
          </div>

          {/* Photos Grid - chỉ hiển thị 4 ảnh đầu */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {samples.slice(0, 4).map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedSampleUrl(item.image_url)}
                className="aspect-square rounded-2xl overflow-hidden border border-card-border bg-card-bg group cursor-pointer relative shadow-sm hover:shadow-md transition-all duration-300"
              >
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <span className="text-[10px] font-mono text-purple-300 font-bold uppercase block">{item.category}</span>
                  <span className="font-bold text-xs text-white leading-snug mt-1 truncate">{item.title}</span>
                  <span className="text-[10px] text-stone-300/80 mt-1 flex items-center gap-1 font-semibold">
                    🔍 Nhấp để xem lớn
                  </span>
                </div>
              </div>
            ))}
            {samples.length === 0 && (
              <div className="col-span-full py-12 text-center text-text-muted text-xs font-medium">
                Đang tải thư viện hình ảnh mẫu...
              </div>
            )}
          </div>

          {/* Link to the dedicated gallery page */}
          {samples.length > 4 && (
            <Link
              href="/thu-vien-anh"
              className="mx-auto block w-fit px-6 py-2.5 rounded-xl btn-primary font-bold text-sm transition-all duration-200 mt-8 cursor-pointer"
            >
              Xem toàn bộ 34 ảnh mẫu in thực tế →
            </Link>
          )}
        </div>
      </section>

      {/* Product Details Modal (Summary and Price Tiers) */}
      {selectedProductDetail && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-100 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedProductDetail(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết sản phẩm ${selectedProductDetail.label}`}
        >
          <div 
            className="w-full max-w-3xl bg-[var(--card-bg)]/95 backdrop-blur-xl border border-[var(--card-border)] rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 relative animate-fadeIn"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedProductDetail(null)}
              className="absolute top-4 right-4 z-110 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white rounded-full transition focus:outline-none cursor-pointer"
              aria-label="Đóng chi tiết"
            >
              <X size={20} aria-hidden="true" />
            </button>

            {/* Left column: Product Image */}
            <div className="w-full md:w-5/12 aspect-video md:aspect-square rounded-2xl overflow-hidden border border-[var(--card-border)] bg-black/10 shrink-0 shadow-inner flex items-center justify-center">
              <img
                src={selectedProductDetail.img}
                alt={selectedProductDetail.imgAlt}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Right column: Content & Details */}
            <div className="flex-1 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="inline-block bg-[var(--accent)]/15 border border-[var(--accent)]/30 rounded px-2.5 py-0.5 text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider">
                    {selectedProductDetail.badge}
                  </span>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight text-[var(--foreground)] leading-tight">
                    {selectedProductDetail.label}
                  </h3>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/80">
                    Thông tin tóm tắt
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {selectedProductDetail.desc}
                  </p>
                </div>

                {/* Price list table */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/80 border-b border-[var(--card-border)]/40 pb-1.5">
                    Đơn giá tham khảo (Bảng giá sỉ bậc thang)
                  </h4>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {selectedProductDetail.item.price_sheet && selectedProductDetail.item.price_sheet
                      .filter((range: any) => range.price > 0)
                      .map((range: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex justify-between items-center py-2 px-3 rounded-xl bg-[var(--foreground)]/5 border border-[var(--card-border)]/20 transition-all hover:bg-[var(--foreground)]/10"
                        >
                          <span className="font-semibold text-[11px] text-[var(--foreground)]">
                            {range.max && range.max < 999999
                              ? `Từ ${range.min} đến ${range.max} ${selectedProductDetail.item.unit}`
                              : `Từ ${range.min} ${selectedProductDetail.item.unit} trở lên`}
                          </span>
                          <span className="font-black text-[var(--accent)] text-xs md:text-sm">
                            {range.price.toLocaleString('vi-VN')}đ
                            <span className="text-[10px] text-[var(--text-muted)] font-normal"> / {selectedProductDetail.item.unit}</span>
                          </span>
                        </div>
                      ))}
                    {(!selectedProductDetail.item.price_sheet || selectedProductDetail.item.price_sheet.length === 0) && (
                      <div className="text-xs text-[var(--text-muted)] py-2">Liên hệ xưởng để nhận báo giá chi tiết.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Button */}
              <div className="pt-3">
                <Link
                  href="/bao-gia"
                  onClick={() => setSelectedProductDetail(null)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-primary font-bold text-xs md:text-sm tracking-wide transition shadow-lg hover:scale-[1.02] cursor-pointer"
                >
                  <Calculator size={16} />
                  <span>Tính giá chi tiết & Đặt hàng</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal Player Popup */}
      {selectedSampleUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-100 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedSampleUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem chi tiết ảnh sản phẩm mẫu"
        >
          <div 
            className="w-full max-w-xl aspect-square bg-[#1c1917] rounded-2xl border border-stone-850 overflow-hidden shadow-2xl relative flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSampleUrl(null)}
              className="absolute top-4 right-4 z-110 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition focus:outline-none cursor-pointer"
              aria-label="Đóng ảnh"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <img
              src={selectedSampleUrl}
              alt="Mẫu tem in UV DTF thực tế"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Universal Video Modal Player (YouTube / Facebook Reels / TikTok) */}
      {activeVideo && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-100 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveVideo(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Trình phát video"
        >
          <div 
            className={`relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl ${
              activeVideo.platform === 'tiktok'
                ? 'w-full max-w-sm' // TikTok: dọc 9:16
                : 'w-full max-w-4xl' // YouTube / Reels: ngang 16:9
            }`}
            style={activeVideo.platform === 'tiktok' ? { aspectRatio: '9/16', maxHeight: '85vh' } : { aspectRatio: '16/9' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Badge nền tảng */}
            <div className="absolute top-3 left-3 z-20">
              {activeVideo.platform === 'youtube' && (
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-red-600 text-white shadow">YouTube</span>
              )}
              {activeVideo.platform === 'reels' && (
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow">Reels</span>
              )}
              {activeVideo.platform === 'tiktok' && (
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-black text-white border border-stone-700 shadow">TikTok</span>
              )}
            </div>
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
              aria-label="Đóng trình phát video"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <iframe
              src={activeVideo.embedUrl}
              title="Video player"
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* 6. BLOG / GUIDELINES SECTION */}
      <section id="blog" className="py-16 px-6 bg-[var(--card-bg)]/10 border-t border-[var(--card-border)]/20 relative z-10 w-full">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)]">Cẩm nang kỹ thuật</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)]">Kinh nghiệm & Hướng dẫn in tem</h2>
            <p className="text-xs text-[var(--text-muted)]">Các bài viết hướng dẫn chi tiết cách dán tem in UV DTF và cách tối ưu file thiết kế.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map(post => (
              <div key={post.id} className="glass-card overflow-hidden flex flex-col md:flex-row h-full">
                <Link href={`/cam-nang/${post.slug}`} className="md:w-2/5 aspect-video md:aspect-auto min-h-[160px] bg-black/10 relative block overflow-hidden group">
                  <img
                    src={post.cover_image || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&auto=format&fit=crop&q=80'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-555"
                  />
                </Link>
                <div className="p-6 md:w-3/5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]/85 font-bold uppercase block">{new Date(post.created_at).toLocaleDateString('vi-VN')} | {post.author}</span>
                    <h3 className="font-bold text-md text-[var(--foreground)] leading-snug hover:text-[var(--accent)] transition-colors">
                      <Link href={`/cam-nang/${post.slug}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">{post.summary}</p>
                  </div>
                  <Link
                    href={`/cam-nang/${post.slug}`}
                    className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:underline inline-flex"
                    aria-label={`Đọc tiếp bài viết: ${post.title}`}
                  >
                    Đọc tiếp bài viết <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CONTACT & FOOTER */}
      <footer id="contact" className={`py-16 px-6 border-t relative z-10 w-full transition-all duration-300 ${
        activeTheme === 'elegant'
          ? 'bg-[#1c1917] text-stone-400 border-stone-800'
          : 'bg-slate-950 text-slate-400 border-slate-900'
      }`}>
        <div className={`max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b ${
          activeTheme === 'elegant' ? 'border-stone-800/50' : 'border-slate-800/50'
        }`}>
          
          <div className="space-y-5">
            <img src="/logo-horizontal.png" alt="PrinK Tech" className="h-10 object-contain" />
            <p className="text-xs leading-relaxed text-stone-400">
              PrinK Tech tự hào mang tới các sản phẩm in ấn chất lượng đột phá, lớp phủ bảo vệ hoàn hảo. Chúng tôi phục vụ in ấn nhãn hàng sỉ và dán cốc lẻ tốc độ cao, hỗ trợ giao hàng toàn quốc.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://zalo.me/0822968412"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 hover:border-sky-400 text-sky-400 hover:text-sky-300 flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                aria-label="Liên hệ Zalo của xưởng (mở trong cửa sổ mới)"
              >
                <MessageCircle size={18} aria-hidden="true" />
              </a>
              <a
                href="https://www.facebook.com/prinktechUS"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-400 text-blue-400 hover:text-blue-300 flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                aria-label="Fanpage Facebook PrinK Tech (mở trong cửa sổ mới)"
              >
                <Facebook size={18} aria-hidden="true" />
              </a>
            </div>
            <div className="pt-2">
              <Link
                href="/chinh-sach-bao-mat"
                className="text-sm font-bold text-stone-200 hover:text-white hover:underline underline-offset-4 transition flex items-center gap-2"
              >
                <ShieldCheck size={16} className="text-sky-400" />
                Chính sách bảo mật dữ liệu
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm text-white tracking-widest uppercase border-b border-white/10 pb-2">Cơ sở sản xuất</h4>
            <ul className="space-y-4 text-xs leading-relaxed">
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={14} className="text-sky-400" />
                </div>
                <div>
                  <strong className="text-stone-200 block mb-0.5">Cơ sở Phú Thọ</strong>
                  <span className="text-stone-400">Khu 9, Phù Ninh, Phú Thọ</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={14} className="text-pink-400" />
                </div>
                <div>
                  <strong className="text-stone-200 block mb-0.5">Cơ sở Hà Nội</strong>
                  <span className="text-stone-400">Nguyễn Tuân, Thanh Xuân, Hà Nội</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm text-white tracking-widest uppercase border-b border-white/10 pb-2">Hỗ trợ khách hàng</h4>
            <ul className="space-y-4 text-xs">
              <li>
                <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Zalo (Ưu tiên)</span>
                <a href="https://zalo.me/0822968412" className="font-bold text-sky-400 hover:text-sky-300 hover:underline text-sm transition">0822.968.412</a>
              </li>
              <li>
                <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Tra cứu đơn hàng</span>
                <Link href="/tra-cuu" className="font-bold text-[var(--accent)] hover:underline flex items-center gap-1.5 transition">
                  🔍 Kiểm tra hành trình đơn
                </Link>
              </li>
              <li>
                <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Đơn vị chủ quản</span>
                <span className="font-semibold text-stone-200">Công ty TNHH GMKT Việt Nam</span>
              </li>
            </ul>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
              <span className="text-[10px] text-stone-500 block uppercase font-bold tracking-wider mb-2">Giờ làm việc</span>
              <span className="text-base font-bold text-white block leading-tight">Thứ 2 – Chủ Nhật</span>
              <span className="text-sm text-stone-300 block mt-0.5">08:00 – 22:00</span>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto w-full pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-[11px] text-stone-500">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p>© 2026 Xưởng in UV DTF PrinK Tech. Dự án thuộc sở hữu của GMKT Việt Nam.</p>
            <Link href="/chinh-sach-bao-mat" className="text-stone-500 hover:text-stone-300 underline underline-offset-2 transition">
              Chính sách bảo mật
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-stone-600">Designed by PrinK Tech</span>
            <Link
              href="/login"
              className="group p-1.5 rounded-md text-stone-700 hover:text-stone-400 hover:bg-stone-800/40 transition-all duration-200"
              title="Đăng nhập quản trị"
              aria-label="Trang đăng nhập quản trị"
            >
              <Lock size={13} className="group-hover:scale-110 transition-transform duration-200" />
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
