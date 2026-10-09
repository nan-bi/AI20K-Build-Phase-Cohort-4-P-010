import { AdminService } from './admin.service';

const profile = (over: any = {}) => ({
  id: 'p1',
  fullName: 'NAMTEST',
  email: 't@x.vn',
  phoneEnc: null,
  tenantContracts: [
    { id: 'c1', status: 'ACTIVE' },
    { id: 'c2', status: 'ACTIVE' },
    { id: 'c3', status: 'AWAITING_TENANT_SIGN' },
  ],
  landlordContracts: [],
  ...over,
});

function build(row: any) {
  const prisma: any = { profile: { findFirst: jest.fn(async () => row) } };
  return { svc: new AdminService(prisma, { log: jest.fn() } as any), prisma };
}

describe('AdminService.getContractPartyById', () => {
  it('trả ĐỦ hợp đồng của bên ký (không cắt còn 1), kèm số đang hiệu lực / chờ ký khớp danh sách', async () => {
    const { svc, prisma } = build(profile());
    const r: any = await svc.getContractPartyById('p1');
    expect(r.contracts).toEqual(['c1', 'c2', 'c3']);
    expect(r.activeContracts).toBe(2);
    expect(r.needsSignature).toBe(1);
    expect(r.role).toBe('tenant');
    const select = prisma.profile.findFirst.mock.calls[0][0].select;
    expect(select.tenantContracts.take).toBeUndefined();
    expect(select.landlordContracts.take).toBeUndefined();
  });

  it('id không có hợp đồng ⇒ 404', async () => {
    const { svc } = build(null);
    await expect(svc.getContractPartyById('x')).rejects.toMatchObject({ status: 404 });
  });
});
