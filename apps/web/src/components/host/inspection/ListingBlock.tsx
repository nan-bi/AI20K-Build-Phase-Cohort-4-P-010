"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { ROOMS, ROOM_LABEL, moveListing } from "@/lib/inspection/logic";
import type { InspectionDraft, InspectionPhotoView, ListingRoom } from "@/lib/inspection/types";
import consign from "@/components/consign/Consign.module.css";
import { PhotoStrip } from "./PhotoStrip";
import type { PhotoController } from "./photoController";
import styles from "./Inspection.module.css";

interface Props {
  draft: InspectionDraft;
  photos: PhotoController;
  min: number;
  max: number;
  invalid: boolean;
  onChange: (patch: (d: InspectionDraft) => InspectionDraft) => void;
}

/** Khối 6 — ảnh niêm yết 4–12: chọn phòng TRƯỚC khi chụp, đổi thứ tự bằng nút ↑↓ (thứ tự = `listingPhotoIds`). */
export function ListingBlock({ draft, photos, min, max, invalid, onChange }: Props) {
  const [room, setRoom] = useState<ListingRoom>("living_room");
  const byId = new Map(photos.photosOf("listing").map((p) => [p.id, p]));
  const ordered = draft.listingPhotoIds.map((id) => byId.get(id)).filter((p): p is InspectionPhotoView => Boolean(p));
  const pending = photos.uploadsOf("listing");

  const ids = draft.listingPhotoIds; // đã đồng bộ với ảnh trên server (bản `draft` thô có thể chưa có)
  const move = (i: number, dir: -1 | 1) => onChange((d) => ({ ...d, listingOrder: moveListing(ids, i, dir) }));

  return (
    <div id="insp-listingPhotoIds" className={`${consign.formCard} ${invalid ? styles.cardBad : ""}`}>
      <h3 className={consign.formCardTitle}>6. Ảnh niêm yết ({min}–{max} ảnh)</h3>
      <p className={styles.publicNote}>Ảnh này hiện công khai trên tin đăng ngay khi đạt. Chụp sáng, gọn, đủ các phòng; ảnh đầu tiên là ảnh bìa.</p>

      <div>
        <span className="label" style={{ display: "block", marginBottom: 6 }}>
          Ảnh sắp chụp thuộc phòng
        </span>
        <div className={styles.roomPick}>
          {ROOMS.map((r) => (
            <button key={r} type="button" className={`${consign.chipItem} ${room === r ? consign.chipItemActive : ""}`} onClick={() => setRoom(r)}>
              {ROOM_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {ordered.length > 0 && (
        <div className={styles.listingGrid}>
          {ordered.map((p, i) => {
            const src = p.url ?? photos.previews[p.id] ?? null;
            return (
              <div key={p.id} className={styles.listingCard}>
                <div className={styles.listingImg}>
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- link ký tạm thời / blob cục bộ
                    <img src={src} alt={`Ảnh niêm yết ${i + 1}`} loading="lazy" />
                  ) : (
                    <span className="muted xs">Ảnh đã lên</span>
                  )}
                  <span className={styles.listingIndex}>{i + 1}</span>
                </div>
                <div className={styles.listingFoot}>
                  <span>{p.room ? ROOM_LABEL[p.room] : "—"}</span>
                  <span className={styles.listingMoves}>
                    <button type="button" className="icon-btn" aria-label="Đưa lên" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp size={15} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Đưa xuống" disabled={i === ordered.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown size={15} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Xoá ảnh" disabled={photos.removing.has(p.id)} onClick={() => photos.remove(p.id)}>
                      <X size={15} />
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PhotoStrip
        slot="listing"
        photos={[]}
        uploads={pending}
        previews={photos.previews}
        max={max - ordered.length}
        totalLeft={photos.totalLeft}
        removing={photos.removing}
        label={`Chụp ảnh · ${ROOM_LABEL[room]}`}
        showCount={false}
        onAdd={(files) => photos.add("listing", room, files)}
        onRemove={photos.remove}
        onRetry={photos.retry}
        onForce={photos.force}
        onDismiss={photos.dismiss}
      />
      <p className="muted xs" style={{ margin: 0 }}>
        Đang có {ordered.length + pending.length}/{max} ảnh · cần tối thiểu {min}.
      </p>
    </div>
  );
}
