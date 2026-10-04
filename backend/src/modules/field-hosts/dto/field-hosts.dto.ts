import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEmpty,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { HOST_ROLES, HostRoleCode } from '../../auth/host-roles';

// Profile.email là VarChar(100); field_hosts.assigned_zone là VarChar(50).
const EMAIL_MAX = 100;
const ZONE_MAX = 50;
const NAME_MAX = 100;
// scrypt không giới hạn độ dài nhưng chặn trên để không bị dùng làm đòn DoS băm.
const PASSWORD_MAX = 72;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

const roleRules = (description: string) =>
  ApiProperty({ enum: HOST_ROLES, isArray: true, example: ['sale', 'inspector'], description });

export class CreateFieldHostDto {
  @ApiProperty({ example: 'host.nam@vinstay.vn', description: 'Email đăng nhập (Google hoặc mật khẩu). Không sửa được sau khi tạo.' })
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  email: string;

  @ApiProperty({ example: 'Nguyễn Phương Nam' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(NAME_MAX)
  fullName: string;

  @ApiProperty({ example: 'The Sapphire 1', description: 'Phải là một phân khu có trong `GET /admin/field-hosts/zones`' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(ZONE_MAX)
  assignedZone: string;

  @roleRules('Một Host có thể có cả hai vai')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(HOST_ROLES.length)
  @ArrayUnique()
  @IsIn(HOST_ROLES as unknown as string[], { each: true })
  roles: HostRoleCode[];

  @ApiPropertyOptional({ description: 'Mật khẩu ban đầu (≥ 8 ký tự). Bỏ trống ⇒ Host chỉ đăng nhập bằng Google.' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(PASSWORD_MAX)
  password?: string;
}

export class UpdateFieldHostDto {
  /** Email là định danh đăng nhập: không cho sửa. Khai báo để trường lạ bị TỪ CHỐI thay vì bị bỏ qua lặng lẽ (whitelist). */
  @ApiPropertyOptional({ type: String, description: 'Không sửa được — gửi lên sẽ bị từ chối' })
  @IsEmpty({ message: 'Không được sửa email của Field Host' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(NAME_MAX)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(ZONE_MAX)
  assignedZone?: string;

  @ApiPropertyOptional({ enum: HOST_ROLES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(HOST_ROLES.length)
  @ArrayUnique()
  @IsIn(HOST_ROLES as unknown as string[], { each: true })
  roles?: HostRoleCode[];

  @ApiPropertyOptional({ description: 'Đặt lại mật khẩu (≥ 8 ký tự)' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(PASSWORD_MAX)
  password?: string;

  @ApiPropertyOptional({ description: 'false = khoá (đăng xuất ngay), true = mở khoá' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListFieldHostsQueryDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên, email hoặc số điện thoại' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: [...HOST_ROLES, 'both'] })
  @IsOptional()
  @IsIn([...HOST_ROLES, 'both'])
  role?: HostRoleCode | 'both';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ZONE_MAX)
  zone?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: 'true' | 'false';
}
