import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { ShieldCheck, ChevronRight, Home, ArrowUp } from 'lucide-react';

const BASE_URL = 'https://prinktech.netslive.com';

export const metadata: Metadata = {
  title: 'Chính Sách Bảo Mật Dữ Liệu | PrinK Tech',
  description:
    'PrinK Tech cam kết bảo vệ thông tin cá nhân của khách hàng theo Nghị định 13/2023/NĐ-CP. Tìm hiểu cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.',
  keywords: [
    'chính sách bảo mật PrinK Tech',
    'bảo vệ dữ liệu cá nhân',
    'quyền riêng tư khách hàng',
    'Nghị định 13/2023',
    'bảo mật thông tin in ấn',
  ],
  alternates: {
    canonical: `${BASE_URL}/chinh-sach-bao-mat`,
  },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/chinh-sach-bao-mat`,
    title: 'Chính Sách Bảo Mật Dữ Liệu | PrinK Tech',
    description:
      'PrinK Tech cam kết bảo vệ thông tin cá nhân của khách hàng theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân tại Việt Nam.',
    siteName: 'PrinK Tech – Xưởng In UV DTF',
  },
};

const sections = [
  { id: 'gioi-thieu', title: '1. Giới thiệu' },
  { id: 'thu-thap-khi-nao', title: '2. Khi nào chúng tôi thu thập dữ liệu?' },
  { id: 'thu-thap-gi', title: '3. Chúng tôi thu thập những dữ liệu gì?' },
  { id: 'su-dung-nhu-the-nao', title: '4. Chúng tôi sử dụng dữ liệu như thế nào?' },
  { id: 'chia-se', title: '5. Chúng tôi có chia sẻ dữ liệu không?' },
  { id: 'bao-ve', title: '6. Chúng tôi bảo vệ dữ liệu như thế nào?' },
  { id: 'luu-tru', title: '7. Thời gian lưu trữ dữ liệu' },
  { id: 'quyen-cua-ban', title: '8. Quyền của bạn' },
  { id: 'thay-doi', title: '9. Thay đổi chính sách' },
  { id: 'lien-he', title: '10. Liên hệ với chúng tôi' },
];

export default function ChinhSachBaoMatPage() {
  return (
    <div className="min-h-screen bg-[#0f0f13] text-slate-300">
      <Header />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <div className="bg-gradient-to-b from-slate-900 to-[#0f0f13] border-b border-slate-800/50 py-12 px-6">
          <div className="max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-slate-300 transition flex items-center gap-1">
                <Home size={12} /> Trang chủ
              </Link>
              <ChevronRight size={12} />
              <span className="text-slate-400">Chính sách bảo mật</span>
            </nav>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck size={28} className="text-sky-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  Chính Sách Bảo Mật Dữ Liệu
                </h1>
                <p className="text-slate-400 mt-2 text-sm">
                  Cập nhật lần cuối: <strong className="text-slate-300">10/07/2026</strong>
                  &nbsp;·&nbsp; Căn cứ theo{' '}
                  <strong className="text-sky-400">Nghị định 13/2023/NĐ-CP</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 mt-10 flex flex-col lg:flex-row gap-10">
          {/* Sidebar TOC */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-28 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4">Mục lục</p>
              <ul className="space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex items-center gap-2 text-xs text-slate-400 hover:text-sky-400 hover:bg-sky-500/5 rounded-lg px-2 py-1.5 transition-all duration-150"
                    >
                      <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-5 border-t border-slate-800/60">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-3">Liên hệ nhanh</p>
                <a
                  href="https://zalo.me/0822968412"
                  className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 transition"
                >
                  📱 Zalo: 0822.968.412
                </a>
              </div>
            </div>
          </aside>

          {/* Content */}
          <article className="flex-1 space-y-12 text-sm leading-relaxed text-slate-400">

            {/* Section 1 */}
            <section id="gioi-thieu" className="scroll-mt-28">
              <SectionTitle number="1" title="Giới thiệu" />
              <div className="space-y-4">
                <p>
                  Chào mừng bạn đến với <strong className="text-white">PrinK Tech</strong> – xưởng in UV DTF
                  chuyên nghiệp, được vận hành bởi <strong className="text-slate-300">Công ty TNHH GMKT Việt Nam</strong>{' '}
                  (gọi chung là &quot;PrinK Tech&quot;, &quot;chúng tôi&quot;).
                </p>
                <p>
                  PrinK Tech nghiêm túc thực hiện trách nhiệm bảo mật thông tin theo đúng các quy định của pháp luật
                  Việt Nam, đặc biệt là <strong className="text-sky-400">Nghị định 13/2023/NĐ-CP</strong> về bảo vệ
                  dữ liệu cá nhân. Chúng tôi cam kết tôn trọng quyền riêng tư của tất cả khách hàng khi sử dụng
                  website <strong className="text-slate-300">prinktech.netslive.com</strong> và các dịch vụ liên quan.
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

            {/* Section 2 */}
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

            {/* Section 3 */}
            <section id="thu-thap-gi" className="scroll-mt-28">
              <SectionTitle number="3" title="Chúng tôi thu thập những dữ liệu gì?" />
              <p className="mb-4">
                Tùy theo hoàn cảnh cụ thể, chúng tôi có thể thu thập các loại dữ liệu sau:
              </p>

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

            {/* Section 4 */}
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

            {/* Section 5 */}
            <section id="chia-se" className="scroll-mt-28">
              <SectionTitle number="5" title="Chúng tôi có chia sẻ dữ liệu không?" />
              <p className="mb-4">
                Chúng tôi <strong className="text-white">không bán</strong> dữ liệu cá nhân của bạn cho bất kỳ bên
                thứ ba nào vì mục đích thương mại. Tuy nhiên, để thực hiện đơn hàng, dữ liệu có thể được chia sẻ
                giới hạn với:
              </p>
              <div className="space-y-3">
                {[
                  { title: 'Đơn vị vận chuyển', desc: 'Họ tên, số điện thoại và địa chỉ giao hàng được cung cấp cho bưu tá/shipper để giao đơn hàng đến bạn (GHN, GHTK, Viettel Post,…).' },
                  { title: 'Đối tác in ấn phụ trợ', desc: 'Một số đơn hàng đặc biệt có thể cần xử lý tại cơ sở đối tác; họ chỉ nhận dữ liệu cần thiết tối thiểu và bị ràng buộc bảo mật.' },
                  { title: 'Cơ quan nhà nước', desc: 'Chúng tôi có thể tiết lộ dữ liệu khi có yêu cầu hợp pháp từ cơ quan điều tra, tòa án hoặc cơ quan thuế.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 bg-slate-900/40 border border-slate-800/40 rounded-xl p-4">
                    <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                    <div>
                      <strong className="text-slate-200 block mb-0.5">{item.title}</strong>
                      <span>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 6 */}
            <section id="bao-ve" className="scroll-mt-28">
              <SectionTitle number="6" title="Chúng tôi bảo vệ dữ liệu như thế nào?" />
              <p className="mb-4">
                Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu cá nhân của bạn:
              </p>
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

            {/* Section 7 */}
            <section id="luu-tru" className="scroll-mt-28">
              <SectionTitle number="7" title="Thời gian lưu trữ dữ liệu" />
              <p>
                Chúng tôi chỉ lưu trữ dữ liệu cá nhân của bạn trong thời gian cần thiết để thực hiện mục đích đã
                nêu, hoặc theo yêu cầu pháp luật (thông thường không quá <strong className="text-slate-300">5 năm</strong>{' '}
                kể từ ngày hoàn thành giao dịch). Sau thời hạn này, dữ liệu sẽ được xóa hoặc ẩn danh hóa an toàn.
              </p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Thông tin đơn hàng', value: '5 năm', note: 'Yêu cầu kế toán/thuế' },
                  { label: 'Tệp thiết kế', value: '30 ngày', note: 'Sau khi hoàn thành in' },
                  { label: 'Tin nhắn hỗ trợ', value: '12 tháng', note: 'Giải quyết tranh chấp' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">{item.label}</span>
                    <span className="text-xl font-bold text-white block">{item.value}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{item.note}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 8 */}
            <section id="quyen-cua-ban" className="scroll-mt-28">
              <SectionTitle number="8" title="Quyền của bạn" />
              <p className="mb-4">
                Theo <strong className="text-sky-400">Nghị định 13/2023/NĐ-CP</strong>, bạn có các quyền sau đối với
                dữ liệu cá nhân của mình:
              </p>
              <div className="space-y-3">
                {[
                  { right: 'Quyền được biết', desc: 'Bạn có quyền biết dữ liệu nào chúng tôi đang lưu trữ về bạn.' },
                  { right: 'Quyền truy cập', desc: 'Bạn có thể yêu cầu cung cấp bản sao thông tin cá nhân của bạn mà chúng tôi đang lưu giữ.' },
                  { right: 'Quyền chỉnh sửa', desc: 'Bạn có quyền yêu cầu sửa thông tin không chính xác hoặc không đầy đủ.' },
                  { right: 'Quyền xóa', desc: 'Bạn có thể yêu cầu xóa dữ liệu cá nhân khi không còn cần thiết, trừ trường hợp pháp luật yêu cầu lưu giữ.' },
                  { right: 'Quyền phản đối', desc: 'Bạn có quyền phản đối việc chúng tôi sử dụng dữ liệu của bạn cho mục đích marketing.' },
                  { right: 'Quyền rút đồng ý', desc: 'Bạn có thể rút lại sự đồng ý bất kỳ lúc nào mà không ảnh hưởng đến các giao dịch đã hoàn thành.' },
                ].map((item) => (
                  <div key={item.right} className="flex items-start gap-3 bg-slate-900/30 border border-slate-800/40 rounded-xl px-4 py-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                    <div>
                      <strong className="text-slate-200">{item.right}:</strong>{' '}
                      <span>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5">
                Để thực hiện các quyền trên, vui lòng liên hệ trực tiếp qua{' '}
                <a href="https://zalo.me/0822968412" className="text-sky-400 hover:underline font-semibold">
                  Zalo 0822.968.412
                </a>{' '}
                hoặc nhắn tin qua{' '}
                <a href="https://www.facebook.com/prinktechUS" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">
                  Facebook PrinK Tech
                </a>. Chúng tôi sẽ phản hồi trong vòng <strong className="text-slate-300">3 ngày làm việc</strong>.
              </p>
            </section>

            {/* Section 9 */}
            <section id="thay-doi" className="scroll-mt-28">
              <SectionTitle number="9" title="Thay đổi chính sách" />
              <p>
                PrinK Tech có thể cập nhật Chính sách bảo mật này theo thời gian để phản ánh các thay đổi trong
                thực tiễn kinh doanh hoặc yêu cầu pháp lý mới. Phiên bản mới nhất luôn được công bố tại trang này
                kèm ngày cập nhật. Chúng tôi khuyến khích bạn định kỳ xem lại trang này.
              </p>
              <p className="mt-3">
                Nếu có thay đổi quan trọng ảnh hưởng đến quyền lợi của bạn, chúng tôi sẽ thông báo qua Zalo hoặc
                kênh liên lạc chính.
              </p>
            </section>

            {/* Section 10 */}
            <section id="lien-he" className="scroll-mt-28">
              <SectionTitle number="10" title="Liên hệ với chúng tôi" />
              <p className="mb-5">
                Nếu bạn có bất kỳ câu hỏi, thắc mắc hay yêu cầu nào liên quan đến Chính sách bảo mật này hoặc
                dữ liệu cá nhân của bạn, vui lòng liên hệ:
              </p>
              <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-sky-400 text-lg">🏢</span>
                  <div>
                    <strong className="text-slate-200 block">Đơn vị chủ quản</strong>
                    <span>Công ty TNHH GMKT Việt Nam</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sky-400 text-lg">🏭</span>
                  <div>
                    <strong className="text-slate-200 block">Xưởng sản xuất chính</strong>
                    <span>Khu 9, Phù Ninh, Phú Thọ</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sky-400 text-lg">📱</span>
                  <div>
                    <strong className="text-slate-200 block">Zalo (ưu tiên)</strong>
                    <a href="https://zalo.me/0822968412" className="text-sky-400 hover:text-sky-300 hover:underline font-bold transition">
                      0822.968.412
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg">📘</span>
                  <div>
                    <strong className="text-slate-200 block">Facebook</strong>
                    <a
                      href="https://www.facebook.com/prinktechUS"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline transition"
                    >
                      facebook.com/prinktechUS
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-slate-400 text-lg">⏰</span>
                  <div>
                    <strong className="text-slate-200 block">Thời gian phản hồi</strong>
                    <span>Thứ 2 – Chủ Nhật, 08:00 – 22:00</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Back to top */}
            <div className="pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition flex items-center gap-2">
                ← Quay về trang chủ
              </Link>
              <a
                href="#"
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition"
              >
                <ArrowUp size={14} /> Lên đầu trang
              </a>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}

/* ─── Helper components ─── */
function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 text-sm font-bold flex items-center justify-center shrink-0">
        {number}
      </span>
      {title}
    </h2>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-300 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500/60 shrink-0 mt-2" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'note' | 'warning' }) {
  const styles = {
    info: 'bg-sky-500/5 border-sky-500/20 text-sky-300',
    note: 'bg-green-500/5 border-green-500/20 text-green-300',
    warning: 'bg-amber-500/5 border-amber-500/20 text-amber-300',
  };
  const icons = { info: 'ℹ️', note: '✅', warning: '⚠️' };
  return (
    <div className={`mt-5 flex items-start gap-3 border rounded-xl px-4 py-3.5 text-xs leading-relaxed ${styles[variant]}`}>
      <span className="text-base shrink-0">{icons[variant]}</span>
      <span>{children}</span>
    </div>
  );
}
