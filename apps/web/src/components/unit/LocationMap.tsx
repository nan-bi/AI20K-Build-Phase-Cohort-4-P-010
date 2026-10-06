import { MapPin } from "lucide-react";
import { zoneById, type ZoneId } from "@/lib/units";
import styles from "./LocationMap.module.css";

/** Link đến vị trí thực của tòa trong Maps; không tự vẽ vị trí căn trên sơ đồ minh họa. */
export function LocationMap({ zoneId, building }: { zoneId?: ZoneId; building: string }) {
  const zone = zoneById(zoneId);
  const address = ["Vinhomes Ocean Park", zone?.name, building].filter(Boolean).join(" ");
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return (
    <div className={styles.wrap}>
      <MapPin size={20} aria-hidden="true" />
      <div>
        <strong>{building}{zone ? ` · ${zone.name}` : ""}</strong>
        <p className="muted small">Vinhomes Ocean Park, Gia Lâm, Hà Nội</p>
        <a className="link small" href={href} target="_blank" rel="noreferrer">Xem vị trí tòa trên Google Maps</a>
      </div>
    </div>
  );
}
