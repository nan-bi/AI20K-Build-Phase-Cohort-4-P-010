import { holdingDepositAmount } from '../deposit-amount';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({ description: 'Đồng ý điều khoản cọc' })
  @IsNotEmpty()
  @IsBoolean()
  acceptTerms: boolean;

  @ApiProperty({ example: 'HOLD-2026.10-v1', description: 'Phiên bản điều khoản cọc' })
  @IsNotEmpty()
  @IsString()
  termsVersion: string;
}

export class VietQrWebhookInputDto {
  @ApiPropertyOptional({ example: 'DEP-VS-89212', description: 'Mã cọc định danh' })
  @IsOptional()
  @IsString()
  depositCode?: string;

  @ApiPropertyOptional({ example: 'COC S1.02-12A08 0912345678', description: 'Nội dung chuyển khoản' })
  @IsOptional()
  @IsString()
  transferContent?: string;

  @ApiProperty({ example: holdingDepositAmount(), description: 'Số tiền chuyển khoản' })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'FT2401019999', description: 'Mã giao dịch ngân hàng' })
  @IsNotEmpty()
  @IsString()
  bankRefNumber: string;
}

export class UploadHostReceiptDto {
  @ApiProperty({ example: 'https://storage.vinstay.vn/receipts/unc-8921.jpg', description: 'Đường dẫn ảnh ủy nhiệm chi (UNC)' })
  @IsNotEmpty()
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  receiptUrl: string;

  @ApiPropertyOptional({ example: 'Khách đã chuyển khoản 2.000.000đ tại Techcombank, webhook ngân hàng chưa báo', description: 'Ghi chú của Host' })
  @IsOptional()
  @IsString()
  note?: string;
}
