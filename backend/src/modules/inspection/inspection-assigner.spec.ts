import { InspectorAssigner } from './inspector-assigner.service';
import { withConsignmentMeta } from '../landlord/landlord.mappers';

const T = (n: number) => new Date(`2026-09-0${n}T00:00:00Z`);
const meta = (hostId: string | undefined, stage: string) => ({
  doorAccessConfig: withConsignmentMeta(null, { form: {} as any, stage: stage as any, ...(hostId ? { hostId } : {}) }),
});

function fakeDb(hosts: any[], mandates: any[] = []) {
  return {
    fieldHost: { findMany: jest.fn(async (_args?: any) => hosts) },
    exclusiveMandate: { findMany: jest.fn(async (_args?: any) => mandates) },
  };
}

describe('InspectorAssigner.pick', () => {
  const assigner = new InspectorAssigner();

  it('lọc đúng vai INSPECTOR + phân khu; sắp theo createdAt tăng dần', async () => {
    const db = fakeDb([]);
    await assigner.pick(db as any, 'The Sapphire 1');
    expect(db.fieldHost.findMany).toHaveBeenCalledWith({
      where: { roles: { has: 'INSPECTOR' }, assignedZone: { contains: 'The Sapphire 1' } },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('không có Inspector ⇒ null và không đếm ca', async () => {
    const db = fakeDb([]);
    expect(await assigner.pick(db as any, 'Z')).toBeNull();
    expect(db.exclusiveMandate.findMany).not.toHaveBeenCalled();
  });

  it('chọn người có ÍT ca awaiting_host+inspecting nhất; ca đã nộp (approved/rejected) và ca của host ngoài khu không tính', async () => {
    const db = fakeDb(
      [{ id: 'a', createdAt: T(1) }, { id: 'b', createdAt: T(2) }],
      [meta('a', 'awaiting_host'), meta('a', 'inspecting'), meta('b', 'awaiting_host'), meta('b', 'approved'), meta('b', 'rejected'), meta('zzz', 'inspecting'), meta(undefined, 'awaiting_host')],
    );
    expect((await assigner.pick(db as any, 'Z'))?.id).toBe('b');
  });

  it('hoà ca ⇒ người tạo sớm hơn (đứng đầu danh sách sắp createdAt)', async () => {
    const db = fakeDb([{ id: 'old', createdAt: T(1) }, { id: 'new', createdAt: T(5) }], [meta('old', 'inspecting'), meta('new', 'inspecting')]);
    expect((await assigner.pick(db as any, 'Z'))?.id).toBe('old');
  });

  it('người cũ đang bận hơn ⇒ người mới được chọn', async () => {
    const db = fakeDb([{ id: 'old', createdAt: T(1) }, { id: 'new', createdAt: T(5) }], [meta('old', 'inspecting'), meta('old', 'awaiting_host')]);
    expect((await assigner.pick(db as any, 'Z'))?.id).toBe('new');
  });
});
