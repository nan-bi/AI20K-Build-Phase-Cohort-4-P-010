/**
 * Prisma giả CÓ TRẠNG THÁI cho test luồng thẩm định (hồ sơ 16). Chỉ hiểu các truy vấn mà module `inspection` +
 * `ConsignmentMetaStore` dùng. `$transaction` chạy TUẦN TỰ (mỗi giao dịch chờ giao dịch trước xong) để mô phỏng khóa
 * dòng `FOR UPDATE`, và HOÀN TÁC toàn bộ khi `cb` ném lỗi — nên rollback của "đạt" là thật.
 * `failOn('unitMedia.createMany')` bắt phương thức đó ném lỗi (kiểm rollback).
 */
type Row = Record<string, any>;

const inList = (v: any, c: any): boolean => {
  if (c === null) return v == null;
  if (c && typeof c === 'object' && !Array.isArray(c) && !(c instanceof Date)) {
    if ('in' in c && !c.in.includes(v)) return false;
    if ('not' in c && (c.not === null ? v == null : v === c.not)) return false;
    if ('has' in c && !(Array.isArray(v) && v.includes(c.has))) return false;
    if ('contains' in c && !(typeof v === 'string' && v.includes(c.contains))) return false;
    return true;
  }
  return v === c;
};

export class FakeInspectionDb {
  hosts: Row[] = [];
  units: Row[] = [];
  mandates: Row[] = [];
  media: Row[] = [];
  inventory: Row[] = [];
  doorKeys: Row[] = [];
  audits: Row[] = [];
  /** `fee_configs` giả: `{ configKey, paramValue }`. Rỗng ⇒ publisher dùng đơn giá mặc định. */
  feeConfigs: Row[] = [];
  private seq = 0;
  private lock: Promise<unknown> = Promise.resolve();
  private failing = new Set<string>();

  id(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${String(this.seq).padStart(4, '0')}`;
  }

  failOn(method: string): void {
    this.failing.add(method);
  }

  private guard(method: string): void {
    if (this.failing.has(method)) throw new Error(`fake-db: ${method} bị ép lỗi`);
  }

  private joinMandate(m: Row): Row {
    const unit = this.units.find((u) => u.id === m.unitId)!;
    return { ...m, unit: { ...unit } };
  }

  private matchMandate(m: Row, where: Row = {}): boolean {
    return Object.entries(where).every(([k, c]) => (k === 'unit' ? true : inList(m[k], c)));
  }

  readonly prisma: Row = {
    exclusiveMandate: {
      findUnique: async ({ where }: Row) => {
        const m = this.mandates.find((x) => x.id === where.id);
        return m ? this.joinMandate(m) : null;
      },
      findMany: async ({ where }: Row = {}) => this.mandates.filter((m) => this.matchMandate(m, where)).map((m) => this.joinMandate(m)),
      update: async ({ where, data }: Row) => {
        const m = this.mandates.find((x) => x.id === where.id)!;
        Object.assign(m, data);
        return this.joinMandate(m);
      },
    },
    unit: {
      update: async ({ where, data }: Row) => {
        this.guard('unit.update');
        const u = this.units.find((x) => x.id === where.id)!;
        Object.assign(u, data);
        return { ...u };
      },
    },
    unitMedia: {
      deleteMany: async ({ where }: Row) => {
        this.guard('unitMedia.deleteMany');
        const keep = this.media.filter((m) => m.unitId !== where.unitId);
        const count = this.media.length - keep.length;
        this.media.splice(0, this.media.length, ...keep);
        return { count };
      },
      createMany: async ({ data }: Row) => {
        this.guard('unitMedia.createMany');
        (data as Row[]).forEach((d) => this.media.push({ id: this.id('media'), ...d }));
        return { count: (data as Row[]).length };
      },
      findFirst: async ({ where }: Row) => {
        const hit = this.media.find((m) => m.url === where.url && (!where.unit || this.units.find((u) => u.id === m.unitId)?.isVerified === where.unit.isVerified));
        return hit ? { ...hit } : null;
      },
    },
    unitInventoryItem: {
      deleteMany: async ({ where }: Row) => {
        this.guard('unitInventoryItem.deleteMany');
        const keep = this.inventory.filter((m) => m.unitId !== where.unitId);
        const count = this.inventory.length - keep.length;
        this.inventory.splice(0, this.inventory.length, ...keep);
        return { count };
      },
      createMany: async ({ data }: Row) => {
        this.guard('unitInventoryItem.createMany');
        (data as Row[]).forEach((d) => {
          if (this.inventory.some((x) => x.unitId === d.unitId && x.code === d.code)) throw new Error('fake-db: unique (unitId, code)');
          this.inventory.push({ id: this.id('inv'), ...d });
        });
        return { count: (data as Row[]).length };
      },
    },
    doorAccessKey: {
      findUnique: async ({ where }: Row) => {
        const k = this.doorKeys.find((x) => x.unitId === where.unitId);
        return k ? { ...k } : null;
      },
      upsert: async ({ where, update, create }: Row) => {
        const k = this.doorKeys.find((x) => x.unitId === where.unitId);
        if (k) {
          Object.assign(k, update);
          return { ...k };
        }
        const row = { physicalKeyState: null, physicalKeyHolderId: null, ...create };
        this.doorKeys.push(row);
        return { ...row };
      },
      updateMany: async ({ where, data }: Row) => {
        const hit = this.doorKeys.filter((k) => Object.entries(where).every(([a, c]) => inList(k[a], c)));
        hit.forEach((k) => Object.assign(k, data));
        return { count: hit.length };
      },
    },
    feeConfig: {
      findUnique: async ({ where }: Row) => {
        const r = this.feeConfigs.find((x) => x.configKey === where.configKey);
        return r ? { ...r } : null;
      },
    },
    fieldHost: {
      findUnique: async ({ where }: Row) => {
        const h = this.hosts.find((x) => (where.id ? x.id === where.id : x.profileId === where.profileId));
        return h ? { ...h } : null;
      },
      findMany: async ({ where }: Row = {}) =>
        this.hosts.filter((h) => Object.entries(where ?? {}).every(([k, c]) => inList(h[k], c))).map((h) => ({ ...h })),
    },
    auditLog: {
      create: async ({ data }: Row) => {
        const row = { id: this.id('au'), createdAt: new Date(), ...data };
        this.audits.push(row);
        return { ...row };
      },
    },
    $queryRaw: async () => [],
    $transaction: async (cb: (tx: Row) => Promise<unknown>) => {
      const run = this.lock.then(async () => {
        const snap = structuredClone({
          hosts: this.hosts, units: this.units, mandates: this.mandates, media: this.media, inventory: this.inventory, doorKeys: this.doorKeys, audits: this.audits,
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
