import {
  Body,
  CallHandler,
  Controller,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Observable, catchError, throwError } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HostRoles } from '../../common/decorators/host-roles.decorator';
import { RequireVerification } from '../../common/decorators/require-verification.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { requestContext } from '../auth/auth.controller';
import { AuthenticatedUser } from '../auth/session/authenticated-user';
import { HostActorService } from '../host-viewings/host-actor.service';
import { SubmitInspectionDto, UploadInspectionPhotoDto } from './dto/inspection.dto';
import { PHOTO_MAX_BYTES } from './inspection.constants';
import { photoTooLarge } from './inspection.errors';
import { InspectionFlowService } from './inspection-flow.service';
import { InspectionPhotoService, InspectionUpload } from './inspection-photo.service';
import { InspectionQueryService } from './inspection-query.service';

/** Multer cắt file quá giới hạn bằng 413 thô; đổi sang lỗi có mã `photo_too_large` (01 §8). */
@Injectable()
class PhotoTooLargeCode implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(catchError((err) => throwError(() => (err instanceof PayloadTooLargeException ? photoTooLarge() : err))));
  }
}

/**
 * Cổng Thẩm định (hồ sơ 16). Khóa vai ở mức class: chỉ Field Host có vai `inspector`; không route nào bỏ qua phiên.
 * Host LUÔN lấy từ phiên (`HostActorService.resolve(user.id)`) — CẤM nhận `hostId` từ client. Ca không phải của
 * mình và không ở Open Pool ⇒ 404 `inspection_not_found`.
 */
@ApiTags('4.1. Field Host & Thẩm định (/host)')
@ApiCookieAuth('session-cookie')
@Roles('field_host')
@HostRoles('inspector')
@Controller('host/inspections')
export class InspectionController {
  constructor(
    private readonly actors: HostActorService,
    private readonly query: InspectionQueryService,
    private readonly flow: InspectionFlowService,
    private readonly photos: InspectionPhotoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'E1 — Bảng thẩm định: ca của tôi · Open Pool · đã nộp (1 request)' })
  async board(@CurrentUser() user: AuthenticatedUser) {
    return this.query.board(await this.actors.resolve(user.id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'E2 — Chi tiết ca (catalog 32 hạng mục, ảnh, giới hạn). Chỉ chủ ca hoặc ca Open Pool' })
  async detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.query.detail(await this.actors.resolve(user.id), id);
  }

  @Post(':id/accept')
  @RequireVerification('phone')
  @HttpCode(200)
  @ApiOperation({ summary: 'E3 — Nhận ca được giao (nhận lại ca của mình ⇒ 200)' })
  async accept(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.accept(await this.actors.resolve(user.id), id, requestContext(req));
  }

  @Post(':id/claim')
  @RequireVerification('phone')
  @HttpCode(200)
  @ApiOperation({ summary: 'E4 — Nhận ca ở Open Pool (ai nhận trước được giao, nguyên tử)' })
  async claim(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.claim(await this.actors.resolve(user.id), id, requestContext(req));
  }

  @Post(':id/door-code')
  @HttpCode(200)
  @ApiOperation({
    summary: 'E5 — Mã cửa để vào thẩm định (hiệu lực hiển thị 10 phút, ghi audit cho chủ nhà)',
    description: 'Chỉ chủ ca đang `inspecting`. Căn chưa có mã hợp lệ ⇒ 409 `door_code_missing` (không có PIN giả).',
  })
  async doorCode(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.revealDoor(await this.actors.resolve(user.id), id, requestContext(req));
  }

  @Post(':id/photos')
  // +1: multer coi file chạm đúng giới hạn là bị cắt; cộng 1 để ảnh đúng 3MB vẫn được nhận (service chặn > PHOTO_MAX_BYTES).
  @UseInterceptors(PhotoTooLargeCode, FileInterceptor('file', { limits: { fileSize: PHOTO_MAX_BYTES + 1, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'E6 — Tải MỘT ảnh thẩm định (JPG/PNG/WebP, ≤3MB, cạnh ngắn ≥200px)',
    description: 'Multipart: `file`, `slot` (`listing`|`1..32`|`X1..X10`), `room` (bắt buộc khi slot listing), `takenAt?`, `sharpness?`, `brightness?`.',
  })
  async addPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: InspectionUpload | undefined,
    @Body() body: UploadInspectionPhotoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.photos.add(await this.actors.resolve(user.id), id, file, body);
  }

  @Delete(':id/photos/:photoId')
  @ApiOperation({ summary: 'E7 — Xóa một ảnh thẩm định (chỉ khi ca còn `inspecting`)' })
  async removePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.photos.remove(await this.actors.resolve(user.id), id, photoId);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @ApiOperation({
    summary: 'E8 — Nộp phiếu 32 hạng mục. Đạt ⇒ căn lên danh sách NGAY (không qua Admin); không đạt ⇒ đóng hồ sơ',
  })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitInspectionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.flow.submit(await this.actors.resolve(user.id), id, dto, requestContext(req));
  }
}
