import { randomUUID } from 'node:crypto';

/**
 * PrismaService giả trong bộ nhớ cho unit/HTTP test của module auth: đủ trung thực (unique → P2002,
 * increment, NOT, include) để test luồng nghiệp vụ mà không cần Postgres.
 */
type Row = Record<string, any>;

type Relations = (row: Row, key: string) => Row | null | undefined;

const matches = (row: Row, where: Row = {}, relation?: Relations): boolean =>
  Object.entries(where).every(([key, expected]) => {
    if (key === 'NOT') return !matches(row, expected, relation);
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      // Bộ lọc mảng của Prisma (cột enum[]): has / hasEvery.
      if ('has' in expected) return Array.isArray(row[key]) && row[key].includes(expected.has);
      if ('hasEvery' in expected) return Array.isArray(row[key]) && expected.hasEvery.every((v: unknown) => row[key].includes(v));
      if ('in' in expected) return expected.in.includes(row[key]);
      // Bộ lọc theo quan hệ (vd. fieldHost.where.profile = { isActive }).
      const related = relation?.(row, key);
      if (related !== undefined) return related !== null && matches(related, expected);
    }
    return (row[key] ?? null) === expected;
  });

const uniqueViolation = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

class FakeTable {
  rows: Row[] = [];

  constructor(
    private readonly uniques: string[],
    private readonly defaults: () => Row = () => ({}),
    // Luôn trả bản sao (snapshot) như DB thật — trả tham chiếu sống sẽ che lỗi race trong test.
    private readonly resolveInclude: (row: Row, include?: Row) => Row = (row) => ({ ...row }),
    private readonly relation?: Relations,
  ) {}

  private assertUnique(candidate: Row, ignore?: Row) {
    for (const key of this.uniques) {
      if (candidate[key] == null) continue;
      if (this.rows.some((r) => r !== ignore && r[key] === candidate[key])) throw uniqueViolation();
    }
  }

  private find(where: Row) {
    return this.rows.find((row) => matches(row, where, this.relation));
  }

  private filter(where?: Row) {
    return this.rows.filter((row) => matches(row, where, this.relation));
  }

  findUnique = jest.fn(async ({ where, include }: Row) => {
    const row = this.find(where);
    return row ? this.resolveInclude(row, include) : null;
  });

  findFirst = jest.fn(async ({ where, orderBy }: Row = {}) => {
    let hits = this.filter(where);
    if (orderBy?.createdAt === 'desc') hits = [...hits].sort((a, b) => b.createdAt - a.createdAt);
    return hits[0] ? { ...hits[0] } : null;
  });

  findMany = jest.fn(async ({ where, include, distinct, orderBy, select }: Row = {}) => {
    let hits = this.filter(where);
    const order = Array.isArray(orderBy) ? orderBy[0] : orderBy;
    if (order) {
      const [key, dir] = Object.entries(order)[0] as [string, string];
      hits = [...hits].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
    }
    if (distinct?.length) {
      const seen = new Set<unknown>();
      hits = hits.filter((r) => (seen.has(r[distinct[0]]) ? false : (seen.add(r[distinct[0]]), true)));
    }
    return hits.map((row) => {
      const full = this.resolveInclude(row, include);
      return select ? Object.fromEntries(Object.keys(select).map((k) => [k, full[k]])) : full;
    });
  });

  count = jest.fn(async ({ where }: Row = {}) => this.filter(where).length);

  groupBy = jest.fn(async ({ by, where }: Row) => {
    const groups = new Map<unknown, number>();
    for (const row of this.filter(where)) groups.set(row[by[0]], (groups.get(row[by[0]]) ?? 0) + 1);
    return [...groups].map(([value, n]) => ({ [by[0]]: value, _count: n }));
  });

  create = jest.fn(async ({ data, include }: Row) => {
    const row = { id: randomUUID(), createdAt: new Date(), ...this.defaults(), ...data };
    this.assertUnique(row);
    this.rows.push(row);
    return this.resolveInclude(row, include);
  });

  private apply(row: Row, data: Row) {
    const next = { ...row };
    for (const [key, value] of Object.entries(data)) {
      next[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value;
    }
    this.assertUnique(next, row);
    Object.assign(row, next);
  }

  update = jest.fn(async ({ where, data, include }: Row) => {
    const row = this.find(where);
    if (!row) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
    this.apply(row, data);
    return this.resolveInclude(row, include);
  });

  updateMany = jest.fn(async ({ where, data }: Row) => {
    const hits = this.filter(where);
    hits.forEach((row) => this.apply(row, data));
    return { count: hits.length };
  });

  upsert = jest.fn(async ({ where, update, create }: Row) => {
    const row = this.find(where);
    if (row) {
      this.apply(row, update);
      return { ...row };
    }
    return this.create({ data: create });
  });
}

export function createFakePrisma() {
  const role = new FakeTable(['id', 'code']);
  // Mặc định khớp @default trong schema.prisma (roles = [SALE], duty OFF_DUTY).
  const fieldHost: FakeTable = new FakeTable(
    ['id', 'profileId'],
    () => ({ roles: ['SALE'], dutyStatus: 'OFF_DUTY', rating: 5, assignedZone: 'The Sapphire 1' }),
    (row, include) => ({
      ...row,
      ...(include?.profile ? { profile: profile.rows.find((p) => p.id === row.profileId) } : {}),
    }),
    (row, key) => (key === 'profile' ? (profile.rows.find((p) => p.id === row.profileId) ?? null) : undefined),
  );
  const profile: FakeTable = new FakeTable(
    ['id', 'email', 'phoneHash'],
    () => ({ isActive: true, isPhoneVerified: false, fullName: null, lastLoginAt: null, passwordHash: null }),
    (row, include) => ({
      ...row,
      ...(include?.role ? { role: role.rows.find((r) => r.id === row.roleId) } : {}),
      ...(include?.hostProfile ? { hostProfile: fieldHost.rows.find((f) => f.profileId === row.id) ?? null } : {}),
    }),
  );
  const otpCode = new FakeTable(['id'], () => ({
    attemptCount: 0,
    lockedUntil: null,
    verifiedAt: null,
    consumedAt: null,
    status: 'PENDING',
  }));
  const authAuditLog = new FakeTable(['id']);
  const auditLog = new FakeTable(['id']);
  const building = new FakeTable(['id']);
  const dispatchTicket = new FakeTable(['id']);
  const holdingDeposit = new FakeTable(['id']);
  const hostPayout = new FakeTable(['id']);

  const prisma: Record<string, any> = {
    role,
    profile,
    fieldHost,
    otpCode,
    authAuditLog,
    auditLog,
    building,
    dispatchTicket,
    holdingDeposit,
    hostPayout,
  };
  prisma.$transaction = jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  return prisma;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;

/** Seed nhanh: role + profile (+ FieldHost nếu là host đã có hồ sơ Field Host do Admin tạo). */
export function seedProfile(
  prisma: FakePrisma,
  params: { id?: string; email: string; roleCode: string; isActive?: boolean; withFieldHost?: boolean; hostRoles?: string[]; fullName?: string; passwordHash?: string | null },
) {
  let role = prisma.role.rows.find((r: Row) => r.code === params.roleCode);
  if (!role) {
    role = { id: randomUUID(), code: params.roleCode, name: params.roleCode };
    prisma.role.rows.push(role);
  }
  const profile = {
    id: params.id ?? randomUUID(),
    roleId: role.id,
    email: params.email,
    fullName: params.fullName ?? null,
    passwordHash: params.passwordHash ?? null,
    isActive: params.isActive ?? true,
    isPhoneVerified: false,
    createdAt: new Date(),
  };
  prisma.profile.rows.push(profile);
  if (params.withFieldHost) {
    prisma.fieldHost.rows.push({
      id: randomUUID(),
      profileId: profile.id,
      roles: params.hostRoles ?? ['SALE'],
      dutyStatus: 'OFF_DUTY',
      rating: 5,
      assignedZone: 'The Sapphire 1',
      createdAt: new Date(),
    });
  }
  return profile;
}
