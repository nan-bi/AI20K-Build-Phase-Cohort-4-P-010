import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingService } from './booking.service';
import { BookingAccessService } from '../tenant/booking-access.service';
import { PhoneService } from '../auth/phone/phone.service';
import { ActionTokenService } from '../auth/otp/action-token.service';
import { DemoGuard } from '../demo/demo.guard';
import { ViewingStatus, UnitStatus, TicketStatus, HostDutyStatus } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000002';
const UNIT_ID = '00000000-0000-4000-8000-000000000010';
const HOST_ID = '00000000-0000-4000-8000-000000000020';

function getValidFutureSlot(): string {
  const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days ahead
  // 08:30 VN time = 01:30 UTC
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 1, 30, 0, 0)).toISOString();
}

function fakePrisma() {
  const mockUnit = {
    id: UNIT_ID,
    unitCode: 'VHOP-S1.02-1208',
    status: UnitStatus.AVAILABLE,
    isVerified: true,
    doorLockType: 'ELECTRONIC_PIN',
    layoutType: 'ONE_BED_PLUS',
    baseRentPrice: 6500000,
    marketAvgPrice: 7000000,
    managementFee: 500000,
    parkingFeeEstimate: 100000,
    utilityCostEstimate: 500000,
    carpetAreaM2: 45,
    floorNumber: 12,
    doorNumber: '08',
    title: 'Căn hộ 1PN+ Sapphire',
    building: { buildingCode: 'S1.02', zoneName: 'The Sapphire 1' },
    media: [{ id: 'm1', url: 'https://cdn.example.com/img1.jpg', order: 0 }],
  };

  let savedViewing: any = null;

  const prisma: Record<string, any> = {
    unit: {
      findFirst: jest.fn(async () => ({ ...mockUnit })),
      update: jest.fn(async ({ data }) => ({ ...mockUnit, ...data })),
    },
    viewing: {
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async ({ where }) => {
        if (savedViewing && where.bookingRefCode === savedViewing.bookingRefCode) {
          return { ...savedViewing };
        }
        return null;
      }),
      create: jest.fn(async ({ data }) => {
        savedViewing = {
          id: 'viewing-1',
          ...data,
          createdAt: new Date(),
          unit: mockUnit,
          tickets: [],
          deposit: null,
        };
        return savedViewing;
      }),
      update: jest.fn(async ({ where, data }) => {
        if (savedViewing && savedViewing.id === where.id) {
          savedViewing = { ...savedViewing, ...data };
          return savedViewing;
        }
        return { id: where.id, ...data, unit: mockUnit, tickets: [], deposit: null };
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    profile: {
      findUnique: jest.fn(async () => ({
        id: TENANT_ID,
        fullName: 'Nguyễn Văn Thuê',
        isPhoneVerified: true,
        phoneHash: 'sample-hash',
      })),
      findFirst: jest.fn(async () => null),
      update: jest.fn(async ({ data }) => ({ id: TENANT_ID, ...data })),
    },
    dispatchTicket: {
      create: jest.fn(async ({ data }) => ({ id: 'ticket-1', ...data })),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    fieldHost: {
      findFirst: jest.fn(async () => ({
        id: HOST_ID,
        rating: 4.9,
        dutyStatus: HostDutyStatus.ONLINE_AVAILABLE,
        assignedZone: 'The Sapphire 1',
        profile: { fullName: 'Trần Host' },
      })),
    },
    holdingDeposit: {
      update: jest.fn(async ({ data }) => data),
      create: jest.fn(async ({ data }) => data),
    },
    $transaction: jest.fn(async (cbOrArr: any) => {
      if (typeof cbOrArr === 'function') {
        return cbOrArr(prisma);
      }
      return Promise.all(cbOrArr);
    }),
  };

  return { prisma, mockUnit, getSavedViewing: () => savedViewing, setSavedViewing: (v: any) => { savedViewing = v; } };
}

describe('Tenant Booking Backend (SPEC-P02 §6: 14 test cases)', () => {
  let bookingService: BookingService;
  let bookingAccess: BookingAccessService;
  let phoneService: PhoneService;
  let actionTokens: ActionTokenService;
  let fixture: ReturnType<typeof fakePrisma>;

  beforeEach(() => {
    fixture = fakePrisma();
    const config = new ConfigService({
      AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!',
      NODE_ENV: 'test',
    });
    phoneService = new PhoneService(config);
    actionTokens = {
      redeem: jest.fn(),
    } as unknown as ActionTokenService;

    bookingAccess = new BookingAccessService(fixture.prisma as any);
    bookingService = new BookingService(
      fixture.prisma as any,
      bookingAccess,
      phoneService,
      actionTokens,
    );
  });

  // 1. Tạo lịch thiếu token & SĐT chưa xác thực → 403 otp_required
  it('1. tạo lịch thiếu token & SĐT chưa xác thực → 403 otp_required', async () => {
    fixture.prisma.profile.findUnique.mockResolvedValueOnce({
      id: TENANT_ID,
      fullName: 'Khách A',
      isPhoneVerified: false,
      phoneHash: null,
    });

    const dto = {
      unitCode: 'VHOP-S1.02-1208',
      slot: getValidFutureSlot(),
      contactName: 'Khách A',
      phone: '0912345678',
      partySize: 2,
    };

    await expect(bookingService.createBooking({ id: TENANT_ID }, dto)).rejects.toMatchObject({
      status: 403,
      response: expect.objectContaining({ code: 'otp_required' }),
    });
  });

  // 2. Token phone khác → 401 action_token_invalid
  it('2. token phone khác → 401 action_token_invalid', async () => {
    (actionTokens.redeem as jest.Mock).mockResolvedValueOnce({
      phone: '+84988888888', // Khác phone gửi lên
      purpose: 'TENANT_VIEWING',
      jti: 'otp-id-123',
    });

    const dto = {
      unitCode: 'VHOP-S1.02-1208',
      slot: getValidFutureSlot(),
      contactName: 'Khách A',
      phone: '0912345678',
      partySize: 2,
      actionToken: 'valid-token-for-other-phone',
    };

    await expect(bookingService.createBooking({ id: TENANT_ID }, dto)).rejects.toMatchObject({
      status: 401,
      response: expect.objectContaining({ code: 'action_token_invalid' }),
    });
  });

  // 3. Slot ngoài khung → 422 slot_invalid
  it('3. slot ngoài khung (12:00 không thuộc SLOT_TIMES) → 422 slot_invalid', async () => {
    const invalidSlot = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    invalidSlot.setUTCHours(5, 0, 0, 0); // 12:00 VN time (không phải 08:30, 09:30, ...)

    const dto = {
      unitCode: 'VHOP-S1.02-1208',
      slot: invalidSlot.toISOString(),
      contactName: 'Khách A',
      phone: '0912345678',
      partySize: 2,
    };

    await expect(bookingService.createBooking({ id: TENANT_ID }, dto)).rejects.toMatchObject({
      status: 422,
      response: expect.objectContaining({ code: 'slot_invalid' }),
    });
  });

  // 4. Slot trùng → 409 slot_taken
  it('4. slot trùng lịch hẹn đang hoạt động → 409 slot_taken', async () => {
    (actionTokens.redeem as jest.Mock).mockResolvedValueOnce({
      phone: '+84912345678',
      purpose: 'TENANT_VIEWING',
      jti: 'otp-1',
    });
    // Giả lập đã có viewing cùng khung giờ
    fixture.prisma.viewing.findFirst.mockResolvedValueOnce({ id: 'existing-viewing' });

    const dto = {
      unitCode: 'VHOP-S1.02-1208',
      slot: getValidFutureSlot(),
      contactName: 'Khách A',
      phone: '0912345678',
      partySize: 2,
      actionToken: 'valid-token',
    };

    await expect(bookingService.createBooking({ id: TENANT_ID }, dto)).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'slot_taken' }),
    });
  });

  // 5. Căn HOLDING → 409 unit_not_available
  it('5. căn hộ ở trạng thái HOLDING → 409 unit_not_available', async () => {
    fixture.prisma.unit.findFirst.mockResolvedValueOnce({
      ...fixture.mockUnit,
      status: UnitStatus.HOLDING,
    });

    const dto = {
      unitCode: 'VHOP-S1.02-1208',
      slot: getValidFutureSlot(),
      contactName: 'Khách A',
      phone: '0912345678',
      partySize: 2,
    };

    await expect(bookingService.createBooking({ id: TENANT_ID }, dto)).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'unit_not_available' }),
    });
  });

  // 6. SĐT trùng tài khoản khác → 409 phone_already_registered
  it('6. SĐT gắn với tài khoản khác khi hồ sơ chưa có SĐT → 409 phone_already_registered', async () => {
    (actionTokens.redeem as jest.Mock).mockResolvedValueOnce({
      phone: '+84912345678',
      purpose: 'TENANT_VIEWING',
      jti: 'otp-1',
    });
    // Profile của user chưa có phoneHash
    fixture.prisma.profile.findUnique.mockResolvedValue({
      id: TENANT_ID,
      fullName: 'Khách A',
      isPhoneVerified: false,
      phoneHash: null,
    });
    // Tìm thấy tài khoản khác đã dùng phoneHash này
    fixture.prisma.profile.findFirst.mockResolvedValueOnce({
      id: OTHER_USER_ID,
      phoneHash: phoneService.hash('+84912345678'),
    });

    const dto = {
      unitCode: 'VHOP-S1.02-1208',
      slot: getValidFutureSlot(),
      contactName: 'Khách A',
      phone: '0912345678',
      partySize: 2,
      actionToken: 'valid-token',
    };

    await expect(bookingService.createBooking({ id: TENANT_ID }, dto)).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'phone_already_registered' }),
    });
  });

  // 7. Ref đúng format ^VS-[A-HJ-NP-Z2-9]{5}$
  it('7. tạo lịch thành công trả ref đúng định dạng ^VS-[A-HJ-NP-Z2-9]{5}$', async () => {
    (actionTokens.redeem as jest.Mock).mockResolvedValueOnce({
      phone: '+84912345678',
      purpose: 'TENANT_VIEWING',
      jti: 'otp-1',
    });
    fixture.prisma.profile.findUnique.mockResolvedValue({
      id: TENANT_ID,
      fullName: 'Khách A',
      isPhoneVerified: true,
      phoneHash: phoneService.hash('+84912345678'),
    });

    const dto = {
      unitCode: 'VHOP-S1.02-1208',
      slot: getValidFutureSlot(),
      contactName: 'Khách A',
      phone: '0912345678',
      partySize: 2,
      actionToken: 'valid-token',
    };

    const result = await bookingService.createBooking({ id: TENANT_ID }, dto);
    expect(result.ref).toMatch(/^VS-[A-HJ-NP-Z2-9]{5}$/);
    expect(result.status).toBe('pending');
  });

  // 8. SLA ticket = 180s
  it('8. SLA ticket điều phối phải là 180s (3 phút theo charter)', async () => {
    (actionTokens.redeem as jest.Mock).mockResolvedValueOnce({
      phone: '+84912345678',
      purpose: 'TENANT_VIEWING',
      jti: 'otp-1',
    });
    fixture.prisma.profile.findUnique.mockResolvedValue({
      id: TENANT_ID,
      fullName: 'Khách A',
      isPhoneVerified: true,
      phoneHash: phoneService.hash('+84912345678'),
    });

    const dto = {
      unitCode: 'VHOP-S1.02-1208',
      slot: getValidFutureSlot(),
      contactName: 'Khách A',
      phone: '0912345678',
      partySize: 2,
      actionToken: 'valid-token',
    };

    await bookingService.createBooking({ id: TENANT_ID }, dto);
    expect(fixture.prisma.dispatchTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slaSeconds: 180,
          tier: 1,
        }),
      }),
    );
  });

  // 9. Đọc lịch người khác → 404 booking_not_found
  it('9. đọc lịch hẹn của người khác qua loadOwned → 404 booking_not_found', async () => {
    fixture.prisma.viewing.findUnique.mockResolvedValueOnce({
      id: 'viewing-1',
      bookingRefCode: 'VS-TEST1',
      tenantId: OTHER_USER_ID, // Thuộc về người khác
      unit: fixture.mockUnit,
    });

    await expect(bookingAccess.loadOwned('VS-TEST1', { id: TENANT_ID })).rejects.toMatchObject({
      status: 404,
      response: expect.objectContaining({ code: 'booking_not_found' }),
    });
  });

  // 10. Huỷ < 2h → 409 too_late_to_modify
  it('10. huỷ lịch khi giờ xem còn dưới 2 giờ → 409 too_late_to_modify', async () => {
    const slotIn1Hour = new Date(Date.now() + 60 * 60 * 1000); // 1h in future
    fixture.setSavedViewing({
      id: 'viewing-1',
      bookingRefCode: 'VS-TEST2',
      tenantId: TENANT_ID,
      status: ViewingStatus.CONFIRMED,
      viewingSlot: slotIn1Hour,
      unit: fixture.mockUnit,
      unitId: UNIT_ID,
    });

    await expect(
      bookingService.cancelBooking('VS-TEST2', { id: TENANT_ID }, { reason: 'Bận đột xuất' }),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'too_late_to_modify' }),
    });
  });

  // 11. Huỷ đúng → CANCELLED + ticket CANCELLED
  it('11. huỷ hợp lệ (≥ 2h) → viewing CANCELLED và ticket CANCELLED', async () => {
    const slotIn4Hours = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4h in future
    fixture.setSavedViewing({
      id: 'viewing-1',
      bookingRefCode: 'VS-TEST3',
      tenantId: TENANT_ID,
      status: ViewingStatus.CONFIRMED,
      viewingSlot: slotIn4Hours,
      unit: fixture.mockUnit,
      unitId: UNIT_ID,
    });

    const res = await bookingService.cancelBooking(
      'VS-TEST3',
      { id: TENANT_ID },
      { reason: 'Thay đổi kế hoạch cá nhân' },
    );

    expect(fixture.prisma.viewing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ViewingStatus.CANCELLED,
          closedReason: 'Thay đổi kế hoạch cá nhân',
        }),
      }),
    );
    expect(fixture.prisma.dispatchTicket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TicketStatus.CANCELLED,
        }),
      }),
    );
  });

  // 12. Check-in sai trạng thái → 409 bad_status
  it('12. check-in sảnh khi lịch chưa CONFIRMED → 409 bad_status', async () => {
    fixture.setSavedViewing({
      id: 'viewing-1',
      bookingRefCode: 'VS-TEST4',
      tenantId: TENANT_ID,
      status: ViewingStatus.PENDING_CONFIRMATION, // Chưa confirmed
      viewingSlot: new Date(Date.now() + 4 * 60 * 60 * 1000),
      unit: fixture.mockUnit,
      unitId: UNIT_ID,
    });

    await expect(bookingService.lobbyCheckIn('VS-TEST4', { id: TENANT_ID })).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'bad_status' }),
    });
  });

  // 13. Chấm sao 2 lần → 409 already_rated
  it('13. chấm sao lần 2 khi đã có tenantRating → 409 already_rated', async () => {
    fixture.setSavedViewing({
      id: 'viewing-1',
      bookingRefCode: 'VS-TEST5',
      tenantId: TENANT_ID,
      status: ViewingStatus.COMPLETED,
      viewingSlot: new Date(Date.now() - 2 * 60 * 60 * 1000),
      tenantRating: 5, // Đã chấm sao
      unit: fixture.mockUnit,
      unitId: UNIT_ID,
    });

    await expect(
      bookingService.rateBooking('VS-TEST5', { id: TENANT_ID }, { stars: 4 }),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'already_rated' }),
    });
  });

  // 14. DEMO_TOOLS tắt → 404 not_found
  it('14. DemoGuard ném 404 not_found khi DEMO_TOOLS không bật', () => {
    const originalDemo = process.env.DEMO_TOOLS;
    try {
      process.env.DEMO_TOOLS = 'false';
      const guard = new DemoGuard();
      const mockContext = {} as any;

      expect(() => guard.canActivate(mockContext)).toThrow(NotFoundException);
      try {
        guard.canActivate(mockContext);
      } catch (err: any) {
        expect(err.getResponse()).toMatchObject({ code: 'not_found' });
      }
    } finally {
      process.env.DEMO_TOOLS = originalDemo;
    }
  });
});
