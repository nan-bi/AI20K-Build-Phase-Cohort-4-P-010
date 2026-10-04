import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { LayoutType, UnitStatus } from '@prisma/client';

export class PropertyFilterDto {
  @ApiPropertyOptional({ description: 'Mã phân khu (sapphire1, sapphire2, zenpark, pavilion, masteri)' })
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiPropertyOptional({ description: 'Loại layout (Studio, 1PN, 2PN, 3PN)' })
  @IsOptional()
  @IsString()
  layout?: 'Studio' | '1PN' | '2PN' | '3PN';

  @ApiPropertyOptional({ description: 'Giá thuê trần (VNĐ/tháng)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxRent?: number;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (mã căn hoặc tiêu đề)' })
  @IsOptional()
  @IsString()
  q?: string;

  // Legacy fields for backward compatibility
  @ApiPropertyOptional({ description: 'Mã tòa nhà (ví dụ: S1.02, S1.05, S2.01)' })
  @IsOptional()
  @IsString()
  buildingCode?: string;

  @ApiPropertyOptional({ enum: LayoutType, description: 'Loại căn hộ enum' })
  @IsOptional()
  @IsEnum(LayoutType)
  layoutType?: LayoutType;

  @ApiPropertyOptional({ description: 'Ngân sách trần All-in (VNĐ)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAllInCost?: number;

  @ApiPropertyOptional({ default: 1, description: 'Số lượng xe máy' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  motorbikes?: number = 1;

  @ApiPropertyOptional({ default: 0, description: 'Số lượng ô tô' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cars?: number = 0;

  @ApiPropertyOptional({ default: 2, description: 'Số người ở' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  occupants?: number = 2;

  @ApiPropertyOptional({ enum: UnitStatus, default: UnitStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus = UnitStatus.AVAILABLE;
}
