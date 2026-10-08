import { AuditService } from '../audit/audit.service';
import { LandlordPricingService } from '../landlord/landlord-pricing.service';
import { LandlordConsignmentService } from '../landlord/landlord-consignment.service';
import { toTenantUnit } from '../tenant/tenant.mappers';
import { World, buildWorld, fullPhotos, validInput } from './testing/world';

/** Hồ sơ 18 — SPEC-P02 §6 (P2-3…P2-9). Luồng thật trên FakeInspectionDb (giao dịch tuần tự + rollback). */
const codeOf = async (p: Promise<unknown>) => p.then(() => 'OK', (e) => e.getResponse?.().code ?? e.message);
const bodyOf = async (p: Promise<unknown>) => p.then(() => null, (e) => e.getResponse());
const LANDLORD = 'landlord-1';

describe('Inspection — giá/cọc đổi ⇒ chủ nhà duyệt (hồ sơ 18)', () => {
  let w: World;
  let a: ReturnType<World['addInspector']>;
  let pricing: LandlordPricingService;
  let publishSpy: jest.SpyInstance;

  beforeEach(() => {
    w = buildWorld();
    a = w.addInspector('a');
    pricing = new LandlordPricingService(w.store, w.publisher, new AuditService(w.prisma));
    publishSpy = jest.spyOn(w.publisher, 'publish');
  });

  const setup = (o: Parameters<World['addCase']>[0] = {}) => {
    const photos = fullPhotos(a.id);
    const c = w.addCase({ stage: 'inspecting', hostId: a.id, photos, ...o });
    return { c, photos };
  };
  const submit = (c: { mandate: { id: string } }, photos: ReturnType<typeof fullPhotos>, over: Record<string, unknown> = {}) =>
    w.flow.submit(w.actor(a), c.mandate.id, validInput(photos, over as any));

  it('P2-3: pass + giá/cọc không đổi ⇒ approved ngay, căn AVAILABLE, giá = askRent, ghi facts/highlights', async () => {
    const { c, photos } = setup();
    const out = await submit(c, photos);
    expect(out).toMatchObject({ stage: 'approved', unitCode: c.unit.unitCode });
    expect(out.listedAt).toBeTruthy();
    expect(w.unitRow(c.unit)).toMatchObject({
      status: 'AVAILABLE', baseRentPrice: 6_500_000, securityDeposit: 6_500_000, marketAvgPrice: 6_500_000,
      bathrooms: 1, direction: 'Đông Nam', floorNumber: 12,
    });
    expect(w.unitRow(c.unit).highlights).toEqual(['View hồ', 'Nội thất đầy đủ', 'Gần sảnh']);
    expect(w.metaOf(c.mandate).pricingProposal).toBeUndefined();
  });

  it('P2-4: pass + đổi giá ⇒ awaiting_landlord, căn UNLISTED, 0 UnitMedia, pricingProposal đủ trường, không publish', async () => {
    const { c, photos } = setup();
    const out = await submit(c, photos, { pricing: { rent: 7_000_000, securityDeposit: 6_500_000, reason: 'Căn tầng cao, view hồ' } });
    expect(out).toEqual({ stage: 'awaiting_landlord', unitCode: c.unit.unitCode, listedAt: null });
    expect(publishSpy).not.toHaveBeenCalled();
    expect(w.unitRow(c.unit)).toMatchObject({ status: 'UNLISTED', isVerified: false, baseRentPrice: 6_500_000 });
    expect(w.db.media).toHaveLength(0);
    expect(w.db.inventory).toHaveLength(0);
    expect(w.mandateRow(c.mandate).status).toBe('PENDING_INSPECTION');
    const meta = w.metaOf(c.mandate);
    expect(meta.stage).toBe('awaiting_landlord');
    expect(meta.report?.pricing).toEqual({ rent: 7_000_000, securityDeposit: 6_500_000, reason: 'Căn tầng cao, view hồ' });
    expect(meta.pricingProposal).toMatchObject({
      rent: 7_000_000, securityDeposit: 6_500_000, reason: 'Căn tầng cao, view hồ', original: { rent: 6_500_000, securityDeposit: 6_500_000 },
    });
    expect(typeof meta.pricingProposal?.proposedAt).toBe('string');
    // Inspector nộp lại khi đang chờ chủ ⇒ 409 inspection_bad_stage
    const again: any = await w.flow.submit(w.actor(a), c.mandate.id, validInput(photos)).catch((e) => e);
    expect(again.getStatus()).toBe(409);
    expect(again.getResponse().code).toBe('inspection_bad_stage');
  });

  it('P2-5: pass + CHỈ đổi cọc ⇒ awaiting_landlord (so cả cọc, không chỉ giá)', async () => {
    const { c, photos } = setup();
    const out = await submit(c, photos, { pricing: { rent: 6_500_000, securityDeposit: 13_000_000, reason: 'Nội thất cao cấp' } });
    expect(out.stage).toBe('awaiting_landlord');
    expect(w.metaOf(c.mandate).pricingProposal).toMatchObject({ rent: 6_500_000, securityDeposit: 13_000_000 });
    expect(w.unitRow(c.unit).status).toBe('UNLISTED');
  });

  it('đổi giá/cọc mà thiếu reason ⇒ report_invalid pricing.reason; giá/cọc không đổi ⇒ approved (F2: số thập phân bị chặn ở biên)', async () => {
    const same = setup();
    expect((await submit(same.c, same.photos, { pricing: { rent: 6_500_000, securityDeposit: 6_500_000 } })).stage).toBe('approved');
    const diff = setup();
    expect(await bodyOf(submit(diff.c, diff.photos, { pricing: { rent: 7_000_000, securityDeposit: 6_500_000 } }))).toMatchObject({
      code: 'report_invalid', field: 'pricing.reason',
    });
    expect(w.metaOf(diff.c.mandate).stage).toBe('inspecting');
  });

  it('validator: thiếu facts/pricing/listing, rent ngoài [1tr,200tr], cọc âm, hướng lạ, text có SĐT/số tiền ⇒ lỗi đúng field', async () => {
    const { c, photos } = setup();
    const field = async (over: Record<string, unknown>) => ((await bodyOf(submit(c, photos, over))) as any)?.field;
    expect(await field({ facts: undefined })).toBe('facts');
    expect(await field({ pricing: undefined })).toBe('pricing');
    expect(await field({ listing: undefined })).toBe('listing');
    expect(await field({ pricing: { rent: 999_999, securityDeposit: 0, reason: 'x' } })).toBe('pricing');
    expect(await field({ pricing: { rent: 200_000_001, securityDeposit: 0, reason: 'x' } })).toBe('pricing');
    expect(await field({ pricing: { rent: 6_500_000, securityDeposit: -1 } })).toBe('pricing');
    expect(await field({ facts: { areaM2: 47, layout: '1PN', bathrooms: 1, direction: 'Trên trời', floor: 12 } })).toBe('facts.direction');
    expect(await field({ facts: { areaM2: 47, layout: '1PN', bathrooms: 1, direction: null, floor: 12 } })).toBeUndefined(); // null hợp lệ ⇒ không lỗi (approved)
  });

  it('F2: biên giá/cọc — rent ∈ [3tr,200tr], cọc ∈ [2tr, 3×rent], số nguyên hữu hạn', async () => {
    const { c, photos } = setup();
    const field = async (pricing: Record<string, unknown>) => ((await bodyOf(submit(c, photos, { pricing: { reason: 'x', ...pricing } }))) as any)?.field;
    expect(await field({ rent: 2_999_999, securityDeposit: 3_000_000 })).toBe('pricing'); // rent < 3tr
    expect(await field({ rent: 6_500_000, securityDeposit: 0 })).toBe('pricing'); // cọc < cọc giữ chỗ
    expect(await field({ rent: 6_500_000, securityDeposit: 1_999_999 })).toBe('pricing');
    expect(await field({ rent: 6_500_000, securityDeposit: 19_500_001 })).toBe('pricing'); // > 3 × rent
    expect(await field({ rent: 6_500_000, securityDeposit: 1e15 })).toBe('pricing');
    expect(await field({ rent: 6_500_000, securityDeposit: NaN })).toBe('pricing');
    expect(await field({ rent: 6_500_000, securityDeposit: Infinity })).toBe('pricing');
    expect(await field({ rent: 6_500_000.4, securityDeposit: 6_500_000 })).toBe('pricing'); // thập phân
    expect(await field({ rent: 6_500_000, securityDeposit: 6_500_000.5 })).toBe('pricing');
    expect(await field({ rent: '6500000', securityDeposit: 6_500_000 })).toBe('pricing');
    expect(await field({ rent: 6_500_000, securityDeposit: 2_000_000 })).toBeUndefined(); // đúng cận dưới
    const top = setup();
    expect(((await bodyOf(submit(top.c, top.photos, { pricing: { rent: 6_500_000, securityDeposit: 19_500_000, reason: 'x' } }))) as any)?.field).toBeUndefined(); // đúng cận trên
  });

  it('validator: listing có SĐT / số tiền ⇒ 400 LISTING_TEXT_FORBIDDEN (field + reason)', async () => {
    const { c, photos } = setup();
    const listing = { highlights: ['Gọi 0979841233'] };
    expect(await bodyOf(submit(c, photos, { listing }))).toMatchObject({ code: 'LISTING_TEXT_FORBIDDEN', field: 'highlights', reason: 'phone' });
    const money = { highlights: ['Giá 8tr5 rẻ'] };
    expect(await bodyOf(submit(c, photos, { listing: money }))).toMatchObject({ code: 'LISTING_TEXT_FORBIDDEN', field: 'highlights', reason: 'money' });
    expect(w.metaOf(c.mandate).stage).toBe('inspecting');
  });

  it('P2-6: accept ⇒ publish giá đề xuất vào units + API công khai, mandate ACTIVE, media đủ, audit', async () => {
    const { c, photos } = setup();
    await submit(c, photos, { pricing: { rent: 7_000_000, securityDeposit: 14_000_000, reason: 'Giá thị trường' } });
    const out = await pricing.decide(LANDLORD, c.mandate.id, 'accept');
    expect(out).toMatchObject({ stage: 'approved', unitCode: c.unit.unitCode, rent: 7_000_000, securityDeposit: 14_000_000 });
    expect(out.listedAt).toBeTruthy();
    expect(w.unitRow(c.unit)).toMatchObject({ status: 'AVAILABLE', isVerified: true, baseRentPrice: 7_000_000, securityDeposit: 14_000_000, marketAvgPrice: 7_000_000 });
    expect(w.mandateRow(c.mandate).status).toBe('ACTIVE');
    expect(w.db.media.filter((m) => m.unitId === c.unit.id)).toHaveLength(4);
    expect(w.db.inventory.filter((m) => m.unitId === c.unit.id)).toHaveLength(32);
    const meta = w.metaOf(c.mandate);
    expect(meta).toMatchObject({ stage: 'approved', pricingDecision: { decision: 'accept' } });
    const pub = toTenantUnit({ ...w.unitRow(c.unit), media: [], amenities: [], building: { buildingCode: 'S1.02', zoneName: 'The Sapphire 1', totalFloors: 28 } } as any);
    expect(pub.securityDeposit).toBe(14_000_000);
    expect(JSON.stringify(pub)).toContain('7000000');
    expect(w.db.audits.find((x) => x.actionType === 'CONSIGNMENT_PRICING_DECISION')?.newValue).toEqual({ decision: 'accept', rent: 7_000_000, securityDeposit: 14_000_000 });
  });

  it('P2-7: decline ⇒ rejected, căn UNLISTED, 0 UnitMedia, decisionNote đúng, KHÔNG gọi publish, mandate TERMINATED', async () => {
    const { c, photos } = setup();
    await submit(c, photos, { pricing: { rent: 7_000_000, securityDeposit: 6_500_000, reason: 'x' } });
    publishSpy.mockClear();
    const out = await pricing.decide(LANDLORD, c.mandate.id, 'decline');
    expect(out).toEqual({ stage: 'rejected', unitCode: c.unit.unitCode, listedAt: null });
    expect(publishSpy).not.toHaveBeenCalled();
    expect(w.unitRow(c.unit)).toMatchObject({ status: 'UNLISTED', isVerified: false, baseRentPrice: 6_500_000 });
    expect(w.db.media).toHaveLength(0);
    expect(w.mandateRow(c.mandate).status).toBe('TERMINATED');
    expect(w.metaOf(c.mandate)).toMatchObject({ stage: 'rejected', decisionNote: 'Chủ nhà không đồng ý giá đề xuất', pricingDecision: { decision: 'decline' } });
    expect(w.db.audits.find((x) => x.actionType === 'CONSIGNMENT_PRICING_DECISION')?.newValue).toMatchObject({ decision: 'decline' });
    expect(w.db.audits.some((x) => x.actionType === 'UNIT_PUBLISHED')).toBe(false);
  });

  it('P2-8: gọi decision 2 lần (kể cả song song) ⇒ chỉ 1 thành công, còn lại 409 PRICING_NOT_PENDING; landlord khác ⇒ 403 NOT_OWNER', async () => {
    const { c, photos } = setup();
    await submit(c, photos, { pricing: { rent: 7_000_000, securityDeposit: 6_500_000, reason: 'x' } });
    expect(await codeOf(pricing.decide('landlord-2', c.mandate.id, 'accept'))).toBe('NOT_OWNER');
    expect(w.metaOf(c.mandate).stage).toBe('awaiting_landlord');
    const results = await Promise.all([codeOf(pricing.decide(LANDLORD, c.mandate.id, 'accept')), codeOf(pricing.decide(LANDLORD, c.mandate.id, 'decline'))]);
    expect(results.filter((r) => r === 'OK')).toHaveLength(1);
    expect(results.filter((r) => r === 'PRICING_NOT_PENDING')).toHaveLength(1);
    expect(await codeOf(pricing.decide(LANDLORD, c.mandate.id, 'accept'))).toBe('PRICING_NOT_PENDING');
    // hồ sơ chưa tới bước chờ chủ ⇒ 409
    const other = setup();
    expect(await codeOf(pricing.decide(LANDLORD, other.c.mandate.id, 'accept'))).toBe('PRICING_NOT_PENDING');
  });

  it('P2-9: facts sửa diện tích ⇒ managementFee tính lại theo FeeConfig (mgmtRate cùng nguồn với create)', async () => {
    const { c, photos } = setup();
    await submit(c, photos, { facts: { areaM2: 60, layout: '1PN', bathrooms: 2, direction: 'Tây', floor: 15 } });
    expect(w.unitRow(c.unit)).toMatchObject({ carpetAreaM2: 60, managementFee: 570_000, bathrooms: 2, direction: 'Tây', floorNumber: 15 });
    expect(w.unitRow(c.unit).unitCode).toBe(c.unit.unitCode);

    w.db.feeConfigs.push({ configKey: 'mgmt_fee_per_m2', paramValue: 10_000 });
    const second = setup();
    await submit(second.c, second.photos, { facts: { areaM2: 50, layout: '1PN', bathrooms: 1, direction: null, floor: 12 } });
    expect(w.unitRow(second.c.unit)).toMatchObject({ carpetAreaM2: 50, managementFee: 500_000, direction: null });
  });

  it('reject kèm pricing ⇒ bỏ qua pricing, rejected như cũ; không cần facts/listing', async () => {
    const { c, photos } = setup();
    const out = await submit(c, photos, { recommendation: 'reject', note: 'Khác hình', pricing: { rent: 9_000_000, securityDeposit: 1 }, facts: undefined, listing: undefined });
    expect(out.stage).toBe('rejected');
    expect(w.metaOf(c.mandate).report?.pricing).toBeUndefined();
    expect(w.metaOf(c.mandate).pricingProposal).toBeUndefined();
  });

  it('GET chi tiết ký gửi trả pricingProposal khi awaiting_landlord, null sau khi chủ quyết định', async () => {
    const { c, photos } = setup();
    await submit(c, photos, { pricing: { rent: 7_000_000, securityDeposit: 6_500_000, reason: 'x' } });
    const prisma: any = w.prisma;
    prisma.exclusiveMandate.findFirst = async ({ where }: any) => {
      const m = w.mandateRow({ id: where.id });
      const u = w.unitRow({ id: m.unitId });
      return { ...m, unit: { ...u, landlordId: LANDLORD } };
    };
    prisma.fieldHost.findUnique = async () => ({ profile: { fullName: 'Thẩm định a' } });
    const svc = new LandlordConsignmentService(
      prisma, { ownedMandate: async (_l: string, id: string) => prisma.exclusiveMandate.findFirst({ where: { id } }) } as any,
      new AuditService(prisma), {} as any, {} as any,
      { withUrls: async () => [], signPaths: async () => new Map() } as any, w.store, {} as any,
    );
    const view: any = await svc.get(LANDLORD, c.mandate.id);
    expect(view.status).toBe('awaiting_landlord');
    expect(view.pricingProposal).toMatchObject({ rent: 7_000_000, securityDeposit: 6_500_000, reason: 'x', original: { rent: 6_500_000, securityDeposit: 6_500_000 } });
    await pricing.decide(LANDLORD, c.mandate.id, 'decline');
    expect(((await svc.get(LANDLORD, c.mandate.id)) as any).pricingProposal).toBeNull();
  });
});
