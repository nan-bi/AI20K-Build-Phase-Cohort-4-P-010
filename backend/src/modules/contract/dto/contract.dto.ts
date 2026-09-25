import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SignDepositAgreementDto {
  @ApiProperty({ description: 'ID lượt cọc giữ chỗ (Holding Deposit ID)' })
  @IsUUID()
  depositId: string;

  @ApiProperty({ example: '<svg>signature path</svg>', description: 'Vector nét vẽ chữ ký tay trên Canvas' })
  @IsNotEmpty()
  @IsString()
  signatureSvg: string;

  @ApiProperty({ example: '4829', description: 'Mã xác thực OTP ký số' })
  @IsNotEmpty()
  @IsString()
  otp: string;
}

export class CreateMandateDto {
  @ApiProperty({ description: 'Mã căn hộ (ví dụ: VHOP-S1.02-12A08)' })
  @IsNotEmpty()
  @IsString()
  unitCode: string;

  @ApiProperty({ example: 6500000, description: 'Giá kỳ vọng cho thuê (VNĐ)' })
  @IsNotEmpty()
  expectedRentPrice: number;

  @ApiProperty({ example: '482910#', description: 'Mã số khóa cửa điện tử do chủ nhà thiết lập' })
  @IsNotEmpty()
  @IsString()
  doorPin: string;

  @ApiPropertyOptional({ default: true, description: 'Đăng ký Host thẩm định chụp ảnh 0đ' })
  @IsOptional()
  freeInspectionRequest?: boolean = true;
}
