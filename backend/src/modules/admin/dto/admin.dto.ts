import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsIn, Max, Min } from 'class-validator';

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

  @ApiProperty({ example: 'Host cũ kẹt thang', description: 'Lý do can thiệp (lưu Audit)' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class TerminateMandateDto {
  @ApiProperty({ example: 'Chủ nhà đã báo trước đủ 15 ngày', description: 'Lý do chấm dứt ủy quyền (lưu Audit)' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class EscalateTicketDto {
  @ApiProperty({ example: 'Host không phản hồi', description: 'Lý do leo thang (lưu Audit)' })
  @IsNotEmpty()
  @IsString()
  reason: string;
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
  @ApiPropertyOptional({ description: 'Không còn hỗ trợ cấu hình riêng từng căn; nếu gửi sẽ bị từ chối' })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiPropertyOptional({ example: 7, description: 'Số ngày giữ chỗ (nguyên, 1–14); ghi vào FeeConfig holding_duration_days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  days?: number;

  @ApiPropertyOptional({ example: 48, description: 'Tương thích cũ: số giờ (12–72), quy đổi lên số ngày nguyên. Bỏ qua nếu có days' })
  @IsOptional()
  @IsNumber()
  @Min(12)
  @Max(72)
  hours?: number;

  @ApiPropertyOptional({ example: 'Mùa cao điểm', description: 'Lý do thay đổi (lưu Audit)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PayoutQueryDto {
  @ApiPropertyOptional({ example: '2026-W41', description: 'Tuần ISO; mặc định tuần hiện tại' })
  @IsOptional()
  @IsString()
  period?: string;
}

export class ResolveUncDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'], description: 'Duyệt hoặc từ chối UNC (từ chối ⇒ QR_EXPIRED)' })
  @IsIn(['APPROVE', 'REJECT'])
  decision: 'APPROVE' | 'REJECT';

  @ApiProperty({ example: 'Đã đối soát sao kê', description: 'Lý do (lưu Audit)' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class KeyReasonDto {
  @ApiProperty({ example: 'Khách cũ trả phòng', description: 'Lý do (lưu Audit)' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class DepositQueryDto {
  @ApiPropertyOptional({ example: 'UNC_PENDING_REVIEW' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  pageSize?: number;
}

export class UpdateDepositPolicyDto {
  @ApiPropertyOptional({ example: 0.5, description: 'Tỷ lệ cọc tối thiểu theo giá thuê tháng (ví dụ 0.5 = 50%)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(2.0)
  minRatio?: number;

  @ApiPropertyOptional({ example: 4.0, description: 'Tỷ lệ cọc tối đa theo giá thuê tháng (ví dụ 4.0 = 400% / 4 lần)' })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(10.0)
  maxRatio?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Tỷ lệ cọc khuyến nghị mặc định (ví dụ 1.0 = 100% / 1 tháng)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10.0)
  defaultRatio?: number;

  @ApiPropertyOptional({ example: 'Cập nhật quy định cọc căn cứ theo giá thuê tháng', description: 'Lý do thay đổi (lưu Audit)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

