"use client";

import { Fragment } from "react";
import { fmtTime, dayLabel } from "@/lib/mock/format";
import type { Notice, NoticeAction } from "@/lib/mock/types";
import styles from "./ZaloThread.module.css";

interface ZaloBubbleProps {
  notice: Notice;
  now: number;
  /** Bấm nút tương tác 1-chạm trong tin (chỉ có ở tin nhắc hẹn). */
  onAction?: (notice: Notice, action: NoticeAction) => void;
  actionsDisabled?: boolean;
}

/** Một tin nhắn Zalo OA mô phỏng. */
export function ZaloBubble({ notice, now, onAction, actionsDisabled }: ZaloBubbleProps) {
  const answered = notice.actions?.some((a) => a.doneAt);
  return (
    <div className={styles.msg}>
      <span className={styles.avatar} aria-hidden>
        VS
      </span>
      <div className={styles.body}>
        <div className={styles.bubble}>
          <strong className={styles.title}>{notice.title}</strong>
          <p>{notice.body}</p>
          {notice.actions && (
            <div className={styles.actions}>
              {notice.actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`${styles.action} ${a.doneAt ? styles.done : ""}`}
                  disabled={!!answered || actionsDisabled || !onAction}
                  onClick={() => onAction?.(notice, a)}
                >
                  {a.doneAt ? "✓ " : ""}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className={styles.time}>
          {fmtTime(notice.at)} · {dayLabel(notice.at, now)}
        </span>
      </div>
    </div>
  );
}

interface ZaloThreadProps {
  notices: Notice[];
  now: number;
  title?: string;
  subtitle?: string;
  onAction?: ZaloBubbleProps["onAction"];
  actionsDisabled?: boolean;
  empty?: string;
  /** Chiều cao tối đa của vùng cuộn. */
  maxHeight?: number;
}

/** Khung "điện thoại" Zalo hiển thị luồng tin VinStay AI OA gửi cho khách. */
export function ZaloThread({ notices, now, title = "VinStay AI", subtitle = "Tài khoản Zalo OA chính thức", onAction, actionsDisabled, empty, maxHeight = 460 }: ZaloThreadProps) {
  const list = [...notices].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <div className={styles.phone}>
      <header className={styles.head}>
        <span className={`${styles.avatar} ${styles.avatarLg}`} aria-hidden>
          VS
        </span>
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <span className={styles.zalo}>Zalo</span>
      </header>
      <div className={styles.scroll} style={{ maxHeight }}>
        {list.length === 0 && <p className={styles.empty}>{empty ?? "Chưa có tin nhắn."}</p>}
        {list.map((n) => (
          <Fragment key={n.id}>
            <ZaloBubble notice={n} now={now} onAction={onAction} actionsDisabled={actionsDisabled} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
