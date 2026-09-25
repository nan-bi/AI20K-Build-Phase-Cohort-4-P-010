import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class EkycVerificationRequestDto {
  @ApiProperty({ description: 'ID của lượt cọc giữ chỗ (Holding Deposit ID)' })
  @IsUUID()
  depositId: string;

  @ApiProperty({ example: 'v2026.1', description: 'Phiên bản chấp thuận dữ liệu cá nhân (Consent Version)' })
  @IsNotEmpty()
  @IsString()
  consentVersion: string;

  @ApiProperty({ example: true, description: 'Khách thuê đã đồng ý chính sách xử lý dữ liệu cá nhân (Consent)' })
  @IsBoolean()
  hasConsent: boolean;

  @ApiPropertyOptional({ description: 'Mô phỏng ảnh chụp mặt trước CCCD (Base64/Stream)' })
  @IsOptional()
  @IsString()
  frontCardBase64?: string;

  @ApiPropertyOptional({ description: 'Mô phỏng ảnh chụp mặt sau CCCD (Base64/Stream)' })
  @IsOptional()
  @IsString()
  backCardBase64?: string;

  @ApiPropertyOptional({ description: 'Mô phỏng quét khuôn mặt Liveness' })
  @IsOptional()
  @IsString()
  faceVideoBase64?: string;
}
