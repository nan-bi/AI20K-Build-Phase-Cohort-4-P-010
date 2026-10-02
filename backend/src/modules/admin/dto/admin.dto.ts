import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, IsIn, Max, Min } from 'class-validator';

export class UpdateCommissionParamDto {
  @ApiProperty({ example: 'host_deal_commission', description: 'Mã tham số biến phí' })
  @IsNotEmpty()
  @IsString()
  configKey: string;

  @ApiProperty({ example: 450000, description: 'Giá trị mới của tham số' })
  @IsNumber()
  paramValue: number;

  @ApiProperty({ example: 'Điều chỉnh thưởng kích cầu tuần lễ vàng', description: 'Lý do thay đổi tham số (lưu Audit)' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class CreateFieldHostDto {
  @ApiProperty({ example: 'host3@vinstay.test', description: 'Email của Field Host' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0912345679', description: 'Số điện thoại' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Trần Minh Khoa', description: 'Họ và tên' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'The Sapphire 1', description: 'Phân khu phụ trách' })
  @IsNotEmpty()
  @IsString()
  assignedZone: string;

  @ApiPropertyOptional({ example: ['sale', 'inspector'], description: 'Vai trò đảm nhiệm' })
  @IsOptional()
  @IsArray()
  roles?: string[];

  @ApiPropertyOptional({ example: 'RFID-S1-0003', description: 'Mã thẻ thang máy RFID' })
  @IsOptional()
  @IsString()
  rfidCardNumber?: string;
}

export class UpdateFieldHostDto {
  @ApiPropertyOptional({ example: 'Trần Minh Khoa' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '0912345679' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'The Sapphire 2' })
  @IsOptional()
  @IsString()
  assignedZone?: string;

  @ApiPropertyOptional({ example: ['sale', 'inspector'] })
  @IsOptional()
  @IsArray()
  roles?: string[];

  @ApiPropertyOptional({ example: 'RFID-S2-0004' })
  @IsOptional()
  @IsString()
  rfidCardNumber?: string;
}

export class ApproveConsignmentDto {
  @ApiPropertyOptional({ example: 'Hồ sơ đầy đủ, căn hộ đủ điều kiện niêm yết' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectConsignmentDto {
  @ApiProperty({ example: 'Hiện trạng căn hộ xuống cấp, nội thất hỏng hóc', description: 'Lý do từ chối' })
  @IsNotEmpty()
  @IsString()
  note: string;
}

export class ReassignBookingDto {
  @ApiProperty({ example: 'h1111111-1111-1111-1111-111111111111', description: 'ID của Field Host mới' })
  @IsNotEmpty()
  @IsString()
  hostId: string;
}

export class VoidHoldDto {
  @ApiProperty({ example: 'landlord_breach', enum: ['landlord_breach', 'force_majeure'], description: 'Lý do hủy cọc' })
  @IsNotEmpty()
  @IsIn(['landlord_breach', 'force_majeure'])
  reason: 'landlord_breach' | 'force_majeure';

  @ApiProperty({ example: 'Chủ nhà đơn phương chấm dứt hợp đồng', description: 'Ghi chú chi tiết' })
  @IsNotEmpty()
  @IsString()
  note: string;
}

export class UpdateHoldPolicyDto {
  @ApiPropertyOptional({ example: 'u1111111-1111-1111-1111-111111111111', description: 'Unit ID nếu cài riêng cho từng căn (null nếu toàn sàn)' })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiProperty({ example: 48, description: 'Số giờ giữ chỗ (12 - 72 giờ)' })
  @IsNumber()
  @Min(12)
  @Max(72)
  hours: number;
}
