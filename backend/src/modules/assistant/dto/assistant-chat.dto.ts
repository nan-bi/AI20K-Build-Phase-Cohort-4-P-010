import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AssistantMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

/** Tiêu chí tìm đang áp dụng (client lấy từ event `units.criteria`); khoá lạ bị whitelist bỏ. Khớp ai-engine SearchContext. */
export class SearchContextDto {
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000_000)
  max_all_in_budget?: number;

  @IsOptional() @IsInt() @Min(0) @Max(20)
  occupants?: number;

  @IsOptional() @IsInt() @Min(0) @Max(10)
  motorbikes?: number;

  @IsOptional() @IsInt() @Min(0) @Max(10)
  cars?: number;

  @IsOptional() @IsIn(['studio', '1pn', '2pn', '3pn'])
  layout?: 'studio' | '1pn' | '2pn' | '3pn';

  @IsOptional() @IsIn(['full', 'basic', 'empty'])
  furnishing?: 'full' | 'basic' | 'empty';

  @IsOptional() @IsBoolean()
  pet?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  min_floor?: number;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  max_floor?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(40, { each: true })
  must_have?: string[];
}

/** Body relay chatbot (01-CONTRACTS §5). `user` do Nest tự gắn từ phiên, client gửi lên sẽ bị bỏ qua. */
export class AssistantChatDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AssistantMessageDto)
  messages!: AssistantMessageDto[];

  @IsIn(['vi', 'en'])
  locale!: 'vi' | 'en';

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchContextDto)
  searchContext?: SearchContextDto;
}
