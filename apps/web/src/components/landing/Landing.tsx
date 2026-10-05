import Link from "next/link";
import { ArrowRight, BadgeCheck, EyeOff, FileCheck2, KeyRound } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { RATES } from "@/lib/mock/cost";
import { vnd, vndShort } from "@/lib/mock/format";
import { AllInDemo } from "./AllInDemo";
import { LiveBargains, LiveVerifiedPhoto, LiveZones } from "./LandingLive";
import styles from "./Landing.module.css";

const FLOW = [
  { time: "30 giây", title: "Nói nhu cầu với AI", body: "Ngân sách, số người, loại căn. AI loại bỏ mọi căn có tổng chi phí vượt trần và trả về top 3." },
  { time: "≤ 3 phút", title: "Đặt lịch, xác thực Zalo", body: "Chọn khung giờ khớp ca trực của Host, nhập mã 4 số gửi qua Zalo. Host của khu nhận lịch trong 3 phút." },
  { time: "T-10 phút", title: "Nhắc hẹn có nút bấm", body: "Zalo nhắn kèm nút “Tôi đã có mặt tại sảnh”. Không cần quét mã QR nào ở sảnh, không cần đứng chờ." },
  { time: "60 giây", title: "Host đón và mở cửa", body: "Host có thẻ cư dân quẹt thang máy đưa bạn lên phòng, mở cửa bằng mã trong ứng dụng. Không hộp khoá treo cửa." },
  { time: "48 giờ", title: "Cọc giữ căn 2.000.000đ", body: "Quét VietQR ngay tại chỗ, căn được khoá giữ chỗ (mặc định 48 giờ, tuỳ căn 12–72 giờ) cho riêng bạn. Không chuyển tiền qua tài khoản cá nhân." },
  { time: "OTP Zalo", title: "Xác minh CCCD, ký số", body: "Chụp CCCD một lần, AI tự điền thỏa thuận. Bạn ký bằng OTP, hợp đồng thuê ký số ngay sau đó." },
];

const FAQ = [
  { q: "All-in Cost gồm những khoản nào?", a: `Tiền thuê, phí quản lý Vinhomes (diện tích × ${vnd(RATES.mgmtPerM2)}đ/m²), phí gửi xe (${vnd(RATES.motorbike)}đ/xe máy, ${vnd(RATES.car)}đ/ô tô) và dự toán điện nước (${vnd(RATES.utilityPerPerson)}đ/người). Bốn khoản này luôn hiển thị trước khi bạn đặt lịch.` },
  { q: "Cọc 2 triệu có bị trừ vào tiền thuê tháng đầu không?", a: "Không. Khoản 2.000.000đ khoá căn theo thời hạn giữ chỗ (mặc định 48 giờ). Khi bạn ký hợp đồng thuê, đúng khoản này chuyển 100% thành một phần Tiền cọc bảo đảm tài sản và giữ nguyên suốt kỳ thuê. Tiền thuê tháng đầu vẫn thanh toán đủ." },
  { q: "Tôi có cần tài khoản để đặt lịch xem?", a: "Không. Bạn chỉ cần số điện thoại và mã 4 số gửi qua Zalo. Tài khoản chỉ cần khi muốn chat không giới hạn với AI." },
  { q: "Nếu tôi đến trễ hoặc không đến được?", a: "Bấm “Đang trên đường” trong tin Zalo để xin trễ 10 phút, hoặc đổi và huỷ lịch ngay trên trang theo dõi. Quá 15 phút không phản hồi thì ca trực được giải phóng để Host phục vụ khách khác." },
  { q: "Ảnh CCCD của tôi được xử lý thế nào?", a: "AI đọc CCCD trong khoảng 5 giây để điền thỏa thuận. Dữ liệu được mã hoá AES-256 theo Nghị định 13/2023/NĐ-CP, chỉ dùng cho giao dịch này và không gửi cho môi giới hay chủ nhà." },
  { q: "Ai sửa chữa khi có hỏng hóc?", a: "VinStay và Field Host không nhận sửa chữa. Host giới thiệu danh bạ thợ ngoài uy tín tại Ocean Park để bạn tự thoả thuận giá và trách nhiệm." },
];

export function Landing() {
  return (
    <>
      <section className={styles.section} id="quy-trinh">
        <div className={`wrap ${styles.flow}`}>
          <div className={styles.flowHead}>
            <h2 className={styles.h2}>Từ tin nhắn đầu tiên đến chìa khoá</h2>
            <p className="muted">Sáu bước, phần lớn do hệ thống và Field Host lo. Bạn chỉ cần có mặt đúng giờ.</p>
          </div>
          <ol className={styles.flowList}>
            {FLOW.map((s, i) => (
              <li key={s.title}>
                <span className={styles.flowNo}>{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.body}</p>
                </div>
                <span className={`badge badge-plain ${styles.flowTime}`}>{s.time}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${styles.section} ${styles.tint}`}>
        <div className={`wrap ${styles.split}`}>
          <div className={styles.copy}>
            <h2 className={styles.h2}>Giá bạn thấy là giá bạn trả mỗi tháng</h2>
            <p>Tin đăng thường chỉ ghi tiền thuê. VinStay cộng sẵn phí quản lý, gửi xe và điện nước, rồi loại mọi căn vượt ngân sách trần của bạn. Đổi số người hoặc số xe bên cạnh để thấy tổng tiền đổi theo.</p>
            <p className="muted small">Công thức: tiền thuê + diện tích × {vnd(RATES.mgmtPerM2)}đ + phí xe + {vndShort(RATES.utilityPerPerson)}/người. Căn rẻ hơn giá trung bình toà từ 10% được gắn “Căn hời”.</p>
          </div>
          <AllInDemo />
        </div>
      </section>

      <section className={styles.section}>
        <div className={`wrap ${styles.split} ${styles.flip}`}>
          <div className={styles.photo}>
            <LiveVerifiedPhoto />
          </div>
          <div className={styles.copy}>
            <h2 className={styles.h2}>Mỗi ảnh có mã căn và dấu thời gian</h2>
            <ul className={styles.checks}>
              <li>
                <BadgeCheck size={20} />
                <span>Định danh chuẩn Toà · Tầng · Căn, ảnh do Field Host chụp tại chỗ lúc tiếp nhận.</span>
              </li>
              <li>
                <FileCheck2 size={20} />
                <span>Chủ nhà ký gửi độc quyền nên không có tin mồi hay tráo căn: giá đúng, căn còn thật.</span>
              </li>
              <li>
                <EyeOff size={20} />
                <span>Số điện thoại chủ nhà được ẩn. Mọi liên lạc đi qua Zalo của VinStay.</span>
              </li>
              <li>
                <KeyRound size={20} />
                <span>Mã cửa chỉ hiện trên ứng dụng của Host đúng lúc đứng trước cửa phòng.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.tint}`}>
        <div className="wrap">
          <div className={styles.rowHead}>
            <div>
              <h2 className={styles.h2}>Căn hời tuần này</h2>
              <p className="muted">Rẻ hơn giá trung bình toà từ 10% cho cùng layout, đã tính đủ mọi khoản phí.</p>
            </div>
            <Link href="/units" className="btn btn-quiet">
              Xem tất cả căn <ArrowRight size={16} />
            </Link>
          </div>
          <LiveBargains />
        </div>
      </section>

      <section className={styles.section}>
        <div className={`wrap ${styles.split}`}>
          <div className={styles.copy}>
            <h2 className={styles.h2}>Phủ sóng các phân khu Ocean Park 1</h2>
            <p>Mỗi phân khu có Field Host riêng đã có thẻ cư dân thang máy, nên lịch xem luôn có người đón đúng giờ.</p>
          </div>
          <LiveZones />
        </div>
      </section>

      <section className={`${styles.section} ${styles.tint}`}>
        <div className={`wrap ${styles.deposit}`}>
          <div className={styles.copy}>
            <h2 className={styles.h2}>Cọc 2 triệu đi đâu?</h2>
            <p>Bạn chỉ cọc sau khi đã xem phòng và ưng ý. Khoản cọc không nằm trong túi môi giới: nó vào tài khoản định danh của nền tảng và có đường đi rõ ràng.</p>
          </div>
          <div className={`card ${styles.money}`} role="img" aria-label="Cọc giữ chỗ 2.000.000 đồng chuyển 100 phần trăm thành Tiền cọc bảo đảm khi ký hợp đồng; tiền thuê tháng đầu không bị trừ">
            <div className={styles.moneyRow}>
              <div className={styles.chunk}>
                <span className="muted small">Cọc giữ chỗ</span>
                <strong className="num">2.000.000đ</strong>
              </div>
              <span className={styles.arrow}>ký hợp đồng thuê</span>
              <div className={`${styles.chunk} ${styles.chunkOn}`}>
                <span className="small">Tiền cọc bảo đảm</span>
                <strong className="num">gồm 2.000.000đ</strong>
              </div>
            </div>
            <div className={`${styles.chunk} ${styles.chunkFull}`}>
              <span className="muted small">Tiền thuê tháng đầu</span>
              <strong className="num">Thanh toán đủ, không bị trừ cọc</strong>
            </div>
            <p className="muted xs">Khoản cọc bảo đảm được giữ nguyên suốt kỳ thuê và hoàn 100% khi thanh lý sau khi đối soát hiện trạng theo Hộ chiếu bàn giao số.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`wrap ${styles.faqWrap}`}>
          <h2 className={styles.h2}>Câu hỏi thường gặp</h2>
          <div className={styles.faq}>
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p className="muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={`wrap ${styles.ctaInner}`}>
          <h2 className={styles.ctaTitle}>Bạn đã có ngân sách trong đầu?</h2>
          <div className={styles.ctaBtns}>
            <a href="#top" className="btn btn-amber btn-lg">
              Hỏi VinStay AI ngay
            </a>
            <Link href="/booking" className={`btn btn-lg ${styles.ghostOnDark}`}>
              Kiểm tra lịch xem
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`wrap ${styles.footGrid}`}>
          <div>
            <Logo inverse sub="Vinhomes Ocean Park 1, Gia Lâm, Hà Nội" />
            <p className={styles.footNote}>Nền tảng cho thuê và vận hành căn hộ. VinStay AI chỉ giới thiệu thợ kỹ thuật ngoài, không nhận sửa chữa.</p>
          </div>
          <nav aria-label="Liên kết cuối trang">
            <strong>Khách thuê</strong>
            <Link href="/units">Tìm căn</Link>
            <Link href="/booking">Kiểm tra lịch xem</Link>
          </nav>
          <nav aria-label="Cổng đối tác">
            <strong>Đối tác</strong>
            <Link href="/login?as=landlord">Cổng chủ nhà</Link>
            <Link href="/admin/login">Cổng Field Host</Link>
            <Link href="/login?as=admin">Quản trị</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
