import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptInspectionDto {
  @ApiPropertyOptional({ example: 'h1111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsString()
  hostId?: string;
}

export class SubmitInspectionReportDto {
  @ApiPropertyOptional({ example: 'h1111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiPropertyOptional({ description: 'Đối chiếu 5 trường thông tin khai báo' })
  @IsOptional()
  @IsArray()
  declared?: any[];

  @ApiPropertyOptional({ description: 'Kiểm kê danh mục 32 hạng mục' })
  @IsOptional()
  @IsArray()
  inventory?: any[];

  @ApiPropertyOptional({ example: 45.5, description: 'Diện tích thông thủy Host đo' })
  @IsOptional()
  @IsNumber()
  netAreaM2?: number;

  @ApiPropertyOptional({ example: 'full', enum: ['full', 'basic', 'empty'] })
  @IsOptional()
  @IsString()
  furnishing?: string;

  @ApiProperty({ example: 'approve', enum: ['approve', 'reject'] })
  @IsNotEmpty()
  @IsIn(['approve', 'reject'])
  recommendation: 'approve' | 'reject';

  @ApiPropertyOptional({ example: 'Căn hộ đúng hiện trạng, thiết bị hoạt động tốt' })
  @IsOptional()
  @IsString()
  note?: string;
}
