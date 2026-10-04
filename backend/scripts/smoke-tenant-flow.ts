/**
 * Smoke script kiểm thử luồng Tenant đầu-cuối (18 bước)
 * SPEC-P03 §8 · OPERATIONS.md §3
 *
 * Chạy:
 *   npm run smoke:tenant
 *   npm run smoke:tenant -- --cleanup
 */
import { createHash } from 'node:crypto';
import { PrismaClient, UnitStatus } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:4000/api/v1';
const EXPECT_PDF = process.env.SMOKE_EXPECT_PDF !== 'false';

class CookieClient {
  private cookies = new Map<string, string>();

  constructor(public readonly baseUrl: string) {}

  async request(path: string, options: RequestInit = {}): Promise<{
    status: number;
    data: any;
    headers: Headers;
    rawBuffer?: Buffer;
  }> {
    const headers = new Headers(options.headers || {});
    if (this.cookies.size > 0) {
      const cookieStr = Array.from(this.cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      headers.set('cookie', cookieStr);
    }
    if (options.body && typeof options.body === 'string' && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const url = `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    const res = await fetch(url, { ...options, headers });

    // Store set-cookie
    const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of rawCookies) {
      const part = c.split(';')[0];
      const eq = part.indexOf('=');
      if (eq > 0) {
        this.cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
      }
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      const arrayBuf = await res.arrayBuffer();
      return {
        status: res.status,
        data: null,
        headers: res.headers,
        rawBuffer: Buffer.from(arrayBuf),
      };
    }

    let data: any = null;
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && parsed.success === true && 'data' in parsed) {
        data = parsed.data;
      } else {
        data = parsed;
      }
    } catch {
      data = text;
    }

    return { status: res.status, data, headers: res.headers };
  }

  get(path: string) {
    return this.request(path, { method: 'GET' });
  }

  post(path: string, body?: any) {
    return this.request(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

function logStep(stepNum: number, name: string, status: number, ok: boolean, detail?: string) {
  const statusLabel = ok ? 'ok' : 'FAIL';
  console.log(`STEP ${stepNum}. ${name} ${status} ${statusLabel}${detail ? ` (${detail})` : ''}`);
  if (!ok) {
    throw new Error(`Smoke test FAILED at step ${stepNum}: ${name}`);
  }
}

async function cleanupSmokeData() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres@localhost:55432/vinstay_dev';
  // Chỉ dọn trên DB cục bộ: script xoá dữ liệu, tuyệt đối không để chạy nhầm lên Supabase (OPERATIONS §4).
  if (!/^postgres(ql)?:\/\/[^/]*@(localhost|127\.0\.0\.1)(:\d+)?\//.test(dbUrl) || process.env.NODE_ENV === 'production') {
    throw new Error('--cleanup chỉ chạy với DATABASE_URL trỏ localhost và NODE_ENV khác production.');
  }
  const prefixArg = process.argv.find((a) => a.startsWith('--prefix='));
  const prefix = prefixArg ? prefixArg.slice('--prefix='.length) : 'smoke+'; // 'audit+' = dữ liệu của audit:tenant
  if (!/^(smoke|audit)\+/.test(prefix)) throw new Error('--prefix chỉ nhận smoke+ hoặc audit+');
  const prisma = new PrismaClient({ datasourceUrl: dbUrl });
  try {
    const smokeProfiles = await prisma.profile.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true, email: true },
    });

    if (smokeProfiles.length === 0) {
      console.log('No smoke test profiles to clean up.');
      return;
    }

    console.log(`Cleaning up ${smokeProfiles.length} smoke profile(s)...`);
    const profileIds = smokeProfiles.map((p) => p.id);

    // Căn mà smoke đã đụng tới: sau khi xoá giao dịch phải trả về trạng thái gốc của catalog web, kẻo mỗi lần chạy
    // smoke lại "thuê mất" một căn và rổ hàng cạn dần.
    const touched = await prisma.viewing.findMany({
      where: { tenantId: { in: profileIds } },
      select: { unit: { select: { id: true, unitCode: true } } },
    });
    const touchedUnits = new Map(touched.map((v) => [v.unit.id, v.unit.unitCode]));

    // Delete related entities in reverse dependency order
    await prisma.signedDocument.deleteMany({
      where: {
        contract: { is: { tenantId: { in: profileIds } } },
      },
    });
    await prisma.contract.deleteMany({
      where: { tenantId: { in: profileIds } },
    });
    await prisma.identityVerification.deleteMany({
      where: { tenantId: { in: profileIds } },
    });
    await prisma.escrowTransaction.deleteMany({
      where: {
        deposit: { viewing: { tenantId: { in: profileIds } } },
      },
    });
    await prisma.holdingDeposit.deleteMany({
      where: { viewing: { tenantId: { in: profileIds } } },
    });
    await prisma.dispatchTicket.deleteMany({
      where: { viewing: { tenantId: { in: profileIds } } },
    });
    await prisma.viewing.deleteMany({
      where: { tenantId: { in: profileIds } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorId: { in: profileIds } },
    });
    await prisma.profile.deleteMany({
      where: { id: { in: profileIds } },
    });

    const catalog = JSON.parse(readFileSync(join(__dirname, '..', 'prisma', 'web-catalog.json'), 'utf8')) as {
      units: { code: string; baseStatus: 'available' | 'holding' | 'rented' }[];
    };
    const baseStatus = new Map(catalog.units.map((u) => [u.code, u.baseStatus.toUpperCase() as UnitStatus]));
    let restored = 0;
    for (const [id, code] of touchedUnits) {
      const live = await prisma.holdingDeposit.count({ where: { unitId: id, paymentStatus: 'PAID_HOLDING' } });
      const leased = await prisma.contract.count({ where: { unitId: id, status: 'ACTIVE' } });
      if (live > 0 || leased > 0) continue; // còn giao dịch thật của người khác ⇒ không đụng
      const target = baseStatus.get(code) ?? UnitStatus.AVAILABLE;
      const res = await prisma.unit.updateMany({ where: { id, NOT: { status: target } }, data: { status: target } });
      restored += res.count;
    }
    console.log(`Restored status of ${restored} unit(s) to catalog baseline.`);
    console.log('Cleanup completed successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

async function runSmoke() {
  if (process.argv.includes('--cleanup')) {
    await cleanupSmokeData();
    return;
  }

  console.log(`========================================================`);
  console.log(`🚀 Starting VinStay AI Tenant End-to-End Smoke Test`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Expect PDF: ${EXPECT_PDF}`);
  console.log(`========================================================\n`);

  const client1 = new CookieClient(BASE_URL);
  const client2 = new CookieClient(BASE_URL);

  const timestamp = Date.now();
  const email1 = `smoke+tenant1_${timestamp}@vinstay.test`;
  const email2 = `smoke+tenant2_${timestamp}@vinstay.test`;
  const phone1 = '09' + Math.floor(10000000 + Math.random() * 90000000);
  const phone2 = '09' + Math.floor(10000000 + Math.random() * 90000000);

  // --- STEP 1: Signup Tenant 1 ---
  const signup1Res = await client1.post('/auth/signup', {
    email: email1,
    password: 'Password123!',
    fullName: 'Nguyễn Văn An Smoke',
    portal: 'tenant',
  });
  logStep(
    1,
    'POST /auth/signup',
    signup1Res.status,
    signup1Res.status === 200 && Boolean(signup1Res.data?.user?.id),
    `userId: ${signup1Res.data?.user?.id}`,
  );

  // --- STEP 2: Query Available Units ---
  const unitsRes = await client1.get('/properties/units');
  const units = Array.isArray(unitsRes.data) ? unitsRes.data : unitsRes.data?.data || [];
  const availableUnit = units.find(
    (u: any) => u.status === 'AVAILABLE' || u.status === 'available' || !u.status,
  );
  if (!availableUnit) {
    throw new Error('No available unit found in catalog!');
  }
  const unitCode = availableUnit.code;
  logStep(
    2,
    'GET /properties/units',
    unitsRes.status,
    unitsRes.status === 200 && Boolean(unitCode),
    `picked: ${unitCode}`,
  );

  // --- STEP 3: Pick Free Slot ---
  const busyRes = await client1.get(`/properties/units/${unitCode}/busy-slots`);
  const busySlots: string[] = Array.isArray(busyRes.data)
    ? busyRes.data
    : busyRes.data?.slots || busyRes.data?.data || [];

  // Find two slots that are NOT in busySlots
  const availableSlots: string[] = [];
  for (let dayOffset = 1; dayOffset <= 7 && availableSlots.length < 2; dayOffset++) {
    const targetDay = new Date();
    targetDay.setUTCDate(targetDay.getUTCDate() + dayOffset);
    const ty = targetDay.getUTCFullYear();
    const tm = targetDay.getUTCMonth();
    const td = targetDay.getUTCDate();

    // UTC hours for VN times (UTC+7):
    // 08:30 VN = 01:30 UTC, 09:30 VN = 02:30 UTC, 10:30 VN = 03:30 UTC, 14:30 VN = 07:30 UTC, 15:30 VN = 08:30 UTC...
    const candidateUtcTimes = [
      [1, 30],
      [2, 30],
      [3, 30],
      [7, 30],
      [8, 30],
      [9, 30],
      [10, 30],
    ];

    for (const [ch, cmin] of candidateUtcTimes) {
      const candidateIso = new Date(Date.UTC(ty, tm, td, ch, cmin, 0)).toISOString();
      if (!busySlots.includes(candidateIso)) {
        availableSlots.push(candidateIso);
        if (availableSlots.length === 2) break;
      }
    }
  }

  if (availableSlots.length < 2) {
    throw new Error('Not enough free slots available for unit!');
  }
  const [slot1, slot2] = availableSlots;

  logStep(
    3,
    'GET /properties/units/:code/busy-slots',
    busyRes.status,
    busyRes.status === 200,
    `slot1: ${slot1}`,
  );

  // --- STEP 4: OTP Send (Tenant 1) ---
  const otpSend1 = await client1.post('/auth/otp/send', {
    phone: phone1,
    purpose: 'TENANT_VIEWING',
  });
  const devCode1 = otpSend1.data?.devCode;
  logStep(
    4,
    'POST /auth/otp/send',
    otpSend1.status,
    otpSend1.status === 200 && Boolean(devCode1),
    `devCode: ${devCode1}`,
  );

  // --- STEP 5: OTP Verify (Tenant 1) ---
  const otpVerify1 = await client1.post('/auth/otp/verify', {
    phone: phone1,
    purpose: 'TENANT_VIEWING',
    code: devCode1,
  });
  const actionToken1 = otpVerify1.data?.actionToken;
  logStep(
    5,
    'POST /auth/otp/verify',
    otpVerify1.status,
    otpVerify1.status === 200 && Boolean(actionToken1),
  );

  // --- STEP 6: Create Booking 1 ---
  const createBookingRes1 = await client1.post('/bookings', {
    unitCode,
    slot: slot1,
    contactName: 'Nguyễn Văn An Smoke',
    phone: phone1,
    partySize: 1,
    actionToken: actionToken1,
  });
  const ref1 = createBookingRes1.data?.ref || createBookingRes1.data?.bookingRefCode;
  logStep(
    6,
    'POST /bookings',
    createBookingRes1.status,
    createBookingRes1.status === 201 && Boolean(ref1),
    `ref: ${ref1}`,
  );

  // --- STEP 7: Demo Host Accept ---
  const hostAcceptRes = await client1.post(`/demo/bookings/${ref1}/host-accept`);
  logStep(
    7,
    'POST /demo/bookings/:ref/host-accept',
    hostAcceptRes.status,
    (hostAcceptRes.status === 200 || hostAcceptRes.status === 201) &&
      (hostAcceptRes.data?.status === 'CONFIRMED' || hostAcceptRes.data?.status === 'confirmed'),
    `status: ${hostAcceptRes.data?.status}`,
  );

  // --- STEP 8: Lobby Check-in ---
  const lobbyCheckinRes = await client1.post(`/bookings/${ref1}/lobby-checkin`);
  logStep(
    8,
    'POST /bookings/:ref/lobby-checkin',
    lobbyCheckinRes.status,
    (lobbyCheckinRes.status === 200 || lobbyCheckinRes.status === 201) &&
      (lobbyCheckinRes.data?.status === 'LOBBY' || lobbyCheckinRes.data?.status === 'lobby'),
    `status: ${lobbyCheckinRes.data?.status}`,
  );

  // --- STEP 9: Demo Host Receive, View & Start Deposit ---
  await client1.post(`/demo/bookings/${ref1}/host-receive`);
  await client1.post(`/demo/bookings/${ref1}/host-view`);
  const closingRes = await client1.post(`/demo/bookings/${ref1}/host-start-deposit`);
  logStep(
    9,
    'demo host-receive/view/start-deposit',
    closingRes.status,
    (closingRes.status === 200 || closingRes.status === 201) &&
      (closingRes.data?.status === 'CLOSING' || closingRes.data?.status === 'closing'),
    `status: ${closingRes.data?.status}`,
  );

  // --- STEP 10: Fetch Deposit Terms (A14) ---
  const termsRes = await client1.get(`/bookings/${ref1}/deposit/terms`);
  const termsDoc = termsRes.data;
  logStep(
    10,
    'GET /bookings/:ref/deposit/terms',
    termsRes.status,
    termsRes.status === 200 &&
      termsDoc?.version === 'HOLD-2026.10-v1' &&
      Array.isArray(termsDoc?.items || termsDoc?.terms) &&
      (termsDoc?.items || termsDoc?.terms).length >= 6,
    `version: ${termsDoc?.version}`,
  );

  // --- STEP 11: Create Holding Deposit (A15) ---
  const createDepositRes = await client1.post(`/bookings/${ref1}/deposit`, {
    acceptTerms: true,
    termsVersion: 'HOLD-2026.10-v1',
  });
  const depositData = createDepositRes.data?.deposit;
  logStep(
    11,
    'POST /bookings/:ref/deposit',
    createDepositRes.status,
    (createDepositRes.status === 200 || createDepositRes.status === 201) &&
      (depositData?.outcome === 'awaiting_payment' ||
        depositData?.paymentStatus === 'PENDING_PAYMENT') &&
      Boolean(depositData?.vietqr) &&
      depositData?.amount === 2000000,
    `qrRef: ${depositData?.qrRef || depositData?.depositCode}`,
  );

  // --- STEP 12: Second Tenant Books Same Unit (Different Slot) ---
  const signup2Res = await client2.post('/auth/signup', {
    email: email2,
    password: 'Password123!',
    fullName: 'Trần Thị Bình Smoke',
    portal: 'tenant',
  });
  const otpSend2 = await client2.post('/auth/otp/send', {
    phone: phone2,
    purpose: 'TENANT_VIEWING',
  });
  const devCode2 = otpSend2.data?.devCode;
  const otpVerify2 = await client2.post('/auth/otp/verify', {
    phone: phone2,
    purpose: 'TENANT_VIEWING',
    code: devCode2,
  });
  const createBookingRes2 = await client2.post('/bookings', {
    unitCode,
    slot: slot2,
    contactName: 'Trần Thị Bình Smoke',
    phone: phone2,
    partySize: 1,
    actionToken: otpVerify2.data?.actionToken,
  });
  const ref2 = createBookingRes2.data?.ref || createBookingRes2.data?.bookingRefCode;
  logStep(
    12,
    'POST /bookings (tenant 2)',
    createBookingRes2.status,
    createBookingRes2.status === 201 && Boolean(ref2),
    `ref2: ${ref2}`,
  );

  // --- STEP 13: Demo Bank Paid (First-to-Pay Wins) & Auto-Cancel Booking 2 ---
  const paidRes = await client1.post(`/demo/bookings/${ref1}/bank-paid`);
  const checkBooking2Res = await client2.get(`/bookings/${ref2}`);
  const b2Cancelled =
    checkBooking2Res.data?.status === 'CANCELLED' ||
    checkBooking2Res.data?.status === 'cancelled' ||
    checkBooking2Res.data?.closedReason === 'auto_cancelled_due_to_deposit';

  logStep(
    13,
    'demo bank-paid & auto-cancel race',
    paidRes.status,
    (paidRes.status === 200 || paidRes.status === 201) &&
      (paidRes.data?.status === 'HOLDING' || paidRes.data?.status === 'holding') &&
      b2Cancelled,
    `booking1: ${paidRes.data?.status}, booking2: ${checkBooking2Res.data?.status}`,
  );

  // --- STEP 14: eKYC Scan (A17) ---
  const scanRes = await client1.post(`/bookings/${ref1}/ekyc/scan`, {
    consent: true,
    consentVersion: 'PRIVACY-2026.10-v1',
  });
  const scanData = scanRes.data;
  logStep(
    14,
    'POST /bookings/:ref/ekyc/scan',
    scanRes.status,
    (scanRes.status === 200 || scanRes.status === 201) &&
      Boolean(scanData?.scanId) &&
      Boolean(scanData?.fields?.fullName) &&
      Boolean(scanData?.fields?.idNumber),
    `scanId: ${scanData?.scanId?.slice(0, 16)}...`,
  );

  // --- STEP 15: eKYC Submit & Establish Contract (A18) ---
  const todayStr = new Date().toISOString().split('T')[0];
  const submitRes = await client1.post(`/bookings/${ref1}/ekyc`, {
    scanId: scanData.scanId,
    consentVersion: 'PRIVACY-2026.10-v1',
    fields: scanData.fields,
    confirmedLowConfidence: true,
    lease: {
      startDate: todayStr,
      months: 12,
      paymentCycle: 1,
    },
  });
  const contract = submitRes.data?.contract;
  const contractId = contract?.id;
  logStep(
    15,
    'POST /bookings/:ref/ekyc',
    submitRes.status,
    (submitRes.status === 200 || submitRes.status === 201) &&
      Boolean(contractId) &&
      (submitRes.data?.booking?.status === 'LEASED' ||
        submitRes.data?.booking?.status === 'leased'),
    `contractNumber: ${contract?.contractNumber}`,
  );

  // --- STEP 16: List Contracts & Verify First Payment Invariant (A19) ---
  const contractsRes = await client1.get('/me/contracts');
  const myContracts = contractsRes.data?.data || contractsRes.data || [];
  const myContract = myContracts.find((c: any) => c.id === contractId);

  const rentNotDeducted =
    myContract?.firstPaymentDue &&
    myContract.firstPaymentDue.rent === myContract.monthlyRent * 1 &&
    (myContract.convertedHolding === 2000000 ||
      myContract.convertedHoldingAmount === 2000000);

  logStep(
    16,
    'GET /me/contracts',
    contractsRes.status,
    contractsRes.status === 200 && Boolean(myContract) && rentNotDeducted,
    `rent: ${myContract?.firstPaymentDue?.rent}, depositTopUp: ${myContract?.firstPaymentDue?.depositTopUp}`,
  );

  // --- STEP 17: Stream Lease PDF & Verify SHA256 (A20) ---
  const pdfRes = await client1.get(`/me/contracts/${contractId}/pdf`);
  if (!EXPECT_PDF && pdfRes.status === 503) {
    logStep(17, 'GET /me/contracts/:id/pdf', 503, true, 'skipped (SMOKE_EXPECT_PDF=false)');
  } else {
    const isPdfHeader =
      pdfRes.rawBuffer &&
      pdfRes.rawBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
    const sha256 = pdfRes.rawBuffer
      ? createHash('sha256').update(pdfRes.rawBuffer).digest('hex')
      : '';
    logStep(
      17,
      'GET /me/contracts/:id/pdf',
      pdfRes.status,
      pdfRes.status === 200 && Boolean(isPdfHeader) && sha256.length === 64,
      `sha256: ${sha256.slice(0, 16)}...`,
    );
  }

  // --- STEP 18: Cross-Tenant Isolation (B3) ---
  // Tenant 2 tries to access Tenant 1's booking
  const unauthorizedBookingRes = await client2.get(`/bookings/${ref1}`);
  // Tenant 2 tries to download Tenant 1's contract PDF
  const unauthorizedPdfRes = await client2.get(`/me/contracts/${contractId}/pdf`);

  const isolationOk =
    unauthorizedBookingRes.status === 404 && unauthorizedPdfRes.status === 404;

  logStep(
    18,
    'cross-tenant isolation',
    unauthorizedBookingRes.status,
    isolationOk,
    `booking 404: ${unauthorizedBookingRes.status === 404}, pdf 404: ${unauthorizedPdfRes.status === 404}`,
  );

  console.log(`\n========================================================`);
  console.log(`🎉 ALL 18 SMOKE STEPS PASSED SUCCESSFULLY!`);
  console.log(`========================================================\n`);
}

runSmoke().catch((err) => {
  console.error('\n❌ Smoke Test FAILED with error:');
  console.error(err);
  process.exit(1);
});
