'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { ShieldCheck, ChevronRight, Home, ArrowUp } from 'lucide-react';

const sections = [
  { id: 'gioi-thieu', title: '1. Giới thiệu' },
  { id: 'thu-thap-khi-nao', title: '2. Khi nào thu thập dữ liệu?' },
  { id: 'thu-thap-gi', title: '3. Thu thập những dữ liệu gì?' },
  { id: 'su-dung-nhu-the-nao', title: '4. Sử dụng dữ liệu như thế nào?' },
  { id: 'chia-se', title: '5. Có chia sẻ dữ liệu không?' },
  { id: 'bao-ve', title: '6. Bảo vệ dữ liệu như thế nào?' },
  { id: 'luu-tru', title: '7. Thời gian lưu trữ' },
  { id: 'quyen-cua-ban', title: '8. Quyền của bạn' },
  { id: 'thay-doi', title: '9. Thay đổi chính sách' },
  { id: 'lien-he', title: '10. Liên hệ' },
];

export default function ChinhSachBaoMatPage() {
  const [theme, setTheme] = useState<'tech' | 'creative' | 'elegant'>('elegant');

  // Đọc theme từ localStorage giống cách trang chủ làm
  useEffect(() => {
    const saved = localStorage.getItem('prinktech-theme') as 'tech' | 'creative' | 'elegant';
    if (saved === 'tech' || saved === 'creative' || saved === 'elegant') {
      setTheme(saved);
    }
  }, []);

  return (
    <div
      className="min-h-screen transition-all duration-300"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    >
      <Header activeTheme={theme} setActiveTheme={setTheme} />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <div
          className="border-b py-12 px-6"
          style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--block-bg)' }}
        >
          <div className="max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground/50 bg-foreground/5 px-4 py-2.5 rounded-xl border border-card-border/30 w-fit"
            >
              <Link href="/" className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
                <Home size={13} />
                <span>Trang chủ</span>
              </Link>
              <span className="text-foreground/20 font-light">/</span>
              <span className="text-foreground/80 font-medium flex items-center gap-1.5">
                <ShieldCheck size={13} />
                Chính sách bảo mật
              </span>
            </nav>

            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: 'var(--accent-glow)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--accent)',
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                  Chính Sách Bảo Mật Dữ Liệu
                </h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Cập nhật lần cuối:{' '}
                  <strong style={{ color: 'var(--foreground)', opacity: 0.8 }}>10/07/2026</strong>
                  &nbsp;·&nbsp; Căn cứ theo{' '}
                  <strong style={{ color: 'var(--accent)' }}>Nghị định 13/2023/NĐ-CP</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 mt-10 flex flex-col lg:flex-row gap-10">
          {/* Sidebar TOC */}
          <aside className="lg:w-64 shrink-0">
            <div
              className="sticky top-28 rounded-2xl p-5 border"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
              <p className="text-[10px] uppercase font-bold tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                Mục lục
              </p>
              <ul className="space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 transition-all duration-150 hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <span
                        className="w-1 h-1 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--accent)', opacity: 0.5 }}
                      />
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--card-border)' }}>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Liên hệ nhanh
                </p>
                <a
                  href="https://zalo.me/0822968412"
                  className="flex items-center gap-2 text-xs transition hover:opacity-80"
                  style={{ color: 'var(--accent)' }}
                >
                  📱 Zalo: 0822.968.412
                </a>
              </div>
            </div>
          </aside>

          {/* Content */}
          <article className="flex-1 space-y-12 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>

            <section id="gioi-thieu" className="scroll-mt-28">
              <SectionTitle number="1" title="Giới thiệu" />
              <div className="space-y-4">
                <p>
                  Chào mừng bạn đến với <Strong>PrinK Tech</Strong> – xưởng in UV DTF chuyên nghiệp, được vận hành
                  bởi <Strong>Công ty TNHH GMKT Việt Nam</Strong> (gọi chung là &quot;PrinK Tech&quot;,
                  &quot;chúng tôi&quot;).
                </p>
                <p>
                  PrinK Tech nghiêm túc thực hiện trách nhiệm bảo mật thông tin theo đúng các quy định của pháp luật
                  Việt Nam, đặc biệt là <AccentText>Nghị định 13/2023/NĐ-CP</AccentText> về bảo vệ dữ liệu cá nhân.
                  Chúng tôi cam kết tôn trọng quyền riêng tư của tất cả khách hàng khi sử dụng website{' '}
                  <Strong>prinktech.netslive.com</Strong> và các dịch vụ liên quan.
                </p>
                <p>
                  Chính sách bảo mật này giúp bạn hiểu cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu cá nhân
                  mà bạn cung cấp khi đặt hàng hoặc liên hệ với chúng tôi.
                </p>
                <InfoBox>
                  Bằng việc sử dụng dịch vụ, bạn xác nhận đã đọc và đồng ý với Chính sách bảo mật này.
                </InfoBox>
              </div>
            </section>

            <section id="thu-thap-khi-nao" className="scroll-mt-28">
              <SectionTitle number="2" title="Khi nào chúng tôi thu thập dữ liệu?" />
              <p className="mb-4">Chúng tôi có thể thu thập dữ liệu cá nhân của bạn trong các trường hợp sau:</p>
              <BulletList items={[
                'Khi bạn đặt hàng hoặc gửi yêu cầu báo giá trên website hoặc qua Zalo/Facebook.',
                'Khi bạn điền thông tin giao hàng (họ tên, số điện thoại, địa chỉ).',
                'Khi bạn liên hệ hỗ trợ qua Zalo, Facebook Messenger hoặc email.',
                'Khi bạn gửi phản hồi, đánh giá về sản phẩm/dịch vụ.',
                'Khi bạn truy cập website và hệ thống tự động ghi nhận thông tin kỹ thuật.',
              ]} />
            </section>

            <section id="thu-thap-gi" className="scroll-mt-28">
              <SectionTitle number="3" title="Chúng tôi thu thập những dữ liệu gì?" />
              <p className="mb-4">Tùy theo hoàn cảnh cụ thể, chúng tôi có thể thu thập các loại dữ liệu sau:</p>
              <div className="space-y-5">
                <SubSection title="3.1. Dữ liệu bạn cung cấp trực tiếp">
                  <BulletList items={[
                    'Họ và tên đầy đủ.',
                    'Số điện thoại liên lạc.',
                    'Địa chỉ giao hàng (tỉnh/thành phố, quận/huyện, địa chỉ chi tiết).',
                    'Tên doanh nghiệp / thương hiệu (nếu là đơn hàng sỉ).',
                    'Tệp thiết kế (file in) mà bạn gửi để chúng tôi xử lý đơn hàng.',
                    'Nội dung tin nhắn, yêu cầu kỹ thuật liên quan đến đơn hàng.',
                  ]} />
                </SubSection>
                <SubSection title="3.2. Dữ liệu thu thập tự động">
                  <BulletList items={[
                    'Địa chỉ IP và loại trình duyệt khi bạn truy cập website.',
                    'Trang bạn xem và thời gian truy cập (qua Google Analytics nếu được kích hoạt).',
                    'Dữ liệu cookie cơ bản giúp website hoạt động đúng chức năng.',
                  ]} />
                </SubSection>
              </div>
              <InfoBox variant="note">
                Chúng tôi <strong>không thu thập</strong> thông tin nhạy cảm như số CMND/CCCD, tài khoản ngân hàng,
                mật khẩu hay dữ liệu sinh trắc học.
              </InfoBox>
            </section>

            <section id="su-dung-nhu-the-nao" className="scroll-mt-28">
              <SectionTitle number="4" title="Chúng tôi sử dụng dữ liệu như thế nào?" />
              <p className="mb-4">Dữ liệu cá nhân của bạn được sử dụng với các mục đích sau:</p>
              <BulletList items={[
                'Xử lý đơn hàng: xác nhận đơn, sắp xếp sản xuất, điều phối giao hàng.',
                'Liên hệ xác nhận thông tin kỹ thuật file in hoặc yêu cầu đặc biệt.',
                'Gửi thông báo tình trạng đơn hàng qua Zalo/SMS/email.',
                'Giải quyết khiếu nại, tranh chấp hoặc yêu cầu hoàn trả.',
                'Cải thiện chất lượng dịch vụ dựa trên phản hồi của khách hàng.',
                'Tuân thủ các yêu cầu pháp lý từ cơ quan nhà nước có thẩm quyền.',
                'Gửi thông tin khuyến mãi, ưu đãi (chỉ khi bạn đã đồng ý nhận).',
              ]} />
            </section>

            <section id="chia-se" className="scroll-mt-28">
              <SectionTitle number="5" title="Chúng tôi có chia sẻ dữ liệu không?" />
              <p className="mb-4">
                Chúng tôi <Strong>không bán</Strong> dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích
                thương mại. Tuy nhiên, để thực hiện đơn hàng, dữ liệu có thể được chia sẻ giới hạn với:
              </p>
              <div className="space-y-3">
                {[
                  {
                    title: 'Đơn vị vận chuyển',
                    desc: 'Họ tên, số điện thoại và địa chỉ giao hàng được cung cấp cho bưu tá/shipper để giao đơn hàng (GHN, GHTK, Viettel Post,…).'
                  },
                  {
                    title: 'Đối tác in ấn phụ trợ',
                    desc: 'Một số đơn hàng đặc biệt có thể cần xử lý tại cơ sở đối tác; họ chỉ nhận dữ liệu tối thiểu cần thiết và bị ràng buộc bảo mật.'
                  },
                  {
                    title: 'Cơ quan nhà nước',
                    desc: 'Chúng tôi có thể tiết lộ dữ liệu khi có yêu cầu hợp pháp từ cơ quan điều tra, tòa án hoặc cơ quan thuế.'
                  }
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-xl p-4 border"
                    style={{ backgroundColor: 'var(--block-bg)', borderColor: 'var(--card-border)' }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: 'var(--accent)' }} />
                    <div>
                      <Strong className="block mb-0.5">{item.title}</Strong>
                      <span>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="bao-ve" className="scroll-mt-28">
              <SectionTitle number="6" title="Chúng tôi bảo vệ dữ liệu như thế nào?" />
              <p className="mb-4">Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu:</p>
              <BulletList items={[
                'Website sử dụng giao thức HTTPS (TLS) để mã hóa dữ liệu truyền tải.',
                'Hệ thống máy chủ đặt trên VPS có tường lửa và giới hạn quyền truy cập.',
                'Chỉ nhân viên được ủy quyền mới có quyền xem thông tin đơn hàng của khách.',
                'Tệp thiết kế của khách hàng được lưu trữ riêng biệt và xóa sau khi hoàn thành đơn.',
                'Chúng tôi không lưu thông tin thanh toán (thẻ ngân hàng, mã OTP) của bạn.',
              ]} />
              <InfoBox variant="warning">
                Mặc dù chúng tôi áp dụng các biện pháp bảo mật tốt nhất có thể, không có hệ thống nào đảm bảo an
                toàn tuyệt đối 100%. Bạn nên thận trọng khi chia sẻ thông tin qua các kênh không chính thức.
              </InfoBox>
            </section>

            <section id="luu-tru" className="scroll-mt-28">
              <SectionTitle number="7" title="Thời gian lưu trữ dữ liệu" />
              <p>
                Chúng tôi chỉ lưu trữ dữ liệu cá nhân của bạn trong thời gian cần thiết để thực hiện mục đích đã
                nêu, hoặc theo yêu cầu pháp luật (thông thường không quá <Strong>5 năm</Strong> kể từ ngày hoàn
                thành giao dịch). Sau thời hạn này, dữ liệu sẽ được xóa hoặc ẩn danh hóa an toàn.
              </p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Thông tin đơn hàng', value: '5 năm', note: 'Yêu cầu kế toán/thuế' },
                  { label: 'Tệp thiết kế', value: '30 ngày', note: 'Sau khi hoàn thành in' },
                  { label: 'Tin nhắn hỗ trợ', value: '12 tháng', note: 'Giải quyết tranh chấp' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-4 text-center border"
                    style={{ backgroundColor: 'var(--block-bg)', borderColor: 'var(--card-border)' }}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                      {item.label}
                    </span>
                    <span className="text-xl font-bold block" style={{ color: 'var(--foreground)' }}>
                      {item.value}
                    </span>
                    <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {item.note}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section id="quyen-cua-ban" className="scroll-mt-28">
              <SectionTitle number="8" title="Quyền của bạn" />
              <p className="mb-4">
                Theo <AccentText>Nghị định 13/2023/NĐ-CP</AccentText>, bạn có các quyền sau đối với dữ liệu cá nhân:
              </p>
              <div className="space-y-3">
                {[
                  { right: 'Quyền được biết', desc: 'Bạn có quyền biết dữ liệu nào chúng tôi đang lưu trữ về bạn.' },
                  { right: 'Quyền truy cập', desc: 'Bạn có thể yêu cầu cung cấp bản sao thông tin cá nhân của bạn mà chúng tôi đang lưu giữ.' },
                  { right: 'Quyền chỉnh sửa', desc: 'Bạn có quyền yêu cầu sửa thông tin không chính xác hoặc không đầy đủ.' },
                  { right: 'Quyền xóa', desc: 'Bạn có thể yêu cầu xóa dữ liệu khi không còn cần thiết, trừ khi pháp luật yêu cầu lưu giữ.' },
                  { right: 'Quyền phản đối', desc: 'Bạn có quyền phản đối việc chúng tôi sử dụng dữ liệu của bạn cho mục đích marketing.' },
                  { right: 'Quyền rút đồng ý', desc: 'Bạn có thể rút lại sự đồng ý bất kỳ lúc nào mà không ảnh hưởng đến các giao dịch đã hoàn thành.' },
                ].map((item) => (
                  <div
                    key={item.right}
                    className="flex items-start gap-3 rounded-xl px-4 py-3 border"
                    style={{ backgroundColor: 'var(--block-bg)', borderColor: 'var(--card-border)' }}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: 'var(--accent)' }} />
                    <div>
                      <Strong>{item.right}:</Strong>{' '}
                      <span>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5">
                Để thực hiện các quyền trên, vui lòng liên hệ qua{' '}
                <a href="https://zalo.me/0822968412" className="font-semibold hover:underline transition" style={{ color: 'var(--accent)' }}>
                  Zalo 0822.968.412
                </a>{' '}
                hoặc{' '}
                <a
                  href="https://www.facebook.com/prinktechUS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline transition"
                  style={{ color: 'var(--accent)' }}
                >
                  Facebook PrinK Tech
                </a>
                . Chúng tôi sẽ phản hồi trong vòng <Strong>3 ngày làm việc</Strong>.
              </p>
            </section>

            <section id="thay-doi" className="scroll-mt-28">
              <SectionTitle number="9" title="Thay đổi chính sách" />
              <p>
                PrinK Tech có thể cập nhật Chính sách bảo mật này theo thời gian để phản ánh các thay đổi trong
                thực tiễn kinh doanh hoặc yêu cầu pháp lý mới. Phiên bản mới nhất luôn được công bố tại trang này
                kèm ngày cập nhật. Nếu có thay đổi quan trọng, chúng tôi sẽ thông báo qua Zalo.
              </p>
            </section>

            <section id="lien-he" className="scroll-mt-28">
              <SectionTitle number="10" title="Liên hệ với chúng tôi" />
              <p className="mb-5">
                Nếu bạn có bất kỳ câu hỏi nào liên quan đến Chính sách bảo mật này, vui lòng liên hệ:
              </p>
              <div className="rounded-2xl p-6 border space-y-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                {[
                  { icon: '🏢', label: 'Đơn vị chủ quản', content: <span>Công ty TNHH GMKT Việt Nam</span> },
                  { icon: '🏭', label: 'Xưởng sản xuất chính', content: <span>Khu 9, Phù Ninh, Phú Thọ</span> },
                  {
                    icon: '📱', label: 'Zalo (ưu tiên)',
                    content: (
                      <a href="https://zalo.me/0822968412" className="font-bold hover:underline transition text-base" style={{ color: 'var(--accent)' }}>
                        0822.968.412
                      </a>
                    )
                  },
                  {
                    icon: '📘', label: 'Facebook',
                    content: (
                      <a href="https://www.facebook.com/prinktechUS" target="_blank" rel="noopener noreferrer" className="hover:underline transition" style={{ color: 'var(--accent)' }}>
                        facebook.com/prinktechUS
                      </a>
                    )
                  },
                  { icon: '⏰', label: 'Giờ phản hồi', content: <span>Thứ 2 – Chủ Nhật, 08:00 – 22:00</span> },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <span className="text-lg">{row.icon}</span>
                    <div>
                      <Strong className="block mb-0.5">{row.label}</Strong>
                      {row.content}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom nav */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--card-border)' }}>
              <Link href="/" className="text-sm transition hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                ← Quay về trang chủ
              </Link>
              <a href="#" className="flex items-center gap-2 text-xs transition hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                <ArrowUp size={14} /> Lên đầu trang
              </a>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}

/* ─── Micro components ─── */
function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="text-xl font-bold mb-4 flex items-center gap-3" style={{ color: 'var(--foreground)' }}>
      <span
        className="w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center shrink-0 border"
        style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--card-border)', color: 'var(--accent)' }}
      >
        {number}
      </span>
      {title}
    </h2>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)', opacity: 0.85 }}>{title}</h3>
      {children}
    </div>
  );
}

function Strong({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <strong className={className} style={{ color: 'var(--foreground)', opacity: 0.9 }}>
      {children}
    </strong>
  );
}

function AccentText({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: 'var(--accent)' }}>{children}</strong>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ backgroundColor: 'var(--accent)', opacity: 0.6 }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'note' | 'warning' }) {
  const icons = { info: 'ℹ️', note: '✅', warning: '⚠️' };
  return (
    <div
      className="mt-5 flex items-start gap-3 rounded-xl px-4 py-3.5 text-xs leading-relaxed border"
      style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--card-border)', color: 'var(--foreground)', opacity: 0.85 }}
    >
      <span className="text-base shrink-0">{icons[variant]}</span>
      <span>{children}</span>
    </div>
  );
}
