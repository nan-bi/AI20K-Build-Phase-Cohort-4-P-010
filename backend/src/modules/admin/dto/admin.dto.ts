import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
