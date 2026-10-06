"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, ArrowUp, BadgeCheck, Building2, CalendarCheck2, ChevronDown,
  CircleHelp, ClipboardCheck, Coins, FileCheck2, HeartHandshake, KeyRound, LayoutDashboard,
  MapPin, ShieldCheck, Sparkles, Sun, WalletCards,
} from "lucide-react";
import { useCatalog } from "@/lib/tenant/catalog";
import { useLandingPreferences } from "./LandingPreferences";
import { FeaturedListings, LiveBentoAreas } from "./LandingLive";
import styles from "./Landing.module.css";

const copy = {
  vi: {
    why: "Tìm nhà đúng gu. Quản lý cho thuê gọn gàng.",
    whyLead: "VinStay kết nối nhu cầu thuê với quy trình xem nhà và quản lý minh bạch — bắt đầu từ danh mục đang có thật.",
    districts: "Khu vực có căn đang mở",
    districtsLead: "Các phân khu bên dưới và giá tham khảo được lấy trực tiếp từ danh mục căn hộ hiện tại.",
    listings: "Không phải ảnh minh hoạ — là căn đang mở",
    listingsLead: "Lọc theo loại căn, xem thông tin và mở hồ sơ thật trước khi đặt lịch.",
    ownerEyebrow: "Không gian dành cho chủ nhà",
    ownerTitle: "Căn hộ, hồ sơ và quy trình cho thuê — trong cùng một cổng.",
    ownerLead: "Đăng ký ký gửi, theo dõi căn và làm việc với đội vận hành trên một luồng thống nhất.",
    flowTitle: "Một quy trình rõ ràng cho cả hai phía.",
    flowLead: "Từng bước được thiết kế để người thuê biết điều gì sẽ diễn ra, chủ nhà theo dõi hồ sơ của mình.",
    reasonsTitle: "Tập trung vào những điều khiến bạn an tâm.",
    reasonsLead: "Thông tin căn, chi phí và lịch hẹn đi cùng nhau — để quyết định có cơ sở hơn.",
    pricingTitle: "Chính sách dịch vụ cần rõ trước khi bắt đầu.",
    pricingLead: "Mức phí chủ nhà chưa được công bố trên trang công khai này. Hãy xác nhận chính sách hiện hành trước khi gửi hồ sơ hoặc đồng ý sử dụng dịch vụ.",
    pricingCta: "Xem quy trình ký gửi",
    reviewsTitle: "Đánh giá chỉ có ý nghĩa khi đến từ trải nghiệm thật.",
    reviewsLead: "Người thuê có thể gửi đánh giá Field Host sau lịch xem hoàn tất. Điểm số được hiển thị ở luồng đánh giá của từng lịch hẹn.",
    reviewsCta: "Tra cứu lịch xem",
    mobileTitle: "VinStay ở ngay trên trình duyệt điện thoại.",
    mobileLead: "Tìm căn, mở thông tin chi tiết và theo dõi lịch xem trên giao diện tối ưu cho màn hình nhỏ — không cần cài ứng dụng.",
    guideTitle: "Vài điều nên biết trước khi thuê.",
    guideLead: "Thông tin ngắn gọn giúp bạn chuẩn bị tốt hơn trước khi xem căn và gửi yêu cầu.",
    faqTitle: "Câu hỏi thường gặp",
    faqLead: "Một vài thông tin quan trọng về catalog, chi phí và lịch xem.",
    finalTitle: "Bắt đầu từ một căn phù hợp.",
    finalLead: "Khám phá danh mục hiện có hoặc tạo hồ sơ ký gửi để đội ngũ VinStay tiếp nhận.",
    findHome: "Tìm căn phù hợp",
    listHome: "Đăng ký ký gửi",
    explore: "Khám phá căn hộ",
    viewAll: "Xem toàn bộ danh mục",
    live: "Dữ liệu đang đồng bộ",
    unitCount: "Căn đang trống",
    areasCount: "Phân khu có căn",
    layoutsCount: "Loại căn đang mở",
    startingRent: "Giá thuê từ",
    areaKicker: "Kết nối với danh mục hiện tại",
    areaTitle: "Tìm một nơi phù hợp, ngay đúng khu bạn cần.",
    featureTitle: "Rõ thông tin. Chủ động lựa chọn.",
    featureLead: "Mỗi chi tiết quan trọng đều được đặt cạnh nhau để bạn dễ cân nhắc.",
    guide1: "Ước tính chi phí tháng", guide1b: "Hiểu các khoản trong mức All-in Cost trước khi chọn căn.",
    guide2: "Chuẩn bị lịch xem", guide2b: "Xem hồ sơ căn và chọn lịch phù hợp với bạn.",
    guide3: "Dành cho chủ nhà", guide3b: "Nắm quy trình gửi thông tin căn để VinStay tiếp nhận.",
    footerText: "Tìm căn hộ, xem chi phí và theo dõi quy trình thuê nhà — từ danh mục VinStay đang vận hành.",
    tenant: "Người thuê", landlord: "Chủ nhà", company: "VinStay", support: "Hỗ trợ & điều khoản",
    faq1: "VinStay hiện có nhà ở những khu vực nào?", faq1a: "Danh mục công khai hiện tập trung vào căn hộ tại Vinhomes Ocean Park 1, Hà Nội. Các phân khu hiển thị được lấy từ dữ liệu căn đang mở.",
    faq2: "Làm sao biết căn còn trống?", faq2a: "Trang danh mục hiển thị căn đang mở theo dữ liệu hệ thống. Trạng thái có thể thay đổi; hãy mở chi tiết căn để xem thông tin mới nhất trước khi đặt lịch.",
    faq3: "All-in Cost gồm những khoản nào?", faq3a: "Đây là mức ước tính gồm tiền thuê, phí quản lý, phí phương tiện và dự toán điện nước theo thông tin hiện có. Hãy đối chiếu chi tiết ở từng căn trước khi quyết định.",
    faq4: "Tôi đặt lịch xem nhà ở đâu?", faq4a: "Mở căn hộ bạn quan tâm, kiểm tra các khung giờ và gửi yêu cầu xem. Bạn có thể tra cứu lịch hẹn tại mục Tra cứu lịch xem.",
    faq5: "Tôi là chủ nhà, bắt đầu từ đâu?", faq5a: "Chọn Đăng ký ký gửi để đăng nhập hoặc tạo tài khoản chủ nhà, sau đó gửi thông tin căn theo hướng dẫn trong cổng.",
    faq6: "VinStay có ứng dụng iOS hoặc Android không?", faq6a: "Hiện bạn có thể sử dụng VinStay trực tiếp trên trình duyệt điện thoại. Trang được thiết kế tương thích với màn hình di động.",
  },
  en: {
    why: "Find a place that fits. Manage rentals with clarity.",
    whyLead: "VinStay connects home search with transparent viewing and management workflows, starting with live catalog data.",
    districts: "Areas with available homes",
    districtsLead: "Areas and indicative rents below are drawn directly from the current apartment catalog.",
    listings: "Live listings, not sample cards",
    listingsLead: "Filter by layout, review the details, then open a real listing before booking a visit.",
    ownerEyebrow: "For property owners",
    ownerTitle: "Apartments, applications, and rental workflows in one portal.",
    ownerLead: "Submit a listing, track your units, and work with the operations team in one connected flow.",
    flowTitle: "A clear process for both sides.",
    flowLead: "Renters can see what happens next, while owners can follow their application and units.",
    reasonsTitle: "The details that help you decide with confidence.",
    reasonsLead: "Listing information, costs, and appointments stay together so you can make an informed choice.",
    pricingTitle: "Service terms should be clear before you start.",
    pricingLead: "Landlord service fees are not published on this public page. Confirm the current terms before submitting a listing or agreeing to a service.",
    pricingCta: "View listing process",
    reviewsTitle: "Reviews matter when they come from real experiences.",
    reviewsLead: "Renters can rate a Field Host after a completed viewing. Ratings are shown in each appointment's review flow.",
    reviewsCta: "Look up a viewing",
    mobileTitle: "Use VinStay in your mobile browser.",
    mobileLead: "Search homes, review listing details, and follow viewings in a mobile-ready interface. No app installation required.",
    guideTitle: "A few things to know before renting.",
    guideLead: "Practical notes to help you prepare before viewing a home or sending a request.",
    faqTitle: "Frequently asked questions",
    faqLead: "Helpful details about the catalog, costs, and viewings.",
    finalTitle: "Start with a place that feels right.",
    finalLead: "Explore current listings or submit a property for the VinStay team to review.",
    findHome: "Find a home", listHome: "Submit a listing", explore: "Explore apartments", viewAll: "View all listings",
    live: "Live catalog sync", unitCount: "Available apartments", areasCount: "Areas with listings", layoutsCount: "Available layouts", startingRent: "Rent from",
    areaKicker: "Connected to the live catalog", areaTitle: "Find a place in the neighborhood that works for you.",
    featureTitle: "Clear details. Confident choices.", featureLead: "Important details stay together so you can compare with confidence.",
    guide1: "Estimate monthly costs", guide1b: "Understand each All-in Cost component before choosing a home.",
    guide2: "Prepare for a viewing", guide2b: "Review a listing and choose a viewing time that works.",
    guide3: "For property owners", guide3b: "Learn how to submit a property for VinStay review.",
    footerText: "Find apartments, review costs, and follow the rental process through the VinStay catalog.",
    tenant: "Renters", landlord: "Property owners", company: "VinStay", support: "Support & terms",
    faq1: "Where are VinStay homes located?", faq1a: "The public catalog currently focuses on apartments at Vinhomes Ocean Park 1 in Hanoi. Displayed areas come from active listings.",
    faq2: "How can I tell if a home is available?", faq2a: "The catalog shows homes currently open in the system. Status can change, so review the listing details before booking a visit.",
    faq3: "What does All-in Cost include?", faq3a: "It estimates rent, management fees, vehicle parking, and utilities based on available details. Review each listing before deciding.",
    faq4: "How do I book a viewing?", faq4a: "Open a listing, review its available times, and submit a viewing request. You can look up appointments from the viewing lookup page.",
    faq5: "I own a home. How do I get started?", faq5a: "Choose Submit a listing to sign in or create an owner account, then send your property details in the portal.",
    faq6: "Does VinStay have an iOS or Android app?", faq6a: "You can use VinStay in your mobile browser today. The site adapts to mobile screens.",
  },
} as const;

const TENANT_STEPS = [
  { icon: MapPin, title: "Tìm căn", body: "Mô tả nhu cầu hoặc chọn bộ lọc để xem căn đang mở." },
  { icon: Building2, title: "Xem thông tin", body: "Đối chiếu giá, diện tích, nội thất và phân khu." },
  { icon: CalendarCheck2, title: "Đặt lịch xem", body: "Chọn khung giờ đang có trên hồ sơ căn hộ." },
  { icon: KeyRound, title: "Hoàn tất thuê", body: "Theo dõi các bước tiếp theo trong tài khoản của bạn." },
];

const LANDLORD_STEPS = [
  { icon: ClipboardCheck, title: "Gửi hồ sơ căn", body: "Đăng nhập và nhập thông tin căn theo hướng dẫn." },
  { icon: BadgeCheck, title: "VinStay tiếp nhận", body: "Theo dõi tiến trình hồ sơ trong cổng chủ nhà." },
  { icon: CalendarCheck2, title: "Kết nối lịch xem", body: "Cập nhật trạng thái và phối hợp quy trình xem nhà." },
  { icon: LayoutDashboard, title: "Quản lý căn", body: "Theo dõi danh sách căn và hồ sơ trong một nơi." },
];

const TENANT_STEPS_EN = [
  { icon: MapPin, title: "Find a home", body: "Describe your needs or use filters to find available homes." },
  { icon: Building2, title: "Review details", body: "Compare rent, area, furnishing, and neighborhood." },
  { icon: CalendarCheck2, title: "Request a viewing", body: "Choose an available time in the listing." },
  { icon: KeyRound, title: "Complete the rental", body: "Follow the next steps in your account." },
];

const LANDLORD_STEPS_EN = [
  { icon: ClipboardCheck, title: "Submit property details", body: "Sign in and provide the information requested." },
  { icon: BadgeCheck, title: "VinStay reviews", body: "Follow your application status in the owner portal." },
  { icon: CalendarCheck2, title: "Coordinate viewings", body: "Update status and follow the viewing process." },
  { icon: LayoutDashboard, title: "Manage your homes", body: "Track listings and applications in one place." },
];

const REASONS = [
  { icon: BadgeCheck, title: "Danh mục theo hệ thống", body: "Căn hộ và trạng thái được tải từ API catalog hiện tại." },
  { icon: Coins, title: "Ước tính chi phí rõ ràng", body: "Các thành phần All-in Cost được hiển thị để dễ đối chiếu." },
  { icon: CalendarCheck2, title: "Lịch xem có trạng thái", body: "Yêu cầu và lịch hẹn được theo dõi trong luồng đặt lịch." },
  { icon: FileCheck2, title: "Quy trình số hoá", body: "Thông tin căn, hồ sơ và các bước thuê tập trung trên nền tảng." },
  { icon: HeartHandshake, title: "Hỗ trợ tại điểm xem", body: "Quy trình Field Host được kết nối với lịch xem căn hộ." },
  { icon: ShieldCheck, title: "Chủ động kiểm tra", body: "Mở chi tiết và xác nhận thông tin trước khi gửi yêu cầu." },
];

const REASONS_EN = [
  { icon: BadgeCheck, title: "Listings from the system", body: "Apartments and status come from the current catalog API." },
  { icon: Coins, title: "Clear monthly estimates", body: "Review estimated All-in Cost components before comparing." },
  { icon: CalendarCheck2, title: "Viewings with status", body: "Requests and appointments are tracked in the booking flow." },
  { icon: FileCheck2, title: "Digital workflows", body: "Listing details, applications, and rental steps stay together." },
  { icon: HeartHandshake, title: "Support at viewings", body: "Field Host workflows connect to apartment viewing requests." },
  { icon: ShieldCheck, title: "Check before deciding", body: "Open the listing and confirm its details before requesting." },
];

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`${styles.reveal} ${visible ? styles.revealVisible : ""} ${className}`} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>{children}</div>;
}

function ProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? window.scrollY / scrollable : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  return <div className={styles.progressTrack} aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>;
}

export function Landing() {
  const { locale } = useLandingPreferences();
  const t = copy[locale];
  const { available, loading } = useCatalog();
  const [flow, setFlow] = useState<"tenant" | "landlord">("tenant");
  const uniqueAreas = new Set(available.map((unit) => unit.zoneName).filter(Boolean)).size;
  const uniqueLayouts = new Set(available.map((unit) => unit.layout)).size;
  const startingRent = available.length ? Math.min(...available.map((unit) => unit.rent)) : null;
  const processSteps = flow === "tenant" ? (locale === "vi" ? TENANT_STEPS : TENANT_STEPS_EN) : (locale === "vi" ? LANDLORD_STEPS : LANDLORD_STEPS_EN);

  return (
    <div className={styles.landing} id="landing">
      <ProgressBar />

      <section className={styles.liveBand} aria-label={t.live}>
        <div className={styles.container}>
          <span className={styles.liveBandLabel}><span className={styles.livePulse} />{t.live}</span>
          <div className={styles.liveMetrics} aria-live="polite">
            <div><strong>{loading ? "—" : available.length.toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}</strong><span>{t.unitCount}</span></div>
            <div><strong>{loading ? "—" : uniqueAreas}</strong><span>{t.areasCount}</span></div>
            <div><strong>{loading ? "—" : uniqueLayouts}</strong><span>{t.layoutsCount}</span></div>
            <div><strong>{loading || startingRent === null ? "—" : `${(startingRent / 1_000_000).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 1 })} tr`}</strong><span>{t.startingRent}</span></div>
          </div>
          <Link href="/units" className={styles.bandLink}>{t.viewAll}<ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className={`${styles.section} ${styles.introSection}`} id="about">
        <div className={styles.container}>
          <Reveal>
            <header className={styles.sectionHeader}>
              <div className={styles.sectionIntro}>
                <p className={styles.kicker}>{t.areaKicker}</p>
                <h2 className={styles.heading}>{t.why}</h2>
                <p className={styles.lede}>{t.whyLead}</p>
              </div>
              <Link href="/units" className={styles.textLink}>{t.explore}<ArrowRight size={16} /></Link>
            </header>
          </Reveal>
          <div className={styles.promiseRow}>
            {[
              { icon: BadgeCheck, label: locale === "vi" ? "Căn đang mở từ catalog thật" : "Live homes from the catalog" },
              { icon: Coins, label: locale === "vi" ? "Chi phí hiển thị theo từng căn" : "Costs shown per listing" },
              { icon: CalendarCheck2, label: locale === "vi" ? "Đặt lịch ngay trên hồ sơ" : "Book from each listing" },
              { icon: ShieldCheck, label: locale === "vi" ? "Trạng thái cập nhật từ hệ thống" : "Status synced from the system" },
            ].map(({ icon: Icon, label }) => <div key={label} className={styles.promise}><span><Icon size={17} /></span>{label}</div>)}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.areasSection}`} id="areas">
        <div className={styles.container}>
          <Reveal>
            <header className={styles.sectionHeader}>
              <div className={styles.sectionIntro}>
                <p className={styles.kicker}>{locale === "vi" ? "Một khu vực · nhiều lựa chọn" : "One neighborhood · more choices"}</p>
                <h2 className={styles.heading}>{t.areaTitle}</h2>
                <p className={styles.lede}>{t.districtsLead}</p>
              </div>
              <span className={styles.sectionCaption}><MapPin size={15} /> Vinhomes Ocean Park 1 · Hà Nội</span>
            </header>
          </Reveal>
          <Reveal delay={70}><LiveBentoAreas /></Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.listingSection}`} id="featured">
        <div className={styles.container}>
          <Reveal>
            <header className={styles.sectionHeader}>
              <div className={styles.sectionIntro}>
                <p className={styles.kicker}>{locale === "vi" ? "Cập nhật từ catalog" : "Live from the catalog"}</p>
                <h2 className={styles.heading}>{t.listings}</h2>
                <p className={styles.lede}>{t.listingsLead}</p>
              </div>
              <Link href="/units" className={styles.textLink}>{t.viewAll}<ArrowRight size={16} /></Link>
            </header>
          </Reveal>
          <Reveal delay={70}><FeaturedListings /></Reveal>
        </div>
      </section>

      <section className={styles.ownerSection} id="for-owners">
        <div className={`${styles.container} ${styles.ownerLayout}`}>
          <Reveal>
            <div className={styles.ownerCopy}>
              <p className={styles.kickerLight}><Building2 size={15} /> {t.ownerEyebrow}</p>
              <h2>{t.ownerTitle}</h2>
              <p>{t.ownerLead}</p>
              <div className={styles.ownerActions}>
                <Link href="/login?tab=landlord" className={styles.goldButton}>{locale === "vi" ? "Bắt đầu ký gửi" : "Start a listing"}<ArrowRight size={16} /></Link>
                <Link href="/landlord/dashboard" className={styles.ownerTextLink}>{locale === "vi" ? "Tôi đã có tài khoản" : "I already have an account"}</Link>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className={styles.ownerPanel}>
              <div className={styles.ownerPanelHead}><span className={styles.ownerPanelIcon}><LayoutDashboard size={19} /></span><div><strong>{locale === "vi" ? "Cổng chủ nhà" : "Owner portal"}</strong><small>{locale === "vi" ? "Quy trình và dữ liệu theo hồ sơ của bạn" : "Workflows and data for your properties"}</small></div><ArrowRight size={16} /></div>
              <div className={styles.ownerFeatureGrid}>
                {[
                  { icon: ClipboardCheck, title: locale === "vi" ? "Hồ sơ ký gửi" : "Listing application", body: locale === "vi" ? "Gửi thông tin căn theo hướng dẫn" : "Submit property details" },
                  { icon: Building2, title: locale === "vi" ? "Danh sách căn" : "Your properties", body: locale === "vi" ? "Theo dõi các căn đã gửi" : "Track submitted homes" },
                  { icon: WalletCards, title: locale === "vi" ? "Tài chính" : "Finance", body: locale === "vi" ? "Mở khu vực tài chính chủ nhà" : "Open owner finance" },
                  { icon: FileCheck2, title: locale === "vi" ? "Hồ sơ vận hành" : "Operations", body: locale === "vi" ? "Theo dõi các bước liên quan" : "Follow related workflows" },
                ].map(({ icon: Icon, title, body }) => <div key={title}><span><Icon size={17} /></span><strong>{title}</strong><small>{body}</small></div>)}
              </div>
              <Link href="/landlord/dashboard" className={styles.ownerPanelLink}>{locale === "vi" ? "Mở cổng chủ nhà" : "Open owner portal"}<ArrowRight size={15} /></Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.processSection}`} id="how-it-works">
        <div className={styles.container}>
          <Reveal>
            <header className={`${styles.sectionHeader} ${styles.centerHeader}`}>
              <div className={styles.sectionIntro}>
                <p className={styles.kicker}>{locale === "vi" ? "Dễ theo dõi từ bước đầu" : "Clear from the first step"}</p>
                <h2 className={styles.heading}>{t.flowTitle}</h2>
                <p className={styles.lede}>{t.flowLead}</p>
              </div>
            </header>
          </Reveal>
          <div className={styles.flowTabs} role="tablist" aria-label={locale === "vi" ? "Chọn quy trình" : "Choose a workflow"}>
            <button type="button" role="tab" aria-selected={flow === "tenant"} className={flow === "tenant" ? styles.flowTabActive : styles.flowTab} onClick={() => setFlow("tenant")}><MapPin size={16} /> {locale === "vi" ? "Tôi muốn thuê nhà" : "I want to rent"}</button>
            <button type="button" role="tab" aria-selected={flow === "landlord"} className={flow === "landlord" ? styles.flowTabActive : styles.flowTab} onClick={() => setFlow("landlord")}><Building2 size={16} /> {locale === "vi" ? "Tôi là chủ nhà" : "I am a property owner"}</button>
          </div>
          <div className={styles.timeline} key={flow}>
            {processSteps.map(({ icon: Icon, title, body }, index) => <article className={styles.timelineStep} key={title}>
              <span className={styles.timelineNumber}>0{index + 1}</span><span className={styles.timelineIcon}><Icon size={20} /></span><h3>{title}</h3><p>{body}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.reasonsSection}`} id="why-vinstay">
        <div className={styles.container}>
          <Reveal><header className={styles.sectionHeader}><div className={styles.sectionIntro}><p className={styles.kicker}>{locale === "vi" ? "Được thiết kế quanh nhu cầu thật" : "Designed around real needs"}</p><h2 className={styles.heading}>{t.reasonsTitle}</h2><p className={styles.lede}>{t.reasonsLead}</p></div></header></Reveal>
          <div className={styles.reasonGrid}>{(locale === "vi" ? REASONS : REASONS_EN).map(({ icon: Icon, title, body }, index) => <Reveal key={title} delay={index * 45}><article className={styles.reasonCard}><span className={styles.reasonIcon}><Icon size={20} /></span><h3>{title}</h3><p>{body}</p><span className={styles.reasonArrow}><ArrowRight size={16} /></span></article></Reveal>)}</div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.pricingSection}`} id="fees">
        <div className={`${styles.container} ${styles.pricingLayout}`}>
          <Reveal><div><p className={styles.kicker}>{locale === "vi" ? "Minh bạch trước khi xác nhận" : "Clear before you commit"}</p><h2 className={styles.heading}>{t.pricingTitle}</h2><p className={styles.lede}>{t.pricingLead}</p><Link href="/login?tab=landlord" className={styles.textLink}>{t.pricingCta}<ArrowRight size={16} /></Link></div></Reveal>
          <Reveal delay={100}><div className={styles.pricingCard}><span className={styles.pricingIcon}><ShieldCheck size={21} /></span><span className={styles.pricingLabel}>{locale === "vi" ? "Không có mức phí giả định" : "No invented service rates"}</span><strong>{locale === "vi" ? "Xác nhận điều khoản trước khi dùng" : "Confirm terms before using a service"}</strong><p>{locale === "vi" ? "Chỉ tiếp tục khi mức phí và điều khoản áp dụng đã được thông tin rõ ràng." : "Continue only after the applicable service fee and terms have been clearly provided."}</p><Link href="/login?tab=landlord" className={styles.pricingButton}>{locale === "vi" ? "Mở luồng chủ nhà" : "Open owner flow"}<ArrowRight size={15} /></Link></div></Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.reviewSection}`}>
        <div className={`${styles.container} ${styles.reviewLayout}`}>
          <Reveal><div><p className={styles.kicker}>{locale === "vi" ? "Đánh giá có ngữ cảnh" : "Reviews with context"}</p><h2 className={styles.heading}>{t.reviewsTitle}</h2><p className={styles.lede}>{t.reviewsLead}</p><Link href="/booking" className={styles.textLink}>{t.reviewsCta}<ArrowRight size={16} /></Link></div></Reveal>
          <Reveal delay={100}><div className={styles.reviewCard}><div className={styles.reviewStars} aria-label={locale === "vi" ? "Thang điểm năm sao, chờ đánh giá thực tế" : "Five-star scale, awaiting real reviews"}>☆☆☆☆☆</div><span className={styles.reviewScale}>— / 5</span><strong>{locale === "vi" ? "Chưa có điểm tổng hợp công khai" : "No public aggregate rating"}</strong><p>{locale === "vi" ? "Đánh giá được ghi nhận sau khi lịch xem hoàn tất." : "Ratings are recorded after a viewing is completed."}</p><span className={styles.reviewSource}><BadgeCheck size={15} /> {locale === "vi" ? "Đánh giá gắn với lịch hẹn" : "Reviews tied to appointments"}</span></div></Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.mobileSection}`} id="mobile-app">
        <div className={`${styles.container} ${styles.mobileCard}`}>
          <Reveal><div className={styles.mobileCopy}><span className={styles.mobileBadge}><Sun size={15} /> {locale === "vi" ? "Trải nghiệm web di động" : "Mobile web experience"}</span><h2>{t.mobileTitle}</h2><p>{t.mobileLead}</p><Link href="/units" className={styles.primaryLink}>{t.explore}<ArrowRight size={16} /></Link></div></Reveal>
          <Reveal delay={100}><div className={styles.phoneScene} aria-hidden="true"><div className={styles.phoneBack}><div /><div /><div /></div><div className={styles.phoneFront}><div className={styles.phoneIsland} /><div className={styles.phoneBrand}><span className={styles.phoneBrandIcon}><Building2 size={13} /></span><b>VinStay</b><span>•••</span></div><div className={styles.phoneHero}><span>{locale === "vi" ? "Tìm căn phù hợp" : "Find your next home"}</span><i /></div><div className={styles.phoneSearch}><MapPin size={12} /> {locale === "vi" ? "Ocean Park 1" : "Ocean Park 1"}</div><div className={styles.phoneListing}><span className={styles.phonePicture} /><span><b>{locale === "vi" ? "Căn hộ đang mở" : "Available homes"}</b><small>{locale === "vi" ? "Thông tin từ catalog" : "Live catalog details"}</small></span></div><div className={styles.phoneListing}><span className={styles.phonePicture} /><span><b>{locale === "vi" ? "Lịch xem nhà" : "Home viewings"}</b><small>{locale === "vi" ? "Theo dõi trong tài khoản" : "Track in your account"}</small></span></div></div><span className={styles.phoneHalo} /></div></Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.guidesSection}`} id="guides">
        <div className={styles.container}>
          <Reveal><header className={styles.sectionHeader}><div className={styles.sectionIntro}><p className={styles.kicker}>{locale === "vi" ? "Cẩm nang ngắn" : "Quick guides"}</p><h2 className={styles.heading}>{t.guideTitle}</h2><p className={styles.lede}>{t.guideLead}</p></div></header></Reveal>
          <div className={styles.guideGrid}>
            <Link href="/units" className={styles.guideCard}><span className={styles.guideIcon}><Coins size={19} /></span><small>01 · {locale === "vi" ? "NGƯỜI THUÊ" : "RENTERS"}</small><strong>{t.guide1}</strong><p>{t.guide1b}</p><span className={styles.guideArrow}><ArrowRight size={16} /></span></Link>
            <Link href="/booking" className={styles.guideCard}><span className={styles.guideIcon}><CalendarCheck2 size={19} /></span><small>02 · {locale === "vi" ? "LỊCH XEM" : "VIEWINGS"}</small><strong>{t.guide2}</strong><p>{t.guide2b}</p><span className={styles.guideArrow}><ArrowRight size={16} /></span></Link>
            <Link href="/login?tab=landlord" className={styles.guideCard}><span className={styles.guideIcon}><Building2 size={19} /></span><small>03 · {locale === "vi" ? "CHỦ NHÀ" : "OWNERS"}</small><strong>{t.guide3}</strong><p>{t.guide3b}</p><span className={styles.guideArrow}><ArrowRight size={16} /></span></Link>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.faqSection}`} id="faq">
        <div className={`${styles.container} ${styles.faqLayout}`}>
          <Reveal><div className={styles.faqIntro}><span className={styles.faqIcon}><CircleHelp size={21} /></span><p className={styles.kicker}>{locale === "vi" ? "Cần giải đáp?" : "Need help?"}</p><h2 className={styles.heading}>{t.faqTitle}</h2><p className={styles.lede}>{t.faqLead}</p><Link href="/booking" className={styles.textLink}>{locale === "vi" ? "Mở trang tra cứu lịch" : "Open viewing lookup"}<ArrowRight size={16} /></Link></div></Reveal>
          <Reveal delay={80}><div className={styles.faqList}>{[1, 2, 3, 4, 5, 6].map((n) => <details key={n} className={styles.faqItem} open={n === 1}><summary><span>{t[`faq${n}` as keyof typeof t]}</span><ChevronDown size={18} /></summary><p>{t[`faq${n}a` as keyof typeof t]}</p></details>)}</div></Reveal>
        </div>
      </section>

      <section className={styles.finalCta} id="get-started">
        <div className={styles.finalGlow} />
        <div className={`${styles.container} ${styles.finalInner}`}>
          <div><p className={styles.kickerLight}><Sparkles size={15} /> VINSTAY AI</p><h2>{t.finalTitle}</h2><p>{t.finalLead}</p></div>
          <div className={styles.finalActions}><Link href="/units" className={styles.finalPrimary}>{t.findHome}<ArrowRight size={16} /></Link><Link href="/login?tab=landlord" className={styles.finalSecondary}>{t.listHome}</Link></div>
        </div>
      </section>

      <footer className={styles.footer} id="footer">
        <div className={styles.container}>
          <div className={styles.footerMain}>
            <div className={styles.footerBrand}><Link href="/" className={styles.footerLogo}><span><Building2 size={19} /></span><b>VinStay <i>AI</i></b></Link><p>{t.footerText}</p><span className={styles.footerLocation}><MapPin size={14} /> Vinhomes Ocean Park 1 · Hà Nội</span></div>
            <div><strong>{t.company}</strong><Link href="/#about">{locale === "vi" ? "Về VinStay" : "About VinStay"}</Link><Link href="/#how-it-works">{locale === "vi" ? "Cách hoạt động" : "How it works"}</Link><Link href="/#faq">FAQ</Link></div>
            <div><strong>{t.tenant}</strong><Link href="/units">{locale === "vi" ? "Tìm căn hộ" : "Find apartments"}</Link><Link href="/booking">{locale === "vi" ? "Tra cứu lịch xem" : "Viewings"}</Link><Link href="/login">{locale === "vi" ? "Tài khoản" : "Account"}</Link></div>
            <div><strong>{t.landlord}</strong><Link href="/login?tab=landlord">{locale === "vi" ? "Đăng ký ký gửi" : "Submit a listing"}</Link><Link href="/landlord/dashboard">{locale === "vi" ? "Cổng chủ nhà" : "Owner portal"}</Link><Link href="/host/login">{locale === "vi" ? "Cổng vận hành" : "Operations portal"}</Link></div>
            <div><strong>{t.support}</strong><Link href="/#faq">{locale === "vi" ? "Câu hỏi thường gặp" : "FAQ"}</Link><Link href="/booking">{locale === "vi" ? "Tra cứu đặt lịch" : "Appointment lookup"}</Link><Link href="/login">{locale === "vi" ? "Đăng nhập" : "Sign in"}</Link></div>
          </div>
          <div className={styles.footerBottom}><span>© 2026 VinStay AI</span><span>{locale === "vi" ? "Danh mục căn hộ hiện tại · Hà Nội" : "Current apartment catalog · Hanoi"}</span><a href="#top" className={styles.backTop}><ArrowUp size={14} /> {locale === "vi" ? "Lên đầu trang" : "Back to top"}</a></div>
        </div>
      </footer>
    </div>
  );
}
