import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsPhoneNumber, IsString, IsUUID } from 'class-validator';

export class RequestBookingOtpDto {
  @ApiProperty({ example: '0912345678', description: 'Số điện thoại nhận mã Zalo OTP' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Nguyễn Văn An', description: 'Họ và tên khách thuê' })
  @IsNotEmpty()
  @IsString()
  fullName: string;
}

export class ConfirmBookingDto {
  @ApiProperty({ example: '0912345678', description: 'Số điện thoại đã nhận OTP' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: '4829', description: 'Mã xác thực OTP (mặc định thử nghiệm: 4829)' })
  @IsNotEmpty()
  @IsString()
  otp: string;

  @ApiProperty({ description: 'ID căn hộ muốn xem' })
  @IsUUID()
  unitId: string;

  @ApiProperty({ example: '2026-09-25T15:30:00Z', description: 'Khung giờ hẹn xem phòng' })
  @IsDateString()
  viewingSlot: string;
}
