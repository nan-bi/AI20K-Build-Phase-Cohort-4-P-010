"use client";

import Link from "next/link";
import { useState } from "react";
import { Bath, BedDouble, Building2, CalendarPlus, Check, Compass, Layers, LockKeyhole, MessageCircle, Minus, Plus, Ruler, Share2, ShieldCheck, Sofa, Users } from "lucide-react";
import { BookingSheet } from "@/components/booking/BookingSheet";
import { toast } from "@/components/ui/Toast";
import { allInCost, DEFAULT_HOUSEHOLD, isBargain, RATES, savingsPct, type Household } from "@/lib/pricing/cost";
import { vnd, vndShort } from "@/lib/format";
import { HOUSE_RULES } from "@/lib/legal/house-rules";
import {
  FURNISHING_LABEL,
  ITEM_LABEL,
  PASSPORT_ITEMS,
  unitAddress,
  zoneById,
  type Unit,
} from "@/lib/units";
import { AllInBar } from "./AllInBar";
import { FavoriteButton } from "./FavoriteButton";
import { Gallery } from "./Gallery";
import { LocationMap } from "./LocationMap";
import { UnitBadges } from "./UnitBadges";
import { similarUnits, useCatalog } from "@/lib/tenant/catalog";
import { UnitCard } from "./UnitCard";
import { useRouter } from "next/navigation";
import { refreshSession, useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const BUILDING_PERKS = ["Bảo vệ 24/7", "Thang máy quẹt thẻ cư dân", "Hầm gửi xe máy và ô tô", "Công viên và biển hồ nội khu", "Hồ bơi, phòng gym (tuỳ toà)", "Vinmart và phố đi bộ dưới chân toà"];

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full shadow-sm"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`Giảm ${label.toLowerCase()}`}
        >
          <Minus size={14} />
        </Button>
        <span className="w-4 text-center font-medium font-mono text-sm">{value}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full shadow-sm"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`Tăng ${label.toLowerCase()}`}
        >
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
}

export function UnitDetail({ unit, autoOpenBooking }: { unit: Unit; autoOpenBooking: boolean }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const zone = zoneById(unit.zoneId);
  const zoneName = unit.zoneName || zone?.name || "Phân khu chưa cập nhật";
  const status = unit.baseStatus;
  const [hh, setHh] = useState<Household>(DEFAULT_HOUSEHOLD);
  const isTenant = user?.portal === "tenant";
  const [manualBooking, setManualBooking] = useState(false);
  const [dismissAutoBooking, setDismissAutoBooking] = useState(false);
  const booking = manualBooking || (autoOpenBooking && ready && isTenant && !dismissAutoBooking);
  const loginHref = `/login?next=${encodeURIComponent(`/units/${unit.code || unit.id}?book=1`)}`;

  const cost = allInCost(unit, hh);
  const sv = savingsPct(unit);
  const bookable = status === "available";
  const holdHours = (unit as Unit & { holdHours?: number }).holdHours ?? 48;
  const catalog = useCatalog(status !== "available");
  const similar = similarUnits(catalog.units, unit, 3);

  const handleOpenBooking = async () => {
    const session = ready ? { user } : await refreshSession();
    if (session.user?.portal !== "tenant") {
      router.push(loginHref);
      return;
    }
    setManualBooking(true);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: unitAddress(unit), url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Đã sao chép liên kết căn hộ", "success");
      }
    } catch {}
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
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 md:py-10 flex flex-col gap-8 pb-32 md:pb-12">
      <nav className="text-sm font-medium text-muted-foreground flex items-center flex-wrap gap-2" aria-label="Đường dẫn">
        <Link href="/" className="hover:text-foreground transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link href="/units" className="hover:text-foreground transition-colors">Tìm căn</Link>
        <span>/</span>
        <span className="text-foreground">{zoneName}</span>
      </nav>

      <Gallery unit={unit} />

      <div className="flex flex-col lg:flex-row gap-12 relative items-start">
        <div className="flex-1 flex flex-col gap-12 min-w-0 w-full">
          {/* Header */}
          <header className="flex flex-col gap-4 border-b border-border pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <UnitBadges unit={unit} />
              <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 shadow-none font-medium gap-1">
                <ShieldCheck size={14} /> Đã xác minh
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  {unitAddress(unit)}
                </h1>
                <p className="text-base text-muted-foreground font-medium">
                  {zoneName} · {unit.view} · mã {unit.code}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <FavoriteButton unitId={unit.id} variant="plain" className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted" />
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-sm" aria-label="Chia sẻ căn hộ" onClick={share}>
                  <Share2 size={18} />
                </Button>
              </div>
            </div>
          </header>

          {/* Stats Grid */}
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/30 border border-border/50 text-center">
                <Icon size={24} className="text-foreground/70" strokeWidth={1.5} />
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <strong className="text-sm text-foreground">{value}</strong>
                </div>
              </li>
            ))}
          </ul>

          {/* Description */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Giới thiệu căn hộ</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {unit.title}. {unit.description}
            </p>
          </section>

          {/* All-in Cost Configurator */}
          <section className="space-y-6" aria-labelledby="allin">
            <h2 id="allin" className="text-2xl font-bold tracking-tight text-foreground">Chi phí mỗi tháng (All-in Cost)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card border border-border p-6 rounded-3xl shadow-sm">
              <div className="flex flex-col gap-6">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl font-black font-mono tracking-tight text-foreground">{vnd(cost.total)}</span>
                  <span className="text-base font-medium text-muted-foreground">đ/tháng</span>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl">
                  <AllInBar cost={cost} variant="table" />
                </div>
                {isBargain(unit) && (
                  <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 p-4 rounded-xl border border-amber-500/20 text-sm font-medium">
                    Giá thuê {vndShort(unit.rent)} thấp hơn giá trung bình toà {vndShort(unit.marketAvg)} cùng layout: rẻ hơn {sv}%.
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <div className="bg-muted/20 p-5 rounded-2xl border border-border/50 h-full flex flex-col">
                  <h3 className="text-base font-semibold mb-4 text-foreground">Tính theo hộ của bạn</h3>
                  <div className="flex flex-col gap-1 mb-6 flex-1">
                    <Stepper label="Số người ở" value={hh.persons} min={1} max={6} onChange={(n) => setHh({ ...hh, persons: n })} />
                    <Stepper label="Xe máy" value={hh.motorbikes} min={0} max={4} onChange={(n) => setHh({ ...hh, motorbikes: n })} />
                    <Stepper label="Ô tô" value={hh.cars} min={0} max={2} onChange={(n) => setHh({ ...hh, cars: n })} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-auto pt-4 border-t border-border/50">
                    Phí quản lý theo hồ sơ căn: {vnd(cost.mgmt)}đ/tháng · xe máy {vndShort(RATES.motorbike)} · ô tô {vndShort(RATES.car)} · điện nước {vndShort(RATES.utilityPerPerson)}/người.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Amenities & Perks */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Nội thất và tiện nghi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {unit.items.map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 rounded-full p-1 text-emerald-600">
                    <Check size={14} strokeWidth={2.5} />
                  </div>
                  <span className="text-foreground font-medium">{ITEM_LABEL[i]}</span>
                </div>
              ))}
              {unit.petFriendly && (
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 rounded-full p-1 text-emerald-600">
                    <Check size={14} strokeWidth={2.5} />
                  </div>
                  <span className="text-foreground font-medium">Cho nuôi thú cưng nhỏ</span>
                </div>
              )}
            </div>

            <Separator className="my-8" />

            <h3 className="text-xl font-bold tracking-tight text-foreground">Tiện ích toà nhà</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
              {BUILDING_PERKS.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <div className="bg-muted rounded-full p-1.5 text-foreground/70">
                    <Building2 size={14} />
                  </div>
                  <span className="text-foreground font-medium">{p}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Handover Passport */}
          <section className="space-y-6 bg-zinc-950 text-zinc-50 p-8 rounded-3xl">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Hộ chiếu bàn giao số</h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
                Lúc nhận nhà, Field Host và bạn cùng chụp ảnh có dấu thời gian cho 10 hạng mục dưới đây. Đây là căn cứ đối soát khi trả phòng: hao mòn tự nhiên không bị trừ cọc.
              </p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-4">
              {PASSPORT_ITEMS.map((p, i) => (
                <li key={p} className="flex items-center gap-3 text-zinc-300">
                  <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-900 w-6 h-6 flex items-center justify-center rounded-md shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-medium text-sm">{p}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Map Location */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Vị trí trong Ocean Park 1</h2>
            <div className="rounded-3xl overflow-hidden border border-border bg-card">
              <LocationMap zoneId={unit.zoneId} building={unit.building} />
            </div>
          </section>

          {/* Rental Terms */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Điều khoản thuê</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-3xl border border-border/50">
              <div className="flex flex-col gap-1.5">
                <dt className="font-semibold text-foreground">Kỳ hạn tối thiểu</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">{unit.minMonths} tháng</dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="font-semibold text-foreground">Tiền cọc bảo đảm</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">Tương đương 1 tháng tiền thuê ({vnd(unit.rent)}đ), giữ nguyên suốt kỳ thuê</dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="font-semibold text-foreground">Cọc giữ chỗ</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">{vnd(RATES.holdingDeposit)}đ, Căn được giữ riêng cho bạn {holdHours} giờ kể từ khi ngân hàng báo có, chuyển 100% vào tiền cọc bảo đảm, không trừ vào tiền thuê tháng đầu</dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="font-semibold text-foreground">Nếu không ký hợp đồng</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">Không ký trong {holdHours} giờ vì lý do cá nhân thì xử lý cọc theo Điều 328 BLDS (50% bù chủ nhà, 50% phí vận hành). Nếu chủ nhà bẻ cọc đền gấp đôi, bất khả kháng hoàn 100% trong 24 giờ làm việc</dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="font-semibold text-foreground">Nội quy BQL</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">Yên tĩnh sau 22:00 · vi phạm bị BQL phạt sẽ trừ vào cọc bảo đảm · đăng ký tạm trú khi vào ở</dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="font-semibold text-foreground">Sửa chữa</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">VinStay chỉ giới thiệu danh bạ thợ ngoài uy tín, bạn và thợ tự thoả thuận giá</dd>
              </div>
            </dl>
          </section>

          {/* House Rules */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Nội quy căn hộ</h2>
            <dl className="flex flex-col gap-6">
              {HOUSE_RULES.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-1.5 pb-6 border-b border-border/50 last:border-0">
                  <dt className="font-semibold text-foreground text-lg">{rule.title}</dt>
                  <dd className="text-muted-foreground text-base leading-relaxed">{rule.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Field Host Info */}
          <section className="flex flex-col sm:flex-row items-start gap-6 bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-3xl mt-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">Field Host nội khu {zone?.short || zoneName} đón bạn tại sảnh</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Host có thẻ cư dân thang máy, được điều phối tự động và nhận lịch trong ≤ 3 phút; sau khi đặt lịch bạn sẽ thấy tên Host phụ trách. Số điện thoại chủ nhà được ẩn; mọi liên lạc đi qua Zalo VinStay.
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar Sticky Booking Card */}
        <aside className="w-full lg:w-[380px] shrink-0 sticky top-24" aria-label="Đặt lịch xem phòng">
          <Card className="flex flex-col p-6 gap-6 bg-card border-border shadow-xl rounded-3xl">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2 flex-wrap pb-4 border-b border-border/50">
                <span className="text-3xl font-black font-mono tracking-tight text-foreground">{vnd(cost.total)}</span>
                <span className="text-sm font-medium text-muted-foreground">đ/tháng · All-in</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed pt-2">
                Thuê {vndShort(unit.rent)} + phí {vndShort(cost.total - unit.rent)} cho {hh.persons} người, {hh.motorbikes} xe máy
                {hh.cars ? `, ${hh.cars} ô tô` : ""}.
              </p>
            </div>

            {bookable ? (
              <div className="flex flex-col gap-4">
                <Button size="lg" className="w-full h-14 rounded-xl text-base shadow-md font-semibold" onClick={handleOpenBooking}>
                  <CalendarPlus size={20} className="mr-2" /> Đặt lịch xem phòng
                </Button>
                <Button variant="outline" size="lg" className="w-full h-12 rounded-xl text-sm font-medium" render={<Link href="/" />}>
                  <MessageCircle size={18} className="mr-2" /> Hỏi AI thêm về căn này
                </Button>

                <Separator className="my-2" />

                <ul className="flex flex-col gap-3">
                  <li className="flex items-start gap-3">
                    <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" strokeWidth={3} />
                    <span className="text-sm text-muted-foreground font-medium">Xem phòng miễn phí, Host đón tại sảnh</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" strokeWidth={3} />
                    <span className="text-sm text-muted-foreground font-medium">Chỉ cọc 2.000.000đ khi bạn ưng ý</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" strokeWidth={3} />
                    <span className="text-sm text-muted-foreground font-medium">Mã cửa chỉ hiện đúng lúc đứng trước phòng</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-4 py-4 bg-muted/30 rounded-2xl border border-border/50">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                  <LockKeyhole size={24} />
                </div>
                <div className="space-y-2 px-4">
                  <strong className="text-foreground font-semibold block">
                    {status === "holding" ? `Căn đang được giữ chỗ (${holdHours} giờ)` : "Căn đã cho thuê"}
                  </strong>
                  <p className="text-sm text-muted-foreground leading-relaxed">Không nhận thêm lịch xem. Xem các căn tương đương bên dưới hoặc hỏi VinStay AI để được gợi ý.</p>
                </div>
              </div>
            )}
          </Card>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-8 pt-12 border-t border-border" aria-label="Căn tương tự">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-8">Căn tương tự cùng layout</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {similar.map((u) => (
              <UnitCard key={u.id} unit={u} cost={allInCost(u, hh)} />
            ))}
          </div>
        </section>
      )}

      {bookable && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border shadow-2xl z-40 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <strong className="font-mono text-xl font-bold text-foreground">{vnd(cost.total)}đ</strong>
            </div>
            <span className="text-xs font-medium text-muted-foreground">/tháng · All-in</span>
          </div>
          <Button size="lg" className="flex-1 rounded-xl shadow-md font-semibold" onClick={handleOpenBooking}>
            Đặt lịch xem
          </Button>
        </div>
      )}

      <BookingSheet unit={unit} open={booking} onClose={() => { setManualBooking(false); setDismissAutoBooking(true); }} />
    </div>
  );
}
