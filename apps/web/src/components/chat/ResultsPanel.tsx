"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageCircleQuestion, SearchX, X } from "lucide-react";
import { Facade } from "@/components/brand/Facade";
import { UnitCard } from "@/components/unit/UnitCard";
import { criteriaChips, relaxHint, type MatchResult } from "@/lib/tenant/matchmaker";
import type { CriteriaState } from "@/lib/mock/types";
import type { Unit } from "@/lib/units";
import { assumedLabel, contextChips, type AssumedDefaults, type SearchContext } from "@/lib/assistant/context";
import type { PinNote } from "@/lib/assistant/pin";
import type { PreviewPhase } from "@/lib/assistant/preview";
import styles from "./ResultsPanel.module.css";

import { criteriaHasFilters as criteriaHasAny } from "@/lib/assistant/preview";

type Sort = "best" | "price" | "area";

/** Số thẻ hiện ban đầu và mỗi lần bấm "Xem thêm". */
export const PAGE_SIZE = 12;

interface ResultsPanelProps {
  results: MatchResult[];
  criteria: CriteriaState;
  onCriteria: (c: CriteriaState) => void;
  units: Unit[];
  totalOpen: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Trạng thái màn Preview; thiếu ⇒ suy từ `results` (giữ tương thích). */
  phase?: PreviewPhase;
  /** Các bước `thinking` hiện có, dùng làm dòng trạng thái lúc đang tìm. */
  steps?: string[];
  onSelect?: (unit: Unit, book: boolean) => void;
  /** Tiêu chí bot đang nhớ — chip chỉ đọc. */
  searchContext?: SearchContext | null;
  /** "kept" = search 0 căn nên đang giữ danh sách trước. */
  note?: PinNote;
  /** Căn bot nhắc trong câu trả lời: nhãn "Gợi ý #n" và đứng đầu; rỗng ⇒ 3 căn đầu danh sách. */
  suggested?: string[];
  /** Tổng số căn khớp theo ai-engine (có thể lớn hơn số căn đang ghim); null ⇒ dùng số căn đang hiện. */
  matchedTotal?: number | null;
  /** Giả định mặc định của lượt tìm (khách chưa nói số người/xe) ⇒ chip "Tạm tính …". */
  assumed?: AssumedDefaults | null;
  onDismissNote?: () => void;
}

export function ResultsPanel({ results, criteria, onCriteria, units, totalOpen, loading, error, onRetry, phase: phaseProp, steps, onSelect, searchContext, note, onDismissNote, suggested, matchedTotal, assumed }: ResultsPanelProps) {
  const phase: PreviewPhase = phaseProp ?? (results.length ? "results" : "empty");
  const [sort, setSort] = useState<Sort>("best");
  const chips = criteriaChips(criteria);
  const hh = criteria.household;
  const memory = contextChips(searchContext);

  const sorted = useMemo(() => {
    const list = [...results];
    if (sort === "price") list.sort((a, b) => a.cost.total - b.cost.total);
    if (sort === "area") list.sort((a, b) => b.unit.areaM2 - a.unit.areaM2);
    return list;
  }, [results, sort]);

  const [limit, setLimit] = useState(PAGE_SIZE);
  const picked = suggested?.length ? results.filter((r) => suggested.includes(r.unit.code)).sort((a, b) => suggested.indexOf(a.unit.code) - suggested.indexOf(b.unit.code)) : [];
  const top = picked.length ? picked : results.slice(0, 3);
  const restAll = sort === "best" ? results.filter((r) => !top.includes(r)) : sorted;
  const restLimit = Math.max(0, limit - (sort === "best" ? top.length : 0));
  const rest = restAll.slice(0, restLimit);
  const hidden = restAll.length - rest.length;
  const total = Math.max(matchedTotal ?? 0, results.length);
  const assumedChip = assumedLabel(assumed);

  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <div className={styles.headTop}>
          <div>
            <h2 className={styles.title}>{phase === "loading" ? "Đang tìm căn phù hợp…" : results.length ? `${total} căn khớp yêu cầu` : "Chưa có căn để hiện"}</h2>
            <p className="muted small">
              {total > results.length ? `Hiển thị ${results.length} căn xếp hạng đầu · ` : ""}Đã quét {totalOpen} căn đang mở · tính cho {hh.persons} người, {hh.motorbikes} xe máy{hh.cars ? `, ${hh.cars} ô tô` : ""}
            </p>
          </div>
          {results.length > 3 && (
            <label className={styles.sort}>
              <span className="sr-only">Sắp xếp</span>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="best">Phù hợp nhất</option>
                <option value="price">All-in thấp đến cao</option>
                <option value="area">Diện tích lớn nhất</option>
              </select>
            </label>
          )}
        </div>
        {chips.length > 0 && (
          <ul className={styles.chips} aria-label="Bộ lọc đang áp dụng">
            {chips.map((c) => (
              <li key={c.key}>
                <button type="button" className={styles.chip} onClick={() => onCriteria(c.clear(criteria))} aria-label={`Bỏ bộ lọc ${c.label}`}>
                  {c.label} <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {(memory.length > 0 || assumedChip) && (
          <ul className={styles.memory} aria-label="Tiêu chí trợ lý đang nhớ">
            {memory.map((c) => (
              <li key={c.key} className={styles.memoryChip}>{c.label}</li>
            ))}
            {assumedChip && <li key="assumed" className={styles.memoryChip}>{assumedChip}</li>}
          </ul>
        )}
        {note === "kept" && results.length > 0 && (
          <p className={styles.note} role="status">
            <span>Chưa có căn nào khớp thêm điều kiện mới — đang giữ kết quả trước đó.</span>
            {onDismissNote && (
              <button type="button" className={styles.noteClose} onClick={onDismissNote} aria-label="Đóng ghi chú">
                <X size={13} />
              </button>
            )}
          </p>
        )}
      </header>

      {phase === "loading" ? (
        <div className={styles.loadingWrap} aria-busy="true">
          <p className={styles.status} role="status">
            <Loader2 size={16} className={styles.spin} aria-hidden="true" />
            {steps?.length ? steps[steps.length - 1] : "Đang tìm căn phù hợp…"}
          </p>
          <div className={styles.grid} aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        </div>
      ) : loading ? (
        <p className="muted">Đang tải danh sách căn từ hệ thống...</p>
      ) : error ? (
        <div className={styles.empty}>
          <div>
            <h3>Không tải được danh sách căn</h3>
            <p className="muted">{error}</p>
            {onRetry && (
              <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
                Thử lại
              </button>
            )}
          </div>
        </div>
      ) : results.length === 0 && phase === "empty" && !criteriaHasAny(criteria) ? (
        <div className={styles.empty}>
          <div className={styles.emptyArt}>
            <Facade lit={0} label="" />
          </div>
          <div>
            <h3>
              <MessageCircleQuestion size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Chưa có căn để hiện
            </h3>
            <p className="muted">Hãy cho mình biết ngân sách, số người ở hoặc loại căn bạn muốn, mình sẽ gợi ý ngay tại đây. Bạn cũng có thể chọn bộ lọc bên dưới khung chat.</p>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyArt}>
            <Facade lit={0} label="" />
          </div>
          <div>
            <h3>
              <SearchX size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Không có căn nào vừa với bộ lọc này
            </h3>
            <p className="muted">{relaxHint(criteria, (u) => u.baseStatus, units)}</p>
            <div className={styles.emptyActions}>
              {criteria.budget && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onCriteria({ ...criteria, budget: criteria.budget! + 1_000_000 })}>
                  Nâng ngân sách thêm 1 triệu
                </button>
              )}
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => onCriteria({ ...criteria, layouts: [], zones: [], buildings: [], floor: undefined, furnishing: undefined, items: [], pets: undefined })}>
                Bỏ bớt điều kiện
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {sort === "best" && (
            <section aria-label="AI chọn cho bạn">
              <h3 className={styles.section}>Gợi ý phù hợp</h3>
              <div className={styles.grid}>
                {top.map((r, i) => (
                  <UnitCard key={r.unit.id} unit={r.unit} cost={r.cost} rank={i + 1} reasons={r.reasons} priority={i === 0} onSelect={onSelect} />
                ))}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section aria-label="Các căn khớp khác">
              <h3 className={styles.section}>{sort === "best" ? `Các căn khớp khác (${restAll.length})` : "Tất cả căn khớp"}</h3>
              <div className={styles.grid}>
                {rest.map((r) => (
                  <UnitCard key={r.unit.id} unit={r.unit} cost={r.cost} onSelect={onSelect} />
                ))}
              </div>
              {hidden > 0 && (
                <div className={styles.more}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                    Xem thêm {Math.min(PAGE_SIZE, hidden)} căn ({hidden} căn còn lại)
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
