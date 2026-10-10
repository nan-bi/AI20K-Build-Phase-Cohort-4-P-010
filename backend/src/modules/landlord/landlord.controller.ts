import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireVerification } from '../../common/decorators/require-verification.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { LandlordConsignmentService } from './landlord-consignment.service';
import { LandlordFinanceService } from './landlord-finance.service';
import { LandlordMandateService } from './landlord-mandate.service';
import { LandlordPricingService } from './landlord-pricing.service';
import { LandlordPhotoService, UploadedImage } from './landlord-photo.service';
import { MAX_PHOTOS, MAX_PHOTO_BYTES, inventoryCatalogView } from './landlord.mappers';
import { LandlordUnitsService } from './landlord-units.service';
import { LandlordService } from './landlord.service';
import {
  CancelExitMandateDto,
  CreateConsignmentDto,
  PricingDecisionDto,
  RequestExitMandateDto,
  SendConsignmentOtpDto,
  SignConsignmentDto,
} from './dto/landlord.dto';

/**
 * Khu Chủ nhà. `landlordId` LUÔN lấy từ phiên đăng nhập (`@CurrentUser('id')`), không nhận từ query/body:
 * chủ nhà chỉ thấy và thao tác được trên căn của chính mình.
 */
@ApiTags('8. Chủ nhà Ở Nhà 100% & Ký Gửi')
@ApiCookieAuth('session-cookie')
@Roles('landlord')
@Controller('landlord')
export class LandlordController {
  constructor(
    private readonly dashboard: LandlordService,
    private readonly units: LandlordUnitsService,
    private readonly consignments: LandlordConsignmentService,
    private readonly finance: LandlordFinanceService,
    private readonly mandates: LandlordMandateService,
    private readonly photos: LandlordPhotoService,
    private readonly pricing: LandlordPricingService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Tổng quan chủ nhà (bản tối thiểu — UI dashboard làm sau)' })
  getDashboard(@CurrentUser('id') landlordId: string) {
    return this.dashboard.getLandlordDashboard(landlordId);
  }

  @Get('inventory-catalog')
  @ApiOperation({ summary: '32 hạng mục trang thiết bị (Điều 5) để chủ nhà chọn món có sẵn khi ký gửi' })
  getInventoryCatalog() {
    return inventoryCatalogView();
  }

  @Get('units')
  @ApiOperation({ summary: 'Danh sách căn đã ký gửi của tôi (kèm trạng thái căn + ủy quyền)' })
  listUnits(@CurrentUser('id') landlordId: string) {
    return this.units.list(landlordId);
  }

  @Get('units/:id')
  @ApiOperation({ summary: 'Chi tiết căn: All-in, ủy quyền, giữ chỗ, hợp đồng đang chạy (không có mã cửa)' })
  getUnit(@CurrentUser('id') landlordId: string, @Param('id') id: string) {
    return this.units.detail(landlordId, id);
  }

  @Get('units/:id/viewings')
  @ApiOperation({ summary: 'Nhật ký xem phòng của căn (khách bị che SĐT)' })
  getViewings(@CurrentUser('id') landlordId: string, @Param('id') id: string) {
    return this.units.viewingLog(landlordId, id);
  }

  @Get('units/:id/audit-trail')
  @ApiOperation({ summary: 'Nhật ký mở cửa của căn: Host nào xem mã cửa, lúc nào' })
  getAuditTrail(@CurrentUser('id') landlordId: string, @Param('id') id: string) {
    return this.units.doorAuditTrail(landlordId, id);
  }

  @Get('consignments')
  @ApiOperation({ summary: 'Hồ sơ ký gửi của tôi (nháp → chờ Host → thẩm định → duyệt/từ chối)' })
  listConsignments(@CurrentUser('id') landlordId: string) {
    return this.consignments.list(landlordId);
  }

  @Post('consignments')
  @ApiOperation({ summary: 'Tạo hồ sơ ký gửi căn mới (trạng thái draft, chưa ký)' })
  createConsignment(@CurrentUser('id') landlordId: string, @Body() dto: CreateConsignmentDto) {
    return this.consignments.create(landlordId, dto);
  }

  @Get('consignments/:id')
  @ApiOperation({ summary: 'Chi tiết hồ sơ ký gửi + kết quả thẩm định' })
  getConsignment(@CurrentUser('id') landlordId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.consignments.get(landlordId, id);
  }

  @Post('consignments/:id/photos')
  // +1: multer coi file chạm đúng giới hạn là bị cắt; cộng 1 để ảnh đúng 3MB vẫn được nhận (service chặn > MAX_PHOTO_BYTES).
  @UseInterceptors(FilesInterceptor('files', MAX_PHOTOS, { limits: { fileSize: MAX_PHOTO_BYTES + 1, files: MAX_PHOTOS } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tải thêm ảnh tham khảo cho hồ sơ ký gửi (JPG/PNG/WebP, ≤3MB/ảnh, tối đa 8 ảnh/hồ sơ)',
    description: 'Field multipart `files`. Chỉ khi hồ sơ còn nháp hoặc chờ Host nhận. Đây KHÔNG phải ảnh Verified — ảnh niêm yết do Host chụp khi thẩm định.',
  })
  addPhotos(
    @CurrentUser('id') landlordId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: UploadedImage[] | undefined,
  ) {
    if (!files?.length) throw new BadRequestException('Chưa chọn ảnh nào.');
    return this.photos.add(landlordId, id, files);
  }

  @Delete('consignments/:id/photos/:photoId')
  @ApiOperation({ summary: 'Xóa một ảnh đã tải lên của hồ sơ ký gửi' })
  removePhoto(
    @CurrentUser('id') landlordId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.photos.remove(landlordId, id, photoId);
  }

  @Post('consignments/:id/send-otp')
  @RequireVerification('phone')
  @HttpCode(200)
  @ApiOperation({ summary: 'Gửi OTP Zalo để ký ủy quyền (tới SĐT đã lưu; chưa có SĐT thì gửi tới số truyền lên)' })
  sendSignOtp(
    @CurrentUser('id') landlordId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendConsignmentOtpDto,
  ) {
    return this.consignments.sendSignOtp(landlordId, id, dto.phone);
  }

  @Post('consignments/:id/sign')
  @RequireVerification('phone')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ký ủy quyền độc quyền bằng OTP → giao Field Host phân khu thẩm định (SLA 48h)' })
  signConsignment(
    @CurrentUser('id') landlordId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignConsignmentDto,
  ) {
    return this.consignments.sign(landlordId, id, dto);
  }

  @Post('consignments/:id/pricing-decision')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Chấp nhận / từ chối giá + cọc bảo đảm do Inspector đề xuất',
    description: 'accept ⇒ niêm yết với giá đề xuất; decline ⇒ đóng hồ sơ (không niêm yết). Chỉ khi hồ sơ ở trạng thái awaiting_landlord, nếu không 409 PRICING_NOT_PENDING.',
  })
  decidePricing(
    @CurrentUser('id') landlordId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PricingDecisionDto,
  ) {
    return this.pricing.decide(landlordId, id, dto.decision);
  }

  @Get('finance')
  @ApiOperation({ summary: 'Khoản thu: thực nhận tháng này, 6 tháng, theo căn, cọc giữ hộ' })
  getFinance(@CurrentUser('id') landlordId: string) {
    return this.finance.getFinance(landlordId);
  }

  @Post('mandates/request-exit')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Yêu cầu thoát ủy quyền (báo trước 15 ngày)',
    description: 'Chỉ khi ủy quyền đang hiệu lực và căn đang trống (AVAILABLE).',
  })
  requestExit(@CurrentUser('id') landlordId: string, @Body() dto: RequestExitMandateDto) {
    return this.mandates.requestExit(landlordId, dto);
  }

  @Post('mandates/cancel-exit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hủy yêu cầu thoát ủy quyền đang đếm ngược' })
  cancelExit(@CurrentUser('id') landlordId: string, @Body() dto: CancelExitMandateDto) {
    return this.mandates.cancelExit(landlordId, dto);
  }
}
