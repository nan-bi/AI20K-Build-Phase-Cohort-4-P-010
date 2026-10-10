import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DIRECTIONS } from '../../property/unit-facts';

export class RequestExitMandateDto {
  @ApiProperty({ description: 'ID của ủy quyền (lấy từ `mandate.id` trong GET /landlord/units)' })
  @IsUUID()
  mandateId: string;

  @ApiProperty({ example: 'Tôi có nhu cầu tự ở hoặc bán căn hộ', description: 'Lý do yêu cầu dừng ký gửi' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  reason: string;
}

export class CancelExitMandateDto {
  @ApiProperty({ description: 'ID của ủy quyền' })
  @IsUUID()
  mandateId: string;
}

export class CreateConsignmentDto {
  @ApiProperty({ example: 'S1.02', description: 'Mã tòa (phải có trong bảng buildings)' })
  @IsNotEmpty()
  @IsString()
  building: string;

  @ApiProperty({ example: 12, description: 'Số tầng (1–60)' })
  @IsInt()
  @Min(1)
  @Max(60)
  floor: number;

  @ApiProperty({ example: '08', description: 'Số căn' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'Số căn chỉ gồm chữ và số' })
  door: string;

  @ApiProperty({ example: '1PN', description: 'Studio | 1PN | 2PN | 3PN (hoặc enum Prisma: STUDIO, ONE_BED_PLUS, ...)' })
  @IsNotEmpty()
  @IsString()
  layout: string;

  @ApiProperty({ example: 47, description: 'Diện tích tim tường chủ nhà khai (m², 20–300)' })
  @IsNumber()
  @Min(20)
  @Max(300)
  areaM2: number;

  @ApiPropertyOptional({ example: 2, description: 'Số phòng vệ sinh (1–4). Bỏ trống = theo loại căn (2PN/3PN: 2, còn lại: 1); Inspector xác nhận lại khi thẩm định' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  bathrooms?: number;

  @ApiPropertyOptional({ example: 'Đông Nam', description: 'Hướng căn hộ: Đông | Tây | Nam | Bắc | Đông Nam | Đông Bắc | Tây Nam | Tây Bắc' })
  @IsOptional()
  @IsIn(DIRECTIONS as unknown as string[])
  direction?: string;

  @ApiProperty({ example: 6500000, description: 'Giá thuê kỳ vọng (VNĐ/tháng, tối thiểu 3.000.000)' })
  @IsNumber()
  @Min(3_000_000)
  askRent: number;

  @ApiPropertyOptional({ example: 6500000, description: 'Tiền cọc bảo đảm đề xuất: 0.5–4 lần giá thuê tháng (Admin cấu hình). Mặc định = giá thuê' })
  @IsOptional()
  @IsNumber()
  suggestedDeposit?: number;

  @ApiPropertyOptional({ example: 'long', description: 'Thời gian thuê mong muốn: mid (1–6 tháng) | long (12 tháng) | fixed (cố định 12 tháng)' })
  @IsOptional()
  @IsIn(['mid', 'long', 'fixed'])
  leaseTerm?: 'mid' | 'long' | 'fixed';

  @ApiPropertyOptional({ example: true, description: 'Đã có đầy đủ nội thất' })
  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @ApiPropertyOptional({ example: ['smart'], description: '1–2 hình thức khóa: smart | physical (hoặc ELECTRONIC_PIN | PHYSICAL_KEY)' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  locks?: string[];

  @ApiPropertyOptional({ example: '839201', description: 'Mã mở khóa điện tử — lưu mã hóa, không bao giờ trả lại qua API' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  doorCode?: string;

  @ApiPropertyOptional({ example: 'Ưu tiên khách ở lâu dài, giữ gìn vệ sinh' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @ApiPropertyOptional({ example: ['8', '21'], description: 'Mã hạng mục (catalog 32 món) chủ nhà khai là có sẵn; thẩm định tick sẵn' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  inventoryCodes?: string[];

  @ApiPropertyOptional({ default: false, description: 'true = bản nháp: bỏ kiểm tra tiền cọc đề xuất' })
  @IsOptional()
  @IsBoolean()
  draft?: boolean;
}

export class SignConsignmentDto {
  @ApiProperty({ example: true, description: 'Cam kết quyền sở hữu/sử dụng hợp pháp (Điều 2 legal/01) — bắt buộc true' })
  @IsBoolean()
  ownershipWarranted: boolean;

  @ApiPropertyOptional({ example: '4829', description: 'OTP Zalo — KHÔNG cần khi ký bằng số đã xác thực của tài khoản; bắt buộc khi nhập số khác hoặc tài khoản chưa có số (gửi trước bằng POST /landlord/consignments/:id/send-otp)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'OTP gồm 4 chữ số' })
  otp?: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Bỏ trống ⇒ dùng số đã xác thực của tài khoản (không cần OTP). Nhập số KHÁC (hoặc tài khoản chưa có số) ⇒ phải OTP; số ký chỉ lưu (mã hoá) trong hồ sơ ký gửi, KHÔNG gắn vào tài khoản' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class SendConsignmentOtpDto {
  @ApiPropertyOptional({ example: '0901234567', description: 'Bỏ trống ⇒ số đã xác thực của tài khoản (trả `otpRequired:false`, không gửi mã). Nhập số khác ⇒ gửi OTP tới số đó' })
  @IsOptional()
  @IsString()
  phone?: string;
}

/** Quyết định của chủ nhà về giá + cọc bảo đảm do Inspector đề xuất (hồ sơ 18, 01 §4.3). */
export class PricingDecisionDto {
  @ApiProperty({ enum: ['accept', 'decline'] })
  @IsIn(['accept', 'decline'])
  decision: 'accept' | 'decline';
}
