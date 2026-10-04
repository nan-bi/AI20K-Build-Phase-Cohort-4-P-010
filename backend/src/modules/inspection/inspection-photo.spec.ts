import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { sniffImage } from '../landlord/landlord-photo-storage.service';
import { readImageSize } from './image-size';
import { ListingMediaController } from './listing-media.controller';
import { ListingMediaService, MEDIA_CACHE_MAX_ITEMS } from './listing-media.service';
import { World, buildWorld, photo } from './testing/world';

/** Ảnh tối thiểu chỉ có HEADER đúng (server không giải mã — B7). */
function jpeg(w: number, h: number): Buffer {
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]);
}
function png(w: number, h: number): Buffer {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}
function webpX(w: number, h: number): Buffer {
  const b = Buffer.alloc(30);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(22, 4);
  b.write('WEBP', 8, 'ascii');
  b.write('VP8X', 12, 'ascii');
  b.writeUInt32LE(10, 16);
  b.writeUIntLE(w - 1, 24, 3);
  b.writeUIntLE(h - 1, 27, 3);
  return b;
}
function webpLossy(w: number, h: number): Buffer {
  const b = Buffer.alloc(30);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  b.write('VP8 ', 12, 'ascii');
  b.set([0x9d, 0x01, 0x2a], 23);
  b.writeUInt16LE(w, 26);
  b.writeUInt16LE(h, 28);
  return b;
}
function webpLossless(w: number, h: number): Buffer {
  const b = Buffer.alloc(30);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  b.write('VP8L', 12, 'ascii');
  b[20] = 0x2f;
  const bits = (w - 1) | ((h - 1) << 14);
  b.writeUInt32LE(bits >>> 0, 21);
  return b;
}
const size = (buf: Buffer) => readImageSize(buf, sniffImage(buf)!);

describe('readImageSize — hàm thuần đọc header', () => {
  it('P2-1: JPEG (SOF0 sau APP0), PNG, WebP VP8X đọc đúng w/h; thêm WebP VP8 và VP8L', () => {
    expect(size(jpeg(800, 600))).toEqual({ width: 800, height: 600 });
    expect(size(png(1280, 720))).toEqual({ width: 1280, height: 720 });
    expect(size(webpX(1024, 768))).toEqual({ width: 1024, height: 768 });
    expect(size(webpLossy(640, 480))).toEqual({ width: 640, height: 480 });
    expect(size(webpLossless(500, 900))).toEqual({ width: 500, height: 900 });
  });

  it('header hỏng/cụt ⇒ null, không ném', () => {
    expect(readImageSize(Buffer.from([0xff, 0xd8, 0xff]), { ext: 'jpg', mime: 'image/jpeg' })).toBeNull();
    expect(readImageSize(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { ext: 'jpg', mime: 'image/jpeg' })).toBeNull();
    expect(readImageSize(png(0, 0), { ext: 'png', mime: 'image/png' })).toBeNull();
    expect(readImageSize(Buffer.alloc(10), { ext: 'webp', mime: 'image/webp' })).toBeNull();
  });
});

describe('InspectionPhotoService (E6, E7)', () => {
  let w: World;
  let a: ReturnType<World['addInspector']>;
  let c: ReturnType<World['addCase']>;
  const add = (buf: Buffer, f: Record<string, string> = { slot: '1' }) => w.photos.add(w.actor(a), c.mandate.id, { size: buf.length, buffer: buf }, f);
  const codeOf = (p: Promise<unknown>) => p.then(() => 'OK', (e) => e.getResponse?.().code ?? e.message);

  beforeEach(() => {
    w = buildWorld();
    a = w.addInspector('a');
    c = w.addCase({ stage: 'inspecting', hostId: a.id });
  });

  it('ảnh hợp lệ: tải lên inspections/<mandateId>/<uuid>.jpg, lưu meta với giờ MÁY CHỦ, trả link ký, không lộ path', async () => {
    const view: any = await add(jpeg(800, 600), { slot: '5', takenAt: '2026-10-06T00:00:00Z', sharpness: '88.5', brightness: 'abc' });
    const [path] = w.storage.uploadAt.mock.calls[0] as unknown as [string];
    expect(path).toMatch(new RegExp(`^inspections/${c.mandate.id}/[0-9a-f-]{36}\\.jpg$`));
    expect(view).toMatchObject({ slot: '5', room: null, width: 800, height: 600, url: `https://signed.test/${path}` });
    expect(view).not.toHaveProperty('path');
    const stored = w.metaOf(c.mandate).inspection!.photos[0];
    expect(stored).toMatchObject({ sharpness: 88.5, brightness: null, takenAt: '2026-10-06T00:00:00.000Z', hostId: a.id });
    expect(Math.abs(Date.parse(stored.uploadedAt) - Date.now())).toBeLessThan(5000);
  });

  it('P2-2: chỉ chặn ảnh cỡ biểu tượng (cạnh ngắn <200px) ⇒ photo_too_small, không chạm Storage; ảnh 590×443 (thấp nhưng nhìn rõ) vẫn nhận', async () => {
    expect(await codeOf(add(jpeg(640, 150)))).toBe('photo_too_small');
    expect(w.storage.uploadAt).not.toHaveBeenCalled();
    expect(await codeOf(add(jpeg(590, 443)))).toBe('OK');
  });

  it('P2-3: file .jpg nội dung text ⇒ photo_invalid_type; ảnh >3MB ⇒ photo_too_large; header không đọc được ⇒ photo_invalid_type', async () => {
    expect(await codeOf(add(Buffer.from('xin chào đây là văn bản')))).toBe('photo_invalid_type');
    const big = Buffer.concat([jpeg(800, 600), Buffer.alloc(3 * 1024 * 1024)]);
    expect(await codeOf(add(big))).toBe('photo_too_large');
    expect(await codeOf(add(Buffer.from([0xff, 0xd8, 0xff, 0xd9])))).toBe('photo_invalid_type');
    expect(w.storage.uploadAt).not.toHaveBeenCalled();
  });

  it('P2-4: ảnh thứ 5 cùng dòng ⇒ photo_quota và Storage.remove đúng path vừa tải', async () => {
    for (let i = 0; i < 4; i += 1) await add(jpeg(800, 600), { slot: '3' });
    expect(await codeOf(add(jpeg(800, 600), { slot: '3' }))).toBe('photo_quota');
    const uploaded = (w.storage.uploadAt.mock.calls.at(-1) as unknown as [string])[0];
    expect(w.storage.remove).toHaveBeenCalledWith([uploaded]);
    expect(w.metaOf(c.mandate).inspection!.photos).toHaveLength(4);
  });

  it('P2-4b: ảnh thứ 13 niêm yết ⇒ photo_quota; tổng 100 ảnh ⇒ photo_quota', async () => {
    const listing = Array.from({ length: 12 }, () => photo('listing', a.id));
    (w.metaOf(c.mandate) as any).inspection = { photos: listing };
    expect(await codeOf(add(jpeg(800, 600), { slot: 'listing', room: 'bedroom' }))).toBe('photo_quota');
    expect(w.storage.remove).toHaveBeenCalledTimes(1);
    // 100 ảnh trải trên 25 ô (4 ảnh/ô, đúng trần) ⇒ ô mới còn trống vẫn bị chặn bởi trần tổng
    (w.metaOf(c.mandate) as any).inspection = { photos: Array.from({ length: 100 }, (_, i) => photo(String((i % 25) + 1) as any, a.id)) };
    expect(await codeOf(add(jpeg(800, 600), { slot: '30' }))).toBe('photo_quota');
  });

  it('P2-5: slot listing thiếu room (hoặc room lạ) ⇒ photo_bad_slot; slot ngoài danh sách ⇒ photo_bad_slot', async () => {
    expect(await codeOf(add(jpeg(800, 600), { slot: 'listing' }))).toBe('photo_bad_slot');
    expect(await codeOf(add(jpeg(800, 600), { slot: 'listing', room: 'garage' }))).toBe('photo_bad_slot');
    for (const slot of ['0', '33', 'X11', 'X0', 'abc', '']) expect(await codeOf(add(jpeg(800, 600), { slot }))).toBe('photo_bad_slot');
    expect(await codeOf(add(jpeg(800, 600), {}))).toBe('photo_bad_slot');
    expect(await codeOf(add(jpeg(800, 600), { slot: 'listing', room: 'view' }))).toBe('OK');
    expect(await codeOf(add(jpeg(800, 600), { slot: 'X10' }))).toBe('OK');
    expect(w.storage.uploadAt).toHaveBeenCalledTimes(2);
  });

  it('chỉ chủ ca, chỉ khi inspecting: Inspector khác ⇒ not_found; ca chưa nhận ⇒ bad_stage; không chạm Storage', async () => {
    const b = w.addInspector('b');
    expect(await codeOf(w.photos.add(w.actor(b), c.mandate.id, { size: 1, buffer: jpeg(800, 600) }, { slot: '1' }))).toBe('inspection_not_found');
    const waiting = w.addCase({ hostId: a.id });
    expect(await codeOf(w.photos.add(w.actor(a), waiting.mandate.id, { size: 1, buffer: jpeg(800, 600) }, { slot: '1' }))).toBe('inspection_bad_stage');
    expect(await codeOf(w.photos.add(w.actor(a), c.mandate.id, undefined, { slot: '1' }))).toBe('photo_invalid_type');
    expect(w.storage.uploadAt).not.toHaveBeenCalled();
  });

  it('stage đổi giữa lúc tải và lúc ghi meta (đã nộp) ⇒ bad_stage và file vừa tải bị xóa', async () => {
    w.storage.uploadAt.mockImplementationOnce(async (p: string) => {
      (w.metaOf(c.mandate) as any).stage = 'approved'; // nộp xong ngay lúc ta đang tải Storage
      return p;
    });
    expect(await codeOf(add(jpeg(800, 600)))).toBe('inspection_bad_stage');
    expect(w.storage.remove).toHaveBeenCalledTimes(1);
  });

  it('Storage lỗi 503 ⇒ storage_unavailable', async () => {
    const { ServiceUnavailableException } = await import('@nestjs/common');
    w.storage.uploadAt.mockRejectedValueOnce(new ServiceUnavailableException('x'));
    expect(await codeOf(add(jpeg(800, 600)))).toBe('storage_unavailable');
  });

  it('E7 xóa ảnh: bỏ khỏi meta rồi xóa file SAU commit; ảnh lạ ⇒ not_found; ca đã nộp ⇒ bad_stage', async () => {
    const view: any = await add(jpeg(800, 600));
    const gone = await w.photos.remove(w.actor(a), c.mandate.id, view.id);
    expect(gone).toEqual({ removed: true });
    expect(w.metaOf(c.mandate).inspection!.photos).toHaveLength(0);
    expect(w.storage.remove).toHaveBeenCalledTimes(1);
    expect(await codeOf(w.photos.remove(w.actor(a), c.mandate.id, view.id))).toBe('inspection_not_found');
    const view2: any = await add(jpeg(800, 600));
    (w.metaOf(c.mandate) as any).stage = 'approved';
    expect(await codeOf(w.photos.remove(w.actor(a), c.mandate.id, view2.id))).toBe('inspection_bad_stage');
  });
});

describe('Ảnh niêm yết công khai (E9)', () => {
  let w: World;
  const M = '00000000-0000-4000-8000-000000000123';
  const PID = '11111111-1111-4111-8111-111111111111';
  const FILE = `${PID}.jpg`;
  beforeEach(() => {
    w = buildWorld();
  });
  const publish = (verified = true, id = PID) => {
    w.db.units.push({ id: 'u-pub', isVerified: verified });
    w.db.media.push({ id: 'm1', unitId: 'u-pub', url: `/api/v1/media/listing/${M}/${id}.jpg`, order: 0 });
  };

  it('P2-6: ảnh hạng mục (không có UnitMedia) ⇒ null/404, Storage không được gọi; hồ sơ chưa đạt (unit chưa verified) cũng 404', async () => {
    expect(await w.media.get(M, FILE)).toBeNull();
    expect(w.storage.download).not.toHaveBeenCalled();
    publish(false);
    expect(await w.media.get(M, FILE)).toBeNull();
    expect(w.storage.download).not.toHaveBeenCalled();
  });

  it('tên file/mandateId sai định dạng ⇒ null mà không truy vấn gì (chặn path traversal)', async () => {
    for (const f of ['../x.jpg', `${PID}.gif`, 'abc.jpg', `${PID}.jpg/..`, '']) expect(await w.media.get(M, f)).toBeNull();
    expect(await w.media.get('not-uuid', FILE)).toBeNull();
    expect(w.storage.download).not.toHaveBeenCalled();
  });

  it('P2-7: ảnh niêm yết hợp lệ ⇒ trả bytes + mime; lần 2 không gọi Storage (cache LRU)', async () => {
    publish();
    const first = await w.media.get(M, FILE);
    expect(first).toEqual({ buf: Buffer.from('img-bytes'), mime: 'image/jpeg' });
    expect(w.storage.download).toHaveBeenCalledWith(`inspections/${M}/${FILE}`);
    await w.media.get(M, FILE);
    expect(w.storage.download).toHaveBeenCalledTimes(1);
  });

  it('LRU: nhiều lượt xem đồng thời cùng URL lúc cache trống không làm sổ byte lệch', async () => {
    const svc = new ListingMediaService(w.prisma, w.storage as any);
    w.db.units.push({ id: 'u-pub', isVerified: true });
    w.db.media.push({ id: 'm1', unitId: 'u-pub', url: `/api/v1/media/listing/${M}/${FILE}`, order: 0 });
    await Promise.all(Array.from({ length: 13 }, () => svc.get(M, FILE)));
    expect((svc as any).bytes).toBe(Buffer.from('img-bytes').length);
  });

  it('LRU: quá 64 ảnh thì bỏ ảnh cũ nhất; lỗi Storage không vào cache; file thiếu ⇒ null', async () => {
    const svc = new ListingMediaService(w.prisma, w.storage as any);
    const ids = Array.from({ length: MEDIA_CACHE_MAX_ITEMS + 1 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    ids.forEach((id) => w.db.media.push({ id, unitId: 'u-pub', url: `/api/v1/media/listing/${M}/${id}.jpg`, order: 0 }));
    w.db.units.push({ id: 'u-pub', isVerified: true });
    for (const id of ids) await svc.get(M, `${id}.jpg`);
    expect(w.storage.download).toHaveBeenCalledTimes(65);
    await svc.get(M, `${ids[64]}.jpg`);
    expect(w.storage.download).toHaveBeenCalledTimes(65); // mới nhất còn trong cache
    await svc.get(M, `${ids[0]}.jpg`);
    expect(w.storage.download).toHaveBeenCalledTimes(66); // cũ nhất đã bị đẩy ra

    w.storage.download.mockRejectedValueOnce(new Error('503'));
    publish(true, 'ffffffff-ffff-4fff-8fff-ffffffffffff');
    await expect(svc.get(M, 'ffffffff-ffff-4fff-8fff-ffffffffffff.jpg')).rejects.toThrow('503');
    w.storage.download.mockResolvedValueOnce(null);
    expect(await svc.get(M, 'ffffffff-ffff-4fff-8fff-ffffffffffff.jpg')).toBeNull();
  });

  describe('HTTP', () => {
    let app: INestApplication;
    beforeEach(async () => {
      const mod = await Test.createTestingModule({
        controllers: [ListingMediaController],
        providers: [{ provide: ListingMediaService, useValue: w.media }, { provide: APP_FILTER, useClass: HttpExceptionFilter }],
      }).compile();
      app = mod.createNestApplication();
      await app.init();
    });
    afterEach(() => app.close());

    it('200 kèm Content-Type + Cache-Control public/immutable + nosniff; chưa niêm yết ⇒ 404', async () => {
      publish();
      const res = await request(app.getHttpServer()).get(`/media/listing/${M}/${FILE}`).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (d: Buffer) => chunks.push(d));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/jpeg');
      expect(res.headers['cache-control']).toBe('public, max-age=86400, immutable');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect((res.body as Buffer).toString()).toBe('img-bytes');
      const missing = await request(app.getHttpServer()).get(`/media/listing/${M}/22222222-2222-4222-8222-222222222222.jpg`);
      expect(missing.status).toBe(404);
    });
  });
});
