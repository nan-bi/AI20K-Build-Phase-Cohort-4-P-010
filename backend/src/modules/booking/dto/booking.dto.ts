import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

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
  @IsString()
  unitId: string;

  @ApiProperty({ example: '2026-09-25T15:30:00Z', description: 'Khung giờ hẹn xem phòng' })
  @IsDateString()
  viewingSlot: string;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'ID căn hộ muốn xem' })
  @IsString()
  unitId: string;

  @ApiProperty({ example: '2026-10-03T14:00:00Z', description: 'Khung giờ hẹn xem phòng' })
  @IsDateString()
  slot: string;

  @ApiProperty({ example: 'Nguyễn Văn An', description: 'Họ và tên khách thuê' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '0912345678', description: 'Số điện thoại khách thuê' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 2, description: 'Số người ở dự kiến' })
  @IsOptional()
  @IsNumber()
  persons?: number;

  @ApiPropertyOptional({ example: 'Cần xem thêm chỗ để xe máy', description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelBookingDto {
  @ApiProperty({ example: 'Bận đột xuất', description: 'Lý do hủy lịch' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class RescheduleBookingDto {
  @ApiProperty({ example: '2026-10-04T10:00:00Z', description: 'Khung giờ mới muốn đổi' })
  @IsDateString()
  slot: string;
}

export class RateBookingDto {
  @ApiProperty({ example: 5, description: 'Số sao đánh giá (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  stars: number;

  @ApiPropertyOptional({ example: 'Host đón đúng giờ, tư vấn nhiệt tình' })
  @IsOptional()
  @IsString()
  comment?: string;
}
