import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LandlordAccessService } from './landlord-access.service';
import { LandlordConsignmentService } from './landlord-consignment.service';
import { LandlordController } from './landlord.controller';
import { LandlordDirectoryService } from './landlord-directory.service';
import { LandlordFeeService } from './landlord-fee.service';
import { LandlordFinanceService } from './landlord-finance.service';
import { LandlordPhotoService } from './landlord-photo.service';
import { LandlordPhotoStorage } from './landlord-photo-storage.service';
import { LandlordMandateService } from './landlord-mandate.service';
import { LandlordService } from './landlord.service';
import { LandlordUnitsService } from './landlord-units.service';

@Module({
  imports: [AuthModule], // OtpService + PhoneService (xác thực OTP khi ký, giải mã SĐT)
  controllers: [LandlordController],
  providers: [
    LandlordAccessService,
    LandlordDirectoryService,
    LandlordFeeService,
    LandlordService,
    LandlordUnitsService,
    LandlordConsignmentService,
    LandlordPhotoService,
    LandlordPhotoStorage,
    LandlordFinanceService,
    LandlordMandateService,
  ],
  exports: [LandlordService],
})
export class LandlordModule {}
