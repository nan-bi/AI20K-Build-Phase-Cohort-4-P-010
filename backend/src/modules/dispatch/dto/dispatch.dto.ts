import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class AcceptTicketDto {
  @ApiPropertyOptional({ description: 'ID của Field Host nhận ticket' })
  @IsOptional()
  @IsString()
  hostId?: string;
}

export class RejectTicketDto {
  @ApiProperty({ example: 'Đang bận dẫn căn khác', description: 'Lý do từ chối ca trực' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'ID của Field Host từ chối' })
  @IsOptional()
  @IsString()
  hostId?: string;
}

export class ClaimTicketDto {
  @ApiPropertyOptional({ description: 'ID của Field Host claim ticket từ Open Pool' })
  @IsOptional()
  @IsString()
  hostId?: string;
}

export class EmergencyReportDto {
  @ApiProperty({ example: 'smart_lock', enum: ['smart_lock', 'physical_key'], description: 'Loại sự cố khẩn cấp' })
  @IsNotEmpty()
  @IsIn(['smart_lock', 'physical_key'])
  kind: 'smart_lock' | 'physical_key';

  @ApiPropertyOptional({ example: 'Khóa thông minh hết pin tại chỗ, cần kỹ thuật hỗ trợ' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class NoShowDto {
  @ApiPropertyOptional({ example: 'Quá 15 phút khách không liên lạc được' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class NotInterestedDto {
  @ApiPropertyOptional({ example: 'Khách muốn tìm căn tầng thấp hơn hoặc hướng khác' })
  @IsOptional()
  @IsString()
  reason?: string;
}
