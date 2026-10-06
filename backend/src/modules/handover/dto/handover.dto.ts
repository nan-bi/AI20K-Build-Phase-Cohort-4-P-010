import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { HandoverType } from '@prisma/client';

export class HandoverItemInputDto {
  @ApiProperty({ example: 'wall', description: 'Hạng mục kiểm định (10 danh mục)' })
  @IsNotEmpty()
  @IsString()
  itemCategory: string;

  @ApiProperty({ example: 'Sơn tường sạch đẹp, không bong tróc, không vết bẩn lớn' })
  @IsString()
  conditionNote: string;

  @ApiProperty({ type: [String], description: 'Storage key ảnh đã tải lên qua API handover' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photos: string[];

  @ApiProperty({ example: true, description: 'Đạt chuẩn / Hao mòn tự nhiên chấp nhận được' })
  isNormalWear: boolean = true;
}

export class UtilityReadingInputDto {
  @ApiProperty({ example: 'ELECTRICITY', enum: ['ELECTRICITY', 'WATER'] })
  @IsNotEmpty()
  @IsString()
  utilityType: string;

  @ApiProperty({ example: 12450.5, description: 'Chỉ số công tơ (Host nhập tay)' })
  @IsNumber()
  meterIndex: number;

  @ApiProperty({ example: 'handovers/<contractId>/<photoId>.jpg', description: 'Storage key ảnh công tơ đã tải lên cho đúng hợp đồng' })
  @IsNotEmpty()
  @IsString()
  photoKey: string;
}

export class CreateDigitalHandoverDto {
  @ApiProperty({ description: 'ID hợp đồng thuê (Contract ID)' })
  @IsUUID()
  contractId: string;

  @ApiProperty({ enum: HandoverType, default: HandoverType.CHECK_IN })
  @IsEnum(HandoverType)
  handoverType: HandoverType = HandoverType.CHECK_IN;

  @ApiProperty({ type: [HandoverItemInputDto] })
  @IsArray()
  @ArrayMinSize(10)
  @ValidateNested({ each: true })
  @Type(() => HandoverItemInputDto)
  items: HandoverItemInputDto[];

  @ApiProperty({ type: [UtilityReadingInputDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => UtilityReadingInputDto)
  utilityReadings: UtilityReadingInputDto[];
}
