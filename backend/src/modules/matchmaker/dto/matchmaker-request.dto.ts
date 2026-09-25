import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { LayoutType } from '@prisma/client';

export class MatchmakerRequestDto {
  @ApiProperty({ example: 10000000, description: 'Ngân sách trần All-in tối đa chấp nhận được (VNĐ/tháng)' })
  @IsNumber()
  @Min(3000000)
  maxAllInBudget: number;

  @ApiPropertyOptional({ enum: LayoutType, description: 'Loại căn hộ mong muốn' })
  @IsOptional()
  @IsEnum(LayoutType)
  preferredLayout?: LayoutType;

  @ApiProperty({ default: 1, description: 'Số lượng xe máy' })
  @IsNumber()
  motorbikes: number = 1;

  @ApiProperty({ default: 0, description: 'Số lượng ô tô' })
  @IsNumber()
  cars: number = 0;

  @ApiProperty({ default: 2, description: 'Số lượng người ở' })
  @IsNumber()
  occupants: number = 2;
}
