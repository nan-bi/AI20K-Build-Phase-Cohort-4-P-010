"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutList } from "lucide-react";
import { Facade } from "@/components/brand/Facade";
import { LogoMark } from "@/components/brand/Logo";
import { fmtTime } from "@/lib/format";
import type { ChatMessage } from "@/lib/mock/types";
import styles from "./Messages.module.css";

function Typewriter({ text, onTick, onDone }: { text: string; onTick: () => void; onDone: () => void }) {
  const words = text.split(/(\s+)/);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (n >= words.length) return;
    const t = setTimeout(() => setN((x) => x + 2), 28);
    return () => clearTimeout(t);
  }, [n, words.length]);

  useEffect(() => {
    onTick();
    if (n >= words.length) onDone();
  }, [n, words.length, onTick, onDone]);

  return <>{words.slice(0, n).join("")}</>;
}

interface MessagesProps {
  greeting: string;
  messages: ChatMessage[];
  thinking: { steps: string[] } | null;
  freshId: string | null;
  onFreshDone: () => void;
  onShowResults?: (count: number) => void;
}

export function Messages({ greeting, messages, thinking, freshId, onFreshDone, onShowResults }: MessagesProps) {
  const end = useRef<HTMLDivElement>(null);
  // Chỉ cuộn khung tin nhắn (tổ tiên cuộn được gần nhất), KHÔNG kéo cả trang như scrollIntoView.
  const scroll = () => {
    let box = end.current?.parentElement ?? null;
    while (box) {
      const overflowY = getComputedStyle(box).overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && box.scrollHeight > box.clientHeight) break;
      box = box.parentElement;
    }
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  };

  // Bỏ qua lần chạy đầu (mount): so với giá trị lần trước để đúng cả khi Strict Mode chạy effect hai lần.
  const prev = useRef({ count: messages.length, thinking });
  useEffect(() => {
    if (prev.current.count === messages.length && prev.current.thinking === thinking) return;
    prev.current = { count: messages.length, thinking };
    scroll();
  }, [messages.length, thinking]);

  return (
    <div className={styles.list} role="log" aria-live="polite" aria-label="Cuộc trò chuyện với VinStay AI">
      <div className={`${styles.row} ${styles.ai}`}>
        <span className={styles.avatar}>
          <LogoMark size={26} />
        </span>
        <div className={styles.col}>
          <div className={styles.bubble}>{greeting}</div>
        </div>
      </div>

      {messages.map((m) => {
        const mine = m.role === "user";
        const fresh = m.id === freshId;
        return (
          <div key={m.id} className={`${styles.row} ${mine ? styles.me : styles.ai}`}>
            {!mine && (
              <span className={styles.avatar}>
                <LogoMark size={26} />
              </span>
            )}
            <div className={styles.col}>
              <div className={`${styles.bubble} ${mine ? styles.mine : ""}`}>{fresh ? <Typewriter text={m.text} onTick={scroll} onDone={onFreshDone} /> : m.text}</div>
              {!mine && m.resultIds && m.resultIds.length > 0 && onShowResults && !fresh && (
                <button type="button" className={styles.results} onClick={() => onShowResults(m.resultIds!.length)}>
                  <LayoutList size={15} /> Xem {m.resultIds.length} căn khớp
                </button>
              )}
              <span className={styles.time}>{fmtTime(m.at)}</span>
            </div>
          </div>
        );
      })}

      {thinking && (
        <div className={`${styles.row} ${styles.ai}`} aria-label="VinStay AI đang quét danh sách căn">
          <span className={styles.avatar}>
            <LogoMark size={26} />
          </span>
          <div className={`${styles.bubble} ${styles.thinking}`}>
            <div className={styles.miniFacade}>
              <Facade scanning lit={9} label="" />
            </div>
            <ol className={styles.steps}>
              {thinking.steps.map((s, i) => (
                <li key={s} style={{ animationDelay: `${i * 420}ms` }}>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <div ref={end} />
    </div>
  );
}
