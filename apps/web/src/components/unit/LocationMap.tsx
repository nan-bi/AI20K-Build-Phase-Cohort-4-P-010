import { MapPin } from "lucide-react";
import { zoneById, type ZoneId } from "@/lib/mock/units";
import styles from "./LocationMap.module.css";

const ZONE_BOX: Record<ZoneId, { x: number; y: number; w: number; h: number; label: string }> = {
  sapphire1: { x: 26, y: 26, w: 128, h: 78, label: "Sapphire 1" },
  sapphire2: { x: 246, y: 26, w: 128, h: 78, label: "Sapphire 2" },
  zenpark: { x: 26, y: 170, w: 110, h: 72, label: "Zenpark" },
  pavilion: { x: 150, y: 190, w: 100, h: 56, label: "Pavilion" },
  masteri: { x: 264, y: 170, w: 110, h: 72, label: "Masteri" },
};

/** Sơ đồ phân khu Ocean Park 1 (minh hoạ, không theo tỷ lệ) với vị trí căn đang xem. */
export function LocationMap({ zoneId, building }: { zoneId: ZoneId; building: string }) {
  const zone = zoneById(zoneId);
  const at = ZONE_BOX[zoneId];
  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 400 268" role="img" aria-label={`Sơ đồ phân khu: căn nằm ở ${zone.name}, toà ${building}`} className={styles.svg}>
        <rect width="400" height="268" rx="16" className={styles.land} />
        <path d="M110 118c30-30 90-38 138-24 38 11 56 32 40 54-18 24-72 30-118 24-48-6-88-24-60-54z" className={styles.lake} />
        <text x="200" y="146" textAnchor="middle" className={styles.lakeLabel}>
          Biển hồ 6,1 ha
        </text>
        {(Object.keys(ZONE_BOX) as ZoneId[]).map((id) => {
          const z = ZONE_BOX[id];
          const on = id === zoneId;
          return (
            <g key={id}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="10" className={on ? styles.zoneOn : styles.zone} />
              <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 4} textAnchor="middle" className={on ? styles.zoneTextOn : styles.zoneText}>
                {z.label}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${at.x + at.w - 16} ${at.y - 6})`}>
          <circle r="13" className={styles.pin} />
          <circle r="4.5" className={styles.pinDot} />
        </g>
      </svg>
      <ul className={styles.near}>
        {zone.nearby.map((n) => (
          <li key={n.label}>
            <MapPin size={14} />
            <span>{n.label}</span>
            <span className="muted">{n.walk}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
