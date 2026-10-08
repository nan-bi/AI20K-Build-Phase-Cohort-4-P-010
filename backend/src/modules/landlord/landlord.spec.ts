import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InspectorAssigner } from '../inspection/inspector-assigner.service';
import { ConsignmentMetaStore } from './consignment-meta.store';
import { LandlordAccessService } from './landlord-access.service';
import { LandlordConsignmentService } from './landlord-consignment.service';
import { LandlordDirectoryService } from './landlord-directory.service';
import { LandlordFeeService } from './landlord-fee.service';
import { LandlordController } from './landlord.controller';
import { LandlordFinanceService } from './landlord-finance.service';
import { LandlordMandateService } from './landlord-mandate.service';
import { LandlordPricingService } from './landlord-pricing.service';
import { LandlordPhotoService, displayName } from './landlord-photo.service';
import { sniffImage } from './landlord-photo-storage.service';
import { LandlordUnitsService } from './landlord-units.service';
import { LandlordService } from './landlord.service';
import { MAX_PHOTO_BYTES, consignmentStage, isConsigned, lastMonths, maskPhone, toLayoutType, withConsignmentMeta } from './landlord.mappers';

const ME = '00000000-0000-4000-8000-0000000000aa';
const OTHER = '00000000-0000-4000-8000-0000000000bb';
const MANDATE_ID = '00000000-0000-4000-8000-0000000000cc';
const UNIT_ID = '00000000-0000-4000-8000-0000000000dd';
const NOW = new Date('2026-10-02T03:00:00Z');

const building = { id: 'b1', buildingCode: 'S1.02', zoneName: 'The Sapphire 1', totalFloors: 28 };

function mandateRow(over: Record<string, unknown> = {}, unitOver: Record<string, unknown> = {}) {
  return {
    id: MANDATE_ID,
    unitId: UNIT_ID,
    contractNumber: 'UQ-2026-S102-ABC123',
    status: 'ACTIVE',
    signedAt: null,
    exitRequestedAt: null,
    exitEffectiveAt: null,
    doorAccessConfig: null,
    createdAt: NOW,
    unit: {
      id: UNIT_ID,
      unitCode: 'VHOP-S1.02-1208',
      landlordId: ME,
      status: 'AVAILABLE',
      floorNumber: 12,
      layoutType: 'ONE_BED_PLUS',
      carpetAreaM2: 47,
      baseRentPrice: 6_500_000,
      doorLockType: 'ELECTRONIC_PIN',
      building,
      ...unitOver,
    },
    ...over,
  };
}

/**
 * Prisma giả tối thiểu: chỉ các hàm mà khu Chủ nhà gọi, mỗi hàm là jest.fn để test kiểm tra tham số.
 * `$transaction` chạy TUẦN TỰ (mỗi giao dịch chờ giao dịch trước xong) để mô phỏng khóa dòng `FOR UPDATE`;
 * `state.mandate` là dòng ủy quyền duy nhất mà `ConsignmentMetaStore` đọc/ghi qua `tx` (dùng `seed()` để đặt).
 */
function fakePrisma() {
  const state: { mandate: any } = { mandate: null };
  let chain: Promise<unknown> = Promise.resolve();
  const tx: Record<string, any> = {
    unit: { create: jest.fn(async ({ data }) => ({ id: UNIT_ID, ...data })) },
    doorAccessKey: { create: jest.fn(async () => ({})) },
    exclusiveMandate: {
      create: jest.fn(async ({ data }) => mandateRow({ ...data, id: MANDATE_ID, createdAt: NOW }, { unitCode: data.unitCode })),
      findUnique: jest.fn(async (_args?: any) => state.mandate),
      findMany: jest.fn(async (_args?: any) => []),
      update: jest.fn(async ({ data }) => {
        state.mandate = { ...state.mandate, ...data };
        return state.mandate;
      }),
    },
    $queryRaw: jest.fn(async (..._args: any[]) => []),
  };
  const prisma = {
    tx,
    state,
    seed(row: any) {
      state.mandate = row;
      prisma.exclusiveMandate.findFirst.mockResolvedValue(row);
    },
    building: { findUnique: jest.fn(async () => building) },
    unit: { findUnique: jest.fn(async (_args?: any) => null), findFirst: jest.fn(), findMany: jest.fn(async (_args?: any) => []) },
    exclusiveMandate: { findFirst: jest.fn(), findMany: jest.fn(async () => []), update: jest.fn(async ({ where, data }) => mandateRow({ ...data, id: where.id })) },
    feeConfig: { findUnique: jest.fn(async () => null) },
    profile: { findUnique: jest.fn(async (_args?: any): Promise<{ phoneEnc: string | null; isPhoneVerified?: boolean }> => ({ phoneEnc: 'enc-phone', isPhoneVerified: false })) },
    contract: { findMany: jest.fn(async () => []), findFirst: jest.fn(async (_args?: any) => null) },
    fieldHost: { findFirst: jest.fn(async () => ({ id: 'host-1' })), findMany: jest.fn(async (_args?: any): Promise<any[]> => []) },
    viewing: { findMany: jest.fn(async (_args?: any) => []) },
    auditLog: { findMany: jest.fn(async (_args?: any) => []) },
    holdingDeposit: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn((fn: any) => {
      const run = chain.then(() => fn(tx));
      chain = run.catch(() => undefined);
      return run;
    }),
  };
  tx.fieldHost = prisma.fieldHost;
  return prisma;
}

const feeOf = (prisma: ReturnType<typeof fakePrisma>) => new LandlordFeeService(prisma as any);

describe('Landlord mappers', () => {
  it('nhận cả giá trị UI lẫn enum Prisma cho layout, từ chối giá trị lạ', () => {
    expect(toLayoutType('1PN')).toBe('ONE_BED_PLUS');
    expect(toLayoutType('THREE_BED')).toBe('THREE_BED');
    expect(toLayoutType('penthouse')).toBeNull();
  });

  it('che SĐT: giữ 4 số đầu và 3 số cuối', () => {
    expect(maskPhone('+84901234567')).toBe('0901 *** 567');
    expect(maskPhone(null)).toBeNull();
  });

  it('suy trạng thái hồ sơ: nháp → chờ Host → duyệt; meta.stage ghi đè', () => {
    expect(consignmentStage({ status: 'PENDING_INSPECTION' as any, signedAt: null, doorAccessConfig: null })).toBe('draft');
    expect(consignmentStage({ status: 'PENDING_INSPECTION' as any, signedAt: NOW, doorAccessConfig: null })).toBe('awaiting_host');
    expect(consignmentStage({ status: 'ACTIVE' as any, signedAt: NOW, doorAccessConfig: null })).toBe('approved');
    const inspecting = withConsignmentMeta(null, { form: {} as any, stage: 'inspecting' });
    expect(consignmentStage({ status: 'PENDING_INSPECTION' as any, signedAt: NOW, doorAccessConfig: inspecting })).toBe('inspecting');
  });

  it('lastMonths trả đúng 6 tháng, cũ → mới, tháng cuối là tháng hiện tại', () => {
    const months = lastMonths(6, NOW);
    expect(months.map((m) => m.key)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(months[5].label).toBe('T10');
  });
});

describe('LandlordAccessService — chống đọc/sửa dữ liệu của chủ nhà khác', () => {
  it('truy vấn luôn kèm landlordId của phiên; căn không thuộc về mình → 404', async () => {
    const prisma = fakePrisma();
    prisma.unit.findFirst.mockResolvedValue(null);
    const access = new LandlordAccessService(prisma as any);

    await expect(access.ownedUnit(ME, UNIT_ID)).rejects.toMatchObject({ status: 404 });
    expect(prisma.unit.findFirst).toHaveBeenCalledWith({ where: { landlordId: ME, id: UNIT_ID } });

    await access.ownedUnit(ME, 'VHOP-S1.02-1208').catch(() => undefined);
    expect(prisma.unit.findFirst).toHaveBeenLastCalledWith({ where: { landlordId: ME, unitCode: 'VHOP-S1.02-1208' } });
  });

  it('id ủy quyền không phải uuid → 404, không chạm DB', async () => {
    const prisma = fakePrisma();
    const access = new LandlordAccessService(prisma as any);
    await expect(access.ownedMandate(ME, 'not-a-uuid')).rejects.toMatchObject({ status: 404 });
    expect(prisma.exclusiveMandate.findFirst).not.toHaveBeenCalled();
  });
});

describe('LandlordConsignmentService', () => {
  const dto = { building: 'S1.02', floor: 12, door: '08', layout: '1PN', areaM2: 47, askRent: 6_500_000 };
  let prisma: ReturnType<typeof fakePrisma>;
  let audit: { log: jest.Mock };
  let otp: { verify: jest.Mock; consume: jest.Mock; send: jest.Mock; expiresInSeconds: number };
  let phones: { encrypt: jest.Mock; decrypt: jest.Mock; normalize: jest.Mock };
  let service: LandlordConsignmentService;

  beforeEach(() => {
    prisma = fakePrisma();
    audit = { log: jest.fn() };
    otp = { verify: jest.fn(async () => ({ id: 'otp-1' })), consume: jest.fn(async () => true), send: jest.fn(async () => ({})), expiresInSeconds: 300 } as any;
    phones = {
      encrypt: jest.fn((v: string) => `ENC(${v})`),
      decrypt: jest.fn(() => '+84901234567'),
      normalize: jest.fn((v: string) => (/^0\d{9}$/.test(v) ? `+84${v.slice(1)}` : null)),
    };
    service = new LandlordConsignmentService(
      prisma as any,
      new LandlordAccessService(prisma as any),
      audit as any,
      otp as any,
      phones as any,
      { withUrls: jest.fn(async () => []) } as any,
      new ConsignmentMetaStore(prisma as any),
      new InspectorAssigner(),
    );
  });

  it('tạo hồ sơ: căn UNLISTED + ủy quyền PENDING_INSPECTION, trạng thái draft, không lộ mã cửa', async () => {
    const out = await service.create(ME, { ...dto, doorCode: '839201', locks: ['smart'] } as any);

    expect(prisma.tx.unit.create.mock.calls[0][0].data).toMatchObject({
      unitCode: 'VHOP-S1.02-1208',
      landlordId: ME,
      status: 'UNLISTED',
      isVerified: false,
      layoutType: 'ONE_BED_PLUS',
      managementFee: 446_500, // 47 m² × 9.500 (mặc định khi chưa có FeeConfig)
    });
    expect(prisma.tx.exclusiveMandate.create.mock.calls[0][0].data.status).toBe('PENDING_INSPECTION');
    expect(prisma.tx.doorAccessKey.create.mock.calls[0][0].data.vaultSecretRef).toBe('aes:ENC(839201)');
    // Mã cửa plaintext không được nằm trong meta hồ sơ hay trong phản hồi.
    expect(JSON.stringify(prisma.tx.exclusiveMandate.create.mock.calls[0][0].data)).not.toContain('839201');
    expect(JSON.stringify(out)).not.toContain('839201');
    expect(out).toMatchObject({ id: MANDATE_ID, status: 'draft', door: '08', layoutKind: '1PN' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'CONSIGNMENT_CREATED', actorId: ME }));
  });

  it.each([
    ['layout lạ', { layout: 'penthouse' }],
    ['cọc nhỏ hơn 2tr', { suggestedDeposit: 1_000_000 }],
    ['cọc quá 3 lần giá thuê', { suggestedDeposit: 6_500_000 * 3 + 1 }],
    ['khóa lạ', { locks: ['laser'] }],
    ['tầng vượt số tầng của tòa', { floor: 40 }],
  ])('từ chối %s bằng 400', async (_name, patch) => {
    await expect(service.create(ME, { ...dto, ...patch } as any)).rejects.toMatchObject({ status: 400 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('bản nháp bỏ kiểm tra tiền cọc đề xuất', async () => {
    await expect(service.create(ME, { ...dto, suggestedDeposit: 1_000_000, draft: true } as any)).resolves.toBeDefined();
  });

  it('tòa không tồn tại → 400; mã căn trùng → 409', async () => {
    prisma.building.findUnique.mockResolvedValueOnce(null);
    await expect(service.create(ME, dto as any)).rejects.toMatchObject({ status: 400 });
    prisma.unit.findUnique.mockResolvedValueOnce({ id: 'x' } as any);
    await expect(service.create(ME, dto as any)).rejects.toMatchObject({ status: 409 });
  });

  describe('ký ủy quyền', () => {
    const draft = () =>
      mandateRow({ status: 'PENDING_INSPECTION', doorAccessConfig: withConsignmentMeta(null, { form: { door: '08' } as any, stage: 'draft' }) });

    it('thành công: verify + consume OTP, đặt signedAt, stage awaiting_host, hạn thẩm định 48h, gán Inspector', async () => {
      prisma.seed(draft());
      prisma.fieldHost.findMany.mockResolvedValue([{ id: 'host-1', createdAt: NOW }]);
      await service.sign(ME, MANDATE_ID, { ownershipWarranted: true, otp: '4829' });

      expect(otp.verify).toHaveBeenCalledWith({ phone: '+84901234567', purpose: 'PHONE_VERIFY', code: '4829' });
      expect(otp.consume).toHaveBeenCalledWith('otp-1');
      const data = prisma.tx.exclusiveMandate.update.mock.calls[0][0].data;
      expect(data.signedAt).toBeInstanceOf(Date);
      const meta = (data.doorAccessConfig as any).consignment;
      expect(meta).toMatchObject({ stage: 'awaiting_host', hostId: 'host-1' });
      expect(new Date(meta.inspectDueAt).getTime() - new Date(meta.ownershipWarrantedAt).getTime()).toBe(48 * 3_600_000);
    });

    it('không cam kết sở hữu → 400 và không tiêu thụ OTP', async () => {
      prisma.seed(draft());
      await expect(service.sign(ME, MANDATE_ID, { ownershipWarranted: false, otp: '4829' })).rejects.toMatchObject({ status: 400 });
      expect(otp.verify).not.toHaveBeenCalled();
    });

    it('chưa có SĐT và không gửi phone → 400', async () => {
      prisma.seed(draft());
      prisma.profile.findUnique.mockResolvedValue({ phoneEnc: null });
      await expect(service.sign(ME, MANDATE_ID, { ownershipWarranted: true, otp: '4829' })).rejects.toMatchObject({ status: 400 });
      expect(prisma.tx.exclusiveMandate.update).not.toHaveBeenCalled();
    });

    it('chưa có SĐT nhưng gửi phone: xác thực OTP trên số đó, KHÔNG gắn vào tài khoản, lưu số ký (mã hoá) trong hồ sơ', async () => {
      prisma.seed(draft());
      prisma.profile.findUnique.mockResolvedValue({ phoneEnc: null });
      await service.sign(ME, MANDATE_ID, { ownershipWarranted: true, otp: '4829', phone: '0901234567' });

      expect(otp.verify).toHaveBeenCalledWith(expect.objectContaining({ phone: '+84901234567', code: '4829' }));
      expect(prisma.profile.findUnique).toHaveBeenCalled(); // chỉ ĐỌC hồ sơ; không có đường ghi Profile
      expect(prisma.tx.exclusiveMandate.update).toHaveBeenCalled();
      const saved = JSON.stringify(prisma.tx.exclusiveMandate.update.mock.calls[0][0]);
      expect(saved).toContain('signedPhoneEnc');
      expect(saved).not.toContain('0901234567');
    });

    it('số đã xác thực của tài khoản + không nhập số khác: KHÔNG cần OTP, vẫn lưu số ký, audit otpSkipped', async () => {
      prisma.seed(draft());
      prisma.profile.findUnique.mockResolvedValue({ phoneEnc: 'enc-phone', isPhoneVerified: true });
      await service.sign(ME, MANDATE_ID, { ownershipWarranted: true });
      expect(otp.verify).not.toHaveBeenCalled();
      expect(otp.consume).not.toHaveBeenCalled();
      expect(JSON.stringify(prisma.tx.exclusiveMandate.update.mock.calls[0][0])).toContain('signedPhoneEnc');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'CONSIGNMENT_SIGNED', newValue: expect.objectContaining({ otpSkipped: true }) }));
    });

    it('số đã xác thực + nhập đúng số đó: vẫn không cần OTP', async () => {
      prisma.seed(draft());
      prisma.profile.findUnique.mockResolvedValue({ phoneEnc: 'enc-phone', isPhoneVerified: true });
      await service.sign(ME, MANDATE_ID, { ownershipWarranted: true, phone: '0901234567' });
      expect(otp.verify).not.toHaveBeenCalled();
      expect(prisma.tx.exclusiveMandate.update).toHaveBeenCalled();
    });

    it('ĐỔI số (khác số đã xác thực): bắt buộc OTP trên số mới; thiếu OTP → 400, không ký', async () => {
      prisma.seed(draft());
      prisma.profile.findUnique.mockResolvedValue({ phoneEnc: 'enc-phone', isPhoneVerified: true });
      await expect(service.sign(ME, MANDATE_ID, { ownershipWarranted: true, phone: '0999999999' })).rejects.toMatchObject({ status: 400 });
      expect(prisma.tx.exclusiveMandate.update).not.toHaveBeenCalled();
      await service.sign(ME, MANDATE_ID, { ownershipWarranted: true, otp: '4829', phone: '0999999999' });
      expect(otp.verify).toHaveBeenCalledWith(expect.objectContaining({ phone: '+84999999999', code: '4829' }));
    });

    it('có số nhưng CHƯA xác thực: vẫn bắt buộc OTP trên số đã lưu', async () => {
      prisma.seed(draft());
      prisma.profile.findUnique.mockResolvedValue({ phoneEnc: 'enc-phone', isPhoneVerified: false });
      await expect(service.sign(ME, MANDATE_ID, { ownershipWarranted: true })).rejects.toMatchObject({ status: 400 });
      await service.sign(ME, MANDATE_ID, { ownershipWarranted: true, otp: '4829' });
      expect(otp.verify).toHaveBeenCalledWith(expect.objectContaining({ phone: '+84901234567' }));
    });

    it('đã ký rồi → 409; hồ sơ của người khác → 404', async () => {
      prisma.exclusiveMandate.findFirst.mockResolvedValue(mandateRow({ status: 'PENDING_INSPECTION', signedAt: NOW }));
      await expect(service.sign(ME, MANDATE_ID, { ownershipWarranted: true, otp: '4829' })).rejects.toMatchObject({ status: 409 });
      prisma.exclusiveMandate.findFirst.mockResolvedValue(null);
      await expect(service.sign(OTHER, MANDATE_ID, { ownershipWarranted: true, otp: '4829' })).rejects.toMatchObject({ status: 404 });
    });
  });
});

describe('LandlordConsignmentService.get — phiếu thẩm định cho chủ nhà (E10)', () => {
  const build = (meta: any) => {
    const prisma = fakePrisma();
    prisma.seed(mandateRow({ status: 'PENDING_INSPECTION', signedAt: NOW, doorAccessConfig: withConsignmentMeta(null, meta) }));
    (prisma.fieldHost as any).findUnique = jest.fn(async () => ({ profile: { fullName: 'Lê Thẩm Định' } }));
    const photos = {
      withUrls: jest.fn(async () => []),
      signPaths: jest.fn(async (paths: string[]) => new Map(paths.map((p) => [p, `https://signed/${p}`]))),
    };
    const service = new LandlordConsignmentService(
      prisma as any, new LandlordAccessService(prisma as any), { log: jest.fn() } as any, {} as any, {} as any,
      photos as any, new ConsignmentMetaStore(prisma as any), new InspectorAssigner(),
    );
    return { prisma, photos, service };
  };

  it('chưa nộp phiếu ⇒ inspection null, không truy vấn Host/ký ảnh', async () => {
    const { prisma, photos, service } = build({ form: { building: 'S1.02', door: '08' } as any, stage: 'inspecting' });
    const out: any = await service.get(ME, MANDATE_ID);
    expect(out.inspection).toBeNull();
    expect(photos.signPaths).not.toHaveBeenCalled();
    expect((prisma.fieldHost as any).findUnique).not.toHaveBeenCalled();
  });

  it('đã nộp ⇒ inspection {hostName, submittedAt, report, photos có link ký}; không lộ path lưu trữ', async () => {
    const photo = { id: 'p1', path: 'inspections/m/p1.jpg', slot: '1', mime: 'image/jpeg', size: 1, width: 800, height: 600, sharpness: null, brightness: null, takenAt: null, uploadedAt: '2026-10-06T00:00:00.000Z', hostId: 'h1' };
    const report = { hostId: 'h1', submittedAt: '2026-10-06T01:00:00.000Z', recommendation: 'approve', avgCondition: 80 };
    const { service } = build({ form: { building: 'S1.02', door: '08' } as any, stage: 'approved', report, inspection: { photos: [photo] } });
    const out: any = await service.get(ME, MANDATE_ID);
    expect(out.inspection).toMatchObject({ hostName: 'Lê Thẩm Định', submittedAt: report.submittedAt, report });
    expect(out.inspection.photos).toEqual([expect.objectContaining({ id: 'p1', slot: '1', url: 'https://signed/inspections/m/p1.jpg' })]);
    expect(out.inspection.photos[0]).not.toHaveProperty('path');
  });
});

describe('LandlordConsignmentService.sendSignOtp', () => {
  const build = () => {
    const prisma = fakePrisma();
    const otp = { send: jest.fn(async () => ({ devCode: '4829' })), expiresInSeconds: 300 };
    const phones = {
      decrypt: jest.fn(() => '+84901234567'),
      normalize: jest.fn((v: string) => (/^0\d{9}$/.test(v) ? `+84${v.slice(1)}` : null)),
    };
    const service = new LandlordConsignmentService(
      prisma as any,
      new LandlordAccessService(prisma as any),
      { log: jest.fn() } as any,
      otp as any,
      phones as any,
      { withUrls: jest.fn(async () => []) } as any,
      new ConsignmentMetaStore(prisma as any),
      new InspectorAssigner(),
    );
    prisma.exclusiveMandate.findFirst.mockResolvedValue(mandateRow({ status: 'PENDING_INSPECTION' }));
    return { prisma, otp, service };
  };

  it('có số nhưng chưa xác thực → gửi OTP tới số đã lưu, trả SĐT đã che (không lộ số đầy đủ)', async () => {
    const { otp, service } = build();
    const out = await service.sendSignOtp(ME, MANDATE_ID);
    expect(otp.send).toHaveBeenCalledWith({ phone: '+84901234567', purpose: 'PHONE_VERIFY' });
    expect(out).toMatchObject({ otpRequired: true, maskedPhone: '0901 *** 567', expiresInSeconds: 300, devCode: '4829' });
    expect(JSON.stringify(out)).not.toContain('901234567');
  });

  it('số đã xác thực + không nhập số khác → otpRequired:false, KHÔNG gửi mã', async () => {
    const { prisma, otp, service } = build();
    prisma.profile.findUnique.mockResolvedValue({ phoneEnc: 'enc-phone', isPhoneVerified: true });
    const out = await service.sendSignOtp(ME, MANDATE_ID);
    expect(out).toMatchObject({ otpRequired: false, maskedPhone: '0901 *** 567' });
    expect(otp.send).not.toHaveBeenCalled();
  });

  it('số đã xác thực nhưng nhập số KHÁC → gửi OTP tới số mới', async () => {
    const { prisma, otp, service } = build();
    prisma.profile.findUnique.mockResolvedValue({ phoneEnc: 'enc-phone', isPhoneVerified: true });
    const out = await service.sendSignOtp(ME, MANDATE_ID, '0999999999');
    expect(otp.send).toHaveBeenCalledWith({ phone: '+84999999999', purpose: 'PHONE_VERIFY' });
    expect(out).toMatchObject({ otpRequired: true });
  });

  it('chưa có SĐT → dùng số client gửi; số sai định dạng → 400', async () => {
    const { prisma, otp, service } = build();
    prisma.profile.findUnique.mockResolvedValue({ phoneEnc: null });
    await service.sendSignOtp(ME, MANDATE_ID, '0912345678');
    expect(otp.send).toHaveBeenCalledWith({ phone: '+84912345678', purpose: 'PHONE_VERIFY' });
    await expect(service.sendSignOtp(ME, MANDATE_ID, 'abc')).rejects.toMatchObject({ status: 400 });
    await expect(service.sendSignOtp(ME, MANDATE_ID)).rejects.toMatchObject({ status: 400 });
  });

  it('hồ sơ đã ký → 409, không gửi OTP', async () => {
    const { prisma, otp, service } = build();
    prisma.exclusiveMandate.findFirst.mockResolvedValue(mandateRow({ status: 'PENDING_INSPECTION', signedAt: NOW }));
    await expect(service.sendSignOtp(ME, MANDATE_ID)).rejects.toMatchObject({ status: 409 });
    expect(otp.send).not.toHaveBeenCalled();
  });
});

describe('LandlordMandateService — thoát ủy quyền', () => {
  let prisma: ReturnType<typeof fakePrisma>;
  let audit: { log: jest.Mock };
  let service: LandlordMandateService;

  beforeEach(() => {
    prisma = fakePrisma();
    audit = { log: jest.fn() };
    service = new LandlordMandateService(prisma as any, new LandlordAccessService(prisma as any), audit as any);
  });

  it('căn trống + ủy quyền ACTIVE → EXIT_REQUESTED, hiệu lực sau đúng 15 ngày', async () => {
    prisma.exclusiveMandate.findFirst.mockResolvedValue(mandateRow());
    const out = await service.requestExit(ME, { mandateId: MANDATE_ID, reason: 'Tự ở' }, NOW);

    const data = prisma.exclusiveMandate.update.mock.calls[0][0].data;
    expect(data.status).toBe('EXIT_REQUESTED');
    expect(data.exitEffectiveAt.getTime() - NOW.getTime()).toBe(15 * 86_400_000);
    expect(out).toMatchObject({ status: 'exiting', countdownDays: 15 });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'MANDATE_EXIT_REQUESTED' }));
  });

  it.each(['HOLDING', 'RENTED'])('căn %s → 409, không đổi trạng thái ủy quyền', async (status) => {
    prisma.exclusiveMandate.findFirst.mockResolvedValue(mandateRow({}, { status }));
    await expect(service.requestExit(ME, { mandateId: MANDATE_ID, reason: 'x' }, NOW)).rejects.toMatchObject({ status: 409 });
    expect(prisma.exclusiveMandate.update).not.toHaveBeenCalled();
  });

  it('đã đang thoát → 409; ủy quyền của người khác → 404', async () => {
    prisma.exclusiveMandate.findFirst.mockResolvedValue(mandateRow({ status: 'EXIT_REQUESTED' }));
    await expect(service.requestExit(ME, { mandateId: MANDATE_ID, reason: 'x' }, NOW)).rejects.toMatchObject({ status: 409 });
    prisma.exclusiveMandate.findFirst.mockResolvedValue(null);
    await expect(service.requestExit(OTHER, { mandateId: MANDATE_ID, reason: 'x' }, NOW)).rejects.toMatchObject({ status: 404 });
  });

  it('hủy thoát: chỉ khi đang EXIT_REQUESTED, xóa mốc ngày', async () => {
    prisma.exclusiveMandate.findFirst.mockResolvedValue(mandateRow({ status: 'EXIT_REQUESTED' }));
    await service.cancelExit(ME, { mandateId: MANDATE_ID });
    expect(prisma.exclusiveMandate.update.mock.calls[0][0].data).toEqual({ status: 'ACTIVE', exitRequestedAt: null, exitEffectiveAt: null });

    prisma.exclusiveMandate.findFirst.mockResolvedValue(mandateRow());
    await expect(service.cancelExit(ME, { mandateId: MANDATE_ID })).rejects.toMatchObject({ status: 409 });
  });
});

describe('LandlordFinanceService', () => {
  const contract = (over: Record<string, unknown>) => ({
    unitId: UNIT_ID,
    status: 'ACTIVE',
    monthlyRentPrice: 10_000_000,
    securityDepositAmount: 10_000_000,
    startDate: new Date('2026-08-15'),
    endDate: new Date('2027-08-14'),
    ...over,
  });

  it('chưa cấu hình phí → mặc định 5% và báo feeSource=default; tính thực nhận theo tháng có hợp đồng', async () => {
    const prisma = fakePrisma();
    prisma.unit.findMany.mockResolvedValue([{ id: UNIT_ID, unitCode: 'U1', status: 'RENTED', building, mandates: [{ status: 'ACTIVE' }] }]);
    prisma.contract.findMany.mockResolvedValue([contract({})]);
    const out = await new LandlordFinanceService(prisma as any, feeOf(prisma)).getFinance(ME, NOW);

    expect(out).toMatchObject({ serviceFeePercent: 5, feeSource: 'default' });
    expect(out.thisMonth).toEqual({ gross: 10_000_000, fee: 500_000, net: 9_500_000 });
    // HĐ bắt đầu 15/08 → tháng 5,6,7 chưa có thu; 8,9,10 có thu.
    expect(out.history.map((m) => m.gross)).toEqual([0, 0, 0, 10_000_000, 10_000_000, 10_000_000]);
    expect(out.totalNet6Months).toBe(28_500_000);
    expect(out.perUnit[0]).toMatchObject({ rent: 10_000_000, fee: 500_000, net: 9_500_000, escrow: 10_000_000 });
    expect(out.escrowTotal).toBe(10_000_000);
  });

  it('dùng tỷ lệ Admin cấu hình; căn đang giữ chỗ tính cọc 2tr vào escrow, không có tiền thuê', async () => {
    const prisma = fakePrisma();
    prisma.feeConfig.findUnique.mockResolvedValue({ paramValue: 8 } as any);
    prisma.unit.findMany.mockResolvedValue([{ id: UNIT_ID, unitCode: 'U1', status: 'HOLDING', building, mandates: [{ status: 'ACTIVE' }] }]);
    prisma.holdingDeposit.findMany.mockResolvedValue([{ unitId: UNIT_ID, amount: 2_000_000 }]);
    const out = await new LandlordFinanceService(prisma as any, feeOf(prisma)).getFinance(ME, NOW);

    expect(out).toMatchObject({ serviceFeePercent: 8, feeSource: 'config', escrowTotal: 2_000_000 });
    expect(out.perUnit[0]).toMatchObject({ status: 'holding', rent: 0, escrow: 2_000_000 });
  });
});

describe('LandlordUnitsService', () => {
  const unitRow = (over: Record<string, unknown> = {}) => ({
    id: UNIT_ID,
    unitCode: 'VHOP-S1.02-1208',
    landlordId: ME,
    status: 'AVAILABLE',
    floorNumber: 12,
    layoutType: 'ONE_BED_PLUS',
    carpetAreaM2: 47,
    baseRentPrice: 6_500_000,
    managementFee: 446_500,
    parkingFeeEstimate: 150_000,
    utilityCostEstimate: 600_000,
    doorLockType: 'ELECTRONIC_PIN',
    isVerified: true,
    building,
    mandates: [{ id: MANDATE_ID, status: 'ACTIVE', signedAt: new Date('2026-03-01'), exitRequestedAt: null, exitEffectiveAt: null, contractNumber: 'UQ-1' }],
    deposits: [],
    contract: [],
    media: [],
    viewings: [],
    _count: { viewings: 3 },
    ...over,
  });
  const build = (prisma: ReturnType<typeof fakePrisma>) =>
    new LandlordUnitsService(prisma as any, new LandlordAccessService(prisma as any), { decrypt: jest.fn(() => '+84901234567') } as any, feeOf(prisma), new LandlordDirectoryService(prisma as any));

  it('danh sách: lọc theo landlordId của phiên, ẩn hồ sơ còn chờ thẩm định, căn có khách đang xem → viewing', async () => {
    const prisma = fakePrisma();
    prisma.unit.findMany.mockResolvedValue([
      unitRow({ viewings: [{ id: 'v1' }] }),
      unitRow({ id: 'u2', mandates: [{ status: 'PENDING_INSPECTION' }] }),
    ] as any);
    const out = await build(prisma).list(ME);

    expect(prisma.unit.findMany.mock.calls[0][0].where).toEqual({ landlordId: ME });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ status: 'viewing', layoutKind: '1PN', lock: 'smart', rent: 6_500_000, totalViewings: 3 });
  });

  it('danh sách chỉ gồm căn ĐÃ qua ký gửi: không có ủy quyền (nhập thẳng DB) hoặc còn chờ thẩm định thì ẩn', async () => {
    const prisma = fakePrisma();
    prisma.unit.findMany.mockResolvedValue([
      unitRow({ id: 'ok' }),
      unitRow({ id: 'imported-no-mandate', mandates: [] }),
      unitRow({ id: 'pending', mandates: [{ status: 'PENDING_INSPECTION' }] }),
      unitRow({ id: 'ended', mandates: [{ status: 'TERMINATED', id: MANDATE_ID }] }),
    ] as any);
    const out = await build(prisma).list(ME);
    expect(out.map((u) => u.id)).toEqual(['ok', 'ended']);
  });

  it('isConsigned: chỉ true khi có ủy quyền và không còn PENDING_INSPECTION', () => {
    expect(isConsigned({ mandates: [] })).toBe(false);
    expect(isConsigned({ mandates: [{ status: 'PENDING_INSPECTION' as any }] })).toBe(false);
    for (const status of ['ACTIVE', 'EXIT_REQUESTED', 'TERMINATED', 'EXPIRED']) expect(isConsigned({ mandates: [{ status: status as any }] })).toBe(true);
  });

  it('chi tiết: không bao giờ include/trả DoorAccessKey; có All-in và ngày gia hạn ủy quyền', async () => {
    const prisma = fakePrisma();
    prisma.unit.findFirst.mockResolvedValue(unitRow() as any);
    const out = await build(prisma).detail(ME, UNIT_ID, NOW);

    expect(JSON.stringify(prisma.unit.findFirst.mock.calls[0][0])).not.toContain('doorKey');
    expect(JSON.stringify(out)).not.toMatch(/vault|doorKey|secret/i);
    expect(out.allInCost.total).toBe(6_500_000 + 446_500 + 150_000 + 600_000);
    expect(out.mandate?.renewsAt).toEqual(new Date('2027-03-01'));
  });

  it('chi tiết: HĐ đang chạy có phí dịch vụ và số chủ nhà thực nhận theo tỷ lệ cấu hình', async () => {
    const prisma = fakePrisma();
    prisma.feeConfig.findUnique.mockResolvedValue({ paramValue: 5 } as any);
    prisma.unit.findFirst.mockResolvedValue(unitRow() as any);
    prisma.contract.findFirst.mockResolvedValue({
      contractNumber: 'HD-1',
      monthlyRentPrice: 10_000_000,
      securityDepositAmount: 10_000_000,
      leaseTermMonths: 12,
      startDate: NOW,
      endDate: NOW,
      tenant: { fullName: 'Khách B' },
    } as any);
    const out = await build(prisma).detail(ME, UNIT_ID, NOW);
    expect(out.lease).toMatchObject({ rent: 10_000_000, serviceFee: 500_000, landlordNet: 9_500_000, tenantName: 'Khách B' });
  });

  it('chi tiết gom luôn nhật ký xem phòng + mở cửa, và mọi truy vấn song song đều bị khóa theo landlordId', async () => {
    const prisma: any = fakePrisma();
    const t0 = new Date('2026-10-01T02:00:00Z');
    prisma.unit.findFirst.mockResolvedValue(unitRow() as any);
    prisma.fieldHost.findMany.mockResolvedValue([{ id: 'h1', assignedZone: 'The Sapphire 1 (S1.01 - S1.06)', profile: { fullName: 'Host A' } }]);
    prisma.viewing.findMany.mockResolvedValue([
      { id: 'v1', bookingRefCode: 'R1', viewingSlot: t0, status: 'CONFIRMED', lobbyCheckInAt: t0, completedAt: null, tenant: { fullName: 'Khách A', phoneEnc: 'enc' }, deposit: null, tickets: [{ hostId: 'h1' }] },
    ]);
    prisma.auditLog.findMany.mockResolvedValue([{ id: 'a1', createdAt: t0, actorRole: 'field_host', actor: { fullName: 'Host A' }, newValue: { expiresAt: '2026-10-01T02:45:00Z' } }]);

    const out = await build(prisma).detail(ME, UNIT_ID, NOW);

    expect(out.host).toEqual({ id: 'h1', name: 'Host A' });
    expect(out.viewings[0]).toMatchObject({ outcome: 'in_progress', host: { id: 'h1', name: 'Host A' }, tenantPhoneMasked: '0901 *** 567' });
    expect(out.doorAudit[0]).toMatchObject({ actorName: 'Host A', expiresAt: '2026-10-01T02:45:00Z' });
    // Mọi truy vấn chạy song song với việc kiểm tra quyền phải tự khóa theo chủ nhà.
    expect(prisma.contract.findFirst.mock.calls[0][0].where.unit).toMatchObject({ landlordId: ME, id: UNIT_ID });
    expect(prisma.viewing.findMany.mock.calls[0][0].where.unit).toMatchObject({ landlordId: ME, id: UNIT_ID });
  });

  it('chi tiết của căn người khác → 404 và không trả dữ liệu dù các truy vấn song song đã chạy', async () => {
    const prisma: any = fakePrisma();
    prisma.unit.findFirst.mockResolvedValue(null);
    prisma.viewing.findMany.mockResolvedValue([
      { id: 'v-secret', bookingRefCode: 'X', viewingSlot: NOW, status: 'COMPLETED', lobbyCheckInAt: null, completedAt: null, tenant: null, deposit: null, tickets: [] },
    ]);
    await expect(build(prisma).detail(OTHER, UNIT_ID, NOW)).rejects.toMatchObject({ status: 404 });
  });

  it('phí và danh bạ Host chỉ truy vấn DB một lần trong 60 giây', async () => {
    const prisma: any = fakePrisma();
    prisma.unit.findFirst.mockResolvedValue(unitRow() as any);
    const service = build(prisma);
    await service.detail(ME, UNIT_ID, NOW);
    await service.detail(ME, UNIT_ID, NOW);
    expect(prisma.feeConfig.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.fieldHost.findMany).toHaveBeenCalledTimes(1);
  });

  it('nhật ký mở cửa: chỉ log của căn này (entityId), không còn trả log mọi căn', async () => {
    const prisma: any = fakePrisma();
    prisma.unit.findFirst.mockResolvedValue(unitRow() as any);
    await build(prisma).doorAuditTrail(ME, UNIT_ID);

    expect(prisma.auditLog.findMany.mock.calls[0][0].where).toEqual({
      entityName: 'Unit',
      entityId: UNIT_ID,
      actionType: 'DOOR_KEY_REVEAL',
    });
  });

  it('nhật ký xem phòng: che SĐT khách, suy kết quả (cọc / bỏ hẹn / đang xem), thời lượng và tên Host', async () => {
    const prisma: any = fakePrisma();
    prisma.unit.findFirst.mockResolvedValue(unitRow() as any);
    prisma.fieldHost.findMany.mockResolvedValue([{ id: 'h1', assignedZone: 'The Sapphire 1', profile: { fullName: 'Host A' } }]);
    const tenant = { fullName: 'Khách A', phoneEnc: 'enc' };
    const t0 = new Date('2026-10-01T02:00:00Z');
    prisma.viewing.findMany.mockResolvedValue([
      { id: 'v1', bookingRefCode: 'R1', viewingSlot: t0, status: 'COMPLETED', lobbyCheckInAt: t0, completedAt: new Date(t0.getTime() + 25 * 60_000), tenant, deposit: { paymentStatus: 'PAID_HOLDING' }, tickets: [{ hostId: 'h1' }] },
      { id: 'v2', bookingRefCode: 'R2', viewingSlot: t0, status: 'NO_SHOW', lobbyCheckInAt: null, completedAt: null, tenant, deposit: null, tickets: [] },
      { id: 'v3', bookingRefCode: 'R3', viewingSlot: t0, status: 'CONFIRMED', lobbyCheckInAt: t0, completedAt: null, tenant, deposit: null, tickets: [] },
    ]);
    const out = await build(prisma).viewingLog(ME, UNIT_ID);

    expect(out.map((v) => v.outcome)).toEqual(['deposit', 'no_show', 'in_progress']);
    expect(out[0]).toMatchObject({ durationMin: 25, tenantPhoneMasked: '0901 *** 567', host: { id: 'h1', name: 'Host A' } });
    expect(out[1].host).toBeNull();
    expect(JSON.stringify(out)).not.toContain('0901234567');
  });
});

describe('LandlordPhotoService — ảnh tham khảo của chủ nhà', () => {
  const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
  const img = (name: string, buffer: Buffer, size = buffer.length) => ({ originalname: name, buffer, size });

  const metaWith = (photos: unknown[] = [], stage: string = 'draft') =>
    withConsignmentMeta(null, { form: { building: 'S1.02' } as any, stage: stage as any, photos: photos as any });

  const build = (doorAccessConfig: unknown = metaWith()) => {
    const prisma = fakePrisma();
    prisma.seed(mandateRow({ doorAccessConfig, status: 'PENDING_INSPECTION' }));
    let n = 0;
    const storage = {
      upload: jest.fn(async () => `${ME}/${MANDATE_ID}/file-${++n}.jpg`),
      remove: jest.fn(async () => undefined),
      signedUrls: jest.fn(async (paths: string[]) => new Map(paths.map((p) => [p, `https://signed/${p}`]))),
    };
    const audit = { log: jest.fn() };
    const service = new LandlordPhotoService(new LandlordAccessService(prisma as any), storage as any, audit as any, new ConsignmentMetaStore(prisma as any));
    return { prisma, storage, audit, service };
  };
  const savedPhotos = (prisma: ReturnType<typeof fakePrisma>) =>
    (prisma.tx.exclusiveMandate.update.mock.calls[0][0].data.doorAccessConfig as any).consignment.photos;

  it('nhận diện ảnh theo nội dung, không theo đuôi/mimetype', () => {
    expect(sniffImage(JPG)?.ext).toBe('jpg');
    expect(sniffImage(PNG)?.ext).toBe('png');
    expect(sniffImage(WEBP)?.ext).toBe('webp');
    expect(sniffImage(Buffer.from('<?php echo 1; ?>'))).toBeNull();
    expect(sniffImage(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });

  it('tên file chỉ để hiển thị: bỏ đường dẫn, ký tự điều khiển, cắt độ dài', () => {
    expect(displayName('../../etc/passwd')).toBe('passwd');
    expect(displayName('C:\\Users\\a\\phong khach.jpg')).toBe('phong khach.jpg');
    expect(displayName('a\u0000b.png')).toBe('ab.png');
    expect(displayName('x'.repeat(200)).length).toBe(80);
    expect(displayName('')).toBe('anh');
  });

  it('thêm ảnh hợp lệ: tải lên Storage, ghi metadata, trả URL ký, KHÔNG lộ đường dẫn lưu', async () => {
    const { prisma, storage, service } = build();
    const out = await service.add(ME, MANDATE_ID, [img('phong-khach.jpg', JPG), img('bep.png', PNG)]);

    expect(storage.upload).toHaveBeenCalledTimes(2);
    expect(savedPhotos(prisma)).toHaveLength(2);
    expect(out.map((p) => p.name)).toEqual(['phong-khach.jpg', 'bep.png']);
    expect(out[0].url).toMatch(/^https:\/\/signed\//);
    expect(Object.keys(out[0]).sort()).toEqual(['id', 'name', 'size', 'uploadedAt', 'url']);
  });

  it('một file hỏng (giả đuôi .jpg) → 400 và KHÔNG file nào được tải lên', async () => {
    const { storage, service } = build();
    await expect(service.add(ME, MANDATE_ID, [img('ok.jpg', JPG), img('virus.jpg', Buffer.from('MZ\x90\x00'))])).rejects.toMatchObject({ status: 400 });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('ảnh quá 3MB → 400; vượt tổng 8 ảnh → 400', async () => {
    const { service } = build();
    await expect(service.add(ME, MANDATE_ID, [img('big.jpg', JPG, MAX_PHOTO_BYTES + 1)])).rejects.toMatchObject({ status: 400 });

    const seven = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, path: `x/${i}`, name: 'a', size: 1, mime: 'image/jpeg', uploadedAt: NOW.toISOString() }));
    const full = build(metaWith(seven));
    await expect(full.service.add(ME, MANDATE_ID, [img('a.jpg', JPG), img('b.jpg', JPG)])).rejects.toMatchObject({ status: 400 });
    await full.service.add(ME, MANDATE_ID, [img('a.jpg', JPG)]); // đúng 8 thì được
    expect(full.storage.upload).toHaveBeenCalledTimes(1);
  });

  it('lưu DB lỗi giữa chừng → dọn các file vừa tải lên, không để file mồ côi', async () => {
    const { prisma, storage, service } = build();
    prisma.tx.exclusiveMandate.update.mockRejectedValueOnce(new Error('db down'));
    await expect(service.add(ME, MANDATE_ID, [img('a.jpg', JPG), img('b.jpg', JPG)])).rejects.toThrow('db down');
    expect(storage.remove).toHaveBeenCalledWith([expect.stringContaining('file-1'), expect.stringContaining('file-2')]);
  });

  it('hồ sơ đã bị Host nhận/duyệt → 409, không tải lên', async () => {
    for (const stage of ['inspecting', 'approved', 'rejected']) {
      const { storage, service } = build(metaWith([], stage));
      await expect(service.add(ME, MANDATE_ID, [img('a.jpg', JPG)])).rejects.toMatchObject({ status: 409 });
      expect(storage.upload).not.toHaveBeenCalled();
    }
  });

  it('hồ sơ của người khác → 404 trước khi chạm Storage', async () => {
    const { prisma, storage, service } = build();
    prisma.exclusiveMandate.findFirst.mockResolvedValue(null);
    await expect(service.add(OTHER, MANDATE_ID, [img('a.jpg', JPG)])).rejects.toMatchObject({ status: 404 });
    expect(storage.upload).not.toHaveBeenCalled();
    expect(prisma.exclusiveMandate.findFirst.mock.calls[0][0].where).toMatchObject({ unit: { landlordId: OTHER } });
  });

  it('xóa ảnh: bỏ khỏi metadata và xóa file; ảnh không có → 404; hồ sơ đã khóa → 409', async () => {
    const photo = { id: '00000000-0000-4000-8000-0000000000e1', path: `${ME}/${MANDATE_ID}/a.jpg`, name: 'a.jpg', size: 1, mime: 'image/jpeg', uploadedAt: NOW.toISOString() };
    const { prisma, storage, service } = build(metaWith([photo]));
    const out = await service.remove(ME, MANDATE_ID, photo.id);
    expect(out).toEqual([]);
    expect(savedPhotos(prisma)).toEqual([]);
    expect(storage.remove).toHaveBeenCalledWith([photo.path]);

    await expect(build(metaWith([photo])).service.remove(ME, MANDATE_ID, '00000000-0000-4000-8000-0000000000e2')).rejects.toMatchObject({ status: 404 });
    await expect(build(metaWith([photo], 'inspecting')).service.remove(ME, MANDATE_ID, photo.id)).rejects.toMatchObject({ status: 409 });
  });
});

describe('ConsignmentMetaStore — khóa dòng + đọc lại meta trong khóa (hồ sơ 16, B3)', () => {
  const metaOf = (stage: string, extra: Record<string, unknown> = {}) =>
    withConsignmentMeta(null, { form: { door: '08' } as any, stage: stage as any, ...extra });
  const row = (stage: string, extra: Record<string, unknown> = {}) =>
    mandateRow({ status: 'PENDING_INSPECTION', signedAt: NOW, doorAccessConfig: metaOf(stage, extra) });
  const savedMeta = (prisma: ReturnType<typeof fakePrisma>) => (prisma.state.mandate.doorAccessConfig as any).consignment;

  it('khóa dòng bằng SELECT … FOR UPDATE TRƯỚC khi đọc lại hồ sơ, rồi ghi meta + cột phụ trong một UPDATE', async () => {
    const prisma = fakePrisma();
    prisma.seed(row('draft'));
    const order: string[] = [];
    prisma.tx.$queryRaw.mockImplementation(async (strings: TemplateStringsArray, ...vals: unknown[]) => {
      order.push(`lock:${strings.join('?')}:${vals[0]}`);
      return [];
    });
    prisma.tx.exclusiveMandate.findUnique.mockImplementation(async () => (order.push('read'), prisma.state.mandate));
    const store = new ConsignmentMetaStore(prisma as any);

    const out = await store.mutate(MANDATE_ID, async (_m, meta) => ({ meta: { ...meta, stage: 'awaiting_host' }, result: 'ok', extra: { signedAt: NOW } }));

    expect(out).toBe('ok');
    expect(order[0]).toContain('FOR UPDATE');
    expect(order[0]).toContain('::uuid');
    expect(order[0].endsWith(`:${MANDATE_ID}`)).toBe(true);
    expect(order[1]).toBe('read');
    expect(prisma.tx.exclusiveMandate.update).toHaveBeenCalledTimes(1);
    expect(prisma.tx.exclusiveMandate.update.mock.calls[0][0].data.signedAt).toBe(NOW);
    expect(savedMeta(prisma).stage).toBe('awaiting_host');
  });

  it('hai mutate song song: người sau thấy kết quả của người trước (không mất cập nhật)', async () => {
    const prisma = fakePrisma();
    prisma.seed(row('awaiting_host'));
    const store = new ConsignmentMetaStore(prisma as any);
    const bump = (n: number) =>
      store.mutate(MANDATE_ID, async (_m, meta) => {
        await new Promise((r) => setTimeout(r, 5)); // nhường lượt: không có khóa thì cả hai cùng đọc bản cũ
        return { meta: { ...meta, decisionNote: `${meta.decisionNote ?? ''}${n}` }, result: undefined };
      });
    await Promise.all([bump(1), bump(2), bump(3)]);
    expect(savedMeta(prisma).decisionNote).toBe('123');
  });

  it('fn ném lỗi ⇒ không UPDATE; hồ sơ không tồn tại / thiếu meta ⇒ 404', async () => {
    const prisma = fakePrisma();
    prisma.seed(row('draft'));
    const store = new ConsignmentMetaStore(prisma as any);
    await expect(store.mutate(MANDATE_ID, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(prisma.tx.exclusiveMandate.update).not.toHaveBeenCalled();

    prisma.state.mandate = null;
    await expect(store.mutate(MANDATE_ID, async (_m, meta) => ({ meta, result: 1 }))).rejects.toMatchObject({ status: 404 });
    prisma.state.mandate = mandateRow({ status: 'PENDING_INSPECTION', doorAccessConfig: null });
    await expect(store.mutate(MANDATE_ID, async (_m, meta) => ({ meta, result: 1 }))).rejects.toMatchObject({ status: 404 });
    expect(prisma.tx.exclusiveMandate.update).not.toHaveBeenCalled();
  });

  it('P1-17: ảnh chủ nhà add chạy xen giữa lúc Inspector nhận ca ⇒ stage cuối vẫn inspecting, ảnh bị 409 và file được xóa', async () => {
    const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    const prisma = fakePrisma();
    prisma.seed(row('awaiting_host', { hostId: 'host-1' }));
    const store = new ConsignmentMetaStore(prisma as any);
    // "accept" của Inspector (WP2 sẽ có service thật) — ở đây chỉ cần một mutate đổi stage.
    const accept = () =>
      store.mutate(MANDATE_ID, async (_m, meta) => ({
        meta: { ...meta, stage: 'inspecting', hostAcceptedAt: NOW.toISOString() },
        result: undefined,
      }));
    const storage = {
      // Đúng lúc chủ nhà đang tải file lên Storage (ngoài khóa), Inspector nhận ca.
      upload: jest.fn(async () => {
        await accept();
        return `${ME}/${MANDATE_ID}/file-1.jpg`;
      }),
      remove: jest.fn(async () => undefined),
      signedUrls: jest.fn(async () => new Map()),
    };
    const audit = { log: jest.fn() };
    const photos = new LandlordPhotoService(new LandlordAccessService(prisma as any), storage as any, audit as any, store);

    await expect(photos.add(ME, MANDATE_ID, [{ originalname: 'a.jpg', buffer: JPG, size: JPG.length }])).rejects.toMatchObject({ status: 409 });

    expect(savedMeta(prisma)).toMatchObject({ stage: 'inspecting', hostId: 'host-1' });
    expect(savedMeta(prisma).hostAcceptedAt).toBe(NOW.toISOString());
    expect(savedMeta(prisma).photos ?? []).toHaveLength(0);
    expect(storage.remove).toHaveBeenCalledWith([`${ME}/${MANDATE_ID}/file-1.jpg`]);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('P1-17b: xóa ảnh khi Inspector đã nhận ca ⇒ 409, không xóa file', async () => {
    const photo = { id: 'p1', path: 'x/p1.jpg', name: 'a', size: 1, mime: 'image/jpeg', uploadedAt: NOW.toISOString() };
    const prisma = fakePrisma();
    prisma.seed(row('awaiting_host', { photos: [photo] }));
    const store = new ConsignmentMetaStore(prisma as any);
    const storage = { remove: jest.fn(), signedUrls: jest.fn(async () => new Map()) };
    const photosSvc = new LandlordPhotoService(new LandlordAccessService(prisma as any), storage as any, { log: jest.fn() } as any, store);
    // Bản đọc "sớm" của remove vẫn thấy awaiting_host, nhưng khi vào khóa stage đã là inspecting.
    prisma.exclusiveMandate.findFirst.mockResolvedValue(row('awaiting_host', { photos: [photo] }));
    prisma.state.mandate = row('inspecting', { photos: [photo] });
    await expect(photosSvc.remove(ME, MANDATE_ID, 'p1')).rejects.toMatchObject({ status: 409 });
    expect(storage.remove).not.toHaveBeenCalled();
  });
});

describe('LandlordConsignmentService.sign — giao Inspector (P1-1)', () => {
  const build = (hosts: any[], mandates: any[] = []) => {
    const prisma = fakePrisma();
    prisma.fieldHost.findMany.mockResolvedValue(hosts);
    prisma.tx.exclusiveMandate.findMany.mockResolvedValue(mandates);
    prisma.seed(
      mandateRow({ status: 'PENDING_INSPECTION', doorAccessConfig: withConsignmentMeta(null, { form: { door: '08' } as any, stage: 'draft' }) }),
    );
    const audit = { log: jest.fn() };
    const otp = { verify: jest.fn(async () => ({ id: 'otp-1' })), consume: jest.fn(async () => true), expiresInSeconds: 300 };
    const phones = { decrypt: jest.fn(() => '+84901234567'), normalize: jest.fn(), encrypt: jest.fn() };
    const service = new LandlordConsignmentService(
      prisma as any,
      new LandlordAccessService(prisma as any),
      audit as any,
      otp as any,
      phones as any,
      { withUrls: jest.fn(async () => []) } as any,
      new ConsignmentMetaStore(prisma as any),
      new InspectorAssigner(),
    );
    return { prisma, audit, service };
  };
  const busy = (hostId: string, stage = 'awaiting_host') => ({ doorAccessConfig: withConsignmentMeta(null, { form: {} as any, stage: stage as any, hostId }) });
  const savedMeta = (prisma: ReturnType<typeof fakePrisma>) => (prisma.state.mandate.doorAccessConfig as any).consignment;

  it('chọn Inspector cùng phân khu ÍT ca nhất; ghi hostId + offeredAt; audit có inspectorId', async () => {
    const { prisma, audit, service } = build(
      [{ id: 'host-a', createdAt: NOW }, { id: 'host-b', createdAt: NOW }],
      [busy('host-a'), busy('host-a', 'inspecting'), busy('host-b')],
    );
    const out = await service.sign(ME, MANDATE_ID, { ownershipWarranted: true, otp: '4829' });

    expect(savedMeta(prisma)).toMatchObject({ stage: 'awaiting_host', hostId: 'host-b' });
    expect(typeof savedMeta(prisma).offeredAt).toBe('string');
    expect(out).toMatchObject({ status: 'awaiting_host', hostId: 'host-b' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'CONSIGNMENT_SIGNED', newValue: expect.objectContaining({ inspectorId: 'host-b' }) }),
    );
    // Truy vấn chọn người lọc đúng vai INSPECTOR + đúng phân khu của tòa.
    expect(prisma.fieldHost.findMany.mock.calls[0][0].where).toEqual({ roles: { has: 'INSPECTOR' }, assignedZone: { contains: 'The Sapphire 1' } });
  });

  it('không có Inspector trong phân khu ⇒ không ghi hostId/offeredAt (ca vào Open Pool ngay), vẫn ký được', async () => {
    const { prisma, audit, service } = build([]);
    const out = await service.sign(ME, MANDATE_ID, { ownershipWarranted: true, otp: '4829' });

    expect(savedMeta(prisma).stage).toBe('awaiting_host');
    expect(savedMeta(prisma)).not.toHaveProperty('hostId');
    expect(savedMeta(prisma)).not.toHaveProperty('offeredAt');
    expect(out.hostId).toBeNull();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ newValue: expect.objectContaining({ inspectorId: null }) }));
  });

  it('stage đổi giữa lúc kiểm sớm và lúc vào khóa (ký 2 lần song song) ⇒ lần sau 409, không ghi đè', async () => {
    const { prisma, service } = build([{ id: 'host-a', createdAt: NOW }]);
    const dto = { ownershipWarranted: true, otp: '4829' };
    const results = await Promise.allSettled([service.sign(ME, MANDATE_ID, dto), service.sign(ME, MANDATE_ID, dto)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { status: 409 } });
    expect(prisma.tx.exclusiveMandate.update).toHaveBeenCalledTimes(1);
  });
});

describe('LandlordController qua HTTP — phân quyền & lấy landlordId từ phiên', () => {
  let app: INestApplication;
  const units = { list: jest.fn(async () => []), detail: jest.fn(), viewingLog: jest.fn(), doorAuditTrail: jest.fn() };
  const consignments = { list: jest.fn(async () => []), create: jest.fn(async () => ({})), get: jest.fn(), sign: jest.fn() };
  const mandates = { requestExit: jest.fn(async () => ({})), cancelExit: jest.fn() };
  const photos = { add: jest.fn(async () => []), remove: jest.fn(async () => []) };
  const pricing = { decide: jest.fn(async () => ({ stage: 'approved' })) };

  /** Thay SupabaseAuthGuard: vai trò + id lấy từ header test; RolesGuard là bản thật. */
  @Injectable()
  class HeaderAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      req.user = { id: req.headers['x-test-user'], role: req.headers['x-test-role'] };
      return true;
    }
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LandlordController],
      providers: [
        { provide: LandlordService, useValue: { getLandlordDashboard: jest.fn(async () => ({})) } },
        { provide: LandlordUnitsService, useValue: units },
        { provide: LandlordConsignmentService, useValue: consignments },
        { provide: LandlordFinanceService, useValue: { getFinance: jest.fn(async () => ({})) } },
        { provide: LandlordMandateService, useValue: mandates },
        { provide: LandlordPricingService, useValue: pricing },
        { provide: LandlordPhotoService, useValue: photos },
        { provide: APP_GUARD, useClass: HeaderAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  afterAll(() => app.close());

  it.each(['tenant', 'field_host', 'ops_admin'])('vai trò %s bị chặn 403 ở mọi route chủ nhà', async (role) => {
    for (const path of ['/landlord/units', '/landlord/finance', '/landlord/consignments']) {
      await request(app.getHttpServer()).get(path).set('x-test-user', ME).set('x-test-role', role).expect(403);
    }
  });

  it('landlordId lấy từ phiên, bỏ qua ?landlordId= do client gửi', async () => {
    await request(app.getHttpServer())
      .get(`/landlord/units?landlordId=${OTHER}`)
      .set('x-test-user', ME)
      .set('x-test-role', 'landlord')
      .expect(200);
    expect(units.list).toHaveBeenCalledWith(ME);
  });

  it('POST consignments: dữ liệu sai bị ValidationPipe chặn 400 (giá thuê dưới 3tr)', async () => {
    await request(app.getHttpServer())
      .post('/landlord/consignments')
      .set('x-test-user', ME)
      .set('x-test-role', 'landlord')
      .send({ building: 'S1.02', floor: 12, door: '08', layout: '1PN', areaM2: 47, askRent: 1000 })
      .expect(400);
    expect(consignments.create).not.toHaveBeenCalled();
  });

  it('POST photos: đúng role + multipart → gọi service với landlordId từ phiên; không có file → 400', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    await request(app.getHttpServer())
      .post(`/landlord/consignments/${MANDATE_ID}/photos`)
      .set('x-test-user', ME)
      .set('x-test-role', 'landlord')
      .attach('files', png, 'a.png')
      .expect(201);
    expect(photos.add).toHaveBeenCalledWith(ME, MANDATE_ID, [expect.objectContaining({ originalname: 'a.png', size: png.length })]);

    await request(app.getHttpServer())
      .post(`/landlord/consignments/${MANDATE_ID}/photos`)
      .set('x-test-user', ME)
      .set('x-test-role', 'landlord')
      .expect(400);
  });

  it('POST photos: vai trò tenant bị chặn 403, ảnh quá 3MB bị chặn trước khi vào service', async () => {
    await request(app.getHttpServer())
      .post(`/landlord/consignments/${MANDATE_ID}/photos`)
      .set('x-test-user', ME)
      .set('x-test-role', 'tenant')
      .attach('files', Buffer.alloc(10), 'a.png')
      .expect(403);

    photos.add.mockClear();
    // Đúng 3MB: được nhận (giao diện hứa "tối đa 3MB") — vào tới service.
    await request(app.getHttpServer())
      .post(`/landlord/consignments/${MANDATE_ID}/photos`)
      .set('x-test-user', ME)
      .set('x-test-role', 'landlord')
      .attach('files', Buffer.alloc(MAX_PHOTO_BYTES), 'edge.png')
      .expect(201);
    expect(photos.add).toHaveBeenCalledTimes(1);

    photos.add.mockClear();
    await request(app.getHttpServer())
      .post(`/landlord/consignments/${MANDATE_ID}/photos`)
      .set('x-test-user', ME)
      .set('x-test-role', 'landlord')
      .attach('files', Buffer.alloc(MAX_PHOTO_BYTES + 2), 'big.png')
      .expect(413);
    expect(photos.add).not.toHaveBeenCalled();
  });

  it('id hồ sơ không phải uuid → 400 trước khi vào service', async () => {
    await request(app.getHttpServer())
      .get('/landlord/consignments/abc')
      .set('x-test-user', ME)
      .set('x-test-role', 'landlord')
      .expect(400);
    expect(consignments.get).not.toHaveBeenCalled();
  });

  it('POST pricing-decision: chỉ landlord (tenant 403), decision lạ 400, landlordId lấy từ phiên', async () => {
    const id = '00000000-0000-4000-8000-0000000000c1';
    const post = (role: string, body: object) =>
      request(app.getHttpServer()).post(`/landlord/consignments/${id}/pricing-decision`).set('x-test-user', ME).set('x-test-role', role).send(body);
    await post('tenant', { decision: 'accept' }).expect(403);
    await post('landlord', { decision: 'maybe' }).expect(400);
    expect(pricing.decide).not.toHaveBeenCalled();
    await post('landlord', { decision: 'accept' }).expect(200);
    expect(pricing.decide).toHaveBeenCalledWith(ME, id, 'accept');
  });
});
