import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import * as PDFDocumentImport from 'pdfkit';
const PDFDocument = (PDFDocumentImport as any).default || PDFDocumentImport;
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { PhoneService } from '../auth/phone/phone.service';
import {
  LeasePdfStore,
  LocalDirLeasePdfStore,
  SupabaseLeasePdfStore,
} from './lease-pdf.store';
import {
  LEASE_TEMPLATE_VERSION,
  LeaseTemplateData,
} from './lease-template';
import { DocType } from '@prisma/client';

@Injectable()
export class LeasePdfService implements OnModuleInit {
  private readonly logger = new Logger(LeasePdfService.name);
  private store: LeasePdfStore | null = null;
  private regularFontPath: string = '';
  private boldFontPath: string = '';

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly supabase?: SupabaseService,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly phones?: PhoneService,
  ) {}

  onModuleInit() {
    this.initStore();
    this.initFonts();
  }

  private initStore() {
    const localDir = process.env.LEASE_PDF_LOCAL_DIR;
    const nodeEnv = process.env.NODE_ENV;
    const dbUrl = process.env.DATABASE_URL || '';

    let dbHost = '';
    try {
      const parsed = new URL(dbUrl);
      dbHost = parsed.hostname;
    } catch {
      dbHost = '';
    }

    const isLocalDb = dbHost === 'localhost' || dbHost === '127.0.0.1';

    if (localDir) {
      if (nodeEnv === 'production' || !isLocalDb) {
        const msg = `LEASE_PDF_LOCAL_DIR is configured but environment is invalid: NODE_ENV=${nodeEnv}, dbHost=${dbHost}. Refusing to start.`;
        this.logger.error(msg);
        throw new Error(msg);
      }
      this.logger.log(`Using LocalDirLeasePdfStore at: ${localDir}`);
      this.store = new LocalDirLeasePdfStore(localDir);
    } else {
      this.store = new SupabaseLeasePdfStore(this.supabase);
    }
  }

  private initFonts() {
    const candidatesRegular = [
      path.join(__dirname, '../../assets/fonts/BeVietnamPro-Regular.ttf'),
      path.join(__dirname, '../../../assets/fonts/BeVietnamPro-Regular.ttf'),
      path.join(process.cwd(), 'assets/fonts/BeVietnamPro-Regular.ttf'),
      path.join(process.cwd(), 'dist/assets/fonts/BeVietnamPro-Regular.ttf'),
      path.join(process.cwd(), 'dist/fonts/BeVietnamPro-Regular.ttf'),
    ];
    for (const p of candidatesRegular) {
      if (fs.existsSync(p)) {
        this.regularFontPath = p;
        break;
      }
    }

    const candidatesBold = [
      path.join(__dirname, '../../assets/fonts/BeVietnamPro-Bold.ttf'),
      path.join(__dirname, '../../../assets/fonts/BeVietnamPro-Bold.ttf'),
      path.join(process.cwd(), 'assets/fonts/BeVietnamPro-Bold.ttf'),
      path.join(process.cwd(), 'dist/assets/fonts/BeVietnamPro-Bold.ttf'),
      path.join(process.cwd(), 'dist/fonts/BeVietnamPro-Bold.ttf'),
    ];
    for (const p of candidatesBold) {
      if (fs.existsSync(p)) {
        this.boldFontPath = p;
        break;
      }
    }

    if (!this.regularFontPath || !this.boldFontPath) {
      this.logger.warn(
        `OFL fonts not found on disk. Regular: ${this.regularFontPath || 'missing'}, Bold: ${this.boldFontPath || 'missing'}`,
      );
    }
  }

  /** Các lần `ensure` đang chạy, theo hợp đồng: eKYC xong và lần tải PDF đầu có thể gọi gần như cùng lúc. */
  private readonly inflight = new Map<string, Promise<{ ready: boolean; sha256?: string; storageKey?: string }>>();

  /** Idempotent và an toàn khi gọi đồng thời: mỗi hợp đồng chỉ sinh/niêm phong MỘT tài liệu (SPEC-P03 §6.1). */
  ensure(contractId: string): Promise<{ ready: boolean; sha256?: string; storageKey?: string }> {
    const running = this.inflight.get(contractId);
    if (running) return running;
    const task = this.generate(contractId).finally(() => this.inflight.delete(contractId));
    this.inflight.set(contractId, task);
    return task;
  }

  private async generate(
    contractId: string,
  ): Promise<{ ready: boolean; sha256?: string; storageKey?: string }> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        document: true,
        unit: { include: { building: true } },
        landlord: true,
        tenant: true,
        holdingDeposit: {
          include: {
            identity: true,
            viewing: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract not found: ${contractId}`);
    }

    // Idempotent: If document already generated and sealed, return existing
    if (contract.document?.sha256) {
      return {
        ready: true,
        sha256: contract.document.sha256,
        storageKey: contract.document.storageKey,
      };
    }

    if (!this.store) {
      this.logger.error('No PDF store available');
      return { ready: false };
    }

    const identity = contract.holdingDeposit?.identity;
    const viewing = contract.holdingDeposit?.viewing;
    if (!identity?.verifiedDataRef || !viewing?.contactPhoneEnc || !this.phones) {
      throw new ServiceUnavailableException('Không thể lập hợp đồng khi thiếu hồ sơ eKYC hoặc số điện thoại đã xác minh.');
    }

    let kycFields: { fullName: string; idNumber: string; dob: string; issuedDate: string; address: string };
    let contactPhone: string;
    try {
      kycFields = JSON.parse(this.phones.decrypt(identity.verifiedDataRef));
      contactPhone = this.phones.decrypt(viewing.contactPhoneEnc);
    } catch {
      throw new ServiceUnavailableException('Không thể giải mã an toàn dữ liệu định danh của hợp đồng.');
    }

    if (!kycFields.fullName || !kycFields.idNumber || !kycFields.dob || !kycFields.issuedDate || !kycFields.address) {
      throw new ServiceUnavailableException('Hồ sơ eKYC thiếu trường bắt buộc để lập hợp đồng.');
    }

    try {

      // Check active exclusive mandate for landlord
      const activeMandate = await this.prisma.exclusiveMandate.findFirst({
        where: { unitId: contract.unitId, status: 'ACTIVE' },
      });

      const rent = Number(contract.monthlyRentPrice);
      const cycle = contract.paymentCycleMonths;
      const secDeposit = Number(contract.securityDepositAmount);
      const depositTopUp = Math.max(0, secDeposit - 2000000);
      const firstRent = rent * cycle;
      const totalFirst = firstRent + depositTopUp;

      const templateData: LeaseTemplateData = {
        contractNumber: contract.contractNumber,
        establishedDate: contract.signedAt
          ? new Date(contract.signedAt).toLocaleDateString('vi-VN')
          : new Date().toLocaleDateString('vi-VN'),
        unit: {
          unitCode: contract.unit.unitCode,
          buildingCode: contract.unit.building?.buildingCode || '',
          floorNumber: contract.unit.floorNumber,
          doorNumber: contract.unit.doorNumber || contract.unit.unitCode.slice(-4),
          carpetAreaM2: Number(contract.unit.carpetAreaM2),
          layoutType: String(contract.unit.layoutType),
          furnishing: String(contract.unit.furnishing),
          amenities: (contract.unit.amenities || []).map(String),
          managementFee: Number(contract.unit.managementFee),
          parkingFeeEstimate: Number(contract.unit.parkingFeeEstimate),
          utilityCostEstimate: Number(contract.unit.utilityCostEstimate),
        },
        landlord: {
          fullName: contract.landlord.fullName || 'Chủ hộ',
          phoneMasked: '[đã mã hoá bảo mật]',
          bankAccountMasked: '[cung cấp qua nền tảng]',
          mandateContractNumber: activeMandate?.contractNumber,
        },
        tenant: {
          fullName: kycFields.fullName || contract.tenant.fullName || 'Khách thuê',
          idNumber: kycFields.idNumber || '001095012345',
          dob: kycFields.dob || '12/04/2001',
          issuedDate: kycFields.issuedDate || '18/08/2021',
          address: kycFields.address || 'Hà Nội',
          contactPhone,
        },
        terms: {
          leaseTermMonths: contract.leaseTermMonths,
          startDate: new Date(contract.startDate).toLocaleDateString('vi-VN'),
          endDate: new Date(contract.endDate).toLocaleDateString('vi-VN'),
          monthlyRentPrice: rent,
          paymentCycleMonths: cycle,
          securityDepositAmount: secDeposit,
          convertedHoldingAmount: 2000000,
          depositTopUp,
          firstRentAmount: firstRent,
          totalFirstPayment: totalFirst,
          firstPaymentTransferContent: `VSA ${contract.unit.unitCode} THANH TOAN TIEN THUE KY 1`,
        },
        deposit: {
          depositCode: contract.holdingDeposit.depositCode,
          amount: 2000000,
          transferContent: contract.holdingDeposit.transferContent || '',
          paidAt: contract.holdingDeposit.paidAt
            ? new Date(contract.holdingDeposit.paidAt).toLocaleDateString('vi-VN')
            : 'Đã thanh toán',
          holdHours: contract.holdingDeposit.holdHours || 48,
          expiresAt: contract.holdingDeposit.expiresAt
            ? new Date(contract.holdingDeposit.expiresAt).toLocaleDateString('vi-VN')
            : '',
          termsVersion: contract.holdingDeposit.termsVersion || 'HOLD-2026.10-v1',
          termsAcceptedAt: contract.holdingDeposit.termsAcceptedAt
            ? new Date(contract.holdingDeposit.termsAcceptedAt).toLocaleDateString('vi-VN')
            : '',
        },
        verifiedAt: identity?.verifiedAt
          ? new Date(identity.verifiedAt).toLocaleDateString('vi-VN')
          : new Date().toLocaleDateString('vi-VN'),
      };

      // 3. Render PDF
      const pdfBytes = await this.renderPdf(templateData);
      const sha256 = createHash('sha256').update(pdfBytes).digest('hex');

      // 4. Put into Store
      const relativeKey = `leases/${contractId}.pdf`;
      await this.store.put(relativeKey, pdfBytes);
      const storageKey = `${this.store.prefix}${relativeKey}`;

      // 5. Create SignedDocument & link to contract
      const linked = await this.prisma.$transaction(async (tx) => {
        const doc = await tx.signedDocument.create({
          data: {
            docType: DocType.LEASE,
            storageKey,
            sha256,
            sealedAt: new Date(),
          },
        });

        // Chỉ gắn khi hợp đồng chưa có tài liệu: tiến trình/instance khác đã gắn trước thì bỏ dòng vừa tạo (không để mồ côi).
        const claimed = await tx.contract.updateMany({
          where: { id: contractId, documentId: null },
          data: { documentId: doc.id },
        });
        if (claimed.count === 0) {
          await tx.signedDocument.delete({ where: { id: doc.id } });
          return false;
        }
        return true;
      });

      if (!linked) {
        const existing = await this.prisma.contract.findUnique({
          where: { id: contractId },
          include: { document: true },
        });
        if (existing?.document?.sha256) {
          return { ready: true, sha256: existing.document.sha256, storageKey: existing.document.storageKey };
        }
        return { ready: false };
      }

      return { ready: true, sha256, storageKey };
    } catch (err: any) {
      console.error('ENSURE ERROR:', err);
      this.logger.error(`Error generating lease PDF for contract ${contractId}: ${err.message}`, err.stack);
      return { ready: false };
    }
  }

  async getPdfStream(
    contractId: string,
    userId: string,
    userRole: string = 'tenant',
  ): Promise<{ buffer: Buffer; filename: string }> {
    // Id rác (không phải UUID) làm Prisma ném lỗi cột uuid ⇒ 500. Với khách, "không có" và "không phải của bạn" đều là 404.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contractId)) {
      throw new NotFoundException('Không tìm thấy hợp đồng');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { document: true },
    });

    if (!contract) {
      throw new NotFoundException('Không tìm thấy hợp đồng');
    }

    if (userRole === 'tenant' && contract.tenantId !== userId) {
      throw new NotFoundException('Không tìm thấy hợp đồng');
    }

    let documentId = contract.documentId;
    if (!documentId || !contract.document?.sha256) {
      // Synchronous ensure retry
      const result = await this.ensure(contractId);
      if (!result.ready) {
        throw new ServiceUnavailableException({
          message: 'Tài liệu PDF đang được tạo, vui lòng thử lại sau giây lát.',
          code: 'pdf_pending',
        });
      }
      const refreshed = await this.prisma.contract.findUnique({
        where: { id: contractId },
        select: { documentId: true },
      });
      documentId = refreshed?.documentId || null;
    }

    if (!documentId) {
      throw new ServiceUnavailableException({
        message: 'Tài liệu PDF chưa sẵn sàng.',
        code: 'pdf_pending',
      });
    }

    const doc = await this.prisma.signedDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || !this.store) {
      throw new ServiceUnavailableException({
        message: 'Tài liệu PDF chưa sẵn sàng.',
        code: 'pdf_pending',
      });
    }

    const key = doc.storageKey.replace(/^(local:|supabase:)/, '');
    let buffer: Buffer;
    try {
      buffer = await this.store.get(key);
    } catch (err: any) {
      this.logger.error(`Failed to retrieve PDF: ${err.message}`);
      throw new ServiceUnavailableException({
        message: 'Không thể tải file PDF từ bộ lưu trữ.',
        code: 'pdf_pending',
      });
    }

    await this.auditService.log({
      actorId: userId,
      actorRole: userRole,
      actionType: 'LEASE_PDF_DOWNLOADED',
      entityName: 'Contract',
      entityId: contractId,
      newValue: { contractNumber: contract.contractNumber, sha256: doc.sha256 },
    });

    return {
      buffer,
      filename: `${contract.contractNumber}.pdf`,
    };
  }

  private renderPdf(data: LeaseTemplateData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 50, left: 45, right: 45 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (this.regularFontPath && this.boldFontPath) {
        doc.registerFont('Regular', this.regularFontPath);
        doc.registerFont('Bold', this.boldFontPath);
      } else {
        doc.registerFont('Regular', 'Helvetica');
        doc.registerFont('Bold', 'Helvetica-Bold');
      }

      // --- Header Quốc hiệu ---
      doc.font('Bold').fontSize(11).text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'center' });
      doc.font('Regular').fontSize(10).text('Độc lập - Tự do - Hạnh phúc', { align: 'center' });
      doc.fontSize(9).text('----------------o0o----------------', { align: 'center' });
      doc.moveDown(1);

      // --- Tiêu đề Hợp đồng ---
      doc.font('Bold').fontSize(15).text('HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ', { align: 'center' });
      doc.font('Regular').fontSize(10).text(`Số: ${data.contractNumber}`, { align: 'center' });
      doc.font('Regular').fontSize(9).text(`Ngày xác lập: ${data.establishedDate}`, { align: 'center' });
      doc.moveDown(0.8);

      // --- Căn cứ pháp lý ---
      doc.font('Bold').fontSize(10).text('CĂN CỨ PHÁP LÝ:');
      doc.font('Regular').fontSize(9);
      doc.text('- Căn cứ Bộ luật Dân sự số 91/2015/QH13;');
      doc.text('- Căn cứ Luật Nhà ở số 27/2023/QH15;');
      doc.text('- Căn cứ Luật Kinh doanh bất động sản số 29/2023/QH15;');
      doc.text('- Căn cứ Luật Giao dịch điện tử số 20/2023/QH15;');
      doc.text('- Căn cứ Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân;');
      doc.text(
        `- Căn cứ Điều khoản đặt cọc phiên bản ${data.deposit.termsVersion} do Bên B chấp thuận điện tử lúc ${data.deposit.termsAcceptedAt}.`,
      );
      doc.moveDown(0.8);

      // --- Bên A ---
      doc.font('Bold').fontSize(10).text('BÊN CHO THUÊ (BÊN A):');
      doc.font('Regular').fontSize(9);
      doc.text(`- Họ và tên: ${data.landlord.fullName}`);
      doc.text(`- Số điện thoại: ${data.landlord.phoneMasked}`);
      doc.text(`- Tài khoản nhận tiền: ${data.landlord.bankAccountMasked}`);
      if (data.landlord.mandateContractNumber) {
        doc.text(
          `- Dẫn chiếu ủy quyền: Hợp đồng Ký gửi Quản lý Độc quyền số ${data.landlord.mandateContractNumber}`,
        );
      }
      doc.moveDown(0.5);

      // --- Bên B ---
      doc.font('Bold').fontSize(10).text('BÊN THUÊ (BÊN B):');
      doc.font('Regular').fontSize(9);
      doc.text(`- Họ và tên: ${data.tenant.fullName}`);
      doc.text(`- Số CCCD: ${data.tenant.idNumber}`);
      doc.text(`- Ngày sinh: ${data.tenant.dob}   - Ngày cấp: ${data.tenant.issuedDate}`);
      doc.text(`- Địa chỉ thường trú: ${data.tenant.address}`);
      doc.text(`- Số điện thoại liên hệ: ${data.tenant.contactPhone} (đã xác thực OTP)`);
      doc.moveDown(0.8);

      // --- Điều 1 ---
      doc.font('Bold').fontSize(10).text('Điều 1. Đối tượng hợp đồng');
      doc.font('Regular').fontSize(9);
      doc.text(
        `Căn hộ số ${data.unit.doorNumber}, Tầng ${data.unit.floorNumber}, Tòa ${data.unit.buildingCode}, Khu đô thị Vinhomes Ocean Park, Gia Lâm, Hà Nội.`,
      );
      doc.text(`- Diện tích sử dụng: ${data.unit.carpetAreaM2} m²`);
      doc.text(`- Loại căn: ${data.unit.layoutType}, Bàn giao: ${data.unit.furnishing}`);
      doc.text(`- Tiện nghi: ${data.unit.amenities.join(', ') || 'Cơ bản theo danh mục'}`);
      doc.moveDown(0.6);

      // --- Điều 2 ---
      doc.font('Bold').fontSize(10).text('Điều 2. Thời hạn thuê và thời điểm bàn giao');
      doc.font('Regular').fontSize(9);
      doc.text(`- Thời hạn thuê: ${data.terms.leaseTermMonths} tháng.`);
      doc.text(`- Ngày bắt đầu: ${data.terms.startDate}   - Ngày kết thúc: ${data.terms.endDate}`);
      doc.text(
        `- Ngày bàn giao căn hộ: ${data.terms.startDate} (sau khi Bên B hoàn tất thanh toán kỳ đầu theo Điều 4).`,
      );
      doc.moveDown(0.6);

      // --- Điều 3 ---
      doc.font('Bold').fontSize(10).text('Điều 3. Giá thuê và phương thức thanh toán');
      doc.font('Regular').fontSize(9);
      doc.text(`- Giá thuê: ${data.terms.monthlyRentPrice.toLocaleString('vi-VN')} VNĐ/tháng.`);
      doc.text(`- Kỳ thanh toán: ${data.terms.paymentCycleMonths} tháng/lần.`);
      doc.text('- Bảng chi phí All-in tham khảo:');
      doc.text(`  + Tiền thuê căn hộ: ${data.terms.monthlyRentPrice.toLocaleString('vi-VN')} VNĐ/tháng`);
      doc.text(`  + Phí quản lý Vinhomes: ${data.unit.managementFee.toLocaleString('vi-VN')} VNĐ/tháng`);
      doc.text(
        `  + Phí gửi xe ước tính: ${data.unit.parkingFeeEstimate.toLocaleString('vi-VN')} VNĐ/tháng`,
      );
      doc.text(
        `  + Điện nước ước tính: ${data.unit.utilityCostEstimate.toLocaleString('vi-VN')} VNĐ/tháng`,
      );
      doc.moveDown(0.6);

      // --- Điều 4 ---
      doc
        .font('Bold')
        .fontSize(10)
        .text('Điều 4. Tiền cọc bảo đảm tài sản và thanh toán kỳ đầu');
      doc.font('Regular').fontSize(9);
      doc.text(
        `- Tổng tiền cọc bảo đảm tài sản & nội thất: ${data.terms.securityDepositAmount.toLocaleString('vi-VN')} VNĐ.`,
      );
      doc.text(
        `- Khoản cọc giữ chỗ 2.000.000 VNĐ đã thanh toán được chuyển đổi 100% thành một phần Tiền cọc bảo đảm tài sản; số tiền cọc bảo đảm còn thiếu cần nộp bổ sung: ${data.terms.depositTopUp.toLocaleString('vi-VN')} VNĐ.`,
      );
      doc.text(
        '- Tuyệt đối không khấu trừ khoản cọc giữ chỗ 2.000.000 VNĐ vào tiền thuê tháng đầu tiên.',
      );
      doc.text('- Thanh toán kỳ đầu:');
      doc.text(
        `  + Tiền thuê kỳ 1 (${data.terms.paymentCycleMonths} tháng): ${data.terms.firstRentAmount.toLocaleString('vi-VN')} VNĐ`,
      );
      doc.text(
        `  + Tiền cọc bảo đảm nộp bổ sung: ${data.terms.depositTopUp.toLocaleString('vi-VN')} VNĐ`,
      );
      doc.text(
        `  + Tổng số tiền thanh toán kỳ 1: ${data.terms.totalFirstPayment.toLocaleString('vi-VN')} VNĐ`,
      );
      doc.text(`  + Nội dung chuyển khoản: ${data.terms.firstPaymentTransferContent}`);
      doc.moveDown(0.6);

      // --- Điều 5 ---
      doc.font('Bold').fontSize(10).text('Điều 5. Hộ chiếu bàn giao số (Digital Handover Passport)');
      doc.font('Regular').fontSize(9);
      doc.text(
        'Hai bên thực hiện bàn giao căn hộ qua ứng dụng VinStay AI với Hộ chiếu bàn giao số ghi nhận hình ảnh có dấu thời gian và định vị thực tế của 10 hạng mục nội thất trọng yếu: (1) Trần, tường, sàn; (2) Hệ thống cửa và khóa; (3) Hệ thống chiếu sáng và công tắc; (4) Điều hòa không khí; (5) Tủ bếp, bếp từ, hút mùi; (6) Thiết bị vệ sinh, bình nóng lạnh; (7) Tủ lạnh; (8) Máy giặt; (9) Giường, đệm, tủ quần áo; (10) Sofa, bàn trà, rèm cửa. Phân định rõ hao mòn tự nhiên do Bên A chịu; hư hỏng do bất cẩn do Bên B bồi thường.',
      );
      doc.moveDown(0.6);

      // --- Điều 6 & 7 & 8 ---
      doc.font('Bold').fontSize(10).text('Điều 6. Quyền và nghĩa vụ của Bên A (Bên Cho Thuê)');
      doc.font('Regular').fontSize(9);
      doc.text(
        'Bàn giao căn hộ đúng hiện trạng và thời hạn; đảm bảo quyền sử dụng căn hộ ổn định cho Bên B; hỗ trợ bảo trì phần kết cấu kỹ thuật căn hộ.',
      );
      doc.moveDown(0.4);

      doc.font('Bold').fontSize(10).text('Điều 7. Quyền và nghĩa vụ của Bên B (Bên Thuê)');
      doc.font('Regular').fontSize(9);
      doc.text(
        'Thanh toán đầy đủ, đúng hạn tiền thuê và chi phí dịch vụ phát sinh; tuân thủ nội quy Ban Quản lý Vinhomes Ocean Park; không cho thuê lại; giữ gìn trang thiết bị nội thất.',
      );
      doc.moveDown(0.4);

      doc.font('Bold').fontSize(10).text('Điều 8. Khai báo nhân khẩu và tạm trú');
      doc.font('Regular').fontSize(9);
      doc.text(
        'Bên B có nghĩa vụ cung cấp thông tin và ảnh CCCD của tất cả người cùng lưu trú vào ngày nhận bàn giao căn hộ để thực hiện đăng ký tạm trú với Công an khu vực và BQL.',
      );
      doc.moveDown(0.6);

      // --- Điều 9 ---
      doc
        .font('Bold')
        .fontSize(10)
        .text('Điều 9. Hiệu lực và hình thức xác lập hợp đồng');
      doc.font('Regular').fontSize(9);
      doc.text(
        `Hợp đồng được xác lập dưới dạng văn bản điện tử theo Luật Giao dịch điện tử 2023 và không bắt buộc công chứng (Khoản 2 Điều 164 Luật Nhà ở 2023), có hiệu lực từ thời điểm Bên B hoàn tất: (i) xác thực số điện thoại chính chủ bằng OTP lúc đặt lịch; (ii) chấp thuận điều khoản đặt cọc ${data.deposit.termsVersion} lúc ${data.deposit.termsAcceptedAt} và chuyển cọc lúc ${data.deposit.paidAt}; (iii) xác minh danh tính eKYC lúc ${data.verifiedAt}. Bản PDF được lưu trên nền tảng, niêm phong SHA-256; Hai Bên tra cứu tại mục Hợp đồng của tài khoản.`,
      );
      doc.moveDown(0.8);

      // --- Phụ lục A ---
      doc.font('Bold').fontSize(10).text('PHỤ LỤC A: GHI NHẬN ĐẶT CỌC GIỮ CHỖ');
      doc.font('Regular').fontSize(9);
      doc.text(`- Mã giao dịch cọc: ${data.deposit.depositCode}`);
      doc.text(`- Số tiền cọc: ${data.deposit.amount.toLocaleString('vi-VN')} VNĐ`);
      doc.text(`- Nội dung chuyển khoản: ${data.deposit.transferContent}`);
      doc.text(`- Thời điểm thanh toán: ${data.deposit.paidAt}`);
      doc.text(`- Thời hạn giữ căn: ${data.deposit.holdHours} giờ (hết hạn lúc: ${data.deposit.expiresAt})`);
      doc.text(`- Phiên bản điều khoản đã đồng ý: ${data.deposit.termsVersion}`);
      doc.moveDown(1);

      // --- Cuối trang: Ký kết điện tử ---
      doc.font('Bold').fontSize(10).text('XÁC LẬP ĐIỆN TỬ QUA HỆ THỐNG VINSTAY AI', { align: 'center' });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.font('Bold').fontSize(9).text('ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)', 60, tableTop);
      doc.text('ĐẠI DIỆN BÊN THUÊ (BÊN B)', 340, tableTop);

      doc.font('Regular').fontSize(9).text('(Đã xác thực ủy quyền điện tử)', 60, tableTop + 15);
      doc.text('(Đã xác thực OTP & eKYC CCCD)', 340, tableTop + 15);

      doc.font('Bold').fontSize(9).text(data.landlord.fullName, 60, tableTop + 50);
      doc.text(data.tenant.fullName, 340, tableTop + 50);

      // Footer numbering across all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font('Regular').fontSize(8).fillColor('#666666');
        doc.text(
          `${data.contractNumber} · Trang ${i + 1}/${range.count} · Bản điện tử VinStay AI · ${LEASE_TEMPLATE_VERSION}`,
          45,
          doc.page.height - 35,
          { align: 'center', width: doc.page.width - 90 },
        );
      }

      doc.end();
    });
  }
}
