import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'VHOP-S1.02-0405', description: 'Mã căn hộ (hoặc ID căn)' })
  @IsNotEmpty()
  @IsString()
  unitCode: string;

  @ApiProperty({ example: '2026-10-06T01:30:00.000Z', description: 'Khung giờ xem phòng (ISO UTC, khớp SLOT_TIMES giờ VN)' })
  @IsNotEmpty()
  @IsDateString()
  slot: string;

  @ApiProperty({ example: 'Nguyễn Văn An', description: 'Họ và tên người xem' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  contactName: string;

  @ApiProperty({ example: '0912345678', description: 'Số điện thoại liên hệ' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ default: 1, example: 2, description: 'Số người tham gia xem (1-10)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  partySize?: number = 1;

  @ApiPropertyOptional({ example: 'Cần xem thêm chỗ gửi xe', description: 'Ghi chú cho Field Host' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @ApiPropertyOptional({ description: 'Token OTP mục đích TENANT_VIEWING' })
  @IsOptional()
  @IsString()
  actionToken?: string;
}

export class CancelBookingDto {
  @ApiProperty({ example: 'Tôi bận công tác đột xuất', description: 'Lý do hủy lịch (3..200 ký tự)' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 200)
  reason: string;
}

export class RescheduleBookingDto {
  @ApiProperty({ example: '2026-10-07T07:30:00.000Z', description: 'Khung giờ mới (ISO UTC)' })
  @IsNotEmpty()
  @IsDateString()
  slot: string;
}

export class RateBookingDto {
  @ApiProperty({ example: 5, description: 'Số sao đánh giá (1..5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  stars: number;
}
