import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { LayoutType, UnitStatus } from '@prisma/client';

export class PropertyFilterDto {
  @ApiPropertyOptional({ description: 'Mã tòa nhà (ví dụ: S1.02, S1.05, S2.01)' })
  @IsOptional()
  @IsString()
  buildingCode?: string;

  @ApiPropertyOptional({ enum: LayoutType, description: 'Loại căn hộ' })
  @IsOptional()
  @IsEnum(LayoutType)
  layoutType?: LayoutType;

  @ApiPropertyOptional({ description: 'Ngân sách trần All-in (VNĐ)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAllInCost?: number;

  @ApiPropertyOptional({ default: 1, description: 'Số lượng xe máy (150.000 đ/tháng/xe)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  motorbikes?: number = 1;

  @ApiPropertyOptional({ default: 0, description: 'Số lượng ô tô (1.250.000 đ/tháng/xe)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cars?: number = 0;

  @ApiPropertyOptional({ default: 2, description: 'Số người ở (ước tính điện nước 300.000 đ/người/tháng)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  occupants?: number = 2;

  @ApiPropertyOptional({ enum: UnitStatus, default: UnitStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus = UnitStatus.AVAILABLE;
}
