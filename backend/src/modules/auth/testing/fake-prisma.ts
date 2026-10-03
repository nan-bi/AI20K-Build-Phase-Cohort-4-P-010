import { randomUUID } from 'node:crypto';

/**
 * PrismaService giả trong bộ nhớ cho unit/HTTP test của module auth: đủ trung thực (unique → P2002,
 * increment, NOT, include) để test luồng nghiệp vụ mà không cần Postgres.
 */
type Row = Record<string, any>;

const matches = (row: Row, where: Row = {}): boolean =>
  Object.entries(where).every(([key, expected]) => {
    if (key === 'NOT') return !matches(row, expected);
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
  ) {}

  private assertUnique(candidate: Row, ignore?: Row) {
    for (const key of this.uniques) {
      if (candidate[key] == null) continue;
      if (this.rows.some((r) => r !== ignore && r[key] === candidate[key])) throw uniqueViolation();
    }
  }

  private find(where: Row) {
    return this.rows.find((row) => matches(row, where));
  }

  findUnique = jest.fn(async ({ where, include }: Row) => {
    const row = this.find(where);
    return row ? this.resolveInclude(row, include) : null;
  });

  findFirst = jest.fn(async ({ where, orderBy }: Row = {}) => {
    let hits = this.rows.filter((row) => matches(row, where));
    if (orderBy?.createdAt === 'desc') hits = [...hits].sort((a, b) => b.createdAt - a.createdAt);
    return hits[0] ? { ...hits[0] } : null;
  });

  findMany = jest.fn(async ({ where, include }: Row = {}) =>
    this.rows.filter((row) => matches(row, where)).map((row) => this.resolveInclude(row, include)),
  );

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
    const hits = this.rows.filter((row) => matches(row, where));
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
  const fieldHost = new FakeTable(['id', 'profileId']);
  const profile: FakeTable = new FakeTable(
    ['id', 'email', 'phoneHash'],
    () => ({ isActive: true, isPhoneVerified: false, fullName: null, lastLoginAt: null, passwordHash: null }),
    (row, include) => ({
      ...row,
      ...(include?.role ? { role: role.rows.find((r) => r.id === row.roleId) } : {}),
      ...(include?.hostProfile ? { hostProfile: fieldHost.rows.find((f) => f.profileId === row.id) ?? null } : {}),
    }),
  );
  // Mặc định khớp @default trong schema.prisma.
  const hostInvite = new FakeTable(['id', 'email', 'claimedById'], () => ({ assignedZone: 'The Sapphire 1', claimedAt: null, claimedById: null }), (row, include) => ({
    ...row,
    ...(include?.claimedBy ? { claimedBy: profile.rows.find((p) => p.id === row.claimedById) ?? null } : {}),
  }));
  const otpCode = new FakeTable(['id'], () => ({
    attemptCount: 0,
    lockedUntil: null,
    verifiedAt: null,
    consumedAt: null,
    status: 'PENDING',
  }));
  const authAuditLog = new FakeTable(['id']);

  const prisma: Record<string, any> = { role, profile, fieldHost, hostInvite, otpCode, authAuditLog };
  prisma.$transaction = jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  return prisma;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;

/** Seed nhanh: role + profile (+ FieldHost nếu là host đã xác nhận RFID). */
export function seedProfile(
  prisma: FakePrisma,
  params: { id?: string; email: string; roleCode: string; isActive?: boolean; withFieldHost?: boolean; fullName?: string; passwordHash?: string | null },
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
  if (params.withFieldHost) prisma.fieldHost.rows.push({ id: randomUUID(), profileId: profile.id });
  return profile;
}
