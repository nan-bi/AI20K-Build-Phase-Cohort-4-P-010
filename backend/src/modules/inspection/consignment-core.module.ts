import { Module } from '@nestjs/common';
import { ConsignmentMetaStore } from '../landlord/consignment-meta.store';
import { LandlordPhotoStorage } from '../landlord/landlord-photo-storage.service';
import { DoorModule } from '../door/door.module';
import { InspectorAssigner } from './inspector-assigner.service';
import { ListingPublisher } from './listing-publisher.service';

/**
 * Phần dùng CHUNG giữa `LandlordModule` (chủ nhà ký/ảnh) và `InspectionModule` (Inspector nhận/nộp): kho meta khóa dòng,
 * kho ảnh Storage, bộ chọn Inspector và `ListingPublisher` (Inspector niêm yết khi giá không đổi; chủ nhà niêm yết khi chấp nhận giá đề xuất — hồ sơ 18). Tách riêng để hai module không import vòng quanh nhau (hồ sơ 16).
 */
@Module({
  imports: [DoorModule],
  providers: [ConsignmentMetaStore, LandlordPhotoStorage, InspectorAssigner, ListingPublisher],
  exports: [ConsignmentMetaStore, LandlordPhotoStorage, InspectorAssigner, ListingPublisher],
})
export class ConsignmentCoreModule {}
