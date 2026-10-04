"use client";

import { useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { FilterTray } from "@/components/chat/FilterTray";
import { criteriaChips, emptyCriteria, searchUnits } from "@/lib/mock/matchmaker";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { tenantQueries } from "@/lib/tenant/queries";
import { toUnit } from "@/lib/tenant/adapters";
import { useFavorites } from "@/lib/tenant/favorites";
import { UnitCard } from "./UnitCard";
import styles from "./UnitsBrowser.module.css";

type Sort = "best" | "price" | "area";

/** Trang duyệt toàn bộ căn: lấy từ API A1 tenant:units, lọc All-in Cost và Căn hời client-side. */
export function UnitsBrowser() {
  const { isSaved, count: savedCount } = useFavorites();
  const [criteria, setCriteria] = useState(emptyCriteria);
  const [sort, setSort] = useState<Sort>("best");
  const [onlySaved, setOnlySaved] = useState(false);

  // A1: Catalog công khai từ backend
  const unitsQuery = useApiQuery(tenantQueries.units());

  const { all, holding, list } = useMemo(() => {
    if (unitsQuery.state.status !== "ready") {
      return { all: [], holding: 0, list: [] };
    }
    const rawUnits = unitsQuery.state.data;
    const holdingCount = rawUnits.filter((u) => u.status === "holding").length;
    const adapted = rawUnits.map(toUnit);

    const matches = searchUnits(criteria, (u) => u.baseStatus, adapted);
    let filtered = onlySaved
      ? matches.filter((r) => isSaved(r.unit.code))
      : [...matches];

    if (sort === "price") filtered = [...filtered].sort((a, b) => a.cost.total - b.cost.total);
    if (sort === "area") filtered = [...filtered].sort((a, b) => b.unit.areaM2 - a.unit.areaM2);

    return { all: matches, holding: holdingCount, list: filtered };
  }, [unitsQuery.state, criteria, onlySaved, sort, isSaved]);

  const chips = criteriaChips(criteria);
  const isLoading = unitsQuery.state.status === "loading";
  const isError = unitsQuery.state.status === "error";

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.h1}>Tất cả căn đang mở tại Ocean Park 1</h1>
        <p className="muted">
          {isLoading
            ? "Đang tải dữ liệu căn hộ..."
            : `${all.length} căn đã xác minh, giá hiển thị là All-in Cost mỗi tháng.${holding > 0 ? ` ${holding} căn khác đang được giữ căn.` : ""}`}
        </p>
      </header>

      <div className={styles.bar}>
        <FilterTray criteria={criteria} onChange={setCriteria} />
        <div className={styles.barRight}>
          <button
            type="button"
            className={`${styles.saved} ${onlySaved ? styles.savedOn : ""}`}
            aria-pressed={onlySaved}
            onClick={() => setOnlySaved((v) => !v)}
          >
            <Heart size={15} fill={onlySaved ? "currentColor" : "none"} /> Đã lưu ({savedCount})
          </button>
          <label>
            <span className="sr-only">Sắp xếp</span>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="best">Phù hợp nhất</option>
              <option value="price">All-in thấp đến cao</option>
              <option value="area">Diện tích lớn nhất</option>
            </select>
          </label>
        </div>
      </div>

      {chips.length > 0 && (
        <p className="muted small">
          Đang lọc: {chips.map((c) => c.label).join(" · ")} ·{" "}
          <button type="button" className="link" onClick={() => setCriteria(emptyCriteria())}>
            Xoá bộ lọc
          </button>
        </p>
      )}

      {isLoading ? (
        <div className={styles.empty}>
          <p className="muted">Đang tải danh sách căn hộ từ hệ thống...</p>
        </div>
      ) : isError ? (
        <div className={styles.empty}>
          <h2>Không tải được danh sách căn hộ</h2>
          <p className="muted">
            {unitsQuery.state.status === "error" ? unitsQuery.state.message : "Vui lòng thử lại sau."}
          </p>
          <button type="button" className="btn btn-outline" onClick={unitsQuery.reload} style={{ marginTop: 12 }}>
            Thử lại
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className={styles.empty}>
          <h2>{onlySaved ? "Bạn chưa lưu căn nào" : "Không có căn nào khớp bộ lọc"}</h2>
          <p className="muted">
            {onlySaved ? "Bấm biểu tượng trái tim trên thẻ căn để lưu lại xem sau." : "Thử nâng ngân sách hoặc bớt một điều kiện."}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {list.map((r, i) => (
            <UnitCard key={r.unit.id} unit={r.unit} cost={r.cost} priority={i < 3} />
          ))}
        </div>
      )}
    </div>
  );
}
