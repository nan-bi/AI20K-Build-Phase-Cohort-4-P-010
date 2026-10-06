import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { BookingAccessService } from '../tenant/booking-access.service';
import { EkycScanRequestDto, SubmitEkycInputDto } from './dto/identity.dto';
import { EkycScanResult, TenantBooking, TenantContract } from '../tenant/tenant.types';

@Injectable()
export class IdentityService {
  constructor(private readonly bookingAccess: BookingAccessService) {}

  private providerUnavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      message: 'Nhà cung cấp eKYC thật chưa được cấu hình; hệ thống không thể xác minh danh tính hoặc lập hợp đồng.',
      code: 'ekyc_provider_unavailable',
    });
  }

  async scan(
    ref: string,
    user: { id: string },
    dto: EkycScanRequestDto,
  ): Promise<EkycScanResult> {
    await this.bookingAccess.loadOwned(ref, user);
    void dto;
    throw this.providerUnavailable();
  }

  async submit(
    ref: string,
    user: { id: string },
    dto: SubmitEkycInputDto,
  ): Promise<{ booking: TenantBooking; contract: TenantContract }> {
    await this.bookingAccess.loadOwned(ref, user);
    void dto;
    throw this.providerUnavailable();
  }
}
