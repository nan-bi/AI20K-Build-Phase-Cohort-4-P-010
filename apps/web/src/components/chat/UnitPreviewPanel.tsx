"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { UnitDetail } from "@/components/unit/UnitDetail";
import { escShouldClose } from "@/lib/assistant/preview";
import { tenantApi } from "@/lib/tenant/api";
import { toUnit, type UnitWithExtras } from "@/lib/tenant/adapters";
import { unitAddress } from "@/lib/units";
import styles from "./UnitPreviewPanel.module.css";

interface Props {
  unit: UnitWithExtras;
  book: boolean;
  onClose: () => void;
}

/** Chi tiết căn ngay trong màn Preview: không đổi URL, chat không mất. Desktop phủ vùng preview; mobile full-screen. */
export function UnitPreviewPanel({ unit: listUnit, book, onClose }: Props) {
  // Danh sách /properties/units chỉ trả bản rút gọn (inventory rỗng); trang /units/[id] tải chi tiết riêng ⇒ panel cũng phải vậy.
  const [detail, setDetail] = useState<UnitWithExtras | null>(null);
  const unit = detail && detail.id === listUnit.id ? detail : listUnit;
  useEffect(() => {
    let alive = true;
    tenantApi
      .unit(listUnit.code || listUnit.id)
      .then((res) => {
        const dto = res.data;
        if (alive && dto && dto.code) setDetail(toUnit(dto));
      })
      .catch(() => undefined); // lỗi mạng: giữ bản rút gọn, không chặn xem căn
    return () => {
      alive = false;
    };
  }, [listUnit.id, listUnit.code]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    scrollRef.current?.scrollTo({ top: 0 });
    const onKey = (e: KeyboardEvent) => {
      if (escShouldClose(e.key, !!document.querySelector("dialog[open]"))) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [unit.id, onClose]);

  return (
    <div className={styles.panel} role="region" aria-label={`Chi tiết căn ${unitAddress(unit)}`}>
      <div className={styles.bar}>
        <button ref={closeRef} type="button" className="btn btn-outline btn-sm" onClick={onClose}>
          <ArrowLeft size={15} /> Quay lại kết quả
        </button>
        <a className={styles.full} href={`/units/${unit.code || unit.id}`} target="_blank" rel="noopener noreferrer">
          Mở trang đầy đủ <ExternalLink size={14} />
        </a>
      </div>
      <div ref={scrollRef} className={styles.scroll}>
        <UnitDetail unit={unit} autoOpenBooking={book} embedded />
      </div>
    </div>
  );
}
