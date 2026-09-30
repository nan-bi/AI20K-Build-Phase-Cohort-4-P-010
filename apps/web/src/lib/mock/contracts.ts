import { maskPhone, normalizePhone } from "./format";
import type { MockState } from "./types";
import { HOSTS, LANDLORDS, landlordById, unitAddress, unitById, UNITS, ZONES } from "./units";
import { type HoldOutcome, holdOutcome } from "./selectors";

export type ContractKind = "mandate" | "holding" | "lease" | "partnership";

export type ContractStatus =
  | "pending_inspection" // mandate: đã ký OTP uỷ quyền, hồ sơ ký gửi chưa được Admin chốt
  | "active"             // mandate đang hiệu lực | lease đang hiệu lực (> 30 ngày tới hết hạn) | partnership
  | "exiting"            // mandate: đang đếm ngược 15 ngày
  | "exit_due"           // mandate: now ≥ exitEffectiveAt, chờ Admin hoàn tất offboard
  | "ended"              // mandate: đã offboard | lease: now ≥ endAt
  | "void"               // mandate bị từ chối | holding bị Admin huỷ cọc
  | "awaiting_sign"      // holding: đã nhận 2tr, chưa ký thoả thuận, còn hạn
  | "holding"            // holding: đã ký thoả thuận, chưa ký HĐ thuê, còn hạn
  | "converted"          // holding: đã chuyển 100% vào Tiền cọc bảo đảm của HĐ thuê
  | "expired"            // holding: hết hạn/khép lịch mà không ký HĐ thuê
  | "expiring";          // lease: 0 < endAt − now ≤ 30 ngày

export interface ContractParty {
  role: "landlord" | "tenant" | "host" | "platform";
  id?: string;          // landlordId | tenantPartyId(phone) | hostId ; platform bỏ trống
  name: string;
  phoneMasked?: string; // luôn qua maskPhone(); platform bỏ trống
}

export interface ContractEvent {
  label: string;
  at?: string;
  done: boolean;
}

export interface ContractRow {
  key: string;              // `${kind}.${sourceId}` — sourceId: unitId | consignmentId (mandate), bookingId (holding, lease), hostId (partnership)
  kind: ContractKind;
  docId: string;
  status: ContractStatus;
  unitLabel: string;        // unitAddress(unit) | `${building} · Tầng ${floor} · Căn ${door}` (consignment) | "Phân khu ..." (partnership)
  unitId?: string;          // chỉ khi thuộc catalog UNITS
  consignmentId?: string;
  bookingId?: string;
  landlordId?: string;      // tuỳ chọn (partnership không có)
  hostId?: string;          // holding/lease = booking.hostId (Host phụ trách) · partnership = host.id
  parties: ContractParty[]; // mandate: [landlord, platform] · holding: [tenant, platform, landlord] · lease: [landlord, tenant] · partnership: [host, platform]
  signedAt?: string;
  startAt?: string;
  endAt?: string;           // mandate exiting/exit_due: exitEffectiveAt · mandate ended: endedAt · holding: deposit.expiresAt · lease: leaseEndAt()
  amount?: number;          // holding: deposit.amount (2_000_000) · lease: lease.rent (tiền thuê/tháng, tháng đầu KHÔNG trừ 2tr)
  securityDeposit?: number; // chỉ lease: = lease.rent (1 tháng, ĐÃ GỒM 2_000_000 chuyển đổi)
  needsAction: boolean;     // status === "exit_due" || (status === "expiring" && !lease.renewalRemindedAt)
  holdHours?: number;       // MỚI (SPEC-P01 §8)
  outcome?: HoldOutcome;    // MỚI (SPEC-P01 §8)
  ownershipWarrantedAt?: string; // MỚI mandate từ consignment (SPEC-P03 §4)
}

export const LEASE_EXPIRING_DAYS = 30;

export const LIVE_STATUSES: ContractStatus[] = [
  "pending_inspection",
  "active",
  "exiting",
  "exit_due",
  "awaiting_sign",
  "holding",
  "expiring",
];

export type PartyRole = "landlord" | "tenant" | "host";
export type PartyRelation = "signatory" | "handler"; // bên ký | Host phụ trách

export interface PartySummary {
  key: string;            // `${role}.${id}`
  role: PartyRole;
  id: string;
  name: string;
  phoneMasked?: string;
  total: number;          // số HĐ liên quan (cả signatory lẫn handler)
  live: number;           // status ∈ LIVE_STATUSES
  needsAction: number;
}

/**
 * FNV-1a 32-bit hash số điện thoại đã chuẩn hoá thành id định danh khách thuê bảo mật.
 */
export function tenantPartyId(phone: string): string {
  const norm = normalizePhone(phone);
  let hash = 0x811c9dc5;
  for (let i = 0; i < norm.length; i++) {
    hash ^= norm.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const unsigned = hash >>> 0;
  return "T" + unsigned.toString(36);
}

/**
 * Cộng số tháng lịch vào ngày bắt đầu, kẹp ngày về cuối tháng của tháng đích (vd: 31/01 + 1 tháng = 28 hoặc 29/02).
 */
export function leaseEndAt(startDate: string, months: number): string {
  const d = new Date(startDate);
  const targetYear = d.getUTCFullYear();
  const targetMonth = d.getUTCMonth() + months;
  const originalDate = d.getUTCDate();

  // Tìm ngày cuối cùng của tháng đích
  const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const finalDate = Math.min(originalDate, daysInMonth);

  const res = new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      finalDate,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds()
    )
  );
  return res.toISOString();
}

/**
 * Hàm thuần tính toán toàn bộ danh sách hợp đồng dẫn xuất từ MockState.
 * Thứ tự: needsAction trước, sau đó signedAt giảm dần (thiếu signedAt xếp cuối).
 */
export function contractRows(state: MockState, now: number): ContractRow[] {
  const rows: ContractRow[] = [];

  // 1. Mandates từ danh mục UNITS
  for (const u of UNITS) {
    const m = state.mandates[u.id];
    if (!m) continue;

    let status: ContractStatus = "active";
    if (m.status === "ended") {
      status = "ended";
    } else if (m.status === "exiting") {
      const effectiveMs = m.exitEffectiveAt ? Date.parse(m.exitEffectiveAt) : 0;
      status = now >= effectiveMs ? "exit_due" : "exiting";
    }

    const landlord = landlordById(u.landlordId);
    const parties: ContractParty[] = [
      {
        role: "landlord",
        id: landlord?.id ?? u.landlordId,
        name: landlord?.name ?? "Chủ nhà",
        phoneMasked: landlord?.phone ? maskPhone(landlord.phone) : undefined,
      },
      { role: "platform", name: "VinStay AI" },
    ];

    const endAt =
      m.status === "ended"
        ? m.endedAt
        : m.status === "exiting"
          ? m.exitEffectiveAt
          : undefined;

    rows.push({
      key: `mandate.${u.id}`,
      kind: "mandate",
      docId: `UQ-${u.code.replace(/^VHOP-/, "")}`,
      status,
      unitLabel: unitAddress(u),
      unitId: u.id,
      landlordId: u.landlordId,
      parties,
      signedAt: m.signedAt,
      startAt: m.signedAt,
      endAt,
      needsAction: status === "exit_due",
    });
  }

  // 2. Mandates từ Consignments
  for (const c of state.consignments) {
    if (c.status === "draft") continue;

    let status: ContractStatus = "pending_inspection";
    if (c.status === "approved") {
      status = "active";
    } else if (c.status === "rejected") {
      status = "void";
    }

    const landlord = landlordById(c.landlordId);
    const parties: ContractParty[] = [
      {
        role: "landlord",
        id: landlord?.id ?? c.landlordId,
        name: landlord?.name ?? "Chủ nhà",
        phoneMasked: landlord?.phone ? maskPhone(landlord.phone) : undefined,
      },
      { role: "platform", name: "VinStay AI" },
    ];

    rows.push({
      key: `mandate.${c.id}`,
      kind: "mandate",
      docId: `UQ-${c.id.toUpperCase()}`,
      status,
      unitLabel: `${c.building} · Tầng ${c.floor} · Căn ${c.door}`,
      consignmentId: c.id,
      landlordId: c.landlordId,
      parties,
      signedAt: c.signedAt,
      startAt: c.signedAt,
      needsAction: false,
      ownershipWarrantedAt: c.ownershipWarrantedAt,
    });
  }

  // 3. Holding deposits từ Bookings
  for (const b of state.bookings) {
    if (!b.deposit?.paidAt) continue;

    const outcome = holdOutcome(b, now);
    let status: ContractStatus = "holding";
    if (outcome.kind === "converted") {
      status = "converted";
    } else if (outcome.kind === "refunded" || outcome.kind === "refunded_double") {
      status = "void";
    } else if (
      outcome.kind === "forfeited" ||
      (!b.deposit.voided && ["cancelled", "rejected", "completed", "no_show"].includes(b.status))
    ) {
      status = "expired";
    } else {
      status = "holding";
    }

    const unit = unitById(b.unitId);
    const landlord = unit ? landlordById(unit.landlordId) : undefined;

    const parties: ContractParty[] = [
      {
        role: "tenant",
        id: tenantPartyId(b.tenant.phone),
        name: b.tenant.name,
        phoneMasked: maskPhone(b.tenant.phone),
      },
      { role: "platform", name: "VinStay AI" },
      {
        role: "landlord",
        id: landlord?.id ?? unit?.landlordId,
        name: landlord?.name ?? "Chủ nhà",
        phoneMasked: landlord?.phone ? maskPhone(landlord.phone) : undefined,
      },
    ];

    rows.push({
      key: `holding.${b.id}`,
      kind: "holding",
      docId: `COC-${b.ref}`,
      status,
      unitLabel: unit ? unitAddress(unit) : b.unitId,
      unitId: b.unitId,
      bookingId: b.id,
      landlordId: unit?.landlordId,
      hostId: b.hostId,
      parties,
      signedAt: b.deposit.paidAt,
      startAt: b.deposit.paidAt,
      endAt: b.deposit.expiresAt,
      amount: b.deposit.amount,
      needsAction: false,
      holdHours: b.deposit.holdHours,
      outcome,
    });
  }

  // 4. Leases từ Bookings
  for (const b of state.bookings) {
    if (!b.lease) continue;

    const endAt = leaseEndAt(b.lease.startDate, b.lease.months);
    const endAtMs = Date.parse(endAt);

    let status: ContractStatus = "active";
    if (now >= endAtMs) {
      status = "ended";
    } else if (endAtMs - now <= LEASE_EXPIRING_DAYS * 86_400_000) {
      status = "expiring";
    }

    const unit = unitById(b.unitId);
    const landlord = unit ? landlordById(unit.landlordId) : undefined;

    const parties: ContractParty[] = [
      {
        role: "landlord",
        id: landlord?.id ?? unit?.landlordId,
        name: landlord?.name ?? "Chủ nhà",
        phoneMasked: landlord?.phone ? maskPhone(landlord.phone) : undefined,
      },
      {
        role: "tenant",
        id: tenantPartyId(b.tenant.phone),
        name: b.tenant.name,
        phoneMasked: maskPhone(b.tenant.phone),
      },
    ];

    const needsAction = status === "expiring" && !b.lease.renewalRemindedAt;

    rows.push({
      key: `lease.${b.id}`,
      kind: "lease",
      docId: b.lease.docId,
      status,
      unitLabel: unit ? unitAddress(unit) : b.unitId,
      unitId: b.unitId,
      bookingId: b.id,
      landlordId: unit?.landlordId,
      hostId: b.hostId,
      parties,
      signedAt: b.lease.signedAt,
      startAt: b.lease.startDate,
      endAt,
      amount: b.lease.rent,
      securityDeposit: b.lease.rent,
      needsAction,
    });
  }

  // 5. Partnership từ HOSTS
  for (const h of HOSTS) {
    const zoneLabels = h.zones.map((zid) => ZONES.find((z) => z.id === zid)?.name ?? zid).join(", ");
    rows.push({
      key: `partnership.${h.id}`,
      kind: "partnership",
      docId: `DT-${h.id}`,
      status: "active",
      unitLabel: `Phân khu ${zoneLabels}`,
      hostId: h.id,
      parties: [
        {
          role: "host",
          id: h.id,
          name: h.name,
          phoneMasked: maskPhone(h.phone),
        },
        {
          role: "platform",
          name: "VinStay AI",
        },
      ],
      signedAt: new Date(h.joined).toISOString(),
      startAt: new Date(h.joined).toISOString(),
      needsAction: false,
    });
  }

  // Sắp xếp ổn định: needsAction = true lên trước, sau đó signedAt giảm dần
  rows.sort((a, b) => {
    if (a.needsAction !== b.needsAction) {
      return a.needsAction ? -1 : 1;
    }
    const aTime = a.signedAt ? Date.parse(a.signedAt) : -Infinity;
    const bTime = b.signedAt ? Date.parse(b.signedAt) : -Infinity;
    return bTime - aTime;
  });

  return rows;
}

export function contractByKey(state: MockState, key: string, now: number): ContractRow | undefined {
  return contractRows(state, now).find((r) => r.key === key);
}

export function contractEvents(state: MockState, row: ContractRow, now: number): ContractEvent[] {
  const events: ContractEvent[] = [];

  if (row.kind === "mandate") {
    if (row.unitId) {
      const m = state.mandates[row.unitId];
      if (m) {
        if (m.signedAt) {
          events.push({ label: "Ký uỷ quyền OTP", at: m.signedAt, done: Date.parse(m.signedAt) <= now });
        }
        if (m.exitRequestedAt) {
          events.push({ label: "Yêu cầu thoát uỷ quyền", at: m.exitRequestedAt, done: Date.parse(m.exitRequestedAt) <= now });
        }
        if (m.exitEffectiveAt) {
          events.push({ label: "Hết 15 ngày báo trước", at: m.exitEffectiveAt, done: Date.parse(m.exitEffectiveAt) <= now });
        }
        if (m.endedAt) {
          events.push({ label: "Hoàn tất offboard", at: m.endedAt, done: Date.parse(m.endedAt) <= now });
        }
      }
    } else if (row.consignmentId) {
      const c = state.consignments.find((cs) => cs.id === row.consignmentId);
      if (c) {
        if (c.signedAt) {
          events.push({ label: "Ký uỷ quyền OTP", at: c.signedAt, done: Date.parse(c.signedAt) <= now });
        }
        if (c.hostAcceptedAt) {
          events.push({ label: "Host nhận thẩm định", at: c.hostAcceptedAt, done: Date.parse(c.hostAcceptedAt) <= now });
        }
        if (c.report?.submittedAt) {
          events.push({ label: "Host nộp báo cáo", at: c.report.submittedAt, done: Date.parse(c.report.submittedAt) <= now });
        }
        if (c.decidedAt) {
          events.push({ label: "Admin phê duyệt", at: c.decidedAt, done: Date.parse(c.decidedAt) <= now });
        }
      }
    }
  } else if (row.kind === "holding") {
    const b = state.bookings.find((bk) => bk.id === row.bookingId);
    if (b) {
      if (b.depositConsentAt) {
        events.push({ label: "Đồng ý điều khoản cọc", at: b.depositConsentAt, done: Date.parse(b.depositConsentAt) <= now });
      }
      if (b.deposit?.paidAt) {
        events.push({ label: "Nhận cọc 2.000.000đ", at: b.deposit.paidAt, done: Date.parse(b.deposit.paidAt) <= now });
      }
      if (b.lease?.signedAt) {
        events.push({ label: "Chuyển vào cọc bảo đảm", at: b.lease.signedAt, done: Date.parse(b.lease.signedAt) <= now });
      }
    }
  } else if (row.kind === "lease") {
    const b = state.bookings.find((bk) => bk.id === row.bookingId);
    if (b?.lease) {
      events.push({ label: "Ký HĐ thuê", at: b.lease.signedAt, done: Date.parse(b.lease.signedAt) <= now });
      events.push({ label: "Bắt đầu thuê", at: b.lease.startDate, done: Date.parse(b.lease.startDate) <= now });
      if (b.lease.renewalRemindedAt) {
        events.push({ label: "Nhắc gia hạn", at: b.lease.renewalRemindedAt, done: Date.parse(b.lease.renewalRemindedAt) <= now });
      }
      if (row.endAt) {
        events.push({ label: "Hết hạn HĐ thuê", at: row.endAt, done: Date.parse(row.endAt) <= now });
      }
    }
  } else if (row.kind === "partnership") {
    events.push({ label: "Ký HĐ hợp tác", at: row.signedAt, done: true });
  }

  return events;
}

export interface ContractKpis {
  activeLeases: number;
  expiringLeases: number;
  heldDeposits: number;
  exitingMandates: number;
  needsAction: number;
}

export function contractKpis(stateOrRows: MockState | ContractRow[], now?: number): ContractKpis {
  const rows = Array.isArray(stateOrRows) ? stateOrRows : contractRows(stateOrRows, now ?? Date.now());
  let activeLeases = 0;
  let expiringLeases = 0;
  let heldDeposits = 0;
  let exitingMandates = 0;
  let needsAction = 0;

  for (const r of rows) {
    if (r.kind === "lease") {
      if (r.status === "active" || r.status === "expiring") {
        activeLeases++;
      }
      if (r.status === "expiring") {
        expiringLeases++;
      }
    } else if (r.kind === "holding") {
      if (r.status === "awaiting_sign" || r.status === "holding") {
        heldDeposits += r.amount ?? 0;
      }
    } else if (r.kind === "mandate") {
      if (r.status === "exiting" || r.status === "exit_due") {
        exitingMandates++;
      }
    }

    if (r.needsAction) {
      needsAction++;
    }
  }

  return { activeLeases, expiringLeases, heldDeposits, exitingMandates, needsAction };
}

/**
 * Gom và tóm tắt hợp đồng theo các bên ký kết (Chủ nhà, Khách thuê, Field Host).
 */
export function contractParties(state: MockState, now: number): PartySummary[] {
  const rows = contractRows(state, now);
  const result: PartySummary[] = [];

  // 1. Landlords (theo thứ tự LANDLORDS)
  for (const l of LANDLORDS) {
    const signatoryRows = rows.filter((r) => r.parties.some((p) => p.role === "landlord" && p.id === l.id));
    const total = signatoryRows.length;
    const live = signatoryRows.filter((r) => LIVE_STATUSES.includes(r.status)).length;
    const needsAction = signatoryRows.filter((r) => r.needsAction).length;
    result.push({
      key: `landlord.${l.id}`,
      role: "landlord",
      id: l.id,
      name: l.name,
      phoneMasked: l.phone ? maskPhone(l.phone) : undefined,
      total,
      live,
      needsAction,
    });
  }

  // 2. Tenants (gom theo tenant id, sắp xếp theo tên tiếng Việt)
  const tenantMap = new Map<
    string,
    { id: string; name: string; phoneMasked?: string; rows: ContractRow[]; latestSignedAt: number }
  >();
  for (const r of rows) {
    for (const p of r.parties) {
      if (p.role === "tenant" && p.id) {
        const signedAtMs = r.signedAt ? Date.parse(r.signedAt) : 0;
        const existing = tenantMap.get(p.id);
        if (!existing) {
          tenantMap.set(p.id, {
            id: p.id,
            name: p.name,
            phoneMasked: p.phoneMasked,
            rows: [r],
            latestSignedAt: signedAtMs,
          });
        } else {
          if (!existing.rows.includes(r)) {
            existing.rows.push(r);
          }
          if (signedAtMs >= existing.latestSignedAt) {
            existing.name = p.name;
            existing.latestSignedAt = signedAtMs;
          }
        }
      }
    }
  }

  const tenantsList: PartySummary[] = Array.from(tenantMap.values()).map((t) => {
    const total = t.rows.length;
    const live = t.rows.filter((r) => LIVE_STATUSES.includes(r.status)).length;
    const needsAction = t.rows.filter((r) => r.needsAction).length;
    return {
      key: `tenant.${t.id}`,
      role: "tenant",
      id: t.id,
      name: t.name,
      phoneMasked: t.phoneMasked,
      total,
      live,
      needsAction,
    };
  });
  tenantsList.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  result.push(...tenantsList);

  // 3. Hosts (theo thứ tự HOSTS)
  for (const h of HOSTS) {
    const hostRows = rows.filter(
      (r) =>
        (r.kind === "partnership" && r.hostId === h.id) ||
        (r.hostId === h.id && (r.kind === "holding" || r.kind === "lease"))
    );
    const total = hostRows.length;
    const live = hostRows.filter((r) => LIVE_STATUSES.includes(r.status)).length;
    const needsAction = hostRows.filter((r) => r.needsAction).length;
    result.push({
      key: `host.${h.id}`,
      role: "host",
      id: h.id,
      name: h.name,
      phoneMasked: maskPhone(h.phone),
      total,
      live,
      needsAction,
    });
  }

  return result;
}

export function partyByKey(state: MockState, key: string, now: number): PartySummary | undefined {
  return contractParties(state, now).find((p) => p.key === key);
}

export function contractsOfParty(
  state: MockState,
  key: string,
  now: number
): { row: ContractRow; relation: PartyRelation }[] {
  const parts = key.split(".");
  if (parts.length < 2) return [];
  const role = parts[0] as PartyRole;
  const id = parts.slice(1).join(".");

  const rows = contractRows(state, now);
  const result: { row: ContractRow; relation: PartyRelation }[] = [];

  for (const r of rows) {
    if (role === "landlord") {
      if (r.parties.some((p) => p.role === "landlord" && p.id === id)) {
        result.push({ row: r, relation: "signatory" });
      }
    } else if (role === "tenant") {
      if (r.parties.some((p) => p.role === "tenant" && p.id === id)) {
        result.push({ row: r, relation: "signatory" });
      }
    } else if (role === "host") {
      if (r.kind === "partnership" && r.hostId === id) {
        result.push({ row: r, relation: "signatory" });
      } else if (r.hostId === id && (r.kind === "holding" || r.kind === "lease")) {
        result.push({ row: r, relation: "handler" });
      }
    }
  }

  return result;
}
