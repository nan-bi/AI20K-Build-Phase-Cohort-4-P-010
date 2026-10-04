/**
 * Prisma giả CÓ TRẠNG THÁI cho test cổng Sale (hồ sơ 15). Chỉ hiểu đúng các truy vấn mà host-viewings dùng:
 * so sánh vô hướng (equals / in / notIn / not / gt,gte,lt,lte / contains / has), quan hệ viewing · unit · tickets ·
 * profile · deposit. `$transaction` chạy tuần tự và hoàn tác toàn bộ khi ném lỗi, nên `updateMany … where` thật sự
 * đóng vai "nguyên tử" như Postgres.
 */
type Row = Record<string, any>;

function cmp(a: any, b: any): number {
  return +a - +b;
}

function matchValue(v: any, cond: any): boolean {
  if (cond === null) return v == null;
  if (cond instanceof Date) return v instanceof Date && +v === +cond;
  if (typeof cond === 'object' && !Array.isArray(cond)) {
    for (const [op, arg] of Object.entries(cond) as [string, any][]) {
      switch (op) {
        case 'equals': if (!matchValue(v, arg)) return false; break;
        case 'in': if (!arg.includes(v)) return false; break;
        case 'notIn': if (arg.includes(v)) return false; break;
        case 'not': if (matchValue(v, arg)) return false; break;
        case 'gt': if (!(v != null && cmp(v, arg) > 0)) return false; break;
        case 'gte': if (!(v != null && cmp(v, arg) >= 0)) return false; break;
        case 'lt': if (!(v != null && cmp(v, arg) < 0)) return false; break;
        case 'lte': if (!(v != null && cmp(v, arg) <= 0)) return false; break;
        case 'contains': if (!(typeof v === 'string' && v.includes(arg))) return false; break;
        case 'has': if (!(Array.isArray(v) && v.includes(arg))) return false; break;
        case 'path': break; // JSON path: xử lý ở auditLog
        default: throw new Error(`fake-db: toán tử chưa hỗ trợ ${op}`);
      }
    }
    return true;
  }
  return v === cond;
}

export class FakeDb {
  hosts: Row[] = [];
  profiles: Row[] = [];
  units: Row[] = [];
  viewings: Row[] = [];
  tickets: Row[] = [];
  doorKeys: Row[] = [];
  audits: Row[] = [];
  deposits: Row[] = [];
  private seq = 0;
  private lock: Promise<unknown> = Promise.resolve();

  id(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${String(this.seq).padStart(4, '0')}`;
  }

  // ---- quan hệ -----------------------------------------------------------
  private unitOf = (viewing: Row) => this.units.find((u) => u.id === viewing.unitId);
  private viewingOf = (ticket: Row) => this.viewings.find((v) => v.id === ticket.viewingId);
  private ticketsOf = (viewing: Row) => this.tickets.filter((t) => t.viewingId === viewing.id);

  private matchTicket = (t: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([k, c]) => {
      if (k === 'viewing') return this.matchViewing(this.viewingOf(t)!, c);
      return matchValue(t[k], c);
    });

  private matchViewing = (v: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([k, c]: [string, any]) => {
      if (k === 'unit') return Object.entries(c).every(([uk, uc]: [string, any]) => matchValue(this.unitOf(v)?.[uk], uc));
      if (k === 'tickets') {
        const list = this.ticketsOf(v);
        if (c.none) return !list.some((t) => this.matchTicket(t, c.none));
        if (c.some) return list.some((t) => this.matchTicket(t, c.some));
        throw new Error('fake-db: viewing.tickets chỉ hỗ trợ none/some');
      }
      if (k === 'deposit') return c.is === null ? !this.deposits.some((d) => d.viewingId === v.id) : true;
      return matchValue(v[k], c);
    });

  private matchHost = (h: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([k, c]: [string, any]) => {
      if (k === 'profile') return Object.entries(c).every(([pk, pc]) => matchValue(h.profile?.[pk], pc));
      if (k === 'tickets') {
        const list = this.tickets.filter((t) => t.hostId === h.id);
        if (c.none) return !list.some((t) => this.matchTicket(t, c.none));
        throw new Error('fake-db: host.tickets chỉ hỗ trợ none');
      }
      return matchValue(h[k], c);
    });

  // ---- dựng bản ghi kèm include --------------------------------------------
  private joinViewing(v: Row, include?: Row): Row {
    const out: Row = { ...v };
    const inc = include ?? {};
    if (inc.unit) out.unit = this.joinUnit(this.unitOf(v)!, inc.unit.include);
    if (inc.deposit) {
      const d = this.deposits.find((x) => x.viewingId === v.id);
      out.deposit = d ? { ...d } : null;
    }
    if (inc.tickets) {
      let list = this.ticketsOf(v);
      if (inc.tickets.where) list = list.filter((t) => this.matchTicket(t, inc.tickets.where));
      if (inc.tickets.take) list = list.slice(0, inc.tickets.take);
      out.tickets = list.map((t) => ({ ...t }));
    }
    return out;
  }

  private joinUnit(u: Row, include?: Row): Row {
    const out: Row = { ...u };
    if (include?.media) out.media = (u.media ?? []).slice(0, include.media.take ?? undefined);
    if (include?.doorKey) out.doorKey = this.doorKeys.find((k) => k.unitId === u.id) ?? null;
    return out;
  }

  private joinTicket(t: Row, include?: Row): Row {
    const out: Row = { ...t };
    if (include?.viewing) out.viewing = this.joinViewing(this.viewingOf(t)!, include.viewing.include);
    return out;
  }

  readonly prisma: Row = {
    dispatchTicket: {
      findUnique: async ({ where, include }: Row) => {
        const t = this.tickets.find((x) => x.id === where.id);
        return t ? this.joinTicket(t, include) : null;
      },
      findMany: async ({ where, include, orderBy, take, select }: Row) => {
        let list = this.tickets.filter((t) => this.matchTicket(t, where));
        if (orderBy) {
          const [[key, dir]] = Object.entries(orderBy) as [string, string][];
          list = [...list].sort((a, b) => (dir === 'desc' ? -1 : 1) * (+a[key] - +b[key]));
        }
        if (take) list = list.slice(0, take);
        if (select) return list.map((t) => Object.fromEntries(Object.keys(select).map((k) => [k, t[k]])));
        return list.map((t) => this.joinTicket(t, include));
      },
      count: async ({ where }: Row) => this.tickets.filter((t) => this.matchTicket(t, where)).length,
      updateMany: async ({ where, data }: Row) => {
        const hit = this.tickets.filter((t) => this.matchTicket(t, where));
        hit.forEach((t) => Object.assign(t, data));
        return { count: hit.length };
      },
      create: async ({ data }: Row) => {
        const row = { id: `00000000-0000-4000-8000-${String(900000 + ++this.seq).padStart(12, '0')}`, offeredAt: new Date(), acceptedAt: null, rejectReason: null, closedAt: null, ...data };
        this.tickets.push(row);
        return { ...row };
      },
      groupBy: async ({ where }: Row) => {
        const hit = this.tickets.filter((t) => this.matchTicket(t, where));
        const by = new Map<string, number>();
        hit.forEach((t) => by.set(t.hostId, (by.get(t.hostId) ?? 0) + 1));
        return [...by].map(([hostId, n]) => ({ hostId, _count: { _all: n } }));
      },
    },
    viewing: {
      findUnique: async ({ where, include }: Row) => {
        const v = this.viewings.find((x) => (where.bookingRefCode ? x.bookingRefCode === where.bookingRefCode : x.id === where.id));
        return v ? this.joinViewing(v, include) : null;
      },
      updateMany: async ({ where, data }: Row) => {
        const hit = this.viewings.filter((v) => this.matchViewing(v, where));
        hit.forEach((v) => Object.assign(v, data));
        return { count: hit.length };
      },
      count: async ({ where }: Row) => this.viewings.filter((v) => this.matchViewing(v, where)).length,
    },
    fieldHost: {
      findUnique: async ({ where }: Row) => {
        const h = this.hosts.find((x) => (where.id ? x.id === where.id : x.profileId === where.profileId));
        return h ? { ...h } : null;
      },
      findMany: async ({ where }: Row) => this.hosts.filter((h) => this.matchHost(h, where)).map((h) => ({ ...h })),
      updateMany: async ({ where, data }: Row) => {
        const hit = this.hosts.filter((h) => this.matchHost(h, where));
        hit.forEach((h) => Object.assign(h, data));
        return { count: hit.length };
      },
    },
    doorAccessKey: {
      findUnique: async ({ where }: Row) => {
        const k = this.doorKeys.find((x) => x.unitId === where.unitId);
        return k ? { ...k } : null;
      },
      updateMany: async ({ where, data }: Row) => {
        const hit = this.doorKeys.filter((k) => Object.entries(where).every(([a, c]) => matchValue(k[a], c)));
        hit.forEach((k) => Object.assign(k, data));
        return { count: hit.length };
      },
    },
    auditLog: {
      create: async ({ data }: Row) => {
        const row = { id: this.id('au'), createdAt: new Date(), ...data };
        this.audits.push(row);
        return { ...row };
      },
      findFirst: async ({ where }: Row) => {
        const { newValue, ...rest } = where;
        const hit = this.audits
          .filter((a) => Object.entries(rest).every(([k, c]) => matchValue(a[k], c)))
          .filter((a) => !newValue?.path || a.newValue?.[newValue.path[0]] === newValue.equals)
          .sort((a, b) => +b.createdAt - +a.createdAt);
        return hit[0] ? { ...hit[0] } : null;
      },
    },
    $transaction: async (cb: (tx: Row) => Promise<unknown>) => {
      const run = this.lock.then(async () => {
        const snap = structuredClone({
          hosts: this.hosts, units: this.units, viewings: this.viewings, tickets: this.tickets,
          doorKeys: this.doorKeys, audits: this.audits, deposits: this.deposits,
        });
        try {
          return await cb(this.prisma);
        } catch (err) {
          for (const [k, v] of Object.entries(snap)) {
            const target = (this as any)[k] as Row[];
            target.splice(0, target.length, ...(v as Row[]));
          }
          throw err;
        }
      });
      this.lock = run.catch(() => undefined);
      return run;
    },
  };
}
