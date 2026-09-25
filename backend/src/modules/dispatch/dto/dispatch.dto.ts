import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AcceptTicketDto {
  @ApiPropertyOptional({ description: 'ID của Field Host nhận ticket' })
  @IsOptional()
  @IsString()
  hostId?: string;
}
