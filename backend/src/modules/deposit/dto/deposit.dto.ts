import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class GenerateVietQrDto {
  @ApiProperty({ description: 'ID của lượt xem phòng (Viewing ID)' })
  @IsString()
  viewingId: string;

  @ApiPropertyOptional({ description: 'ID của Field Host chốt cọc (Attribution Lock)' })
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiPropertyOptional({ default: 2000000, description: 'Số tiền cọc giữ chỗ (mặc định 2.000.000 VNĐ)' })
  @IsOptional()
  @IsNumber()
  amount?: number = 2000000;
}

export class VietQrWebhookDto {
  @ApiProperty({ example: 'DEP-VHOP-S1.02-12A08-8921', description: 'Mã cọc định danh' })
  @IsNotEmpty()
  @IsString()
  depositCode: string;

  @ApiProperty({ example: 2000000, description: 'Số tiền đã chuyển khoản' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'BANK-TX-982142', description: 'Mã tham chiếu ngân hàng' })
  @IsNotEmpty()
  @IsString()
  bankRefNumber: string;
}

export class UploadHostReceiptDto {
  @ApiProperty({ example: 'https://storage.vinstay.vn/receipts/unc-8921.jpg', description: 'Đường dẫn ảnh ủy nhiệm chi (UNC)' })
  @IsNotEmpty()
  @IsString()
  receiptUrl: string;

  @ApiPropertyOptional({ example: 'Khách đã chuyển khoản 2.000.000đ tại Techcombank, webhook ngân hàng chưa báo', description: 'Ghi chú của Host' })
  @IsOptional()
  @IsString()
  note?: string;
}
