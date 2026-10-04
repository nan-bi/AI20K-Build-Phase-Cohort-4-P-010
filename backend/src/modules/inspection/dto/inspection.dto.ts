import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { SubmitInspectionInput } from '../inspection.types';

/**
 * DTO nộp phiếu (E8). CHỈ kiểm KIỂU + trần kích thước mảng; luật nghiệp vụ V1–V11 (kèm `field`) ở
 * `inspection-report.validator.ts` để lỗi trả về đúng ô cần tô đỏ. KHÔNG có `hostId`/`submittedAt`/`avgCondition`:
 * Host lấy từ phiên, hai giá trị còn lại do server tính.
 */
export class DeclaredItemDto {
  @IsIn(['identity', 'layout', 'areaM2', 'furnishing', 'lock'])
  field: 'identity' | 'layout' | 'areaM2' | 'furnishing' | 'lock';

  @IsBoolean()
  ok: boolean;

  @IsOptional()
  @IsString()
  actual?: string;
}

export class InventoryLineDto {
  @IsString() code: string;
  @IsIn(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']) group: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII';
  @IsString() name: string;
  @IsBoolean() present: boolean;
  @IsOptional() @IsNumber() qty?: number;
  @IsOptional() @IsNumber() condition?: number;
  @IsOptional() @IsString() spec?: string;
  @IsOptional() @IsString() note?: string;
  @IsIn(['misuse', 'wear_or_misuse']) liability: 'misuse' | 'wear_or_misuse';
  @IsOptional() @IsNumber() compensation?: number;
  @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) photoIds: string[];
}

export class FunctionsDto {
  @IsBoolean() ac: boolean;
  @IsBoolean() kitchen: boolean;
  @IsBoolean() waterHeater: boolean;
  @IsBoolean() drainage: boolean;
}

export class SubmitInspectionDto implements SubmitInspectionInput {
  @ApiProperty({ description: 'Đúng 5 mục đối chiếu kê khai: identity, layout, areaM2, furnishing, lock' })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DeclaredItemDto)
  declared: DeclaredItemDto[];

  @ApiProperty({ description: '32 dòng catalog Điều 5 theo thứ tự + 0..10 dòng X1..X10' })
  @IsArray()
  @ArrayMaxSize(42)
  @ValidateNested({ each: true })
  @Type(() => InventoryLineDto)
  inventory: InventoryLineDto[];

  @IsDefined() // thiếu `functions` ⇒ 400, không cho căn lên tin với phiếu rỗng (web đọc report.functions[k])
  @ValidateNested()
  @Type(() => FunctionsDto)
  functions: FunctionsDto;

  @IsNumber() netAreaM2: number;
  @IsIn(['full', 'basic', 'empty']) furnishing: 'full' | 'basic' | 'empty';

  @ApiProperty({ description: 'Thứ tự hiển thị trên tin; "đạt" cần 4–12 ảnh slot listing' })
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  listingPhotoIds: string[];

  @IsIn(['approve', 'reject']) recommendation: 'approve' | 'reject';

  @ApiPropertyOptional({ description: '≤300 ký tự; bắt buộc khi reject' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'PIN thật 4–8 số — chỉ cần khi căn khóa điện tử chưa có mã (đạt)' })
  @IsOptional()
  @IsString()
  doorPin?: string;
}

/** Trường multipart đi kèm ảnh (E6). Sai định dạng số/ISO ⇒ lưu null; `slot`/`room` kiểm ở service (`photo_bad_slot`). */
export class UploadInspectionPhotoDto {
  @IsOptional() @IsString() slot?: string;
  @IsOptional() @IsString() room?: string;
  @IsOptional() @IsString() takenAt?: string;
  @IsOptional() @IsString() sharpness?: string;
  @IsOptional() @IsString() brightness?: string;
}
