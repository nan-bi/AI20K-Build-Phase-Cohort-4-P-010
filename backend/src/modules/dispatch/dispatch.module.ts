import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DispatchAssignerService } from './dispatch-assigner.service';

/** Hồ sơ 15: chỉ còn bộ chọn Sale (dùng chung). Route `/dispatch/*` giả đã xoá — cổng Sale ở `/host/*` (host-viewings). */
@Module({
  imports: [PrismaModule],
  providers: [DispatchAssignerService],
  exports: [DispatchAssignerService],
})
export class DispatchModule {}
