"use client";

import { useRef, useState, type ReactNode } from "react";
import { BadgeCheck, CalendarClock, Plus, ReceiptText, Footprints } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { matchmakerApi } from "@/lib/apiClient";
import { chatAppend, chatReset, chatSetCriteria, chatSetSearch, countGuestMessage } from "@/lib/mock/actions";
import { vndShort } from "@/lib/mock/format";
import { interpret, searchUnits } from "@/lib/mock/matchmaker";
import { unitStatus } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { CriteriaState } from "@/lib/mock/types";
import { UNITS } from "@/lib/mock/units";
import { useRole, useSession } from "@/lib/auth/client";
import { Composer } from "./Composer";
import { Messages } from "./Messages";
import { ResultsPanel } from "./ResultsPanel";
import styles from "./ChatExperience.module.css";

const TRUST = [
  { icon: BadgeCheck, text: "Ảnh thật, có mốc thời gian" },
  { icon: ReceiptText, text: "All-in Cost, không phí ẩn" },
  { icon: Footprints, text: "Host đón tại sảnh" },
  { icon: CalendarClock, text: "Giữ căn qua VietQR" },
];

/** Trang chủ khách thuê: ban đầu là hero + khung chat; khi bắt đầu tìm căn, chat thu về cột trái và mở màn kết quả. */
export function ChatExperience({ below }: { below: ReactNode }) {
  const state = useMock();
  const role = useRole();
  const { chat } = state;
  const [thinking, setThinking] = useState<{ steps: string[] } | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [tab, setTab] = useState<"chat" | "results">("chat");
  const busy = useRef(false);

  const statusOf = (u: (typeof UNITS)[number]) => unitStatus(state, u);
  const openCount = UNITS.filter((u) => unitStatus(state, u) === "available").length;
  const results = searchUnits(chat.criteria, statusOf);

  const locked = state.ready && role === null && state.guestSent >= 1 && !thinking;
  const { user } = useSession();
  const first = role === "tenant" ? (user?.fullName?.split(" ").slice(-1)[0] ?? null) : null;
  const greeting = `Xin chào${first ? ` ${first}` : ""}! Mình là VinStay AI, trợ lý thuê căn hộ tại Vinhomes Ocean Park 1. Bạn cho mình biết ngân sách mỗi tháng và loại căn bạn cần nhé, mình lọc trong khoảng 30 giây.`;

  const onSend = (text: string) => {
    if (busy.current || locked) return;
    busy.current = true;
    chatAppend({ role: "user", text });
    if (role === null) countGuestMessage();

    const result = interpret(text, chat.criteria, chat.searched, statusOf);
    const isSearch = result.kind === "search";
    const budget = isSearch ? result.criteria.budget : undefined;

    if (isSearch && budget) {
      matchmakerApi
        .recommend({
          maxAllInBudget: budget,
          preferredLayout: result.criteria.layouts?.[0],
          occupants: result.criteria.household?.persons,
          motorbikes: result.criteria.household?.motorbikes,
          cars: result.criteria.household?.cars,
          prompt: text,
        })
        .catch(() => null);
    }

    setThinking({
      steps: isSearch
        ? [`Quét ${openCount} căn đang mở tại Ocean Park 1`, budget ? `Loại căn có All-in vượt ${vndShort(budget)}` : "Áp dụng bộ lọc của bạn", "Xếp hạng theo mức tiết kiệm"]
        : ["Đang tìm câu trả lời"],
    });

    setTimeout(
      () => {
        if (result.kind === "search") {
          chatSetSearch(result.criteria);
          setFreshId(chatAppend({ role: "assistant", text: result.reply, resultIds: result.results.slice(0, 3).map((r) => r.unit.id), criteria: result.criteria }));
          setTab("results");
        } else {
          setFreshId(chatAppend({ role: "assistant", text: result.reply }));
        }
        setThinking(null);
        busy.current = false;
      },
      isSearch ? 1500 : 800,
    );
  };

  const onCriteria = (c: CriteriaState) => chatSetCriteria(c);
  const workspace = chat.searched;

  if (!workspace) {
    return (
      <>
        <section className={styles.hero}>
          <div className={`wrap ${styles.heroInner}`}>
            <div className={styles.heroTop}>
              <span className={styles.liveBadge}>
                <i className={styles.liveDot} /> <strong className="num">{openCount} căn</strong> đang mở tại Ocean Park 1
              </span>
              <h1 className={styles.h1}>Căn hộ thật ở Ocean Park, tìm ra trong 30 giây</h1>
              <p className={styles.lead}>Không tin ảo, không phí ẩn, không môi giới làm phiền — Host nội khu đón bạn tận sảnh.</p>
            </div>

            <div className={styles.chatCard}>
              <div className={styles.chatHead}>
                <span className={styles.chatHeadIcon}>
                  <LogoMark size={18} inverse />
                </span>
                <div className={styles.chatHeadText}>
                  <strong>VinStay AI</strong>
                  <span>
                    <i className={styles.liveDot} /> Trợ lý thuê nhà · đang hoạt động
                  </span>
                </div>
              </div>
              <div className={styles.convo}>
                <Messages greeting={greeting} messages={chat.messages} thinking={thinking} freshId={freshId} onFreshDone={() => setFreshId(null)} />
              </div>
              <div className={styles.chatFoot}>
                <Composer
                  variant="hero"
                  criteria={chat.criteria}
                  onCriteria={onCriteria}
                  onSend={onSend}
                  busy={!!thinking}
                  locked={locked}
                  guestNotice={state.ready && role === null && state.guestSent === 0}
                  showPrompts={chat.messages.length === 0}
                />
              </div>
            </div>

            <ul className={styles.trust}>
              {TRUST.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <Icon size={18} /> {text}
                </li>
              ))}
            </ul>
          </div>
        </section>
        {below}
      </>
    );
  }

  return (
    <div className={`${styles.workspace} ${tab === "results" ? styles.showResults : styles.showChat}`}>
      <div className={styles.tabs} role="tablist" aria-label="Chuyển giữa trò chuyện và kết quả">
        <button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")}>
          Trò chuyện
        </button>
        <button type="button" role="tab" aria-selected={tab === "results"} onClick={() => setTab("results")}>
          Kết quả ({results.length})
        </button>
      </div>

      <aside className={styles.rail} aria-label="Trò chuyện với VinStay AI">
        <div className={styles.railHead}>
          <div>
            <strong>VinStay AI</strong>
            <span className="muted xs"> · lọc theo All-in Cost</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => chatReset()}>
            <Plus size={15} /> Cuộc mới
          </button>
        </div>
        <div className={styles.railMsgs}>
          <Messages
            greeting={greeting}
            messages={chat.messages}
            thinking={thinking}
            freshId={freshId}
            onFreshDone={() => setFreshId(null)}
            onShowResults={() => setTab("results")}
          />
        </div>
        <div className={styles.railFoot}>
          <Composer variant="rail" criteria={chat.criteria} onCriteria={onCriteria} onSend={onSend} busy={!!thinking} locked={locked} guestNotice={false} />
        </div>
      </aside>

      <section className={styles.results} aria-label="Kết quả tìm căn">
        <ResultsPanel results={results} criteria={chat.criteria} onCriteria={onCriteria} state={state} totalOpen={openCount} />
      </section>
    </div>
  );
}
