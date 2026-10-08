"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, Coins, Footprints, LayoutDashboard, MessageCircle, Plus, ReceiptText } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { vndShort } from "@/lib/format";
import { emptyCriteria, parseQuery, searchUnits } from "@/lib/tenant/matchmaker";
import { CLIENT_ERROR, streamChat, type AssistantEvent, type ChatTurn } from "@/lib/assistant/stream";
import type { AssumedDefaults, SearchContext } from "@/lib/assistant/context";
import { loginPrompt } from "@/lib/assistant/guest";
import { nextPinned, type PinNote } from "@/lib/assistant/pin";
import { closeSelection, criteriaHasFilters, previewPhase, selectUnit, type PreviewSelection } from "@/lib/assistant/preview";
import type { UnitWithExtras } from "@/lib/tenant/adapters";
import type { ChatMessage, CriteriaState } from "@/lib/mock/types";
import { useCatalog } from "@/lib/tenant/catalog";
import { useSession } from "@/lib/auth/client";
import { AssistantLauncher } from "./AssistantLauncher";
import { useAssistantInternal } from "./AssistantProvider";
import { Composer } from "./Composer";
import { Messages } from "./Messages";
import { ResultsPanel } from "./ResultsPanel";
import { UnitPreviewPanel } from "./UnitPreviewPanel";
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
  /** Khách đã gửi tin đầu tiên (kể cả khi bot chưa có căn): chuyển sang bố cục workspace. */
  const [started, setStarted] = useState(false);
  const [thinking, setThinking] = useState<{ steps: string[] } | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [tab, setTab] = useState<"chat" | "results">("chat");
  const [streaming, setStreaming] = useState(false);
  /** Mã căn do trợ lý AI chọn (event `units`); null = kết quả tính từ bộ lọc `criteria`. */
  const [pinned, setPinned] = useState<string[] | null>(null);
  /** Tiêu chí bot đang nhớ (từ `criteria` của event `units` gần nhất), gửi kèm mỗi request. null = chưa có / khách đã chỉnh bộ lọc tay. */
  const [searchContext, setSearchContext] = useState<SearchContext | null>(null);
  /** Ghi chú trên danh sách preview ("search 0 căn nên đang giữ kết quả trước"); khách bấm đóng được. */
  const [previewNote, setPreviewNote] = useState<PinNote>(null);
  /** Căn bot nhắc trong câu trả lời (nhãn "Gợi ý #n", đứng đầu), tổng số căn khớp, giả định mặc định của lượt tìm gần nhất. */
  const [suggested, setSuggested] = useState<string[]>([]);
  const [matchedTotal, setMatchedTotal] = useState<number | null>(null);
  const [assumed, setAssumed] = useState<AssumedDefaults | null>(null);
  /** Đã gửi tin nhưng chưa có event `units`/kết thúc luồng: Preview hiện skeleton. */
  const [pending, setPending] = useState(false);
  /** Căn đang xem chi tiết ngay trong Preview (không đổi URL). */
  const [selected, setSelected] = useState<PreviewSelection<UnitWithExtras> | null>(null);
  const busy = useRef(false);
  /** Danh mục mới nhất: onSend là hàm async giữ bản chụp `catalog` lúc bấm gửi, nếu danh mục đang tải lại (vd ngay sau đăng nhập) thì tập mã rỗng và căn bot gợi ý bị bỏ. */
  const catalogCodesRef = useRef<string[]>([]);
  useEffect(() => {
    catalogCodesRef.current = catalog.units.map((u) => u.code);
  }, [catalog.units]);
  const results = useMemo(() => {
    if (!pinned) return criteriaHasFilters(criteria) ? searchUnits(criteria, statusOf, catalog.units) : [];
    // Danh mục đang tải lại ⇒ found rỗng tạm thời: ResultsPanel hiện "đang tải" (không phải màn trống) và pinned được giữ nguyên.
    const found = searchUnits(emptyCriteria(), () => "available", catalog.units.filter((u) => pinned.includes(u.code)));
    return found.sort((a, b) => pinned.indexOf(a.unit.code) - pinned.indexOf(b.unit.code));
  }, [criteria, catalog.units, pinned]);
  const first = role === "tenant" ? (user?.fullName?.split(" ").slice(-1)[0] ?? null) : null;
  const greeting = en
    ? `Hello${first ? ` ${first}` : ""}! I can help you find available apartments by budget, layout, and everyday needs. Tell me what you are looking for.`
    : `Xin chào${first ? ` ${first}` : ""}! Mình giúp bạn lọc căn hộ đang có trong hệ thống theo ngân sách, loại căn và nhu cầu sinh hoạt. Nhập yêu cầu để bắt đầu.`;

  function append(roleValue: "user" | "assistant", text: string, resultIds?: string[], nextCriteria?: CriteriaState, cta?: ChatMessage["cta"]) {
    const message: ChatMessage = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, role: roleValue, text, at: new Date().toISOString(), resultIds, criteria: nextCriteria, cta };
    setMessages((current) => [...current, message]);
    return message.id;
  }

  /** Nhánh bộ lọc cũ (parseQuery + searchUnits) — dùng khi trợ lý AI không khả dụng cho lượt này. */
  function runFilter(text: string) {
    const parsed = parseQuery(text, criteria);
    const nextCriteria = parsed.patch;
    const hasFilters = criteriaHasFilters(nextCriteria);
    setPending(false);
    setSelected(closeSelection());

    // Không có điều kiện / danh mục chưa sẵn sàng: KHÔNG đụng danh sách đang hiện (không xoá trắng preview).
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
    const foundNow = searchUnits(nextCriteria, statusOf, catalog.units);
    if (!foundNow.length && pinned?.length) {
      // Bộ lọc nhanh 0 căn nhưng đã có danh sách: giữ danh sách cũ, không đổi sang bộ lọc rỗng.
      append("assistant", en ? "No homes match the new condition, so I am keeping your previous results." : "Chưa có căn nào khớp thêm điều kiện mới — mình đang giữ danh sách trước đó.");
      setPreviewNote("kept");
      busy.current = false;
      return;
    }
    setPinned(null);
    setSuggested([]);
    setMatchedTotal(null);
    setAssumed(null);
    setPreviewNote(null);
    setCriteria(nextCriteria);

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

  const noticeText = en ? "AI assistant is busy — using the quick filter" : "Trợ lý AI tạm bận — đang dùng bộ lọc nhanh";

  async function onSend(text: string) {
    if (busy.current) return;
    busy.current = true;
    const history: ChatTurn[] = [
      ...messages.filter((m) => m.text && !m.id.startsWith("notice-")).map((m): ChatTurn => ({ role: m.role, content: m.text.slice(0, 2000) })),
      { role: "user", content: text.slice(0, 2000) } as ChatTurn,
    ].slice(-20);
    append("user", text);
    // Giới hạn lượt của khách do SERVER chốt (401 LOGIN_REQUIRED theo phiên + IP); web không tự đếm để khỏi chặn nhầm người đã đăng nhập.
    setStarted(true);
    setPending(true);
    setStreaming(true);
    setThinking({ steps: en ? ["Asking the AI assistant", "Checking live listings"] : ["Đang hỏi trợ lý AI", "Tra cứu danh mục căn thật"] });

    let replyId: string | null = null;
    let acc = "";
    let unitsEvent: Extract<AssistantEvent, { type: "units" }> | null = null;
    let failure: string | null = null;
    const ensureReply = () => {
      if (replyId) return replyId;
      replyId = append("assistant", "");
      setThinking(null);
      return replyId;
    };
    try {
      for await (const event of streamChat(history, { locale: en ? "en" : "vi", searchContext })) {
        if (event.type === "delta") {
          acc += event.text;
          const id = ensureReply();
          const snapshot = acc;
          setMessages((current) => current.map((m) => (m.id === id ? { ...m, text: snapshot } : m)));
        } else if (event.type === "units") {
          unitsEvent = event; // kể cả unitCodes rỗng (search 0 căn): nextPinned quyết định giữ danh sách cũ
          if (event.criteria) setSearchContext(event.criteria);
          setPending(false);
        } else if (event.type === "error") {
          failure = event.code;
          break;
        }
      }
    } catch {
      failure = "NETWORK";
    }
    setStreaming(false);
    setThinking(null);
    setPending(false);

    if (!acc && failure === CLIENT_ERROR.loginRequired) {
      const prompt = loginPrompt(en);
      append("assistant", prompt.text, undefined, undefined, prompt.cta);
      busy.current = false;
      return;
    }
    if (!acc) {
      // Chưa có delta nào (mọi lỗi HTTP/mạng/timeout/event error, hoặc luồng rỗng): rơi về bộ lọc cũ cho lượt này (F3).
      setMessages((current) => [...current, { id: `notice-${Date.now()}`, role: "assistant", text: noticeText, at: new Date().toISOString() }]);
      runFilter(text);
      return;
    }
    if (failure === "TOOL_FAILED") append("assistant", en ? "Something went wrong while looking that up. Please send it again." : "Có lỗi khi tra cứu dữ liệu. Bạn gửi lại giúp mình nhé.");
    const known = catalogCodesRef.current;
    const next = nextPinned(pinned, unitsEvent && replyId ? unitsEvent : null, known.length ? known : unitsEvent?.unitCodes);
    setPreviewNote(next.note);
    if (next.applied && replyId) {
      const applied = next.applied;
      const id = replyId;
      setMessages((current) => current.map((m) => (m.id === id ? { ...m, resultIds: applied.pinned } : m)));
      setPinned(applied.pinned);
      setSuggested(applied.suggested);
      if (unitsEvent && unitsEvent.mode === "search") {
        setMatchedTotal(unitsEvent.matched ?? applied.pinned.length);
        setAssumed(unitsEvent.assumed ?? null);
      }
      setSelected(closeSelection());
      setSearched(applied.searched);
      setTab(applied.tab);
    }
    busy.current = false;
  }

  const onCriteria = (next: CriteriaState) => {
    // Khách đổi sang bộ lọc tay ⇒ bỏ ghim của bot và tiêu chí bot nhớ (đây là đường duy nhất, cùng reset, được xoá danh sách).
    setPinned(null);
    setSuggested([]);
    setMatchedTotal(null);
    setAssumed(null);
    setSearchContext(null);
    setPreviewNote(null);
    setCriteria(next);
  };
  const reset = () => {
    setCriteria(emptyCriteria());
    setPinned(null);
    setSuggested([]);
    setMatchedTotal(null);
    setAssumed(null);
    setSearchContext(null);
    setPreviewNote(null);
    setMessages([]);
    setSearched(false);
    setStarted(false);
    setPending(false);
    setSelected(closeSelection());
    setTab("chat");
  };
  const onSelect = (unit: { code: string }, book: boolean) => {
    const full = catalog.units.find((u) => u.code === unit.code);
    if (full) setSelected(selectUnit(full, book));
  };
  const closeDetail = useCallback(() => setSelected(closeSelection()), []);
  const phase = previewPhase({ started: started || searched, pending: pending && !pinned?.length, resultCount: results.length });

  if (!searched && !started) {
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
              <Composer variant="hero" criteria={criteria} onCriteria={onCriteria} onSend={onSend} busy={!!thinking || streaming} locked={false} guestNotice={false} showPrompts={messages.length === 0} locale={en ? "en" : "vi"} prefill={assistant?.prefill} />
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
            <Composer variant="rail" criteria={criteria} onCriteria={onCriteria} onSend={onSend} busy={!!thinking || streaming} locked={false} guestNotice={false} locale={en ? "en" : "vi"} />
          </div>
        </aside>

        <section className={`${tab === "results" ? "flex" : "hidden md:flex"} relative flex-1 flex-col min-w-0 bg-muted/10 overflow-hidden`}>
          <div className="relative isolate z-0 flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-24">
          <ResultsPanel phase={phase} steps={thinking?.steps} onSelect={onSelect} results={results} criteria={criteria} onCriteria={onCriteria} searchContext={searchContext} suggested={suggested} matchedTotal={pinned ? matchedTotal : null} assumed={assumed} note={previewNote} onDismissNote={() => setPreviewNote(null)} units={catalog.units} totalOpen={catalog.available.length} loading={catalog.loading} error={catalog.error} onRetry={catalog.reload} />
          </div>
          {selected && <UnitPreviewPanel unit={selected.unit} book={selected.book} onClose={closeDetail} />}
        </section>
      </div>
    </div>
  );
}
