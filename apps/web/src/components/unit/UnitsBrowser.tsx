"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { FilterTray } from "@/components/chat/FilterTray";
import { criteriaChips, emptyCriteria, searchUnits } from "@/lib/mock/matchmaker";
import { unitStatus } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { UNITS } from "@/lib/mock/units";
import { UnitCard } from "./UnitCard";
import styles from "./UnitsBrowser.module.css";

type Sort = "best" | "price" | "area";

/** Trang duyệt toàn bộ căn (không cần chat): bộ lọc giống khung chat, sắp xếp và danh sách đã lưu. */
export function UnitsBrowser() {
  const state = useMock();
  const [criteria, setCriteria] = useState(emptyCriteria);
  const [sort, setSort] = useState<Sort>("best");
  const [onlySaved, setOnlySaved] = useState(false);

  const all = searchUnits(criteria, (u) => unitStatus(state, u));
  let list = onlySaved ? all.filter((r) => state.favorites.includes(r.unit.id)) : [...all];
  if (sort === "price") list = [...list].sort((a, b) => a.cost.total - b.cost.total);
  if (sort === "area") list = [...list].sort((a, b) => b.unit.areaM2 - a.unit.areaM2);

  const chips = criteriaChips(criteria);
  const holding = UNITS.filter((u) => unitStatus(state, u) === "holding").length;

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.h1}>Tất cả căn đang mở tại Ocean Park 1</h1>
        <p className="muted">
          {all.length} căn đã xác minh, giá hiển thị là All-in Cost mỗi tháng.{holding > 0 ? ` ${holding} căn khác đang được giữ căn.` : ""}
        </p>
      </header>

      <div className={styles.bar}>
        <FilterTray criteria={criteria} onChange={setCriteria} />
        <div className={styles.barRight}>
          <button type="button" className={`${styles.saved} ${onlySaved ? styles.savedOn : ""}`} aria-pressed={onlySaved} onClick={() => setOnlySaved((v) => !v)}>
            <Heart size={15} fill={onlySaved ? "currentColor" : "none"} /> Đã lưu ({state.favorites.length})
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

      {list.length === 0 ? (
        <div className={styles.empty}>
          <h2>{onlySaved ? "Bạn chưa lưu căn nào" : "Không có căn nào khớp bộ lọc"}</h2>
          <p className="muted">{onlySaved ? "Bấm biểu tượng trái tim trên thẻ căn để lưu lại xem sau." : "Thử nâng ngân sách hoặc bớt một điều kiện."}</p>
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
