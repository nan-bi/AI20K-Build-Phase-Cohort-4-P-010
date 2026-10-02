import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestExitMandateDto {
  @ApiProperty({ description: 'ID của hợp đồng ủy quyền Mandate' })
  @IsNotEmpty()
  @IsString()
  mandateId: string;

  @ApiProperty({ example: 'Tôi có nhu cầu tự ở hoặc bán căn hộ', description: 'Lý do yêu cầu dừng ký gửi' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class CancelExitMandateDto {
  @ApiProperty({ description: 'ID của hợp đồng ủy quyền Mandate' })
  @IsNotEmpty()
  @IsString()
  mandateId: string;
}

export class CreateConsignmentDto {
  @ApiProperty({ example: 'S1.02', description: 'Tòa căn hộ' })
  @IsNotEmpty()
  @IsString()
  building: string;

  @ApiProperty({ example: 12, description: 'Số tầng' })
  @IsNumber()
  floor: number;

  @ApiProperty({ example: '08', description: 'Số phòng/căn' })
  @IsNotEmpty()
  @IsString()
  door: string;

  @ApiProperty({ example: 'ONE_BED_PLUS', description: 'Loại căn hộ' })
  @IsNotEmpty()
  @IsString()
  layout: string;

  @ApiProperty({ example: 47.0, description: 'Diện tích thông thủy (m2)' })
  @IsNumber()
  areaM2: number;

  @ApiProperty({ example: 6500000, description: 'Giá thuê kỳ vọng (VNĐ/tháng)' })
  @IsNumber()
  askRent: number;

  @ApiPropertyOptional({ example: 6500000, description: 'Tiền cọc bảo đảm gợi ý' })
  @IsOptional()
  @IsNumber()
  suggestedDeposit?: number;

  @ApiPropertyOptional({ example: 12, description: 'Thời hạn thuê tối thiểu (tháng)' })
  @IsOptional()
  @IsNumber()
  leaseTerm?: number;

  @ApiPropertyOptional({ example: true, description: 'Đã có đầy đủ nội thất' })
  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @ApiPropertyOptional({ example: ['ELECTRONIC_PIN'], description: 'Loại khóa cửa' })
  @IsOptional()
  @IsArray()
  locks?: string[];

  @ApiPropertyOptional({ example: '839201', description: 'Mã mở khóa cửa' })
  @IsOptional()
  @IsString()
  doorCode?: string;

  @ApiPropertyOptional({ example: 'Ưu tiên khách ở lâu dài, giữ gìn vệ sinh' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ default: false, description: 'Lưu bản nháp' })
  @IsOptional()
  @IsBoolean()
  draft?: boolean;
}

export class SignConsignmentDto {
  @ApiProperty({ example: true, description: 'Cam kết quyền sở hữu/sử dụng hợp pháp' })
  @IsBoolean()
  ownershipWarranted: boolean;

  @ApiPropertyOptional({ example: '4829', description: 'Mã OTP Zalo ký ủy quyền' })
  @IsOptional()
  @IsString()
  otp?: string;
}
