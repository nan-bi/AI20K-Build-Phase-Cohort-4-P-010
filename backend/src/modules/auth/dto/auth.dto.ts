import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose } from '@prisma/client';
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { PORTALS, Portal } from '../auth.constants';

// Profile.email là VarChar(100).
const EMAIL_MAX = 100;

export class LoginDto {
  @ApiProperty({ example: 'chunha@example.com' })
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  email: string;

  @ApiProperty({ example: 'matkhau-cua-ban' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;

  @ApiProperty({ enum: PORTALS, description: 'Cổng đăng nhập (màn hình FE)' })
  @IsIn(PORTALS as unknown as string[])
  portal: Portal;
}

export class SignupDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ enum: ['tenant', 'landlord', 'host'], description: 'Admin không có đăng ký — chỉ tạo bằng script' })
  @IsIn(['tenant', 'landlord', 'host'])
  portal: Portal;
}

export class SendOtpDto {
  @ApiProperty({ example: '0912345678' })
  @IsString()
  @Length(9, 20)
  phone: string;

  @ApiProperty({ enum: OtpPurpose })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

const OTP_CODE = /^\d{4}$/;

export class VerifyOtpDto {
  @ApiProperty({ example: '0912345678' })
  @IsString()
  @Length(9, 20)
  phone: string;

  @ApiProperty({ enum: ['TENANT_VIEWING', 'TENANT_DEPOSIT_SIGN'] })
  @IsIn(['TENANT_VIEWING', 'TENANT_DEPOSIT_SIGN'])
  purpose: 'TENANT_VIEWING' | 'TENANT_DEPOSIT_SIGN';

  @ApiProperty({ example: '4829' })
  @Matches(OTP_CODE, { message: 'code phải gồm 4 chữ số' })
  code: string;
}

export class SendPhoneOtpDto {
  @ApiProperty({ example: '0912345678' })
  @IsString()
  @Length(9, 20)
  phone: string;
}

export class VerifyPhoneDto {
  @ApiProperty({ example: '0912345678' })
  @IsString()
  @Length(9, 20)
  phone: string;

  @ApiProperty({ example: '4829' })
  @Matches(OTP_CODE, { message: 'code phải gồm 4 chữ số' })
  code: string;
}
