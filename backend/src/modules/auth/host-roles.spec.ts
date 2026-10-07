import { normalizeHostRoles } from './host-roles';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return 'OK';
  } catch (e: any) {
    return `${e.getStatus?.()}:${e.getResponse?.().code}`;
  }
};

describe('normalizeHostRoles (P2-1)', () => {
  it('hợp lệ: [sale], [inspector,sale], [sale,sale,inspector]', () => {
    expect(normalizeHostRoles(['sale'])).toEqual(['SALE']);
    expect(normalizeHostRoles(['inspector', 'sale'])).toEqual(['SALE', 'INSPECTOR']);
    expect(normalizeHostRoles(['sale', 'sale', 'inspector'])).toEqual(['SALE', 'INSPECTOR']);
  });

  it('ném 400 HOST_ROLES_INVALID: [inspector], [], [admin], [sale,admin]', () => {
    for (const bad of [['inspector'], [], ['admin'], ['sale', 'admin']]) {
      expect(codeOf(() => normalizeHostRoles(bad))).toBe('400:HOST_ROLES_INVALID');
    }
    expect(codeOf(() => normalizeHostRoles(undefined))).toBe('400:HOST_ROLES_INVALID');
  });
});

describe('fixHostRoles (P2-2)', () => {
  // Prisma giả tối thiểu: fieldHost.findMany/update, auditLog.create, $transaction.
  const makePrisma = () => {
    const hosts: any[] = [
      { id: 'h1', profileId: 'p1', roles: ['INSPECTOR'] },
      { id: 'h2', profileId: 'p2', roles: ['SALE', 'INSPECTOR'] },
      { id: 'h3', profileId: 'p3', roles: ['SALE'] },
    ];
    const audits: any[] = [];
    const prisma: any = {
      fieldHost: {
        findMany: async ({ where }: any) => hosts.filter((h) => h.roles.includes(where.roles.has)).map((h) => ({ ...h })),
        update: async ({ where, data }: any) => Object.assign(hosts.find((h) => h.id === where.id), data),
      },
      auditLog: { create: async ({ data }: any) => audits.push(data) },
      $transaction: async (cb: any) => cb(prisma),
    };
    return { prisma, hosts, audits };
  };

  it('chạy khô không ghi; --apply sửa đúng 1 dòng + 1 audit; chạy lại fixed=0', async () => {
    const { fixHostRoles } = await import('./fix-host-roles');
    const { prisma, hosts, audits } = makePrisma();
    expect(await fixHostRoles(prisma, false)).toEqual({ fixed: 1 });
    expect(hosts[0].roles).toEqual(['INSPECTOR']);
    expect(audits).toHaveLength(0);

    expect(await fixHostRoles(prisma, true)).toEqual({ fixed: 1 });
    expect(hosts[0].roles).toEqual(['SALE', 'INSPECTOR']);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actionType: 'HOST_ROLES_UPDATE', entityId: 'h1', oldValue: { roles: ['INSPECTOR'] } });

    expect(await fixHostRoles(prisma, true)).toEqual({ fixed: 0 });
    expect(audits).toHaveLength(1);
    expect(hosts[1].roles).toEqual(['SALE', 'INSPECTOR']);
    expect(hosts[2].roles).toEqual(['SALE']);
  });
});
