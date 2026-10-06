"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, Coins, Footprints, LayoutDashboard, MessageCircle, Plus, ReceiptText } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { vndShort } from "@/lib/format";
import { emptyCriteria, parseQuery, searchUnits } from "@/lib/tenant/matchmaker";
import type { ChatMessage, CriteriaState } from "@/lib/mock/types";
import { useCatalog } from "@/lib/tenant/catalog";
import { useSession } from "@/lib/auth/client";
import { AssistantLauncher } from "./AssistantLauncher";
import { useAssistantInternal } from "./AssistantProvider";
import { Composer } from "./Composer";
import { Messages } from "./Messages";
import { ResultsPanel } from "./ResultsPanel";
import { Button } from "@/components/ui/button";
import styles from "./ChatExperience.module.css";
import { useOptionalLandingPreferences } from "@/components/landing/LandingPreferences";

const TRUST = [
  { icon: BadgeCheck, text: "Căn lấy từ danh mục hệ thống" },
  { icon: ReceiptText, text: "Hiển thị ước tính All-in Cost" },
  { icon: Footprints, text: "Host xác nhận lịch xem" },
  { icon: CalendarClock, text: "Theo dõi trạng thái lịch xem" },
];

/** 3 ý năng lực của trợ lý — chỉ hiển thị, không bấm (SPEC-P02 §1). */
const CAPABILITIES = [
  { icon: MessageCircle, vi: "Hiểu câu tự nhiên", en: "Understands natural requests" },
  { icon: Coins, vi: "Tính sẵn All-in Cost", en: "All-in Cost included" },
  { icon: LayoutDashboard, vi: "Lọc trên căn thật", en: "Filters live listings" },
];

const statusOf = (unit: { baseStatus?: string }) => (unit.baseStatus ?? "available") as "available" | "holding" | "rented";

/** Bộ lọc hội thoại chạy trên danh mục căn thật đã tải từ API. */
export function ChatExperience({ below }: { below: ReactNode }) {
  const prefs = useOptionalLandingPreferences();
  const assistant = useAssistantInternal();
  const en = prefs?.locale === "en";
  const session = useSession();
  const role = session.user?.portal ?? null;
  const user = session.user;
  const catalog = useCatalog();
  const [criteria, setCriteria] = useState<CriteriaState>(() => emptyCriteria());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searched, setSearched] = useState(false);
  const [thinking, setThinking] = useState<{ steps: string[] } | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [tab, setTab] = useState<"chat" | "results">("chat");
  const busy = useRef(false);
  const results = useMemo(() => searchUnits(criteria, statusOf, catalog.units), [criteria, catalog.units]);
  const first = role === "tenant" ? (user?.fullName?.split(" ").slice(-1)[0] ?? null) : null;
  const greeting = en
    ? `Hello${first ? ` ${first}` : ""}! I can help you find available apartments by budget, layout, and everyday needs. Tell me what you are looking for.`
    : `Xin chào${first ? ` ${first}` : ""}! Mình giúp bạn lọc căn hộ đang có trong hệ thống theo ngân sách, loại căn và nhu cầu sinh hoạt. Nhập yêu cầu để bắt đầu.`;

  function append(roleValue: "user" | "assistant", text: string, resultIds?: string[], nextCriteria?: CriteriaState) {
    const message: ChatMessage = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, role: roleValue, text, at: new Date().toISOString(), resultIds, criteria: nextCriteria };
    setMessages((current) => [...current, message]);
    return message.id;
  }

  function onSend(text: string) {
    if (busy.current) return;
    busy.current = true;
    append("user", text);
    const parsed = parseQuery(text, criteria);
    const nextCriteria = parsed.patch;
    setCriteria(nextCriteria);
    const hasFilters = nextCriteria.budget !== undefined || nextCriteria.layouts.length > 0 || nextCriteria.zones.length > 0 || nextCriteria.buildings.length > 0 || nextCriteria.floor !== undefined || nextCriteria.furnishing !== undefined || nextCriteria.items.length > 0 || nextCriteria.pets !== undefined;

    if (!hasFilters) {
      append("assistant", en ? "I can only filter by available listing data. Add a maximum budget or choose a filter below." : "Mình chỉ có thể lọc căn theo dữ liệu hiện có. Hãy nhập ngân sách tối đa hoặc chọn tiêu chí bằng các bộ lọc bên dưới.");
      busy.current = false;
      return;
    }
    if (catalog.error) {
      append("assistant", en ? `Could not load listings from the system: ${catalog.error}` : `Không tải được danh mục căn từ hệ thống: ${catalog.error}`);
      busy.current = false;
      return;
    }
    if (catalog.loading) {
      append("assistant", en ? "The apartment catalog is still loading. Please try again in a moment." : "Danh mục căn vẫn đang tải. Bạn thử gửi lại sau khi tải xong nhé.");
      busy.current = false;
      return;
    }

    setThinking({ steps: en ? [`Reading ${catalog.available.length} available homes`, "Applying filters and estimating monthly costs"] : [`Đọc ${catalog.available.length} căn đang trống từ hệ thống`, "Áp dụng bộ lọc và tính All-in Cost"] });
    const found = searchUnits(nextCriteria, statusOf, catalog.units);
    const reply = found.length
      ? en ? `Searched ${catalog.available.length} available homes and found ${found.length} matches${nextCriteria.budget ? ` within ${vndShort(nextCriteria.budget)}` : ""}. Results are ordered by relevance.` : `Đã lọc ${catalog.available.length} căn trống và tìm thấy ${found.length} căn phù hợp${nextCriteria.budget ? ` trong ngân sách ${vndShort(nextCriteria.budget)}` : ""}. Kết quả bên cạnh được xếp theo mức phù hợp.`
      : en ? `Searched ${catalog.available.length} available homes but found no matches. Try removing a filter or increasing your budget.` : `Đã lọc ${catalog.available.length} căn trống nhưng hiện không có kết quả khớp. Hãy thử bỏ bớt điều kiện hoặc tăng ngân sách.`;
    const id = append("assistant", reply, found.slice(0, 3).map((result) => result.unit.code), nextCriteria);
    setFreshId(id);
    setSearched(true);
    setTab("results");
    setThinking(null);
    busy.current = false;
  }

  const onCriteria = (next: CriteriaState) => setCriteria(next);
  const reset = () => {
    setCriteria(emptyCriteria());
    setMessages([]);
    setSearched(false);
    setTab("chat");
  };

  if (!searched) {
    return <>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroInner}>
          <div className={styles.intro}>
            <div className={styles.availability} aria-live="polite">
              <span className={styles.liveDot} />
              <strong>{catalog.loading ? (en ? "Syncing" : "Đang đồng bộ") : `${catalog.available.length} ${en ? "homes" : "căn"}`}</strong>
              <span>{en ? "currently available in the catalog" : "đang mở trong danh mục hệ thống"}</span>
            </div>
            <h1 id="home-title" className={styles.title}>{en ? <>Find an Ocean Park home — <span>just describe what you need</span></> : <>Tìm căn hộ Ocean Park — <span>chỉ cần mô tả nhu cầu</span></>}</h1>
            <p className={styles.description}>{en ? "The assistant filters real listings, calculates All-in Cost for you, and books viewings with a Host meeting you in the lobby." : "Trợ lý lọc căn thật, tính sẵn All-in Cost, đặt lịch có Host đón sảnh."}</p>
          </div>

          <section id="assistant" ref={assistant?.registerAssistant} className={styles.matchCard} aria-label={en ? "VinStay apartment search" : "Trợ lý tìm căn VinStay"}>
            <header className={styles.matchHead}>
              <div className={styles.matchBrand}>
                <span className={styles.matchMark}><LogoMark size={22} inverse /></span>
                <span className={styles.matchBrandText}>
                  <strong>VinStay AI</strong>
                  <span>{en ? "Home search assistant" : "Trợ lý tìm căn"}</span>
                </span>
              </div>
              <span className={styles.sourceBadge}>
                <span className={styles.sourceDot} />
                {catalog.error ? (en ? "Retry needed" : "Cần thử lại") : catalog.loading ? (en ? "Syncing" : "Đang đồng bộ") : (en ? "Live catalog" : "Danh mục thật")}
              </span>
            </header>
            <div className={styles.chatStage}>
              <Messages greeting={greeting} messages={messages} thinking={thinking} freshId={freshId} onFreshDone={() => setFreshId(null)} />
            </div>
            <div className={styles.composer}>
              <Composer variant="hero" criteria={criteria} onCriteria={onCriteria} onSend={onSend} busy={!!thinking} locked={false} guestNotice={false} showPrompts={messages.length === 0} locale={en ? "en" : "vi"} prefill={assistant?.prefill} />
            </div>
            <ul className={styles.capabilities} aria-label={en ? "What the assistant does" : "Trợ lý làm được gì"}>
              {CAPABILITIES.map(({ icon: Icon, vi, en: enText }) => <li key={vi} className={styles.capability}><Icon size={15} /> {en ? enText : vi}</li>)}
            </ul>
            <p className={styles.matchFoot}><Coins size={14} /> {en ? "Matches use current apartment data and estimated monthly costs." : "Kết quả dựa trên catalog căn hộ và ước tính chi phí hiện tại."}</p>
          </section>

          <nav className={styles.heroLinks} aria-label={en ? "More ways to browse" : "Lối khác"}>
            <Link href="/units" className={styles.heroLink}>{en ? "Browse all homes" : "Xem tất cả căn"} <ArrowRight size={15} /></Link>
            <Link href="/#for-owners" className={styles.heroLinkMuted}>{en ? "Own a home? List it with us" : "Chủ nhà? Ký gửi căn"} <ArrowRight size={15} /></Link>
          </nav>
        </div>

        <ul className={styles.trustBar} aria-label="Cam kết VinStay">
          {TRUST.map(({ icon: Icon, text }, index) => (
            <li key={text} className={styles.trustItem}><Icon size={15} /> {en ? ["Apartments from the live catalog", "Estimated monthly cost", "Viewing requests in the system", "Viewing status you can follow"][index] : text}</li>
          ))}
        </ul>
      </section>
      <AssistantLauncher />
      {below}
    </>;
  }

  return (
    <div className={styles.workspace}>
      <div className="md:hidden flex p-2 border-b border-border bg-muted/30" role="tablist" aria-label={en ? "Switch between request and results" : "Chuyển giữa trò chuyện và kết quả"}>
        <Button variant={tab === "chat" ? "default" : "ghost"} className="flex-1 rounded-full" onClick={() => setTab("chat")}>{en ? "Request" : "Yêu cầu"}</Button>
        <Button variant={tab === "results" ? "default" : "ghost"} className="flex-1 rounded-full" onClick={() => setTab("results")}>{en ? "Results" : "Kết quả"} ({results.length})</Button>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        <aside className={`${tab === "chat" ? "flex" : "hidden md:flex"} flex-col w-full md:w-[400px] border-r border-border bg-card z-10`}>
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <div>
              <strong className="text-sm font-semibold block">VinStay AI</strong>
              <span className="text-xs text-muted-foreground">· {en ? "searching live listings" : "lọc trên danh mục hiện có"}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
              <Plus size={14} className="mr-1.5" /> {en ? "New search" : "Làm mới bộ lọc"}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Messages greeting={greeting} messages={messages} thinking={thinking} freshId={freshId} onFreshDone={() => setFreshId(null)} onShowResults={() => setTab("results")} />
          </div>
          <div className="p-4 border-t border-border bg-background">
            <Composer variant="rail" criteria={criteria} onCriteria={onCriteria} onSend={onSend} busy={!!thinking} locked={false} guestNotice={false} locale={en ? "en" : "vi"} />
          </div>
        </aside>

        <section className={`${tab === "results" ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0 bg-muted/10`}>
          <ResultsPanel results={results} criteria={criteria} onCriteria={onCriteria} units={catalog.units} totalOpen={catalog.available.length} loading={catalog.loading} error={catalog.error} onRetry={catalog.reload} />
        </section>
      </div>
    </div>
  );
}
