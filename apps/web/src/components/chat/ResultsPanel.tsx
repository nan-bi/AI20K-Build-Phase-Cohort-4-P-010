"use client";

import { useMemo, useState } from "react";
import { SearchX, X } from "lucide-react";
import { Facade } from "@/components/brand/Facade";
import { UnitCard } from "@/components/unit/UnitCard";
import { criteriaChips, relaxHint, type MatchResult } from "@/lib/mock/matchmaker";
import type { CriteriaState } from "@/lib/mock/types";
import type { Unit } from "@/lib/mock/units";
import styles from "./ResultsPanel.module.css";

type Sort = "best" | "price" | "area";

interface ResultsPanelProps {
  results: MatchResult[];
  criteria: CriteriaState;
  onCriteria: (c: CriteriaState) => void;
  units: Unit[];
  totalOpen: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ResultsPanel({ results, criteria, onCriteria, units, totalOpen, loading, error, onRetry }: ResultsPanelProps) {
  const [sort, setSort] = useState<Sort>("best");
  const chips = criteriaChips(criteria);
  const hh = criteria.household;

  const sorted = useMemo(() => {
    const list = [...results];
    if (sort === "price") list.sort((a, b) => a.cost.total - b.cost.total);
    if (sort === "area") list.sort((a, b) => b.unit.areaM2 - a.unit.areaM2);
    return list;
  }, [results, sort]);

  const top = results.slice(0, 3);
  const rest = sort === "best" ? results.slice(3) : sorted;

  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <div className={styles.headTop}>
          <div>
            <h2 className={styles.title}>{results.length ? `${results.length} căn khớp yêu cầu` : "Chưa có căn khớp"}</h2>
            <p className="muted small">
              Đã quét {totalOpen} căn đang mở · tính cho {hh.persons} người, {hh.motorbikes} xe máy{hh.cars ? `, ${hh.cars} ô tô` : ""}
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
      </header>

      {loading ? (
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
              <h3 className={styles.section}>AI chọn cho bạn</h3>
              <div className={styles.top}>
                {top.map((r, i) => (
                  <UnitCard key={r.unit.id} unit={r.unit} cost={r.cost} variant="feature" rank={i + 1} reasons={r.reasons} priority={i === 0} />
                ))}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section aria-label="Các căn khớp khác">
              <h3 className={styles.section}>{sort === "best" ? `Các căn khớp khác (${rest.length})` : "Tất cả căn khớp"}</h3>
              <div className={styles.grid}>
                {rest.map((r) => (
                  <UnitCard key={r.unit.id} unit={r.unit} cost={r.cost} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
