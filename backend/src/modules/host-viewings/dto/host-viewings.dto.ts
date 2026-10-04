import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RejectTicketDto {
  @ApiProperty({ example: 'Đang có ca khác gần giờ này', minLength: 3, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  reason: string;
}

export class NotInterestedDto {
  @ApiProperty({ example: 'Giá cao hơn ngân sách', minLength: 3, maxLength: 200 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason: string;
}

export const EMERGENCY_KINDS = ['smart_lock', 'physical_key'] as const;
export type EmergencyKind = (typeof EMERGENCY_KINDS)[number];

export class EmergencyDto {
  @ApiProperty({ enum: EMERGENCY_KINDS })
  @IsIn(EMERGENCY_KINDS as unknown as string[])
  kind: EmergencyKind;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  note?: string;
}

export const DUTY_VALUES = ['ONLINE_AVAILABLE', 'OFF_DUTY'] as const;

export class SetDutyDto {
  @ApiProperty({ enum: DUTY_VALUES })
  @IsIn(DUTY_VALUES as unknown as string[])
  status: (typeof DUTY_VALUES)[number];
}
