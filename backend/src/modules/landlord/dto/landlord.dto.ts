import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestExitMandateDto {
  @ApiProperty({ description: 'ID của hợp đồng ủy quyền Mandate' })
  @IsNotEmpty()
  @IsString()
  mandateId: string;

  @ApiProperty({ example: 'Tôi có nhu cầu tự ở hoặc bán căn hộ', description: 'Lý do yêu cầu dừng ký gửi' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
