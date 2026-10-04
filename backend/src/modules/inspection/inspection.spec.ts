import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { HostActorService } from '../host-viewings/host-actor.service';
import { INSPECTION_CATALOG } from './inspection.catalog';
import { InspectionController } from './inspection.controller';
import { InspectionFlowService } from './inspection-flow.service';
import { InspectionPhotoService } from './inspection-photo.service';
import { InspectionQueryService } from './inspection-query.service';
import { ListingMediaController } from './listing-media.controller';
import { PIN, ZONE, World, buildWorld, fullPhotos, hoursAgo, photo, validInput } from './testing/world';

const codeOf = async (p: Promise<unknown>) => p.then(() => 'OK', (e) => e.getResponse?.().code ?? e.message);
const bodyOf = async (p: Promise<unknown>) => p.then(() => null, (e) => e.getResponse());

describe('Catalog 32 hạng mục', () => {
  it('đúng 32 dòng, mã "1".."32" liên tục, 8 nhóm I–VIII, liability chỉ misuse | wear_or_misuse', () => {
    expect(INSPECTION_CATALOG).toHaveLength(32);
    expect(INSPECTION_CATALOG.map((c) => c.code)).toEqual(Array.from({ length: 32 }, (_, i) => String(i + 1)));
    expect([...new Set(INSPECTION_CATALOG.map((c) => c.group))]).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);
    expect(INSPECTION_CATALOG.filter((c) => c.liability === 'misuse')).toHaveLength(24);
    expect(INSPECTION_CATALOG.filter((c) => c.liability === 'wear_or_misuse')).toHaveLength(8);
  });
});

describe('Inspection — đọc & nhận ca', () => {
  let w: World;
  beforeEach(() => {
    w = buildWorld();
  });

  it('P1-3: ca giao tôi <4h ở mine; sau 4h xuất hiện ở open của Inspector khác; Inspector khác <4h không thấy', async () => {
    const a = w.addInspector('a');
    const b = w.addInspector('b');
    const fresh = w.addCase({ hostId: a.id, offeredAt: hoursAgo(1) });
    const stale = w.addCase({ hostId: a.id, offeredAt: hoursAgo(5), signedAt: hoursAgo(5) });

    const boardB = await w.query.board(w.actor(b));
    expect(boardB.mine).toHaveLength(0);
    expect(boardB.open.map((c) => c.id)).toEqual([stale.mandate.id]);
    expect(boardB.open[0].tier).toBe('open');

    const boardA = await w.query.board(w.actor(a));
    expect(boardA.mine.map((c) => c.id).sort()).toEqual([fresh.mandate.id, stale.mandate.id].sort());
    expect(boardA.open).toHaveLength(0);
    expect(boardA.mine[0]).not.toHaveProperty('landlordPhone');
    expect(boardA.mine[0].landlordName).toBe('Nguyễn Thị Mai');
  });

  it('board: không có hostId ⇒ Open Pool ngay; bản nháp chưa ký không hiện; done = ca tôi đã nộp', async () => {
    const a = w.addInspector('a');
    const noHost = w.addCase({});
    w.addCase({ stage: 'draft' });
    const done = w.addCase({ stage: 'approved', hostId: a.id });
    (w.metaOf(done.mandate) as any).decidedBy = a.id;
    (w.metaOf(done.mandate) as any).decidedAt = '2026-10-05T00:00:00.000Z';
    const board = await w.query.board(w.actor(a));
    expect(board.open.map((c) => c.id)).toEqual([noHost.mandate.id]);
    expect(board.done.map((c) => c.id)).toEqual([done.mandate.id]);
  });

  it('P1-4: accept 2 lần cùng người ⇒ lần 2 vẫn 200, không ghi audit lần 2', async () => {
    const a = w.addInspector('a');
    const c = w.addCase({ hostId: a.id });
    const first = await w.flow.accept(w.actor(a), c.mandate.id);
    expect(first.stage).toBe('inspecting');
    expect(first.hostAcceptedAt).toBeTruthy();
    const second = await w.flow.accept(w.actor(a), c.mandate.id);
    expect(second.stage).toBe('inspecting');
    expect(w.db.audits.filter((x) => x.actionType === 'INSPECTION_ACCEPTED')).toHaveLength(1);
    expect(first.catalog).toHaveLength(32);
    expect(first.doorCodeOnFile).toBe(true);
    expect(JSON.stringify(first)).not.toContain(PIN);
  });

  it('accept: không phải người được giao ⇒ inspection_not_found; stage khác ⇒ inspection_bad_stage', async () => {
    const a = w.addInspector('a');
    const b = w.addInspector('b');
    const c = w.addCase({ hostId: a.id });
    expect(await codeOf(w.flow.accept(w.actor(b), c.mandate.id))).toBe('inspection_not_found');
    const approved = w.addCase({ stage: 'approved', hostId: a.id });
    expect(await codeOf(w.flow.accept(w.actor(a), approved.mandate.id))).toBe('inspection_bad_stage');
    expect(await codeOf(w.flow.accept(w.actor(a), '00000000-0000-4000-8000-00000000ffff'))).toBe('inspection_not_found');
  });

  it('P1-5: 2 Inspector claim song song cùng ca ⇒ đúng 1 thành công, 1 inspection_taken', async () => {
    const a = w.addInspector('a');
    const b = w.addInspector('b');
    const c = w.addCase({}); // Open Pool (không có hostId)
    const results = await Promise.all([codeOf(w.flow.claim(w.actor(a), c.mandate.id)), codeOf(w.flow.claim(w.actor(b), c.mandate.id))]);
    expect(results.filter((r) => r === 'OK')).toHaveLength(1);
    expect(results.filter((r) => r === 'inspection_taken')).toHaveLength(1);
    const owner = w.metaOf(c.mandate).hostId;
    expect([a.id, b.id]).toContain(owner);
    expect(w.metaOf(c.mandate).stage).toBe('inspecting');
  });

  it('P1-6: claim khi ca còn trong 4h của người được giao ⇒ inspection_not_open; quá 4h thì claim được', async () => {
    const a = w.addInspector('a');
    const b = w.addInspector('b');
    const c = w.addCase({ hostId: a.id, offeredAt: hoursAgo(1) });
    expect(await codeOf(w.flow.claim(w.actor(b), c.mandate.id))).toBe('inspection_not_open');
    const old = w.addCase({ hostId: a.id, offeredAt: hoursAgo(5), signedAt: hoursAgo(5) });
    const got = await w.flow.claim(w.actor(b), old.mandate.id);
    expect(got.stage).toBe('inspecting');
    expect(w.metaOf(old.mandate).hostId).toBe(b.id);
  });

  it('P1-7: E2 ca của người khác đang inspecting ⇒ inspection_not_found (404); ca Open Pool xem được', async () => {
    const a = w.addInspector('a');
    const b = w.addInspector('b');
    const taken = w.addCase({ stage: 'inspecting', hostId: a.id });
    const e: any = await w.query.detail(w.actor(b), taken.mandate.id).catch((x) => x);
    expect(e.getStatus()).toBe(404);
    expect(e.getResponse().code).toBe('inspection_not_found');
    const open = w.addCase({});
    const d = await w.query.detail(w.actor(b), open.mandate.id);
    expect(d.tier).toBe('open');
    expect(d.landlordPhotos.every((p) => p.url === null)).toBe(true);
    expect(d.doorCodeOnFile).toBe(false); // người chưa nhận ca không biết căn có mã chưa
  });
});

describe('Inspection — mã cửa (E5)', () => {
  let w: World;
  beforeEach(() => {
    w = buildWorld();
  });

  it('P1-18: ghi audit DOOR_KEY_REVEAL purpose inspection (không chứa PIN); chưa PIN ⇒ door_code_missing', async () => {
    const a = w.addInspector('a');
    const ok = w.addCase({ stage: 'inspecting', hostId: a.id });
    const door = await w.flow.revealDoor(w.actor(a), ok.mandate.id);
    expect(door).toMatchObject({ type: 'ELECTRONIC_PIN', pin: PIN });
    const log = w.db.audits.find((x) => x.actionType === 'DOOR_KEY_REVEAL')!;
    expect(log.newValue).toMatchObject({ purpose: 'inspection', mandateId: ok.mandate.id });
    expect(JSON.stringify(log)).not.toContain(PIN);
    expect(w.metaOf(ok.mandate).inspection?.doorRevealedAt).toHaveLength(1);

    const none = w.addCase({ stage: 'inspecting', hostId: a.id, pin: null });
    expect(await codeOf(w.flow.revealDoor(w.actor(a), none.mandate.id))).toBe('door_code_missing');
    expect(w.db.audits.filter((x) => x.actionType === 'DOOR_KEY_REVEAL')).toHaveLength(1);
  });

  it('chìa cơ ⇒ ghi người giữ chìa là Host; chỉ chủ ca, chỉ khi inspecting', async () => {
    const a = w.addInspector('a');
    const b = w.addInspector('b');
    const phys = w.addCase({ stage: 'inspecting', hostId: a.id, lock: 'PHYSICAL_KEY' });
    const door = await w.flow.revealDoor(w.actor(a), phys.mandate.id);
    expect(door.type).toBe('PHYSICAL_KEY');
    expect(w.db.doorKeys.find((k) => k.unitId === phys.unit.id)).toMatchObject({ physicalKeyState: 'WITH_HOST', physicalKeyHolderId: a.id });
    expect(await codeOf(w.flow.revealDoor(w.actor(b), phys.mandate.id))).toBe('inspection_not_found');
    const waiting = w.addCase({ hostId: a.id });
    expect(await codeOf(w.flow.revealDoor(w.actor(a), waiting.mandate.id))).toBe('inspection_bad_stage');
  });
});

describe('Inspection — nộp phiếu & tự niêm yết (E8)', () => {
  let w: World;
  let a: ReturnType<World['addInspector']>;
  beforeEach(() => {
    w = buildWorld();
    a = w.addInspector('a');
  });

  const setup = (o: Parameters<World['addCase']>[0] = {}) => {
    const photos = fullPhotos(a.id);
    const c = w.addCase({ stage: 'inspecting', hostId: a.id, photos, ...o });
    return { c, photos };
  };

  it('P1-8: thiếu ảnh dòng present ⇒ report_invalid field inventory.<i>.photoIds (field ở GỐC body)', async () => {
    const { c, photos } = setup();
    const input = validInput(photos);
    input.inventory[7] = { ...input.inventory[7], photoIds: [] };
    const body: any = await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, input));
    expect(body).toMatchObject({ code: 'report_invalid', field: 'inventory.7.photoIds' });
    expect(w.metaOf(c.mandate).stage).toBe('inspecting');
  });

  it('P1-9: ảnh slot khác / ảnh của hồ sơ khác / ảnh dùng lại ⇒ report_invalid V5', async () => {
    const { c, photos } = setup();
    const wrongSlot = validInput(photos);
    wrongSlot.inventory[2] = { ...wrongSlot.inventory[2], photoIds: [photos[3].id] };
    expect(((await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, wrongSlot))) as any).field).toBe('inventory.2.photoIds');

    const foreign = validInput(photos);
    foreign.inventory[0] = { ...foreign.inventory[0], photoIds: [photo('1', 'x').id] };
    expect(((await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, foreign))) as any).field).toBe('inventory.0.photoIds');

    const reuse = validInput(photos);
    reuse.inventory[1] = { ...reuse.inventory[1], photoIds: [photos[0].id] };
    expect(((await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, reuse))) as any).code).toBe('report_invalid');
  });

  it('P1-10: approve < 4 ảnh niêm yết ⇒ report_invalid listingPhotoIds', async () => {
    const photos = fullPhotos(a.id, 3);
    const c = w.addCase({ stage: 'inspecting', hostId: a.id, photos });
    const body: any = await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, validInput(photos)));
    expect(body).toMatchObject({ code: 'report_invalid', field: 'listingPhotoIds' });
  });

  it('V9: listingPhotoIds trỏ ảnh slot hạng mục (không phải listing) ⇒ report_invalid — chốt chặn B5', async () => {
    const { c, photos } = setup();
    const evidence = photos.filter((p) => p.slot !== 'listing').slice(0, 4);
    const body: any = await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, validInput(photos, { listingPhotoIds: evidence.map((p) => p.id) })));
    expect(body).toMatchObject({ code: 'report_invalid', field: 'listingPhotoIds' });
    expect(w.db.media.filter((m) => m.unitId === c.unit.id)).toHaveLength(0);
    expect(w.unitRow(c.unit).status).toBe('UNLISTED');
  });

  it('DTO: phiếu thiếu `functions` bị ValidationPipe từ chối (không cho niêm yết phiếu rỗng)', async () => {
    const { plainToInstance } = await import('class-transformer');
    const { validate } = await import('class-validator');
    const { SubmitInspectionDto } = await import('./dto/inspection.dto');
    const { photos } = setup();
    const { functions: _omit, ...rest } = validInput(photos) as any;
    const errors = await validate(plainToInstance(SubmitInspectionDto, rest) as object);
    expect(errors.map((e) => e.property)).toContain('functions');
  });

  it('P1-11: approve hợp lệ ⇒ mandate ACTIVE, unit AVAILABLE+Verified, media = đúng ảnh niêm yết theo thứ tự, url /api/v1/media/listing/', async () => {
    const { c, photos } = setup();
    const listing = photos.filter((p) => p.slot === 'listing');
    const order = [listing[2], listing[0], listing[3], listing[1]];
    const input = validInput(photos, { listingPhotoIds: order.map((p) => p.id) });
    const out = await w.flow.submit(w.actor(a), c.mandate.id, input);

    expect(out).toMatchObject({ stage: 'approved', unitCode: c.unit.unitCode });
    expect(out.listedAt).toBeTruthy();
    expect(w.mandateRow(c.mandate).status).toBe('ACTIVE');
    expect(w.mandateRow(c.mandate).validUntil.getTime()).toBeGreaterThan(c.mandate.signedAt.getTime() + 360 * 86_400_000);
    expect(w.unitRow(c.unit)).toMatchObject({ status: 'AVAILABLE', isVerified: true, furnishing: 'FULL', doorNumber: '08' });
    expect(w.unitRow(c.unit).verifiedAt).toBeInstanceOf(Date);
    const media = w.db.media.filter((m) => m.unitId === c.unit.id).sort((x, y) => x.order - y.order);
    expect(media.map((m) => m.url)).toEqual(order.map((p) => `/api/v1/media/listing/${c.mandate.id}/${p.id}.jpg`));
    expect(media.every((m) => m.url.startsWith('/api/v1/media/listing/') && m.url.startsWith('/'))).toBe(true);
    // Hậu điều kiện catalog công khai (property.service): verified + AVAILABLE + có ảnh nội bộ; không ảnh hạng mục nào lọt vào UnitMedia.
    expect(media.some((m) => photos.filter((p) => p.slot !== 'listing').some((p) => m.url.includes(p.id)))).toBe(false);
    const meta = w.metaOf(c.mandate);
    expect(meta).toMatchObject({ stage: 'approved', decidedBy: a.id });
    expect(meta.report?.avgCondition).toBe(80);
    expect(meta.report?.hostId).toBe(a.id);
    expect(w.db.audits.map((x) => x.actionType)).toEqual(expect.arrayContaining(['INSPECTION_SUBMITTED', 'UNIT_PUBLISHED']));
  });

  it('P1-12: approve khi UnitMedia.createMany ném lỗi ⇒ rollback: unit UNLISTED, mandate PENDING_INSPECTION, stage inspecting', async () => {
    const { c, photos } = setup();
    w.db.failOn('unitMedia.createMany');
    await expect(w.flow.submit(w.actor(a), c.mandate.id, validInput(photos))).rejects.toThrow('createMany');
    expect(w.unitRow(c.unit)).toMatchObject({ status: 'UNLISTED', isVerified: false });
    expect(w.mandateRow(c.mandate).status).toBe('PENDING_INSPECTION');
    expect(w.metaOf(c.mandate).stage).toBe('inspecting');
    expect(w.db.media).toHaveLength(0);
  });

  it('P1-13: reject không note ⇒ report_invalid note; có note ⇒ TERMINATED, unit UNLISTED, 0 media, ảnh giữ', async () => {
    const { c, photos } = setup();
    const bad: any = await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, validInput(photos, { recommendation: 'reject' })));
    expect(bad).toMatchObject({ code: 'report_invalid', field: 'note' });
    const out = await w.flow.submit(w.actor(a), c.mandate.id, validInput(photos, { recommendation: 'reject', note: '  Căn khác hẳn hình  ' }));
    expect(out).toMatchObject({ stage: 'rejected', listedAt: null });
    expect(w.mandateRow(c.mandate).status).toBe('TERMINATED');
    expect(w.unitRow(c.unit)).toMatchObject({ status: 'UNLISTED', isVerified: false });
    expect(w.db.media).toHaveLength(0);
    const meta = w.metaOf(c.mandate);
    expect(meta).toMatchObject({ stage: 'rejected', decisionNote: 'Căn khác hẳn hình' });
    expect(meta.inspection?.photos).toHaveLength(photos.length);
  });

  it('P1-14: submit lần 2 ⇒ inspection_bad_stage; Inspector khác ⇒ inspection_not_found', async () => {
    const { c, photos } = setup();
    await w.flow.submit(w.actor(a), c.mandate.id, validInput(photos));
    expect(await codeOf(w.flow.submit(w.actor(a), c.mandate.id, validInput(photos)))).toBe('inspection_bad_stage');
    const b = w.addInspector('b');
    expect(await codeOf(w.flow.submit(w.actor(b), c.mandate.id, validInput(photos)))).toBe('inspection_not_found');
  });

  it('P1-15: khóa điện tử chưa có PIN, approve không doorPin ⇒ door_code_required; có doorPin ⇒ vaultSecretRef aes: và đọc lại đúng', async () => {
    const { c, photos } = setup({ pin: null });
    expect(await codeOf(w.flow.submit(w.actor(a), c.mandate.id, validInput(photos)))).toBe('door_code_required');
    const bad = await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, validInput(photos, { doorPin: '12ab' })));
    expect(bad).toMatchObject({ code: 'report_invalid', field: 'doorPin' });
    expect(w.mandateRow(c.mandate).status).toBe('PENDING_INSPECTION');
    await w.flow.submit(w.actor(a), c.mandate.id, validInput(photos, { doorPin: '246810' }));
    const key = w.db.doorKeys.find((k) => k.unitId === c.unit.id)!;
    expect(key.vaultSecretRef.startsWith('aes:')).toBe(true);
    expect(key.vaultSecretRef).not.toContain('246810');
    expect(await w.doors.readPin(c.unit.id)).toEqual({ type: 'ELECTRONIC_PIN', pin: '246810' });
  });

  it('căn đã có PIN aes: ⇒ không cần doorPin và không bị ghi đè', async () => {
    const { c, photos } = setup();
    const before = w.db.doorKeys.find((k) => k.unitId === c.unit.id)!.vaultSecretRef;
    await w.flow.submit(w.actor(a), c.mandate.id, validInput(photos, { doorPin: '999999' }));
    expect(w.db.doorKeys.find((k) => k.unitId === c.unit.id)!.vaultSecretRef).toBe(before);
  });

  it('P1-16: approve không đổi baseRentPrice, marketAvgPrice', async () => {
    const { c, photos } = setup();
    await w.flow.submit(w.actor(a), c.mandate.id, validInput(photos));
    expect(w.unitRow(c.unit).baseRentPrice).toBe(6_500_000);
    expect(w.unitRow(c.unit).marketAvgPrice).toBe(6_500_000);
  });

  it('chủ nhà khai không nội thất mà thực tế có ⇒ declared.furnishing tự thành sai lệch; netAreaM2 > diện tích khai ⇒ invalid', async () => {
    const { c, photos } = setup({ furnished: false });
    const tooBig: any = await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, validInput(photos, { netAreaM2: 60 })));
    expect(tooBig.field).toBe('netAreaM2');
    await w.flow.submit(w.actor(a), c.mandate.id, validInput(photos, { furnishing: 'basic' }));
    const f = w.metaOf(c.mandate).report!.declared.find((d) => d.field === 'furnishing');
    expect(f).toEqual({ field: 'furnishing', ok: false, actual: 'Nội thất cơ bản' });
  });

  it('liability phải khớp catalog (V2): giá trị lạ ⇒ report_invalid inventory.<i>', async () => {
    const { c, photos } = setup();
    const input = validInput(photos);
    input.inventory[4] = { ...input.inventory[4], liability: input.inventory[4].liability === 'misuse' ? 'wear_or_misuse' : 'misuse' };
    expect(((await bodyOf(w.flow.submit(w.actor(a), c.mandate.id, input))) as any).field).toBe('inventory.4');
  });
});

describe('InspectionController qua HTTP — vai Thẩm định & Host lấy từ phiên', () => {
  let app: INestApplication;
  let hostRoles: string[];
  const query = { board: jest.fn(async (_a: any) => ({ mine: [], open: [], done: [] })), detail: jest.fn() };
  const actors = { resolve: jest.fn(async (profileId: string) => ({ hostId: `host-of-${profileId}`, profileId })) };

  @Injectable()
  class FakeAuth implements CanActivate {
    canActivate(ctx: ExecutionContext) {
      ctx.switchToHttp().getRequest().user = { id: 'prof-1', role: 'field_host', isHostVerified: true, hostRoles };
      return true;
    }
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [InspectionController],
      providers: [
        { provide: HostActorService, useValue: actors },
        { provide: InspectionQueryService, useValue: query },
        { provide: InspectionFlowService, useValue: { accept: jest.fn() } },
        { provide: InspectionPhotoService, useValue: {} },
        { provide: APP_GUARD, useClass: FakeAuth },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  afterAll(() => app.close());

  it('P1-2: Host chỉ vai sale gọi E1 ⇒ 403 host_role_missing, service không được gọi', async () => {
    hostRoles = ['sale'];
    const res = await request(app.getHttpServer()).get('/host/inspections');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('host_role_missing');
    expect(query.board).not.toHaveBeenCalled();
  });

  it('vai inspector ⇒ 200; hostId lấy từ phiên, bỏ qua ?hostId= của client; id không phải uuid ⇒ 400', async () => {
    hostRoles = ['inspector'];
    const res = await request(app.getHttpServer()).get('/host/inspections?hostId=host-attacker');
    expect(res.status).toBe(200);
    expect(query.board).toHaveBeenCalledWith(expect.objectContaining({ hostId: 'host-of-prof-1' }));
    expect((await request(app.getHttpServer()).get('/host/inspections/not-a-uuid')).status).toBe(400);
  });

  it('B1: controller không có route công khai; E9 là route công khai duy nhất', () => {
    const proto = InspectionController.prototype as any;
    const methods = Object.getOwnPropertyNames(proto).filter((k) => k !== 'constructor');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, InspectionController)).toBeUndefined();
    for (const m of methods) expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto[m])).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, (ListingMediaController.prototype as any).get)).toBe(true);
  });
});

export { ZONE };
