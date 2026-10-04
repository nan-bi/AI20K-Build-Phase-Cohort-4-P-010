import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ListingMediaService } from './listing-media.service';

/**
 * E9 — ảnh niêm yết, không cần đăng nhập (khách thuê xem tin). Đây là route duy nhất của module không đòi phiên;
 * chỉ phục vụ ảnh đã gắn vào căn Verified (xem `ListingMediaService`). Nhận `@Res()` để trả bytes thô,
 * không qua `TransformInterceptor`.
 */
@ApiTags('4.3. Ảnh niêm yết (/media)')
@Controller('media')
export class ListingMediaController {
  constructor(private readonly media: ListingMediaService) {}

  @Public()
  @Get('listing/:mandateId/:file')
  @ApiOperation({ summary: 'E9 — Ảnh niêm yết của căn đã thẩm định đạt (bytes ảnh, cache 1 ngày)' })
  async get(@Param('mandateId') mandateId: string, @Param('file') file: string, @Res() res: Response) {
    const image = await this.media.get(mandateId, file);
    if (!image) throw new NotFoundException({ message: 'Không tìm thấy ảnh.', code: 'not_found' });
    res
      .status(200)
      .set({
        'Content-Type': image.mime,
        'Content-Length': String(image.buf.length),
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Content-Type-Options': 'nosniff',
      })
      .end(image.buf);
  }
}
