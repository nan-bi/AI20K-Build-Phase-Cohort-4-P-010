import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';
import * as pdfImport from 'pdf-parse';
const pdf = (pdfImport as any).default || pdfImport;
import { IdentityService } from '../identity/identity.service';
import { LeasePdfService } from './lease-pdf.service';
import { BookingAccessService } from '../tenant/booking-access.service';
import { DepositService } from '../deposit/deposit.service';
import { PhoneService } from '../auth/phone/phone.service';
import { EkycSimulator, EKYC_CONSENT_VERSION } from '../identity/ekyc.simulator';
import { ContractStatus, DepositStatus, UnitStatus, ViewingStatus } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000099';
const LANDLORD_ID = '00000000-0000-4000-8000-000000000030';
const UNIT_ID = '00000000-0000-4000-8000-000000000010';

function fakePrisma() {
  const mockUnit = {
    id: UNIT_ID,
    unitCode: 'VHOP-S1.02-1208',
    status: UnitStatus.HOLDING,
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
    minLeaseMonths: 6,
    landlordId: LANDLORD_ID,
    building: { buildingCode: 'S1.02', zoneName: 'The Sapphire 1' },
    media: [],
  };

  const now = new Date();
  const futureExpiresAt = new Date(now.getTime() + 48 * 3600 * 1000);

  let savedDeposit: any = {
    id: 'dep-1',
    depositCode: 'DEP-VS-99999',
    viewingId: 'viewing-1',
    unitId: UNIT_ID,
    amount: 2000000,
    vietqrRef: 'VQ-9999',
    transferContent: 'COC VHOP-S1.02-1208 0912345678',
    paymentStatus: DepositStatus.PAID_HOLDING,
    paidAt: now,
    holdHours: 48,
    expiresAt: futureExpiresAt,
    identity: null,
    contract: null,
  };

  let savedViewing: any = {
    id: 'viewing-1',
    bookingRefCode: 'VS-99999',
    unitId: UNIT_ID,
    tenantId: TENANT_ID,
    status: ViewingStatus.HOLDING,
    viewingSlot: now,
    partySize: 1,
    contactName: 'NGUYỄN VĂN AN',
    contactPhoneEnc: null,
    unit: mockUnit,
    tenant: { id: TENANT_ID, fullName: 'NGUYỄN VĂN AN' },
    tickets: [],
    deposit: savedDeposit,
  };

  let savedContracts: any[] = [];
  let savedDocuments: any[] = [];
  let savedIdentities: any[] = [];
  let savedAudits: any[] = [];

  const prisma: Record<string, any> = {
    unit: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.id === mockUnit.id || where.unitCode === mockUnit.unitCode) return { ...mockUnit };
        return null;
      }),
      update: jest.fn(async ({ where, data }) => {
        Object.assign(mockUnit, data);
        return { ...mockUnit };
      }),
      updateMany: jest.fn(async ({ data }) => {
        Object.assign(mockUnit, data);
        return { count: 1 };
      }),
    },
    viewing: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.bookingRefCode === savedViewing.bookingRefCode || where.id === savedViewing.id) {
          return {
            ...savedViewing,
            deposit: savedDeposit
              ? {
                  ...savedDeposit,
                  identity: savedIdentities.find((i) => i.depositId === savedDeposit.id) || null,
                  contract: savedContracts.find((c) => c.holdingDepositId === savedDeposit.id) || null,
                }
              : null,
          };
        }
        return null;
      }),
      update: jest.fn(async ({ where, data }) => {
        if (savedViewing.id === where.id) {
          Object.assign(savedViewing, data);
          return { ...savedViewing };
        }
        return { id: where.id, ...data };
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    holdingDeposit: {
      findUnique: jest.fn(async ({ where }) => {
        if (savedDeposit && (savedDeposit.id === where.id || savedDeposit.viewingId === where.viewingId)) {
          return {
            ...savedDeposit,
            identity: savedIdentities.find((i) => i.depositId === savedDeposit.id) || null,
            contract: savedContracts.find((c) => c.holdingDepositId === savedDeposit.id) || null,
          };
        }
        return null;
      }),
      findMany: jest.fn(async ({ where }) => {
        if (!savedDeposit) return [];
        if (where.unitId && savedDeposit.unitId !== where.unitId) return [];
        if (where.paymentStatus && savedDeposit.paymentStatus !== where.paymentStatus) return [];
        if (where.expiresAt?.lte && savedDeposit.expiresAt && new Date(savedDeposit.expiresAt) > new Date(where.expiresAt.lte)) {
          return [];
        }
        return [savedDeposit];
      }),
      update: jest.fn(async ({ where, data }) => {
        if (savedDeposit && savedDeposit.id === where.id) {
          Object.assign(savedDeposit, data);
          return { ...savedDeposit };
        }
        return { id: where.id, ...data };
      }),
    },
    identityVerification: {
      create: jest.fn(async ({ data }) => {
        const idn = { id: `idn-${savedIdentities.length + 1}`, ...data };
        savedIdentities.push(idn);
        if (savedDeposit) savedDeposit.identity = idn;
        return idn;
      }),
    },
    contract: {
      count: jest.fn(async () => savedContracts.length),
      findUnique: jest.fn(async ({ where }) => {
        // Prisma thật ném lỗi (⇒ 500) khi cột uuid nhận chuỗi không phải UUID.
        if (where.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(where.id)) {
          throw new Error('Inconsistent column data: Error creating UUID, invalid character');
        }
        const found = savedContracts.find((c) => c.id === where.id || c.contractNumber === where.contractNumber);
        if (found) {
          const doc = savedDocuments.find((d) => d.id === found.documentId);
          return {
            ...found,
            unit: mockUnit,
            document: doc || null,
            landlord: { id: LANDLORD_ID, fullName: 'Chủ Hộ A' },
            tenant: { id: TENANT_ID, fullName: 'NGUYỄN VĂN AN' },
            holdingDeposit: {
              ...savedDeposit,
              identity: savedIdentities.find((i) => i.depositId === savedDeposit.id) || null,
              viewing: savedViewing,
            },
          };
        }
        return null;
      }),
      create: jest.fn(async ({ data, include }) => {
        const c = {
          id: `00000000-0000-4000-8000-${String(savedContracts.length + 1).padStart(12, '0')}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        savedContracts.push(c);
        if (savedDeposit) savedDeposit.contract = c;
        return {
          ...c,
          unit: mockUnit,
          document: null,
          holdingDeposit: { ...savedDeposit, viewing: savedViewing },
        };
      }),
      update: jest.fn(async ({ where, data }) => {
        const c = savedContracts.find((x) => x.id === where.id);
        if (c) {
          Object.assign(c, data);
          return { ...c };
        }
        return { id: where.id, ...data };
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const c = savedContracts.find((x) => x.id === where.id && (where.documentId === null ? !x.documentId : true));
        if (!c) return { count: 0 };
        Object.assign(c, data);
        return { count: 1 };
      }),
    },
    signedDocument: {
      findUnique: jest.fn(async ({ where }) => {
        return savedDocuments.find((d) => d.id === where.id) || null;
      }),
      create: jest.fn(async ({ data }) => {
        const doc = { id: `doc-${savedDocuments.length + 1}`, ...data };
        savedDocuments.push(doc);
        return doc;
      }),
      delete: jest.fn(async ({ where }) => {
        const i = savedDocuments.findIndex((d) => d.id === where.id);
        if (i >= 0) savedDocuments.splice(i, 1);
        return { id: where.id };
      }),
    },
    exclusiveMandate: {
      findFirst: jest.fn(async () => null),
    },
    profile: {
      update: jest.fn(async ({ where, data }) => ({ id: where.id, ...data })),
    },
    escrowTransaction: {
      create: jest.fn(async ({ data }) => data),
    },
    auditLog: {
      create: jest.fn(async ({ data }) => {
        savedAudits.push(data);
        return data;
      }),
    },
    $transaction: jest.fn(async (cb: any) => {
      if (typeof cb === 'function') {
        return cb(prisma);
      }
      return Promise.all(cb);
    }),
  };

  return {
    prisma,
    mockUnit,
    getSavedViewing: () => savedViewing,
    setSavedViewing: (v: any) => {
      savedViewing = v;
    },
    getSavedDeposit: () => savedDeposit,
    setSavedDeposit: (d: any) => {
      savedDeposit = d;
    },
    savedContracts,
    savedDocuments,
    savedIdentities,
  };
}

describe('eKYC, Lease & PDF Backend Tests (SPEC-P03 §8: Cases 12–18)', () => {
  let identityService: IdentityService;
  let leasePdfService: LeasePdfService;
  let depositService: DepositService;
  let fixture: ReturnType<typeof fakePrisma>;
  let phoneService: PhoneService;
  let bookingAccess: BookingAccessService;

  beforeEach(() => {
    process.env.LEASE_PDF_LOCAL_DIR = './tmp/test-lease-pdfs';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:55432/vinstay_dev';
    process.env.NODE_ENV = 'test';
    process.env.EKYC_SCAN_SECRET = 'test_ekyc_scan_secret_key';

    fixture = fakePrisma();
    const config = new ConfigService({
      AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!',
      NODE_ENV: 'test',
    });
    phoneService = new PhoneService(config);
    bookingAccess = new BookingAccessService(fixture.prisma as any);
    const auditService = { log: jest.fn(async () => {}) } as any;
    const supabaseService = {
      getClient: jest.fn(() => null),
      isConfigured: jest.fn(() => false),
    } as any;

    leasePdfService = new LeasePdfService(
      fixture.prisma as any,
      supabaseService,
      auditService,
      phoneService,
    );
    leasePdfService.onModuleInit();

    depositService = new DepositService(
      fixture.prisma as any,
      auditService,
      phoneService,
      bookingAccess,
    );

    identityService = new IdentityService(
      fixture.prisma as any,
      auditService,
      phoneService,
      bookingAccess,
      depositService,
      leasePdfService,
    );
  });

  // 12. eKYC sau expiresAt → 409 hold_expired và deposit FORFEITED
  it('12. eKYC sau expiresAt → 409 hold_expired và deposit FORFEITED', async () => {
    // Set deposit expired in the past
    fixture.getSavedDeposit().expiresAt = new Date(Date.now() - 60 * 1000);

    await expect(
      identityService.scan('VS-99999', { id: TENANT_ID }, {
        consent: true,
        consentVersion: EKYC_CONSENT_VERSION,
      }),
    ).rejects.toThrow(ConflictException);

    expect(fixture.getSavedDeposit().paymentStatus).toBe(DepositStatus.FORFEITED);
    expect(fixture.mockUnit.status).toBe(UnitStatus.AVAILABLE);
  });

  // 13. Thiếu confirmedLowConfidence → 422 kyc_confirmation_required
  it('13. thiếu confirmedLowConfidence → 422 kyc_confirmation_required', async () => {
    const scanRes = await identityService.scan('VS-99999', { id: TENANT_ID }, {
      consent: true,
      consentVersion: EKYC_CONSENT_VERSION,
    });
    expect(scanRes.lowConfidenceKeys.length).toBeGreaterThan(0);

    const todayStr = new Date().toISOString().split('T')[0];
    await expect(
      identityService.submit('VS-99999', { id: TENANT_ID }, {
        scanId: scanRes.scanId,
        consentVersion: EKYC_CONSENT_VERSION,
        fields: scanRes.fields,
        confirmedLowConfidence: false, // Missing confirmation!
        lease: { startDate: todayStr, months: 12, paymentCycle: 1 },
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // 14. months < minLeaseMonths → 422 lease_terms_invalid
  it('14. months < minLeaseMonths → 422 lease_terms_invalid', async () => {
    const scanRes = await identityService.scan('VS-99999', { id: TENANT_ID }, {
      consent: true,
      consentVersion: EKYC_CONSENT_VERSION,
    });

    const todayStr = new Date().toISOString().split('T')[0];
    await expect(
      identityService.submit('VS-99999', { id: TENANT_ID }, {
        scanId: scanRes.scanId,
        consentVersion: EKYC_CONSENT_VERSION,
        fields: scanRes.fields,
        confirmedLowConfidence: true,
        lease: { startDate: todayStr, months: 3, paymentCycle: 1 }, // unit.minLeaseMonths is 6
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // 15. eKYC đúng → HĐ ACTIVE, deposit CONVERTED_TO_CONTRACT, convertedHoldingAmount = 2000000, unit RENTED, viewing LEASED
  it('15. eKYC đúng → HĐ ACTIVE, deposit CONVERTED_TO_CONTRACT, convertedHoldingAmount = 2000000, unit RENTED, viewing LEASED', async () => {
    const scanRes = await identityService.scan('VS-99999', { id: TENANT_ID }, {
      consent: true,
      consentVersion: EKYC_CONSENT_VERSION,
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const result = await identityService.submit('VS-99999', { id: TENANT_ID }, {
      scanId: scanRes.scanId,
      consentVersion: EKYC_CONSENT_VERSION,
      fields: scanRes.fields,
      confirmedLowConfidence: true,
      lease: { startDate: todayStr, months: 12, paymentCycle: 1 },
    });

    expect(result.contract).toBeDefined();
    expect(result.contract.status).toBe('active');
    expect(result.contract.convertedHolding).toBe(2000000);
    expect(fixture.getSavedDeposit().paymentStatus).toBe(DepositStatus.CONVERTED_TO_CONTRACT);
    expect(fixture.mockUnit.status).toBe(UnitStatus.RENTED);
    expect(fixture.getSavedViewing().status).toBe(ViewingStatus.LEASED);
  });

  // 16. firstPaymentDue.rent === monthlyRent × cycle (không trừ 2tr cọc vào tiền thuê)
  it('16. firstPaymentDue.rent === monthlyRent × cycle (không trừ 2tr)', async () => {
    const scanRes = await identityService.scan('VS-99999', { id: TENANT_ID }, {
      consent: true,
      consentVersion: EKYC_CONSENT_VERSION,
    });

    const todayStr = new Date().toISOString().split('T')[0];
    // Payment cycle 3 months
    const result = await identityService.submit('VS-99999', { id: TENANT_ID }, {
      scanId: scanRes.scanId,
      consentVersion: EKYC_CONSENT_VERSION,
      fields: scanRes.fields,
      confirmedLowConfidence: true,
      lease: { startDate: todayStr, months: 12, paymentCycle: 3 },
    });

    const monthlyRent = 6500000;
    const expectedRent = monthlyRent * 3; // 19.500.000
    const expectedDepositTopUp = monthlyRent - 2000000; // 4.500.000
    const expectedTotal = expectedRent + expectedDepositTopUp; // 24.000.000

    expect(result.contract.firstPaymentDue.rent).toBe(expectedRent);
    expect(result.contract.firstPaymentDue.depositTopUp).toBe(expectedDepositTopUp);
    expect(result.contract.firstPaymentDue.total).toBe(expectedTotal);
    expect(result.contract.firstPaymentDue.transferContent).toBe(
      'VSA VHOP-S1.02-1208 THANH TOAN TIEN THUE KY 1',
    );
  });

  // 17. PDF: buffer bắt đầu %PDF-, chứa chuỗi contractNumber và chữ có dấu "Hợp đồng thuê" sau khi trích text, sha256 khớp
  it('17. PDF: buffer bắt đầu %PDF-, chứa chuỗi contractNumber và chữ có dấu "Hợp đồng thuê", sha256 khớp', async () => {
    const scanRes = await identityService.scan('VS-99999', { id: TENANT_ID }, {
      consent: true,
      consentVersion: EKYC_CONSENT_VERSION,
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const submitResult = await identityService.submit('VS-99999', { id: TENANT_ID }, {
      scanId: scanRes.scanId,
      consentVersion: EKYC_CONSENT_VERSION,
      fields: scanRes.fields,
      confirmedLowConfidence: true,
      lease: { startDate: todayStr, months: 12, paymentCycle: 1 },
    });

    const contractId = submitResult.contract.id;

    // Generate PDF synchronously via ensure
    const ensureResult = await leasePdfService.ensure(contractId);
    expect(ensureResult.ready).toBe(true);
    expect(ensureResult.sha256).toBeDefined();

    // Stream PDF buffer
    const { buffer } = await leasePdfService.getPdfStream(contractId, TENANT_ID, 'tenant');
    expect(buffer).toBeDefined();
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    // Parse PDF text with pdf-parse
    const parsed = await pdf(buffer);
    expect(parsed.text).toContain('HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ');
    expect(parsed.text).toContain(submitResult.contract.contractNumber);
    expect(parsed.text).toContain('BÊN CHO THUÊ (BÊN A)');
    expect(parsed.text).toContain('BÊN THUÊ (BÊN B)');
    expect(parsed.text).toContain('XÁC LẬP ĐIỆN TỬ QUA HỆ THỐNG VINSTAY AI');
  });

  // 18. Tải PDF HĐ người khác → 404
  it('18. tải PDF HĐ người khác → 404', async () => {
    const scanRes = await identityService.scan('VS-99999', { id: TENANT_ID }, {
      consent: true,
      consentVersion: EKYC_CONSENT_VERSION,
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const submitResult = await identityService.submit('VS-99999', { id: TENANT_ID }, {
      scanId: scanRes.scanId,
      consentVersion: EKYC_CONSENT_VERSION,
      fields: scanRes.fields,
      confirmedLowConfidence: true,
      lease: { startDate: todayStr, months: 12, paymentCycle: 1 },
    });

    const contractId = submitResult.contract.id;

    // Calling with OTHER_USER_ID as a tenant must throw NotFoundException (404)
    await expect(
      leasePdfService.getPdfStream(contractId, OTHER_USER_ID, 'tenant'),
    ).rejects.toThrow(NotFoundException);
  });

  async function leasedContractId(): Promise<string> {
    const scanRes = await identityService.scan('VS-99999', { id: TENANT_ID }, {
      consent: true,
      consentVersion: EKYC_CONSENT_VERSION,
    });
    const todayStr = new Date().toISOString().split('T')[0];
    const submitResult = await identityService.submit('VS-99999', { id: TENANT_ID }, {
      scanId: scanRes.scanId,
      consentVersion: EKYC_CONSENT_VERSION,
      fields: scanRes.fields,
      confirmedLowConfidence: true,
      lease: { startDate: todayStr, months: 12, paymentCycle: 1 },
    });
    // submit() đã kích hoạt ensure nền; chờ nó xong để các ca dưới bắt đầu từ trạng thái "chưa có tài liệu".
    await leasePdfService.ensure(submitResult.contract.id);
    fixture.savedDocuments.length = 0;
    fixture.savedContracts.find((c: any) => c.id === submitResult.contract.id).documentId = null;
    return submitResult.contract.id;
  }

  // 19. ensure() gọi đồng thời trong một tiến trình → đúng MỘT tài liệu LEASE (SPEC-P03 §6.1)
  it('19. ensure() song song cùng hợp đồng → chỉ một SignedDocument, cùng sha256', async () => {
    const contractId = await leasedContractId();
    const [a, b, c] = await Promise.all([
      leasePdfService.ensure(contractId),
      leasePdfService.ensure(contractId),
      leasePdfService.ensure(contractId),
    ]);
    expect(fixture.savedDocuments).toHaveLength(1);
    expect([a.ready, b.ready, c.ready]).toEqual([true, true, true]);
    expect(new Set([a.sha256, b.sha256, c.sha256]).size).toBe(1);
  });

  // 20. Hai instance backend cùng sinh PDF → bản đến sau không để lại tài liệu mồ côi
  it('20. hai instance ensure() cùng lúc → không còn tài liệu mồ côi, hợp đồng trỏ đúng một tài liệu', async () => {
    const contractId = await leasedContractId();
    const other = new LeasePdfService(
      fixture.prisma as any,
      { getClient: jest.fn(() => null), isConfigured: jest.fn(() => false) } as any,
      { log: jest.fn(async () => {}) } as any,
      phoneService,
    );
    other.onModuleInit();
    const [a, b] = await Promise.all([leasePdfService.ensure(contractId), other.ensure(contractId)]);
    expect(a.ready && b.ready).toBe(true);
    expect(fixture.savedDocuments).toHaveLength(1);
    const linked = fixture.savedContracts.find((c: any) => c.id === contractId).documentId;
    expect(linked).toBe(fixture.savedDocuments[0].id);
  });

  // 21. consentVersion nộp eKYC phải khớp bản đã đồng ý lúc scan — không ghi chuỗi tuỳ ý vào bằng chứng
  it('21. submit với consentVersion lạ → 409 terms_version_stale, không tạo HĐ; hợp lệ thì ghi bản của token', async () => {
    const scanRes = await identityService.scan('VS-99999', { id: TENANT_ID }, {
      consent: true,
      consentVersion: EKYC_CONSENT_VERSION,
    });
    const todayStr = new Date().toISOString().split('T')[0];
    const body = {
      scanId: scanRes.scanId,
      fields: scanRes.fields,
      confirmedLowConfidence: true,
      lease: { startDate: todayStr, months: 12, paymentCycle: 1 as const },
    };
    await expect(
      identityService.submit('VS-99999', { id: TENANT_ID }, { ...body, consentVersion: 'PRIVACY-1999' }),
    ).rejects.toMatchObject({ response: { code: 'terms_version_stale' } });
    expect(fixture.savedContracts).toHaveLength(0);
    expect(fixture.savedIdentities).toHaveLength(0);

    await identityService.submit('VS-99999', { id: TENANT_ID }, { ...body, consentVersion: EKYC_CONSENT_VERSION });
    expect(fixture.savedIdentities[0].consentVersion).toBe(EKYC_CONSENT_VERSION);
  });

  // 22. id hợp đồng rác khi tải PDF → 404 (không 500)
  it('22. tải PDF với id không phải UUID → 404, không lộ lỗi hệ thống', async () => {
    await expect(leasePdfService.getPdfStream('undefined', TENANT_ID, 'tenant')).rejects.toThrow('Không tìm thấy hợp đồng');
    await expect(leasePdfService.getPdfStream("1' OR '1'='1", TENANT_ID, 'tenant')).rejects.toThrow('Không tìm thấy hợp đồng');
  });
});
