"use client";

import { useMemo, useState } from "react";
import { Heart, SlidersHorizontal } from "lucide-react";
import { FilterTray } from "@/components/chat/FilterTray";
import { criteriaChips, emptyCriteria, searchUnits } from "@/lib/tenant/matchmaker";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { tenantQueries } from "@/lib/tenant/queries";
import { toUnit } from "@/lib/tenant/adapters";
import { useFavorites } from "@/lib/tenant/favorites";
import { UnitCard } from "./UnitCard";
import { Button } from "@/components/ui/button";
import styles from "./UnitsBrowser.module.css";

type Sort = "best" | "price" | "area";

/** Trang duyệt danh mục căn thật từ API, lọc theo All-in Cost và trạng thái. */
export function UnitsBrowser() {
  const { isSaved, count: savedCount } = useFavorites();
  const [criteria, setCriteria] = useState(emptyCriteria);
  const [sort, setSort] = useState<Sort>("best");
  const [onlySaved, setOnlySaved] = useState(false);
  const unitsQuery = useApiQuery(tenantQueries.units());

  const { all, holding, list } = useMemo(() => {
    if (unitsQuery.state.status !== "ready") return { all: [], holding: 0, list: [] };
    const rawUnits = unitsQuery.state.data;
    const holdingCount = rawUnits.filter((unit) => unit.status === "holding").length;
    const adapted = rawUnits.map(toUnit);
    const matches = searchUnits(criteria, (unit) => unit.baseStatus, adapted);
    let filtered = onlySaved ? matches.filter((result) => isSaved(result.unit.code)) : [...matches];
    if (sort === "price") filtered = [...filtered].sort((a, b) => a.cost.total - b.cost.total);
    if (sort === "area") filtered = [...filtered].sort((a, b) => b.unit.areaM2 - a.unit.areaM2);
    return { all: matches, holding: holdingCount, list: filtered };
  }, [unitsQuery.state, criteria, onlySaved, sort, isSaved]);

  const chips = criteriaChips(criteria);
  const isLoading = unitsQuery.state.status === "loading";
  const isError = unitsQuery.state.status === "error";

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Danh mục trực tiếp · Ocean Park 1</p>
            <h1 className={styles.heading}>Tìm căn phù hợp với bạn.</h1>
            <p className={styles.subheading}>
              So sánh căn hộ đang mở theo khu vực, diện tích và tổng chi phí mỗi tháng.
              {holding > 0 ? ` ${holding} căn khác đang được giữ.` : ""}
            </p>
          </div>
          <div className={styles.countCard} aria-live="polite">
            <span className={styles.countNumber}>{isLoading ? "—" : all.length}</span>
            <span className={styles.countText}><strong>căn phù hợp</strong><span>từ danh mục hệ thống</span></span>
          </div>
        </header>

        <section className={styles.filterPanel} aria-label="Bộ lọc căn hộ">
          <div className={styles.filterMain}>
            <h2 className={styles.filterTitle}><SlidersHorizontal size={15} style={{ display: "inline", marginRight: 7, verticalAlign: -3 }} />Lọc theo nhu cầu</h2>
            <FilterTray criteria={criteria} onChange={setCriteria} />
          </div>
          <div className={styles.filterActions}>
            <Button
              variant={onlySaved ? "default" : "outline"}
              className={styles.savedButton}
              onClick={() => setOnlySaved((value) => !value)}
              aria-pressed={onlySaved}
            >
              <Heart size={15} className={onlySaved ? "mr-2 fill-current" : "mr-2"} /> Đã lưu ({savedCount})
            </Button>
            <div className={styles.sortWrap}>
              <label className={styles.sortLabel} htmlFor="unit-sort">Sắp xếp căn hộ</label>
              <select id="unit-sort" className={styles.sort} value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                <option value="best">Phù hợp nhất</option>
                <option value="price">All-in thấp đến cao</option>
                <option value="area">Diện tích lớn nhất</option>
              </select>
            </div>
          </div>
        </section>

        <div className={styles.summary}>
          <span>
            {isLoading ? "Đang đồng bộ danh mục căn…" : isError ? "Chưa thể tải danh mục" : `Đang hiển thị ${list.length} / ${all.length} căn phù hợp`}
          </span>
          <span>Giá tháng đã tính tiền thuê và chi phí ước tính.</span>
        </div>

        {chips.length > 0 && (
          <p className={`${styles.summary} ${styles.chips}`}>
            <span>Đang lọc: <strong>{chips.map((chip) => chip.label).join(" · ")}</strong></span>
            <button type="button" className={styles.clearFilters} onClick={() => setCriteria(emptyCriteria())}>Xoá bộ lọc</button>
          </p>
        )}

        {isLoading ? (
          <div className={styles.skeletonGrid} aria-label="Đang tải căn hộ">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeletonCard} />)}
          </div>
        ) : isError ? (
          <section className={styles.state} role="alert">
            <h2 className={styles.stateTitle}>Không tải được danh mục căn</h2>
            <p className={styles.stateText}>{unitsQuery.state.status === "error" ? unitsQuery.state.message : "Vui lòng thử lại sau."}</p>
            <Button variant="outline" onClick={unitsQuery.reload} className="mt-5">Thử tải lại</Button>
          </section>
        ) : list.length === 0 ? (
          <section className={styles.state}>
            <h2 className={styles.stateTitle}>{onlySaved ? "Bạn chưa lưu căn nào" : "Chưa có căn phù hợp với bộ lọc"}</h2>
            <p className={styles.stateText}>
              {onlySaved ? "Chọn biểu tượng trái tim trên một căn để lưu lại." : "Thử tăng ngân sách hoặc bỏ bớt một tiêu chí để xem thêm lựa chọn."}
            </p>
            <Button variant="outline" onClick={() => { setCriteria(emptyCriteria()); setOnlySaved(false); }} className="mt-5">Xem tất cả căn</Button>
          </section>
        ) : (
          <div className={styles.grid}>
            {list.map((result, index) => (
              <UnitCard key={result.unit.id} unit={result.unit} cost={result.cost} priority={index < 3} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
