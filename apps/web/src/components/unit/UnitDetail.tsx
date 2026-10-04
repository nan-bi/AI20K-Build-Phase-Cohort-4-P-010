"use client";

import Link from "next/link";
import { useState } from "react";
import { Bath, BedDouble, Building2, CalendarPlus, Check, Compass, Layers, LockKeyhole, MessageCircle, Minus, Plus, Ruler, Share2, ShieldCheck, Sofa, Users } from "lucide-react";
import { BookingSheet } from "@/components/booking/BookingSheet";
import { toast } from "@/components/ui/Toast";
import { allInCost, DEFAULT_HOUSEHOLD, isBargain, RATES, savingsPct, type Household } from "@/lib/mock/cost";
import { vnd, vndShort } from "@/lib/mock/format";
import { HOUSE_RULES } from "@/lib/mock/house-rules";
import {
  FURNISHING_LABEL,
  ITEM_LABEL,
  PASSPORT_ITEMS,
  unitAddress,
  zoneById,
  type Unit,
} from "@/lib/mock/units";
import { AllInBar } from "./AllInBar";
import { FavoriteButton } from "./FavoriteButton";
import { Gallery } from "./Gallery";
import { LocationMap } from "./LocationMap";
import { UnitBadges } from "./UnitBadges";
import { similarUnits, useCatalog } from "@/lib/tenant/catalog";
import { UnitCard } from "./UnitCard";
import styles from "./UnitDetail.module.css";

const BUILDING_PERKS = ["Bảo vệ 24/7", "Thang máy quẹt thẻ cư dân", "Hầm gửi xe máy và ô tô", "Công viên và biển hồ nội khu", "Hồ bơi, phòng gym (tuỳ toà)", "Vinmart và phố đi bộ dưới chân toà"];

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className={styles.step}>
      <span>{label}</span>
      <div>
        <button type="button" className="icon-btn" aria-label={`Giảm ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus size={15} />
        </button>
        <b className="num">{value}</b>
        <button type="button" className="icon-btn" aria-label={`Tăng ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";

export function UnitDetail({ unit, autoOpenBooking }: { unit: Unit; autoOpenBooking: boolean }) {
  const { user } = useSession();
  const router = useRouter();
  const zone = zoneById(unit.zoneId);
  const status = unit.baseStatus;
  const [hh, setHh] = useState<Household>(DEFAULT_HOUSEHOLD);
  const isTenant = user?.portal === "tenant";
  const [booking, setBooking] = useState(autoOpenBooking && isTenant);
  const cost = allInCost(unit, hh);
  const sv = savingsPct(unit);
  const bookable = status === "available";
  const holdHours = (unit as Unit & { holdHours?: number }).holdHours ?? 48;
  // Chỉ cần danh sách căn để gợi ý căn thay thế khi căn này đã bị giữ chỗ / cho thuê; căn còn trống thì không tải.
  const catalog = useCatalog(status !== "available");
  const similar = similarUnits(catalog.units, unit, 3);

  const handleOpenBooking = () => {
    if (!user || user.portal !== "tenant") {
      router.push(`/login?next=/units/${encodeURIComponent(unit.code || unit.id)}?book=1`);
      return;
    }
    setBooking(true);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: unitAddress(unit), url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Đã sao chép liên kết căn hộ", "success");
      }
    } catch {
      /* người dùng đóng hộp thoại chia sẻ */
    }
  };

  const stats = [
    { icon: Ruler, label: "Diện tích", value: `${unit.areaM2} m²` },
    { icon: BedDouble, label: "Phòng ngủ", value: unit.layoutLabel },
    { icon: Bath, label: "Vệ sinh", value: `${unit.bathrooms} WC` },
    { icon: Compass, label: "Hướng", value: unit.direction },
    { icon: Layers, label: "Tầng", value: `Tầng ${unit.floor}` },
    { icon: Sofa, label: "Nội thất", value: FURNISHING_LABEL[unit.furnishing] },
  ];

  return (
    <div className={`wrap ${styles.page}`}>
      <nav className={`small muted ${styles.crumbs}`} aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link> / <Link href="/units">Tìm căn</Link> / <span>{zone.name}</span>
      </nav>

      <Gallery unit={unit} />

      <div className={styles.grid}>
        <div className={styles.main}>
          <header className={styles.head}>
            <div className={styles.badges}>
              <UnitBadges unit={unit} />
              <span className="badge badge-kelp">
                <ShieldCheck size={12} /> Đã xác minh
              </span>
            </div>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.h1}>{unitAddress(unit)}</h1>
                <p className="muted">
                  {zone.name} · {unit.view} · mã {unit.code}
                </p>
              </div>
              <div className={styles.headActions}>
                <FavoriteButton unitId={unit.id} variant="plain" />
                <button type="button" className="icon-btn" aria-label="Chia sẻ căn hộ" onClick={share}>
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </header>

          <ul className={styles.stats}>
            {stats.map(({ icon: Icon, label, value }) => (
              <li key={label}>
                <Icon size={18} />
                <span className="muted xs">{label}</span>
                <b>{value}</b>
              </li>
            ))}
          </ul>

          <section className={styles.block}>
            <h2>Giới thiệu căn hộ</h2>
            <p>{unit.title}. {unit.description}</p>
          </section>

          <section className={styles.block} aria-labelledby="allin">
            <h2 id="allin">Chi phí mỗi tháng (All-in Cost)</h2>
            <div className={styles.cost}>
              <div>
                <div className={styles.costTotal}>
                  <span className={`num ${styles.costNum}`}>{vnd(cost.total)}</span>
                  <span className="muted">đ/tháng</span>
                </div>
                <AllInBar cost={cost} variant="table" />
                {isBargain(unit) && (
                  <p className={`small ${styles.deal}`}>
                    Giá thuê {vndShort(unit.rent)} thấp hơn giá trung bình toà {vndShort(unit.marketAvg)} cùng layout: rẻ hơn {sv}%.
                  </p>
                )}
              </div>
              <div className={styles.steppers}>
                <p className="label">Tính theo hộ của bạn</p>
                <Stepper label="Số người ở" value={hh.persons} min={1} max={6} onChange={(n) => setHh({ ...hh, persons: n })} />
                <Stepper label="Xe máy" value={hh.motorbikes} min={0} max={4} onChange={(n) => setHh({ ...hh, motorbikes: n })} />
                <Stepper label="Ô tô" value={hh.cars} min={0} max={2} onChange={(n) => setHh({ ...hh, cars: n })} />
                <p className="muted xs">
                  Phí quản lý {vnd(RATES.mgmtPerM2)}đ/m² · xe máy {vndShort(RATES.motorbike)} · ô tô {vndShort(RATES.car)} · điện nước {vndShort(RATES.utilityPerPerson)}/người.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.block}>
            <h2>Nội thất và tiện nghi</h2>
            <ul className={styles.items}>
              {unit.items.map((i) => (
                <li key={i}>
                  <Check size={16} /> {ITEM_LABEL[i]}
                </li>
              ))}
              {unit.petFriendly && (
                <li>
                  <Check size={16} /> Cho nuôi thú cưng nhỏ
                </li>
              )}
            </ul>
            <h3>Tiện ích toà nhà</h3>
            <ul className={`${styles.items} ${styles.perks}`}>
              {BUILDING_PERKS.map((p) => (
                <li key={p}>
                  <Building2 size={15} /> {p}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.block}>
            <h2>Hộ chiếu bàn giao số</h2>
            <p className="muted">
              Lúc nhận nhà, Field Host và bạn cùng chụp ảnh có dấu thời gian cho 10 hạng mục dưới đây. Đây là căn cứ đối soát khi trả phòng: hao mòn tự nhiên không bị trừ cọc.
            </p>
            <ul className={styles.passport}>
              {PASSPORT_ITEMS.map((p, i) => (
                <li key={p}>
                  <span className="num">{i + 1}</span> {p}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.block}>
            <h2>Vị trí trong Ocean Park 1</h2>
            <LocationMap zoneId={unit.zoneId} building={unit.building} />
            <a className="link small" href="https://www.google.com/maps/search/?api=1&query=Vinhomes+Ocean+Park+Gia+Lam" target="_blank" rel="noreferrer">
              Mở Google Maps
            </a>
          </section>

          <section className={styles.block}>
            <h2>Điều khoản thuê</h2>
            <dl className={styles.terms}>
              <div>
                <dt>Kỳ hạn tối thiểu</dt>
                <dd>{unit.minMonths} tháng</dd>
              </div>
              <div>
                <dt>Tiền cọc bảo đảm</dt>
                <dd>Tương đương 1 tháng tiền thuê ({vnd(unit.rent)}đ), giữ nguyên suốt kỳ thuê</dd>
              </div>
              <div>
                <dt>Cọc giữ chỗ</dt>
                <dd>{vnd(RATES.holdingDeposit)}đ, Căn được giữ riêng cho bạn {holdHours} giờ kể từ khi ngân hàng báo có, chuyển 100% vào tiền cọc bảo đảm, không trừ vào tiền thuê tháng đầu</dd>
              </div>
              <div>
                <dt>Nếu không ký hợp đồng</dt>
                <dd>Không ký trong {holdHours} giờ vì lý do cá nhân thì xử lý cọc theo Điều 328 BLDS (50% bù chủ nhà, 50% phí vận hành). Nếu chủ nhà bẻ cọc đền gấp đôi, bất khả kháng hoàn 100% trong 24 giờ làm việc</dd>
              </div>
              <div>
                <dt>Nội quy BQL</dt>
                <dd>Yên tĩnh sau 22:00 · vi phạm bị BQL phạt sẽ trừ vào cọc bảo đảm · đăng ký tạm trú khi vào ở</dd>
              </div>
              <div>
                <dt>Sửa chữa</dt>
                <dd>VinStay chỉ giới thiệu danh bạ thợ ngoài uy tín, bạn và thợ tự thoả thuận giá</dd>
              </div>
            </dl>
          </section>

          <section className={styles.block}>
            <h2>Nội quy căn hộ</h2>
            <dl className={styles.terms}>
              {HOUSE_RULES.map((rule) => (
                <div key={rule.id}>
                  <dt>{rule.title}</dt>
                  <dd>{rule.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={`${styles.block} ${styles.hostCard}`}>
            <span className={styles.hostAvatar}>
              <Users size={18} />
            </span>
            <div>
              <h2>Field Host nội khu {zone.short} đón bạn tại sảnh</h2>
              <p className="muted">
                Host có thẻ cư dân thang máy, được điều phối tự động và nhận lịch trong ≤ 3 phút; sau khi đặt lịch bạn sẽ thấy tên Host phụ trách. Số điện thoại chủ nhà được ẩn; mọi liên lạc đi qua Zalo VinStay.
              </p>
            </div>
          </section>
        </div>

        <aside className={styles.side} aria-label="Đặt lịch xem phòng">
          <div className={`card ${styles.book}`}>
            <div className={styles.bookPrice}>
              <span className={`num ${styles.bookNum}`}>{vnd(cost.total)}</span>
              <span className="muted small">đ/tháng · All-in</span>
            </div>
            <p className="muted small">
              Thuê {vndShort(unit.rent)} + phí {vndShort(cost.total - unit.rent)} cho {hh.persons} người, {hh.motorbikes} xe máy
              {hh.cars ? `, ${hh.cars} ô tô` : ""}.
            </p>

            {bookable ? (
              <>
                <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleOpenBooking}>
                  <CalendarPlus size={19} /> Đặt lịch xem phòng
                </button>
                <Link href="/" className="btn btn-quiet btn-block">
                  <MessageCircle size={17} /> Hỏi AI thêm về căn này
                </Link>
                <ul className={styles.promises}>
                  <li>
                    <Check size={15} /> Xem phòng miễn phí, Host đón tại sảnh
                  </li>
                  <li>
                    <Check size={15} /> Chỉ cọc 2.000.000đ khi bạn ưng ý
                  </li>
                  <li>
                    <Check size={15} /> Mã cửa chỉ hiện đúng lúc đứng trước phòng
                  </li>
                </ul>
              </>
            ) : (
              <div className={styles.taken}>
                <LockKeyhole size={20} />
                <div>
                  <b>{status === "holding" ? `Căn đang được giữ chỗ (${holdHours} giờ)` : "Căn đã cho thuê"}</b>
                  <p className="muted small">Không nhận thêm lịch xem. Xem các căn tương đương bên dưới hoặc hỏi VinStay AI để được gợi ý.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className={styles.similar} aria-label="Căn tương tự">
          <h2>Căn tương tự cùng layout</h2>
          <div className={styles.similarGrid}>
            {similar.map((u) => (
              <UnitCard key={u.id} unit={u} cost={allInCost(u, hh)} />
            ))}
          </div>
        </section>
      )}

      {bookable && (
        <div className={`${styles.bar} no-print`}>
          <div>
            <b className="num">{vnd(cost.total)}đ</b>
            <span className="muted xs"> /tháng · All-in</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setBooking(true)}>
            Đặt lịch xem
          </button>
        </div>
      )}

      <BookingSheet unit={unit} open={booking} onClose={() => setBooking(false)} />
    </div>
  );
}
