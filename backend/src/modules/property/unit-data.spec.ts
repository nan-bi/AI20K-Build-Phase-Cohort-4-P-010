import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SPEC_POOL, generateInventory, seedUnitInventory } from './unit-inventory-seed';
import { backfillUnitInventory } from './unit-inventory-backfill';
import { holdingDepositAmount } from '../deposit/deposit-amount';
import { buildDepositTerms } from '../deposit/deposit-terms';
import { ConsignmentMetaStore } from '../landlord/consignment-meta.store';
import { LandlordAccessService } from '../landlord/landlord-access.service';
import { LandlordConsignmentService } from '../landlord/landlord-consignment.service';
import { inventoryCatalogView, readConsignmentMeta } from '../landlord/landlord.mappers';
import { CreateConsignmentDto } from '../landlord/dto/landlord.dto';
import { INSPECTION_CATALOG, INSPECTION_GROUPS } from '../inspection/inspection.catalog';
import { InspectorAssigner } from '../inspection/inspector-assigner.service';
import { fullPhotos, validInput, buildWorld } from '../inspection/testing/world';
import { toTenantUnit } from '../tenant/tenant.mappers';
import { assertListingText, detectListingTextViolation } from './listing-text';
import { LISTING_BYPASS, LISTING_OK } from './listing-text.cases';
import { DIRECTIONS } from './unit-facts';

/** Hồ sơ 18 — SPEC-P01 §6 (P1-1…P1-8). */
const ME = '00000000-0000-4000-8000-0000000000aa';
const building = { id: 'b1', buildingCode: 'S1.02', zoneName: 'The Sapphire 1', totalFloors: 28 };

function makeCreateService() {
  const unitCreate = jest.fn(async ({ data }: any) => ({ id: 'u1', ...data }));
  const mandateCreate = jest.fn(async ({ data }: any) => ({
        id: 'm1', ...data, createdAt: new Date(), signedAt: null,
        unit: { id: 'u1', unitCode: data.unitCode, floorNumber: 12, layoutType: 'ONE_BED_PLUS', carpetAreaM2: 47, baseRentPrice: 6_500_000, doorLockType: 'ELECTRONIC_PIN', building },
      }));
  const tx: any = {
    unit: { create: unitCreate },
    doorAccessKey: { create: jest.fn() },
    exclusiveMandate: { create: mandateCreate },
  };
  const prisma: any = {
    building: { findUnique: jest.fn(async () => building) },
    unit: { findUnique: jest.fn(async () => null) },
    feeConfig: { findUnique: jest.fn(async () => null) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const service = new LandlordConsignmentService(
    prisma,
    new LandlordAccessService(prisma),
    { log: jest.fn() } as any,
    {} as any,
    { encrypt: jest.fn((v: string) => `ENC(${v})`) } as any,
    {} as any,
    new ConsignmentMetaStore(prisma),
    new InspectorAssigner(),
  );
  return { service, unitCreate, mandateCreate };
}

const baseDto = { building: 'S1.02', floor: 12, door: '08', layout: '1PN', areaM2: 47, askRent: 6_500_000, bathrooms: 2 };

describe('P1-1/P1-2 — tạo ký gửi ghi thông tin căn vào units', () => {
  it('P1-1: ghi bathrooms/direction/securityDeposit/minLeaseMonths/furnishing', async () => {
    const { service, unitCreate } = makeCreateService();
    await service.create(ME, {
      ...baseDto, direction: 'Đông Nam',
      suggestedDeposit: 13_000_000, leaseTerm: 'long', furnished: false,
    } as any);
    expect(unitCreate.mock.calls[0][0].data).toMatchObject({
      bathrooms: 2, direction: 'Đông Nam',
      securityDeposit: 13_000_000, minLeaseMonths: 12, furnishing: 'EMPTY', marketAvgPrice: 6_500_000,
    });
  });

  it('P1-1: không có leaseTerm/suggestedDeposit/furnished ⇒ minLeaseMonths 6, securityDeposit null, furnishing giữ mặc định', async () => {
    const { service, unitCreate } = makeCreateService();
    await service.create(ME, baseDto as any);
    const data = unitCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({ minLeaseMonths: 6, securityDeposit: null, direction: null });
    expect(data).not.toHaveProperty('furnishing');
  });

  it('form ký gửi không còn ô số WC: bỏ trống ⇒ theo loại căn (Studio/1PN: 1, 2PN/3PN: 2); có gửi thì giữ nguyên', async () => {
    const { bathrooms: _omit, ...noWc } = baseDto;
    for (const [layout, expected] of [['Studio', 1], ['1PN', 1], ['2PN', 2], ['3PN', 2]] as const) {
      const { service, unitCreate } = makeCreateService();
      await service.create(ME, { ...noWc, layout } as any);
      expect(unitCreate.mock.calls[0][0].data.bathrooms).toBe(expected);
    }
    const { service, unitCreate } = makeCreateService();
    await service.create(ME, { ...noWc, layout: '2PN', bathrooms: 3 } as any);
    expect(unitCreate.mock.calls[0][0].data.bathrooms).toBe(3);
  });

  it('chủ nhà khai món có sẵn từ catalog 32 món: lưu vào meta.form.inventoryCodes (bỏ trùng); không khai thì không có khoá', async () => {
    const { service, mandateCreate } = makeCreateService();
    await service.create(ME, { ...baseDto, inventoryCodes: ['8', '21', '8', '24'] } as any);
    expect(readConsignmentMeta(mandateCreate.mock.calls[0][0].data.doorAccessConfig)?.form.inventoryCodes).toEqual(['8', '21', '24']);
    const other = makeCreateService();
    await other.service.create(ME, baseDto as any);
    expect(readConsignmentMeta(other.mandateCreate.mock.calls[0][0].data.doorAccessConfig)?.form).not.toHaveProperty('inventoryCodes');
  });

  it('inventoryCodes có mã ngoài catalog ⇒ 400, không tạo căn', async () => {
    const { service, unitCreate } = makeCreateService();
    const err: any = await service.create(ME, { ...baseDto, inventoryCodes: ['8', '99'] } as any).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(unitCreate).not.toHaveBeenCalled();
  });

  it('GET landlord/inventory-catalog: đủ 32 món, chỉ lộ code/group/name (không lộ gợi ý chụp, trách nhiệm đền bù)', () => {
    const view = inventoryCatalogView();
    expect(view).toHaveLength(32);
    expect(Object.keys(view[0]).sort()).toEqual(['code', 'group', 'name']);
    expect(view.map((v) => v.code)).toEqual(INSPECTION_CATALOG.map((i) => i.code));
  });

  it('form ký gửi không còn điểm nổi bật: DTO bỏ qua `highlights`/`title`/`description` gửi thừa, không ghi vào căn', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    const dto: any = await pipe.transform({ ...baseDto, highlights: ['x'], title: 't', description: 'd' }, { type: 'body', metatype: CreateConsignmentDto });
    expect(dto).not.toHaveProperty('highlights');
    expect(dto).not.toHaveProperty('title');
    expect(dto).not.toHaveProperty('description');
    const { service, unitCreate } = makeCreateService();
    await service.create(ME, dto);
    expect(unitCreate.mock.calls[0][0].data).not.toHaveProperty('highlights');
  });

  it('P1-2: direction ngoài 8 giá trị ⇒ 400 (ValidationPipe); 8 giá trị hợp lệ qua', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    const meta = { type: 'body' as const, metatype: CreateConsignmentDto };
    await expect(pipe.transform({ ...baseDto, direction: 'Trung tâm' }, meta)).rejects.toMatchObject({ status: 400 });
    await expect(pipe.transform({ ...baseDto, bathrooms: 0 }, meta)).rejects.toMatchObject({ status: 400 });
    for (const d of DIRECTIONS) await expect(pipe.transform({ ...baseDto, direction: d }, meta)).resolves.toBeDefined();
    expect(DIRECTIONS).toHaveLength(8);
  });
});

describe('P1-3 — assertListingText', () => {
  const reasonOf = (v: string) => {
    try {
      assertListingText('highlights', v);
      return null;
    } catch (e: any) {
      return e.getResponse().reason;
    }
  };
  it.each([
    ['0979841233', 'phone'],
    ['0979 841 233', 'phone'],
    ['+84 979 841 233', 'phone'],
    ['zalo.me/x', 'url'],
    ['8tr5', 'money'],
    ['7 triệu', 'money'],
    ['500k', 'money'],
    ['giá 8.000.000', 'money'],
  ])('vi phạm %s ⇒ %s', (text, reason) => expect(reasonOf(text)).toBe(reason));
  it.each(['Tầng 12', '45m²', '45 m2', '2PN 2WC', 'View hồ', 'Năm 2024', '1 WC'])('hợp lệ %s', (text) => expect(reasonOf(text)).toBeNull());
});

describe('P1-3b — assertListingText chống lách (F1)', () => {
  it.each(LISTING_BYPASS)('chặn %s ⇒ %s', (text, reason) => expect(detectListingTextViolation(text)).toBe(reason));
  it.each(LISTING_OK)('cho qua %s', (text) => expect(detectListingTextViolation(text)).toBeNull());
});

describe('P1-4 — niêm yết ghi unit_inventory_items', () => {
  it('chỉ ghi dòng present=true; lần publish thứ 2 không nhân đôi', async () => {
    const w = buildWorld();
    const a = w.addInspector('a');
    const photos = fullPhotos(a.id);
    const c = w.addCase({ stage: 'inspecting', hostId: a.id, photos });
    const input = validInput(photos);
    for (const i of [3, 10, 20]) input.inventory[i] = { ...input.inventory[i], present: false, photoIds: [] };
    await w.flow.submit(w.actor(a), c.mandate.id, input);
    const rows = () => w.db.inventory.filter((r) => r.unitId === c.unit.id);
    expect(rows()).toHaveLength(29);
    expect(rows().every((r) => !['4', '11', '21'].includes(r.code))).toBe(true);
    expect(rows()[0]).toMatchObject({ code: '1', groupCode: 'I', qty: 1, condition: 80 });

    const mandate = w.db.mandates.find((m) => m.id === c.mandate.id)!;
    const report = w.metaOf(c.mandate).report!;
    await w.db.prisma.$transaction((tx: any) => w.publisher.publish(tx, { ...mandate, unit: w.db.units.find((u) => u.id === c.unit.id) } as any, report, w.metaOf(c.mandate).inspection?.photos ?? [], { now: new Date(), agreed: { rent: 6_500_000, securityDeposit: 6_500_000 } }));
    expect(rows()).toHaveLength(29);
  });
});

describe('F8 — spec/tên dòng X của Inspector đi qua assertListingText', () => {
  const setup = () => {
    const w = buildWorld();
    const a = w.addInspector('a');
    const photos = fullPhotos(a.id);
    const c = w.addCase({ stage: 'inspecting', hostId: a.id, photos });
    return { w, a, photos, c };
  };
  const body = (p: Promise<unknown>) => p.then(() => null, (e: any) => e.getResponse());

  it('spec chứa SĐT ⇒ 400 LISTING_TEXT_FORBIDDEN field inventory.<i>.spec, chưa ghi DB', async () => {
    const { w, a, photos, c } = setup();
    const input = validInput(photos);
    input.inventory[2] = { ...input.inventory[2], spec: 'Sofa da, LH chủ 0979841233' };
    expect(await body(w.flow.submit(w.actor(a), c.mandate.id, input))).toMatchObject({ code: 'LISTING_TEXT_FORBIDDEN', field: 'inventory.2.spec', reason: 'phone' });
    expect(w.db.inventory.filter((r) => r.unitId === c.unit.id)).toHaveLength(0);
  });

  it('tên dòng X chứa link ⇒ 400 field inventory.<i>.name; spec sạch được ghi vào DB', async () => {
    const { w, a, photos, c } = setup();
    const clean = validInput(photos);
    clean.inventory[2] = { ...clean.inventory[2], spec: 'Da bò, Hàn Quốc' };
    const withX = { ...clean, inventory: [...clean.inventory, { code: 'X1', group: 'I' as const, name: 'zalo.me/abc', present: false, liability: 'misuse' as const, photoIds: [] }] };
    expect(await body(w.flow.submit(w.actor(a), c.mandate.id, withX as any))).toMatchObject({ code: 'LISTING_TEXT_FORBIDDEN', field: `inventory.${clean.inventory.length}.name` });
    await w.flow.submit(w.actor(a), c.mandate.id, clean);
    expect(w.db.inventory.find((r) => r.unitId === c.unit.id && r.code === clean.inventory[2].code)).toMatchObject({ spec: 'Da bò, Hàn Quốc' });
  });
});

describe('P1-5/P1-6/P1-7 — mapper API đọc căn', () => {
  const unit = (over: Record<string, unknown> = {}) => ({
    id: 'u1', unitCode: 'VHOP-S1.02-1208', floorNumber: 12, layoutType: 'ONE_BED_PLUS', carpetAreaM2: 47, baseRentPrice: 6_500_000,
    managementFee: 446_500, parkingFeeEstimate: 150_000, utilityCostEstimate: 600_000, marketAvgPrice: 6_500_000, status: 'AVAILABLE',
    doorLockType: 'ELECTRONIC_PIN', media: [], amenities: [], building, ...over,
  });

  it('P1-5: inventory có conditionPct, không lộ compensation/photoIds; list (không include) ⇒ []', () => {
    const detail = toTenantUnit(unit({
      inventoryItems: [
        { code: '2', groupCode: 'I', name: 'Bàn trà', qty: 1, spec: null, condition: 80, compensation: 500_000, photoIds: ['p'] },
        { code: '1', groupCode: 'I', name: 'Sofa', qty: 1, spec: 'Da', condition: 60 },
      ],
    }));
    expect(detail.inventory.map((i) => i.name)).toEqual(['Sofa', 'Bàn trà']);
    expect(detail.inventory[0]).toEqual({ code: '1', group: 'I', groupLabel: INSPECTION_GROUPS.I, name: 'Sofa', qty: 1, spec: 'Da', conditionPct: 60 });
    expect(detail.inventory[1].conditionPct).toBe(80);
    const json = JSON.stringify(detail.inventory);
    for (const k of ['compensation', 'photoIds', '500000']) expect(json).not.toContain(k);
    expect(toTenantUnit(unit()).inventory).toEqual([]);
  });

  it('F9: mã X (không phải số) xếp sau số, theo thứ tự nhập; mã số sắp theo giá trị số', () => {
    const items = ['X2', '10', 'X1', '2', '1', 'X10', 'Z'].map((code) => ({ code, groupCode: 'I', name: `n${code}`, qty: 1 }));
    expect(toTenantUnit(unit({ inventoryItems: items })).inventory.map((i) => i.name)).toEqual(['n1', 'n2', 'n10', 'nX1', 'nX2', 'nX10', 'nZ']);
  });

  it('P1-6: securityDeposit null ⇒ baseRentPrice; có giá trị ⇒ dùng giá trị; highlights', () => {
    expect(toTenantUnit(unit({ securityDeposit: null })).securityDeposit).toBe(6_500_000);
    expect(toTenantUnit(unit({ securityDeposit: '13000000.00', highlights: ['View hồ'] }))).toMatchObject({ securityDeposit: 13_000_000, highlights: ['View hồ'] });
  });

  it('P1-7: holdingDeposit = holdingDepositAmount() (không đổi 2.000.000); điều khoản dùng cùng hàm', () => {
    expect(toTenantUnit(unit()).holdingDeposit).toBe(holdingDepositAmount());
    expect(holdingDepositAmount()).toBe(2_000_000);
    expect(buildDepositTerms(48).amount).toBe(holdingDepositAmount());
  });
});

describe('P1-8 — backfill idempotent', () => {
  it('chạy 2 lần cùng số dòng, chỉ dòng present, upsert theo unitId+code', async () => {
    const store = new Map<string, any>();
    const inventory = [
      { code: '1', group: 'I', name: 'Sofa', present: true, qty: 1, condition: 80 },
      { code: '2', group: 'I', name: 'Bàn', present: false },
      { code: '5', group: 'II', name: 'Bếp', present: true, spec: 'Từ' },
    ];
    const prisma: any = {
      exclusiveMandate: {
        findMany: jest.fn(async () => [
          { unitId: 'u1', doorAccessConfig: { consignment: { form: {}, report: { inventory } } } },
          { unitId: 'u2', doorAccessConfig: null },
        ]),
      },
      unitInventoryItem: {
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const k = `${where.unitId_code.unitId}:${where.unitId_code.code}`;
          store.set(k, store.has(k) ? { ...store.get(k), ...update } : create);
        }),
      },
    };
    expect(await backfillUnitInventory(prisma, false)).toEqual({ units: 1, rows: 2 });
    expect(store.size).toBe(0);
    expect(await backfillUnitInventory(prisma, true)).toEqual({ units: 1, rows: 2 });
    expect(await backfillUnitInventory(prisma, true)).toEqual({ units: 1, rows: 2 });
    expect(store.size).toBe(2);
  });

  it('F14: lấy cả mandate ACTIVE lẫn EXIT_REQUESTED (căn vẫn đang niêm yết khi chủ xin thoát)', async () => {
    const findMany = jest.fn(async () => []);
    await backfillUnitInventory({ exclusiveMandate: { findMany }, unitInventoryItem: {} } as any, false);
    const status = (findMany.mock.calls[0] as any[])[0].where.status;
    expect([...status.in].sort()).toEqual(['ACTIVE', 'EXIT_REQUESTED']);
  });
});

describe('fix4 — seed nội thất DEMO định danh', () => {
  const codes = Array.from({ length: 55 }, (_, i) => `VHOP-S1.0${i % 9}-${1000 + i * 7}`);
  const layouts = ['STUDIO', 'ONE_BED_PLUS', 'TWO_BED_ONE_BATH', 'TWO_BED_TWO_BATH', 'THREE_BED'] as const;
  const fur = (i: number) => (i % 5 === 0 ? 'EMPTY' : i % 3 === 0 ? 'BASIC' : 'FULL') as any;
  const sig = (rows: any[]) => JSON.stringify(rows.map((r) => [r.code, r.qty, r.spec, r.condition]));

  it('định danh: chạy lại ra y hệt', () => {
    expect(sig(generateInventory(codes[1], 'FULL' as any, 'STUDIO' as any))).toBe(sig(generateInventory(codes[1], 'FULL' as any, 'STUDIO' as any)));
  });

  it('>=10 bộ khác nhau trong 55 căn giả', () => {
    const sigs = new Set(codes.map((c, i) => sig(generateInventory(c, 'FULL' as any, layouts[i % 5] as any))));
    expect(sigs.size).toBeGreaterThanOrEqual(10);
  });

  it('tỉ lệ theo furnishing: FULL 85-100%, BASIC 35-55% (đủ món cốt lõi), EMPTY 0', () => {
    for (const c of codes) {
      const f = generateInventory(c, 'FULL' as any, 'TWO_BED_ONE_BATH' as any).length;
      const b = generateInventory(c, 'BASIC' as any, 'TWO_BED_ONE_BATH' as any);
      expect(f).toBeGreaterThanOrEqual(27);
      expect(f).toBeLessThanOrEqual(32);
      expect(b.length).toBeGreaterThanOrEqual(11);
      expect(b.length).toBeLessThanOrEqual(18);
      for (const k of ['13', '15', '24', '17', '6', '7']) expect(b.some((r) => r.code === k)).toBe(true);
      expect(generateInventory(c, 'EMPTY' as any, 'STUDIO' as any)).toEqual([]);
    }
  });

  it('mọi spec trong pool qua detectListingTextViolation (không SĐT/giá/link)', () => {
    for (const specs of Object.values(SPEC_POOL)) for (const sp of specs) expect(detectListingTextViolation(sp)).toBeNull();
  });

  it('dòng hợp lệ: condition nguyên 30-98, spec sạch, qty theo phòng ngủ, tên đúng catalog', () => {
    const rows = generateInventory(codes[2], 'FULL' as any, 'THREE_BED' as any);
    for (const r of rows) {
      expect(Number.isInteger(r.condition) && r.condition >= 30 && r.condition <= 98).toBe(true);
      if (r.spec) expect(detectListingTextViolation(r.spec)).toBeNull();
      expect(r.qty).toBeGreaterThanOrEqual(1);
    }
    expect(rows.find((r) => r.code === '24')?.qty).toBe(3);
    for (const r of rows) expect(INSPECTION_CATALOG.find((c) => c.code === r.code)).toMatchObject({ name: r.name, group: r.groupCode });
  });

  it('chạy khô không ghi; --keep-existing bỏ qua căn có dòng; apply xoá cũ rồi tạo lại', async () => {
    const units = [
      { id: 'a', unitCode: 'VHOP-A', furnishing: 'FULL', layoutType: 'STUDIO', inventoryItems: [] },
      { id: 'b', unitCode: 'VHOP-B', furnishing: 'FULL', layoutType: 'STUDIO', inventoryItems: [{ id: 'x' }] },
      { id: 'c', unitCode: 'VHOP-C', furnishing: 'EMPTY', layoutType: 'STUDIO', inventoryItems: [] },
    ];
    const tx = { unitInventoryItem: { deleteMany: jest.fn(), createMany: jest.fn() } };
    const prisma: any = { unit: { findMany: jest.fn(async () => units) }, unitInventoryItem: {}, $transaction: jest.fn(async (fn: any) => fn(tx)) };
    const dry = await seedUnitInventory(prisma, { apply: false, overwrite: false });
    expect(dry.units).toBe(2);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(dry.summary.find((s) => s.unitCode === 'VHOP-B')?.skipped).toBe(true);
    const run = await seedUnitInventory(prisma, { apply: true, overwrite: false });
    expect(tx.unitInventoryItem.deleteMany).toHaveBeenCalledTimes(2);
    expect(tx.unitInventoryItem.createMany).toHaveBeenCalledTimes(1);
    expect(run.rows).toBe(dry.rows);
    const all = await seedUnitInventory(prisma, { apply: false, overwrite: true });
    expect(all.units).toBe(3);
  });
});
