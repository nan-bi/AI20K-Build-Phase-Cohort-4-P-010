import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DoorModule } from '../door/door.module';
import { HostViewingsModule } from '../host-viewings/host-viewings.module';
import { ConsignmentCoreModule } from './consignment-core.module';
import { InspectionController } from './inspection.controller';
import { InspectionFlowService } from './inspection-flow.service';
import { InspectionPhotoService } from './inspection-photo.service';
import { InspectionQueryService } from './inspection-query.service';
import { ListingMediaController } from './listing-media.controller';
import { ListingMediaService } from './listing-media.service';

/** Luồng thẩm định ký gửi → tự niêm yết (hồ sơ 16). Không có bước Admin duyệt. */
@Module({
  imports: [AuthModule, ConsignmentCoreModule, DoorModule, HostViewingsModule],
  controllers: [InspectionController, ListingMediaController],
  providers: [InspectionQueryService, InspectionFlowService, InspectionPhotoService, ListingMediaService],
  exports: [InspectionQueryService],
})
export class InspectionModule {}
