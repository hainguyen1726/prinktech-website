'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, MessageSquare, Settings, RefreshCw, Upload, PlusCircle, 
  Send, Phone, CheckCircle, HelpCircle, LogOut, ChevronRight, Filter, 
  Search, User, ShoppingBag, DollarSign, Activity, AlertCircle, Check, X,
  ExternalLink, BarChart
} from 'lucide-react';

// Interfaces cho Dữ liệu
interface Campaign {
  id: string;
  name: string;
  platform: 'facebook' | 'shopee' | 'tiktok' | 'google';
  status: 'active' | 'paused' | 'completed' | 'archived';
  budget: number;
  budget_type: 'daily' | 'lifetime';
  start_date?: string;
  end_date?: string;
  fb_campaign_id?: string;
  created_at: string;
}

interface DailyReport {
  id: string;
  campaign_id: string;
  campaign_name: string;
  platform: string;
  report_date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversations: number;
  purchases: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cost_per_conv: number;
  cpa: number;
  roas: number;
}

interface SummaryData {
  spend: number;
  impressions: number;
  clicks: number;
  conversations: number;
  purchases: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cost_per_conv: number;
  cpa: number;
  roas: number;
}

interface Conversation {
  id: string;
  fb_conversation_id: string;
  type: 'inbox' | 'comment';
  customer_name: string;
  customer_fb_id?: string;
  last_message: string;
  has_phone: boolean;
  phone_number?: string;
  status: 'pending' | 'processing' | 'completed' | 'ignored';
  fb_post_id?: string;
  fb_post_title?: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  fb_message_id: string;
  sender_name: string;
  sender_id: string;
  message_text: string;
  created_time: string;
}

export default function MarketingDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Tabs: 'ads' | 'crm' | 'settings'
  const [activeTab, setActiveTab] = useState<'ads' | 'crm' | 'settings'>('ads');

  // Bộ lọc chung cho Ads
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Mặc định 7 ngày qua
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  // Ads State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    spend: 0, impressions: 0, clicks: 0, conversations: 0, purchases: 0, revenue: 0,
    ctr: 0, cpc: 0, cost_per_conv: 0, cpa: 0, roas: 0
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ mode?: string; message?: string } | null>(null);

  // CRM State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [crmFilterType, setCrmFilterType] = useState<string>('all'); // 'all', 'inbox', 'comment'
  const [crmFilterStatus, setCrmFilterStatus] = useState<string>('all'); // 'all', 'pending', 'processing', 'completed', 'ignored'
  const [crmFilterPhone, setCrmFilterPhone] = useState<string>('all'); // 'all', 'true', 'false'
  const [crmSyncing, setCrmSyncing] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');

  // Chốt đơn Form State (Cột phải CRM)
  const [quoteCustomerName, setQuoteCustomerName] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteMaterial, setQuoteMaterial] = useState('UV DTF Nổi 3D');
  const [quoteQty, setQuoteQty] = useState('100');
  const [quoteDims, setQuoteDims] = useState('A3');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<Record<string, string>>({
    fb_access_token: '',
    fb_page_access_token: '',
    fb_page_id: '',
    fb_ad_account_id: '',
    fb_app_id: '',
    fb_app_secret: ''
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Import CSV State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Drawer thêm chiến dịch
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [newCampPlatform, setNewCampPlatform] = useState<'facebook' | 'shopee' | 'tiktok' | 'google'>('facebook');
  const [newCampBudget, setNewCampBudget] = useState('200000');
  const [newCampBudgetType, setNewCampBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [newCampFbId, setNewCampFbId] = useState('');
  const [newCampLoading, setNewCampLoading] = useState(false);

  // Toast Feedback State
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToastMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Kiểm tra xác thực khi truy cập
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setAuthorized(true);
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

  // 2. Tải dữ liệu Ads
  useEffect(() => {
    if (!authorized) return;
    if (activeTab !== 'ads') return;

    async function fetchAdsData() {
      try {
        const res = await fetch(`/api/marketing/reports?start_date=${startDate}&end_date=${endDate}&platform=${selectedPlatform}`);
        const data = await res.json();
        if (res.ok) {
          setReports(data.reports || []);
          setSummary(data.summary || {
            spend: 0, impressions: 0, clicks: 0, conversations: 0, purchases: 0, revenue: 0,
            ctr: 0, cpc: 0, cost_per_conv: 0, cpa: 0, roas: 0
          });
        }
      } catch (err) {
        console.error('Lỗi tải báo cáo Ads:', err);
      }
    }

    async function fetchCampaigns() {
      try {
        const res = await fetch('/api/marketing/campaigns');
        const data = await res.json();
        if (res.ok) {
          setCampaigns(data.campaigns || []);
        }
      } catch (err) {
        console.error('Lỗi tải chiến dịch:', err);
      }
    }

    fetchAdsData();
    fetchCampaigns();
  }, [startDate, endDate, selectedPlatform, activeTab, authorized, syncResult]);

  // 3. Tải danh sách CRM
  useEffect(() => {
    if (!authorized) return;
    if (activeTab !== 'crm') return;

    fetchCRMConversations();
  }, [crmFilterType, crmFilterStatus, crmFilterPhone, activeTab, authorized]);

  const fetchCRMConversations = async (sync = false) => {
    try {
      const syncParam = sync ? '&sync=true' : '';
      const res = await fetch(
        `/api/marketing/crm?type=${crmFilterType}&status=${crmFilterStatus}&has_phone=${crmFilterPhone}${syncParam}`
      );
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
        // Nếu đang chọn một cuộc trò chuyện, cập nhật lại thông tin của cuộc đó
        if (selectedConv) {
          const updatedSelected = data.conversations.find((c: any) => c.id === selectedConv.id);
          if (updatedSelected) {
            setSelectedConv(updatedSelected);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi tải CRM conversations:', err);
    }
  };

  // 4. Tải tin nhắn của cuộc trò chuyện đang chọn
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      return;
    }

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/marketing/crm?conversation_id=${selectedConv?.id}`);
        const data = await res.json();
        if (res.ok) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Lỗi tải tin nhắn:', err);
      }
    }

    // Thiết lập thông tin mặc định cho form chốt đơn ở cột phải
    setQuoteCustomerName(selectedConv.customer_name);
    setQuotePhone(selectedConv.phone_number || '');
    setQuoteNotes(`Chốt đơn từ Facebook ${selectedConv.type === 'comment' ? 'Bình luận' : 'Tin nhắn'} (FB ID: ${selectedConv.fb_conversation_id})`);

    fetchMessages();

    // Auto-scroll chat window
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

  }, [selectedConv]);

  // 5. Tải Settings
  useEffect(() => {
    if (!authorized) return;
    if (activeTab !== 'settings') return;

    async function fetchSettings() {
      try {
        const res = await fetch('/api/marketing/settings');
        const data = await res.json();
        if (res.ok) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (err) {
        console.error('Lỗi tải cấu hình settings:', err);
      }
    }
    fetchSettings();
  }, [activeTab, authorized]);

  // Hành động Đồng bộ Ads qua API Facebook
  const handleSyncAds = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/marketing/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate })
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({ mode: data.mode, message: data.message });
        showToastMsg('Đồng bộ số liệu thành công!', 'success');
      } else {
        showToastMsg(data.error || 'Đồng bộ thất bại', 'error');
      }
    } catch (err) {
      console.error(err);
      showToastMsg('Lỗi kết nối khi đồng bộ', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  // Hành động Đồng bộ CRM Facebook Page
  const handleSyncCrm = async () => {
    setCrmSyncing(true);
    try {
      await fetchCRMConversations(true);
      showToastMsg('Cập nhật tin nhắn/bình luận mới thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToastMsg('Đồng bộ CRM thất bại', 'error');
    } finally {
      setCrmSyncing(false);
    }
  };

  // Gửi tin nhắn trả lời khách hàng
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !chatInput.trim()) return;

    const textToSend = chatInput;
    setChatInput('');

    // Append tin nhắn local lập tức để UI mượt mà
    const tempMsg: Message = {
      id: `temp_${Date.now()}`,
      conversation_id: selectedConv.id,
      fb_message_id: `temp_fb_${Date.now()}`,
      sender_name: user?.name || 'Xưởng in PrinK Tech',
      sender_id: 'page_admin_id',
      message_text: textToSend,
      created_time: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const res = await fetch('/api/marketing/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedConv.id,
          fb_conversation_id: selectedConv.fb_conversation_id,
          type: selectedConv.type,
          message_text: textToSend
        })
      });

      if (!res.ok) {
        showToastMsg('Lỗi gửi tin nhắn', 'error');
      } else {
        // Tự động tải lại tin nhắn sau 2.5s nếu ở chế độ mock để nhận tin phản hồi giả lập
        setTimeout(async () => {
          const resMsgs = await fetch(`/api/marketing/crm?conversation_id=${selectedConv?.id}`);
          const dataMsgs = await resMsgs.json();
          if (resMsgs.ok) {
            setMessages(dataMsgs.messages || []);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        }, 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cập nhật số điện thoại chốt đơn thủ công
  const handleSavePhone = async () => {
    if (!selectedConv) return;
    try {
      const res = await fetch('/api/marketing/crm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedConv.id,
          phone_number: quotePhone,
          has_phone: !!quotePhone
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedConv(data.conversation);
        // Cập nhật lại trong danh sách conversations
        setConversations(prev => prev.map(c => c.id === data.conversation.id ? data.conversation : c));
        showToastMsg('Cập nhật số điện thoại thành công!', 'success');
      } else {
        showToastMsg(data.error || 'Cập nhật thất bại', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Đổi trạng thái hội thoại (Đang xử lý, bỏ qua...)
  const handleUpdateStatus = async (status: 'pending' | 'processing' | 'completed' | 'ignored') => {
    if (!selectedConv) return;
    try {
      const res = await fetch('/api/marketing/crm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedConv.id, status })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedConv(data.conversation);
        setConversations(prev => prev.map(c => c.id === data.conversation.id ? data.conversation : c));
        showToastMsg(`Đã chuyển trạng thái hội thoại sang: ${status === 'completed' ? 'Đã hoàn thành' : status === 'ignored' ? 'Bỏ qua' : 'Đang xử lý'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tạo báo giá chốt đơn nhanh (chuyển sang xưởng in)
  const handleCreateQuoteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteCustomerName || !quotePhone) {
      showToastMsg('Vui lòng điền tên khách và số điện thoại', 'error');
      return;
    }

    setQuoteSubmitting(true);
    try {
      // 1. POST gửi sang API công cộng của xưởng in
      const resQuote = await fetch('/api/web/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: quoteCustomerName,
          phone: quotePhone,
          material_type: quoteMaterial,
          quantity: quoteQty,
          dimensions: quoteDims,
          notes: quoteNotes
        })
      });

      const dataQuote = await resQuote.json();

      if (resQuote.ok) {
        // 2. Đổi trạng thái cuộc chat sang Completed (Đã chốt đơn)
        await handleUpdateStatus('completed');
        showToastMsg('Đã tạo báo giá thành công và chuyển thẳng sang Xưởng In! 🚀', 'success');
      } else {
        showToastMsg(dataQuote.error || 'Lỗi gửi yêu cầu báo giá sang xưởng', 'error');
      }
    } catch (err) {
      console.error(err);
      showToastMsg('Lỗi kết nối tạo báo giá', 'error');
    } finally {
      setQuoteSubmitting(false);
    }
  };

  // Lưu Settings Token
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/marketing/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showToastMsg('Lưu cấu hình API thành công!', 'success');
      } else {
        showToastMsg('Lưu cấu hình thất bại', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Import CSV Facebook Ads
  const handleImportCSV = async () => {
    if (!csvRawText.trim()) {
      showToastMsg('Nội dung CSV trống', 'error');
      return;
    }
    setImportLoading(true);
    setImportFeedback(null);
    try {
      const res = await fetch('/api/marketing/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvRawText })
      });
      const data = await res.json();
      if (res.ok) {
        setImportFeedback(data.message);
        setCsvRawText('');
        showToastMsg('Import dữ liệu thành công!', 'success');
      } else {
        showToastMsg(data.error || 'Import thất bại', 'error');
      }
    } catch (err) {
      console.error(err);
      showToastMsg('Lỗi kết nối import', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  // Tạo chiến dịch quảng cáo thủ công
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampName) return;
    setNewCampLoading(true);
    try {
      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampName,
          platform: newCampPlatform,
          budget: Number(newCampBudget) || 0,
          budget_type: newCampBudgetType,
          fb_campaign_id: newCampFbId || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToastMsg('Tạo chiến dịch mới thành công!', 'success');
        setCampaigns(prev => [data.campaign, ...prev]);
        setShowCampaignModal(false);
        setNewCampName('');
        setNewCampFbId('');
      } else {
        showToastMsg(data.error || 'Tạo thất bại', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNewCampLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  // Tiện ích format số tiền VNĐ
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Lọc danh sách hội thoại theo từ khóa tìm kiếm
  const filteredConversations = conversations.filter(c => {
    const searchLower = crmSearch.toLowerCase();
    return (
      c.customer_name.toLowerCase().includes(searchLower) ||
      (c.phone_number && c.phone_number.includes(searchLower)) ||
      c.last_message.toLowerCase().includes(searchLower)
    );
  });

  // Vẽ biểu đồ SVG Đường Kép (Spend vs Conversations/Purchases)
  const renderTrendChart = () => {
    if (reports.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-zinc-500 border border-zinc-800 border-dashed rounded-lg bg-zinc-950/20">
          Chưa có dữ liệu báo cáo trong khoảng thời gian này. Bấm đồng bộ để tải dữ liệu mẫu.
        </div>
      );
    }

    // Sắp xếp báo cáo tăng dần theo ngày để vẽ biểu đồ
    const sorted = [...reports].sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
    
    // Nhóm theo ngày (nếu 1 ngày có nhiều chiến dịch thì cộng gộp lại)
    const dailyDataMap: Record<string, { spend: number; conversions: number; purchases: number }> = {};
    sorted.forEach(r => {
      if (!dailyDataMap[r.report_date]) {
        dailyDataMap[r.report_date] = { spend: 0, conversions: 0, purchases: 0 };
      }
      dailyDataMap[r.report_date].spend += r.spend;
      dailyDataMap[r.report_date].conversions += r.conversations;
      dailyDataMap[r.report_date].purchases += r.purchases;
    });

    const chartData = Object.entries(dailyDataMap).map(([date, val]) => ({
      date: date.substring(5), // Lấy MM-DD
      spend: val.spend,
      conversions: val.conversions,
      purchases: val.purchases
    }));

    const width = 600;
    const height = 240;
    const padding = 40;

    const maxSpend = Math.max(...chartData.map(d => d.spend), 100000);
    const maxConv = Math.max(...chartData.map(d => Math.max(d.conversions, d.purchases)), 5);

    const getX = (index: number) => padding + (index * (width - 2 * padding)) / (chartData.length - 1 || 1);
    const getYSpend = (val: number) => height - padding - (val * (height - 2 * padding)) / maxSpend;
    const getYConv = (val: number) => height - padding - (val * (height - 2 * padding)) / maxConv;

    // Đường chi tiêu (Orange Neon)
    let spendPath = '';
    // Đường tin nhắn (Blue Neon)
    let convPath = '';
    // Đường đơn hàng (Pink Neon)
    let purPath = '';

    chartData.forEach((d, idx) => {
      const x = getX(idx);
      const ySpend = getYSpend(d.spend);
      const yConv = getYConv(d.conversions);
      const yPur = getYConv(d.purchases);

      if (idx === 0) {
        spendPath = `M ${x} ${ySpend}`;
        convPath = `M ${x} ${yConv}`;
        purPath = `M ${x} ${yPur}`;
      } else {
        spendPath += ` L ${x} ${ySpend}`;
        convPath += ` L ${x} ${yConv}`;
        purPath += ` L ${x} ${yPur}`;
      }
    });

    return (
      <div className="relative w-full overflow-hidden bg-zinc-900/40 p-4 border border-zinc-800 rounded-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Activity size={16} className="text-orange-500" />
            Biểu đồ xu hướng (Chi tiêu vs Tin nhắn & Đơn hàng)
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-500 inline-block"></span> Chi tiêu (VNĐ)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-500 inline-block"></span> Tin nhắn mới</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-pink-500 inline-block"></span> Đơn hàng</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Lưới ngang (Grid lines) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding + ratio * (height - 2 * padding);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#27272a" strokeWidth={1} strokeDasharray="3 3" />
                {/* Trục trái - Chi tiêu */}
                <text x={padding - 8} y={y + 4} fill="#71717a" fontSize={8} textAnchor="end">
                  {Math.round((maxSpend * (1 - ratio)) / 1000)}k
                </text>
                {/* Trục phải - Số lượng */}
                <text x={width - padding + 8} y={y + 4} fill="#71717a" fontSize={8} textAnchor="start">
                  {Math.round(maxConv * (1 - ratio))}
                </text>
              </g>
            );
          })}

          {/* Đường vẽ đồ thị */}
          <path d={spendPath} fill="none" stroke="#f97316" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_4px_rgba(249,115,22,0.4)]" />
          <path d={convPath} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_4px_rgba(14,165,233,0.4)]" />
          <path d={purPath} fill="none" stroke="#ec4899" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_4px_rgba(236,72,153,0.4)]" />

          {/* Điểm nút dữ liệu & nhãn ngày */}
          {chartData.map((d, idx) => {
            const x = getX(idx);
            return (
              <g key={idx}>
                {/* Đường gióng trục dọc */}
                <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="#27272a" strokeWidth={0.5} opacity={0.3} />
                
                {/* Điểm tròn */}
                <circle cx={x} cy={getYSpend(d.spend)} r={3} fill="#f97316" />
                <circle cx={x} cy={getYConv(d.conversions)} r={3} fill="#0ea5e9" />
                <circle cx={x} cy={getYConv(d.purchases)} r={3} fill="#ec4899" />
                
                {/* Nhãn ngày bên dưới */}
                {idx % (Math.ceil(chartData.length / 7) || 1) === 0 && (
                  <text x={x} y={height - padding + 16} fill="#71717a" fontSize={8} textAnchor="middle">
                    {d.date}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-900 gap-4">
        <RefreshCw className="animate-spin text-sky-500" size={32} />
        <p className="text-slate-600 text-sm">Đang kiểm tra bảo mật...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="marketing-portal min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Header & Navigation */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-sky-600 to-emerald-500 p-2 rounded-lg text-white font-black shadow-lg shadow-sky-500/10">
            PKT
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              PrinK Tech <span className="text-zinc-500 font-normal">|</span> Marketing Portal
            </h1>
            <p className="text-xs text-zinc-500">Mảng quản lý quảng cáo & CSKH chốt đơn</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-zinc-900/60 p-1 rounded-lg border border-zinc-800">
          <button 
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'ads' ? 'bg-sky-500/10 text-sky-400 shadow-sm border border-sky-500/20' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
          >
            <BarChart3 size={14} />
            Số liệu Ads
          </button>
          <button 
            onClick={() => setActiveTab('crm')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'crm' ? 'bg-sky-500/10 text-sky-400 shadow-sm border border-sky-500/20' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
          >
            <MessageSquare size={14} />
            Hội thoại & CSKH
            {conversations.filter(c => c.status === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {conversations.filter(c => c.status === 'pending').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-sky-500/10 text-sky-400 shadow-sm border border-sky-500/20' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
          >
            <Settings size={14} />
            Cấu hình
          </button>
        </nav>

        {/* User profile / Log out */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-right">
            <div className="text-xs font-medium text-zinc-300">{user?.name}</div>
            <div className="text-[10px] text-zinc-500 capitalize">{user?.role} portal</div>
          </div>
          <button 
            onClick={handleLogout}
            title="Đăng xuất"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* 2. Main Content Wrapper */}
      <main className="flex-1 p-6 max-w-full w-full flex flex-col gap-6">
        
        {/* ==================== TAB 1: ADS DASHBOARD ==================== */}
        {activeTab === 'ads' && (
          <>
            {/* Header Filters & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 p-4 border border-zinc-900 rounded-xl backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Filter */}
                <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-500">Từ</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-medium text-zinc-200 focus:outline-none border-none"
                  />
                  <span className="text-xs text-zinc-500">Đến</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-xs font-medium text-zinc-200 focus:outline-none border-none"
                  />
                </div>

                {/* Platform Filter */}
                <select 
                  value={selectedPlatform} 
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="bg-zinc-950 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-200 focus:outline-none"
                >
                  <option value="all">Tất cả kênh</option>
                  <option value="facebook">Facebook Ads</option>
                  <option value="shopee">Shopee Ads (Demo)</option>
                  <option value="tiktok">Tiktok Ads</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowCampaignModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <PlusCircle size={14} />
                  Thêm chiến dịch
                </button>
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Upload size={14} />
                  Import CSV Facebook
                </button>
                <button 
                  onClick={handleSyncAds}
                  disabled={syncLoading}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-sky-600/10 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={14} className={syncLoading ? 'animate-spin' : ''} />
                  {syncLoading ? 'Đang đồng bộ...' : 'Đồng bộ FB API'}
                </button>
              </div>
            </div>

            {/* Sync Feedback Message */}
            {syncResult && (
              <div className={`p-4 border rounded-xl flex items-start gap-3 ${syncResult.mode === 'mock_demo' ? 'bg-amber-950/20 border-amber-900/50 text-amber-300' : 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'}`}>
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold capitalize">{syncResult.mode === 'mock_demo' ? 'Chế độ Demo Giả lập' : 'API Facebook Thật'}</div>
                  <div className="text-xs opacity-90 mt-0.5">{syncResult.message}</div>
                </div>
              </div>
            )}

            {/* 3. Core Metrics Section */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              
              {/* Chi tiêu */}
              <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="text-zinc-500 text-xs flex items-center justify-between">
                  Chi tiêu
                  <DollarSign size={14} className="text-zinc-500" />
                </div>
                <div className="text-xl font-bold text-orange-500 mt-2">{formatVND(summary.spend)}</div>
                <p className="text-[10px] text-zinc-600 mt-1">Tổng chi phí quảng cáo</p>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl"></div>
              </div>

              {/* Lượt click & CTR */}
              <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="text-zinc-500 text-xs flex items-center justify-between">
                  Lượt click & CTR
                  <Activity size={14} className="text-zinc-500" />
                </div>
                <div className="text-xl font-bold text-purple-500 mt-2">
                  {summary.clicks.toLocaleString()} 
                  <span className="text-xs text-zinc-400 ml-1.5">({summary.ctr.toFixed(2)}%)</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">Tỷ lệ nhấp quảng cáo</p>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
              </div>

              {/* Tin nhắn & Cost per conv */}
              <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="text-zinc-500 text-xs flex items-center justify-between">
                  Số tin nhắn & Giá tin
                  <MessageSquare size={14} className="text-zinc-500" />
                </div>
                <div className="text-xl font-bold text-sky-500 mt-2">
                  {summary.conversations.toLocaleString()} 
                  <span className="text-xs text-zinc-400 ml-1.5">({formatVND(summary.cost_per_conv)}/tin)</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">Trung bình chi phí một inbox mới</p>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl"></div>
              </div>

              {/* Đơn hàng & CPA */}
              <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="text-zinc-500 text-xs flex items-center justify-between">
                  Đơn hàng & CPA
                  <ShoppingBag size={14} className="text-zinc-500" />
                </div>
                <div className="text-xl font-bold text-pink-500 mt-2">
                  {summary.purchases.toLocaleString()} 
                  <span className="text-xs text-zinc-400 ml-1.5">({formatVND(summary.cpa)}/đơn)</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">Giá trị chốt đơn thành công</p>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl"></div>
              </div>

              {/* Doanh thu & ROAS */}
              <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="text-zinc-500 text-xs flex items-center justify-between">
                  Doanh thu & ROAS
                  <CheckCircle size={14} className="text-zinc-500" />
                </div>
                <div className="text-xl font-bold text-emerald-500 mt-2">
                  {formatVND(summary.revenue)} 
                  <span className={`text-xs ml-1.5 px-1 py-0.5 rounded font-black ${summary.roas > 2.5 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : summary.roas > 1.0 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {summary.roas.toFixed(2)}x
                  </span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">Doanh số đem về từ Ads</p>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
              </div>

            </div>

            {/* 4. Chart Section */}
            {renderTrendChart()}

            {/* 5. Campaigns Performance Table */}
            <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl backdrop-blur-md overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
                <h3 className="text-sm font-semibold text-zinc-300">Chi tiết hiệu quả theo chiến dịch</h3>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-medium">
                  {campaigns.length} chiến dịch quảng cáo
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-950/40 text-zinc-500 font-semibold uppercase tracking-wider">
                      <th className="px-6 py-3.5">Chi dịch</th>
                      <th className="px-6 py-3.5">Trạng thái</th>
                      <th className="px-6 py-3.5">Chi tiêu</th>
                      <th className="px-6 py-3.5">Hiển thị / Clicks</th>
                      <th className="px-6 py-3.5">CTR</th>
                      <th className="px-6 py-3.5">Tin nhắn</th>
                      <th className="px-6 py-3.5">Đơn hàng / Doanh thu</th>
                      <th className="px-6 py-3.5 text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {campaigns.map((camp) => {
                      // Tính toán tổng số liệu riêng cho chiến dịch này trong khoảng thời gian đang chọn
                      const campReports = reports.filter(r => r.campaign_id === camp.id);
                      const spend = campReports.reduce((sum, r) => sum + r.spend, 0);
                      const clicks = campReports.reduce((sum, r) => sum + r.clicks, 0);
                      const imps = campReports.reduce((sum, r) => sum + r.impressions, 0);
                      const convs = campReports.reduce((sum, r) => sum + r.conversations, 0);
                      const pur = campReports.reduce((sum, r) => sum + r.purchases, 0);
                      const rev = campReports.reduce((sum, r) => sum + r.revenue, 0);

                      const ctr = imps > 0 ? (clicks / imps) * 100 : 0;
                      const roas = spend > 0 ? rev / spend : 0;

                      return (
                        <tr key={camp.id} className="hover:bg-zinc-900/10 transition-colors">
                          <td className="px-6 py-4 font-medium text-zinc-200">
                            <div className="font-semibold text-zinc-100">{camp.name}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
                              <span className="capitalize">{camp.platform} Ads</span>
                              {camp.fb_campaign_id && (
                                <span className="bg-zinc-800 text-zinc-400 px-1 py-0.2 rounded font-mono text-[9px]">ID: {camp.fb_campaign_id}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${camp.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                              {camp.status === 'active' ? 'Đang chạy' : 'Tạm dừng'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-zinc-300">{formatVND(spend)}</td>
                          <td className="px-6 py-4 text-zinc-400">
                            <div>{imps.toLocaleString()} views</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{clicks.toLocaleString()} clicks</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-zinc-300">{ctr.toFixed(2)}%</td>
                          <td className="px-6 py-4 font-medium text-sky-400">
                            <div>{convs} tin</div>
                            {convs > 0 && (
                              <div className="text-[10px] text-zinc-500 mt-0.5">{formatVND(spend / convs)}/tin</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-pink-400">{pur} đơn</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{formatVND(rev)}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-block text-xs font-black px-2 py-0.5 rounded ${roas > 2.5 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : roas > 1.0 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : roas > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                              {roas > 0 ? `${roas.toFixed(2)}x` : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 2: SOCIAL CRM ==================== */}
        {activeTab === 'crm' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
            
            {/* CỘT 1: DANH SÁCH CHAT & COMMENT (Lg: 3 Cột) */}
            <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden backdrop-blur-md">
              <div className="p-4 border-b border-zinc-900 bg-zinc-900/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-sky-500" />
                  Hội thoại Fanpage
                </h3>
                <button 
                  onClick={handleSyncCrm}
                  disabled={crmSyncing}
                  className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"
                  title="Tải lại tin nhắn mới"
                >
                  <RefreshCw size={14} className={crmSyncing ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Tìm kiếm */}
              <div className="p-3 border-b border-zinc-900">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Tìm tên khách, số điện thoại..." 
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 pl-8 pr-3 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              {/* Bộ lọc nhanh CRM */}
              <div className="p-2 border-b border-zinc-900 flex flex-wrap gap-1 bg-zinc-950/20">
                <button 
                  onClick={() => setCrmFilterPhone(crmFilterPhone === 'true' ? 'all' : 'true')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 transition-all ${crmFilterPhone === 'true' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'}`}
                >
                  <Phone size={8} /> Có SĐT
                </button>
                <select 
                  value={crmFilterType} 
                  onChange={(e) => setCrmFilterType(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-[10px] px-1.5 py-0.5 rounded text-zinc-400 focus:outline-none"
                >
                  <option value="all">Loại</option>
                  <option value="inbox">Tin nhắn (Chat)</option>
                  <option value="comment">Bình luận</option>
                </select>
                <select 
                  value={crmFilterStatus} 
                  onChange={(e) => setCrmFilterStatus(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-[10px] px-1.5 py-0.5 rounded text-zinc-400 focus:outline-none"
                >
                  <option value="all">Trạng thái</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang trả lời</option>
                  <option value="completed">Đã chốt đơn</option>
                  <option value="ignored">Bỏ qua</option>
                </select>
              </div>

              {/* Chat list */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
                {filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    Không có cuộc hội thoại nào khớp bộ lọc.
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = selectedConv?.id === conv.id;
                    return (
                      <div 
                        key={conv.id}
                        onClick={() => setSelectedConv(conv)}
                        className={`p-3.5 cursor-pointer transition-all flex items-start justify-between gap-2.5 hover:bg-zinc-900/20 ${isSelected ? 'bg-sky-500/5 border-l-2 border-sky-500' : 'border-l-2 border-transparent'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-zinc-200 truncate block">
                              {conv.customer_name}
                            </span>
                            {/* Loại icon */}
                            {conv.type === 'inbox' ? (
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" title="Tin nhắn"></span>
                            ) : (
                              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full inline-block" title="Bình luận bài đăng"></span>
                            )}
                          </div>
                          
                          {/* Trích xuất bài đăng nếu là comment */}
                          {conv.type === 'comment' && conv.fb_post_title && (
                            <div className="text-[9px] text-purple-400 font-medium truncate mt-0.5">
                              Post: {conv.fb_post_title}
                            </div>
                          )}

                          <p className="text-[10px] text-zinc-500 truncate mt-1">
                            {conv.last_message}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {/* Thời gian */}
                          <span className="text-[9px] text-zinc-600">
                            {new Date(conv.updated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {/* Badge Số điện thoại */}
                          {conv.has_phone && (
                            <span className="bg-orange-500/10 text-orange-400 text-[9px] font-bold px-1.5 py-0.2 rounded border border-orange-500/20 flex items-center gap-0.5">
                              📞
                            </span>
                          )}

                          {/* Badge Status */}
                          <span className={`text-[8px] font-bold px-1 py-0.2 rounded-full uppercase tracking-wider ${conv.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : conv.status === 'ignored' ? 'bg-zinc-800 text-zinc-500' : conv.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400 animate-pulse'}`}>
                            {conv.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CỘT 2: CỬA SỔ CHAT / NỘI DUNG TƯƠNG TÁC (Lg: 6 Cột) */}
            <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden backdrop-blur-md">
              {selectedConv ? (
                <>
                  {/* Header Chat */}
                  <div className="p-4 border-b border-zinc-900 bg-zinc-900/20 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <User size={14} className="text-zinc-500" />
                        {selectedConv.customer_name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5 capitalize">
                        {selectedConv.type === 'inbox' ? 'Kênh chat Messenger' : `Bình luận dưới bài đăng Facebook (Post ID: ${selectedConv.fb_post_id})`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Thay đổi trạng thái cuộc trò chuyện nhanh */}
                      <button 
                        onClick={() => handleUpdateStatus('ignored')}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${selectedConv.status === 'ignored' ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:text-zinc-300'}`}
                      >
                        Bỏ qua
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus('processing')}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${selectedConv.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:text-zinc-300'}`}
                      >
                        Đang tư vấn
                      </button>
                      {selectedConv.status === 'completed' && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                          <Check size={10} /> Đã chốt đơn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cửa sổ hiển thị lịch sử chat */}
                  <div className="flex-1 p-4 overflow-y-auto bg-zinc-950/20 flex flex-col gap-3">
                    
                    {/* Báo cáo nếu là dạng comment bài đăng */}
                    {selectedConv.type === 'comment' && selectedConv.fb_post_title && (
                      <div className="bg-purple-950/10 border border-purple-900/30 p-3 rounded-lg text-[10px] text-purple-300">
                        💬 <strong className="text-purple-200">Đăng từ bình luận trên bài viết:</strong> "{selectedConv.fb_post_title}"
                        <br />
                        <span className="text-zinc-500 mt-1 block">Khách hàng bình luận và bạn có thể trả lời bình luận của họ trực tiếp dưới đây:</span>
                      </div>
                    )}

                    {messages.map((m) => {
                      const isMe = m.sender_id === 'page_admin_id';
                      return (
                        <div 
                          key={m.id}
                          className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                        >
                          <div className={`text-[9px] text-zinc-500 mb-1 px-1`}>
                            {m.sender_name} • {new Date(m.created_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${isMe ? 'bg-sky-600 border-sky-500 text-white rounded-tr-none' : 'bg-zinc-900 border-zinc-800 text-zinc-200 rounded-tl-none'}`}>
                            {m.message_text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input nhập chat */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-900 flex items-center gap-2 bg-zinc-950/40">
                    <input 
                      type="text" 
                      placeholder={selectedConv.type === 'inbox' ? 'Nhập tin nhắn gửi sang Messenger...' : 'Nhập câu trả lời bình luận...'}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                    <button 
                      type="submit"
                      className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow shadow-sky-600/10 transition-all active:scale-95"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
                  <MessageSquare size={36} className="text-zinc-600" />
                  <p className="text-xs">Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu CSKH.</p>
                </div>
              )}
            </div>

            {/* CỘT 3: HỒ SƠ KHÁCH HÀNG & CHỐT ĐƠN QUY TRÌNH (Lg: 3 Cột) */}
            <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden backdrop-blur-md p-4">
              {selectedConv ? (
                <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
                  
                  {/* Khung profile */}
                  <div className="border-b border-zinc-900 pb-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Hồ sơ khách hàng</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300">
                        {selectedConv.customer_name.substring(0, 1)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{selectedConv.customer_name}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Kênh: Facebook {selectedConv.type}</div>
                      </div>
                    </div>
                  </div>

                  {/* SĐT chốt đơn */}
                  <div className="border-b border-zinc-900 pb-4 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Số điện thoại chốt đơn</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Số điện thoại của khách..." 
                        value={quotePhone}
                        onChange={(e) => setQuotePhone(e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                      />
                      <button 
                        onClick={handleSavePhone}
                        className="px-2 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 border border-zinc-800 transition-colors"
                      >
                        Lưu
                      </button>
                    </div>
                    {selectedConv.has_phone && (
                      <span className="text-[9px] text-orange-400 flex items-center gap-1 font-medium mt-0.5">
                        📞 Đã tự động phát hiện số điện thoại từ tin nhắn!
                      </span>
                    )}
                  </div>

                  {/* FORM BÁO GIÁ XƯỞNG IN */}
                  <form onSubmit={handleCreateQuoteRequest} className="flex-1 flex flex-col gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <ShoppingBag size={12} className="text-pink-500" />
                        Tạo báo giá chuyển xưởng
                      </h4>
                      <p className="text-[9px] text-zinc-500">Đơn hàng sau khi chốt sẽ chuyển thẳng sang danh sách sản xuất của kỹ thuật viên.</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Loại tem dán</label>
                      <select 
                        value={quoteMaterial}
                        onChange={(e) => setQuoteMaterial(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                      >
                        <option value="UV DTF Nổi 3D">Tem UV DTF Nổi 3D bóng</option>
                        <option value="UV DTF Thường">Tem UV DTF Thường siêu bám</option>
                        <option value="Decal dán bình giữ nhiệt">Decal bình giữ nhiệt UV nổi</option>
                        <option value="Logo nón bảo hiểm">Decal nón bảo hiểm co giãn</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Số lượng in</label>
                        <input 
                          type="number" 
                          value={quoteQty}
                          onChange={(e) => setQuoteQty(e.target.value)}
                          placeholder="Số lượng..." 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Khổ in / Đơn vị</label>
                        <input 
                          type="text" 
                          value={quoteDims}
                          onChange={(e) => setQuoteDims(e.target.value)}
                          placeholder="A3, Mét dài..." 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Ghi chú thiết kế / Giao hàng</label>
                      <textarea 
                        rows={3}
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        placeholder="Ví dụ: Thiết kế file logo tròn 4x4cm bế viền, giao hỏa tốc..." 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none resize-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={quoteSubmitting}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-sky-600 hover:from-pink-500 hover:to-sky-500 text-xs font-bold text-white shadow-lg shadow-pink-600/10 transition-colors flex items-center justify-center gap-1.5 mt-auto disabled:opacity-50"
                    >
                      {quoteSubmitting ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          Đang gửi yêu cầu...
                        </>
                      ) : (
                        <>Chốt Đơn & Chuyển Xưởng 🚀</>
                      )}
                    </button>
                  </form>

                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-xs text-center">
                  Chọn cuộc trò chuyện để xem hồ sơ và tạo báo giá nhanh.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB 3: CONFIG / SETTINGS ==================== */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Cấu hình Token Form */}
            <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-6 border-b border-zinc-900 pb-3">
                <Settings size={16} className="text-zinc-400" />
                Cấu hình API kết nối Facebook Graph API
              </h3>
              
              <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
                
                {/* FB Access Token */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Facebook User Access Token (Dài hạn)</label>
                  <input 
                    type="password" 
                    placeholder="Mã token EAAb..." 
                    value={settings.fb_access_token}
                    onChange={(e) => setSettings(prev => ({ ...prev, fb_access_token: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-[10px] text-zinc-500">Mã token dài hạn hoặc System User token để lấy số liệu Ads.</span>
                </div>

                {/* FB Page Access Token */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Facebook Page Access Token (CSKH/Inbox)</label>
                  <input 
                    type="password" 
                    placeholder="Mã token Page EAAb..." 
                    value={settings.fb_page_access_token}
                    onChange={(e) => setSettings(prev => ({ ...prev, fb_page_access_token: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-[10px] text-zinc-500">Mã token riêng của Trang để đồng bộ và trả lời tin nhắn, bình luận Fanpage.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Page ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Facebook Page ID</label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: 10482810..." 
                      value={settings.fb_page_id}
                      onChange={(e) => setSettings(prev => ({ ...prev, fb_page_id: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Ad Account ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Facebook Ad Account ID</label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: act_2391290..." 
                      value={settings.fb_ad_account_id}
                      onChange={(e) => setSettings(prev => ({ ...prev, fb_ad_account_id: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-900 pt-4 mt-2">
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <AlertCircle size={12} className="text-yellow-500" />
                    Nếu chưa lưu cấu hình thật, hệ thống sẽ tự động chạy ở chế độ giả lập Demo với dữ liệu mẫu.
                  </div>
                  <button 
                    type="submit"
                    disabled={settingsLoading}
                    className="px-6 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow shadow-sky-600/10 transition-colors disabled:opacity-50"
                  >
                    {settingsLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                </div>

              </form>
            </div>

            {/* Hướng dẫn cài đặt bên phải */}
            <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4 text-xs text-zinc-400">
              <h4 className="font-bold text-white uppercase text-xs flex items-center gap-1">
                <HelpCircle size={14} className="text-sky-500" />
                Hướng dẫn lấy token Meta
              </h4>
              <p>Để hệ thống tự động đồng bộ kết quả quảng cáo và tin nhắn chat Fanpage của bạn, vui lòng thực hiện:</p>
              
              <ol className="list-decimal pl-4 flex flex-col gap-2.5 mt-2">
                <li>Truy cập cổng phát triển ứng dụng <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-0.5">Meta developers <ExternalLink size={10} /></a>.</li>
                <li>Tạo một <strong>Ứng dụng kinh doanh (Business App)</strong> mới.</li>
                <li>Tại mục <strong>Công cụ kiểm tra API Graph (Graph API Explorer)</strong>:
                  <ul className="list-disc pl-4 mt-1 text-[11px] text-zinc-500 flex flex-col gap-1">
                    <li>Chọn ứng dụng của bạn.</li>
                    <li>Thêm các quyền truy cập: <code className="text-zinc-300 font-mono text-[9px] bg-zinc-900 p-0.5 rounded">ads_read</code>, <code className="text-zinc-300 font-mono text-[9px] bg-zinc-900 p-0.5 rounded">pages_manage_metadata</code>, <code className="text-zinc-300 font-mono text-[9px] bg-zinc-900 p-0.5 rounded">pages_read_engagement</code>, <code className="text-zinc-300 font-mono text-[9px] bg-zinc-900 p-0.5 rounded">pages_messaging</code>.</li>
                  </ul>
                </li>
                <li>Tạo Token ngắn hạn, sau đó vào mục Access Token Tool để gia hạn sang <strong>Token dài hạn (60 ngày)</strong> hoặc tạo System User trong BM để có token vô thời hạn.</li>
                <li>Dán Ad Account ID, Page ID và các Access Token tương ứng vào form bên trái để kích hoạt đồng bộ.</li>
              </ol>
            </div>

          </div>
        )}

      </main>

      {/* ==================== 6. MODAL/DRAWER POPUPS ==================== */}

      {/* Modal 1: Import CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 flex flex-col gap-4 shadow-2xl relative">
            <button 
              onClick={() => { setShowImportModal(false); setImportFeedback(null); }}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X size={18} />
            </button>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Upload size={16} className="text-sky-500" />
                Import CSV kết quả chiến dịch Facebook Ads
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">Xuất báo cáo dạng bảng từ Trình quản lý quảng cáo Facebook và dán hoặc kéo thả nội dung thô vào đây.</p>
            </div>

            {/* Dropzone hoặc Textarea dán dữ liệu */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Dán văn bản thô CSV từ file xuất báo cáo</label>
              <textarea 
                rows={8}
                value={csvRawText}
                onChange={(e) => setCsvRawText(e.target.value)}
                placeholder="Ngày,Tên chiến dịch,Số tiền đã chi tiêu,Lượt nhấp chuột,Số tin nhắn...&#10;2026-07-01,UV DTF Nổi 3D,150000,450,15&#10;2026-07-02,UV DTF Nổi 3D,240000,680,24"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 font-mono focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            {/* Feedback kết quả import */}
            {importFeedback && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-300 p-3 rounded-lg text-xs">
                {importFeedback}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-zinc-850 pt-4 mt-1">
              <div className="text-[10px] text-zinc-500">
                Hệ thống sẽ tự khớp theo tên chiến dịch hoặc tạo mới chiến dịch nếu chưa có.
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setShowImportModal(false); setImportFeedback(null); }}
                  className="px-4 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Đóng
                </button>
                <button 
                  onClick={handleImportCSV}
                  disabled={importLoading}
                  className="px-5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  {importLoading ? 'Đang xử lý...' : 'Bắt đầu Import 🚀'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Tạo chiến dịch quảng cáo thủ công */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl relative">
            <button 
              onClick={() => setShowCampaignModal(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X size={18} />
            </button>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <PlusCircle size={16} className="text-sky-500" />
                Thêm chiến dịch quảng cáo mới
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">Tạo chiến dịch quảng cáo thủ công để theo dõi số liệu.</p>
            </div>

            <form onSubmit={handleCreateCampaign} className="flex flex-col gap-4">
              
              {/* Tên chiến dịch */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Tên chiến dịch</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Campaign in tem UV DTF sỉ - Tháng 7" 
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Kênh quảng cáo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Kênh quảng cáo</label>
                  <select 
                    value={newCampPlatform}
                    onChange={(e) => setNewCampPlatform(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="facebook">Facebook Ads</option>
                    <option value="shopee">Shopee Ads</option>
                    <option value="tiktok">Tiktok Ads</option>
                    <option value="google">Google Ads</option>
                  </select>
                </div>

                {/* Ngân sách */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Ngân sách (VNĐ)</label>
                  <input 
                    type="number" 
                    placeholder="200000" 
                    value={newCampBudget}
                    onChange={(e) => setNewCampBudget(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Loại ngân sách */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Loại ngân sách</label>
                  <select 
                    value={newCampBudgetType}
                    onChange={(e) => setNewCampBudgetType(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="daily">Hàng ngày (Daily)</option>
                    <option value="lifetime">Trọn đời (Lifetime)</option>
                  </select>
                </div>

                {/* FB Campaign ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">ID chiến dịch Facebook (Nếu có)</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: 23812903120..." 
                    value={newCampFbId}
                    onChange={(e) => setNewCampFbId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-850 pt-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Đóng
                </button>
                <button 
                  type="submit"
                  disabled={newCampLoading}
                  className="px-5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white"
                >
                  {newCampLoading ? 'Đang tạo...' : 'Tạo chiến dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-2 animate-slide-up border ${toast.type === 'success' ? 'bg-zinc-900 border-emerald-500/30 text-emerald-400 shadow-emerald-950/20' : 'bg-zinc-900 border-red-500/30 text-red-400 shadow-red-950/20'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="text-xs font-medium">{toast.text}</span>
        </div>
      )}

      {/* 4. Footer */}
      <footer className="py-6 border-t border-zinc-900 text-center text-[10px] text-zinc-600 bg-zinc-950 mt-auto">
        &copy; {new Date().getFullYear()} PrinK Tech UV DTF. Đã đăng ký bản quyền. Hệ thống quản trị marketing & CRM độc quyền của GMKT Việt Nam.
      </footer>
    </div>
  );
}
