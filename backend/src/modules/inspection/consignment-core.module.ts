import { Module } from '@nestjs/common';
import { ConsignmentMetaStore } from '../landlord/consignment-meta.store';
import { LandlordPhotoStorage } from '../landlord/landlord-photo-storage.service';
import { InspectorAssigner } from './inspector-assigner.service';

/**
 * Phần dùng CHUNG giữa `LandlordModule` (chủ nhà ký/ảnh) và `InspectionModule` (Inspector nhận/nộp): kho meta khóa dòng,
 * kho ảnh Storage và bộ chọn Inspector. Tách riêng để hai module không import vòng quanh nhau (hồ sơ 16).
 */
@Module({
  providers: [ConsignmentMetaStore, LandlordPhotoStorage, InspectorAssigner],
  exports: [ConsignmentMetaStore, LandlordPhotoStorage, InspectorAssigner],
})
export class ConsignmentCoreModule {}
