import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MatchmakerService } from './matchmaker.service';
import { MatchmakerRequestDto } from './dto/matchmaker-request.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('2. AI Matchmaker 30 Giây')
@Controller('matchmaker')
export class MatchmakerController {
  constructor(private readonly matchmakerService: MatchmakerService) {}

  @Public()
  @Post('recommend')
  @ApiOperation({
    summary: 'AI Matchmaker 30 Giây: Quét rổ hàng & Khớp Top 3 căn hời nhất',
    description: 'Tự động loại bỏ các căn vượt ngân sách trần All-in, xếp hạng Top 3 căn hời nhất kèm giải trình tiết kiệm chi phí',
  })
  async recommend(@Body() dto: MatchmakerRequestDto) {
    return this.matchmakerService.findTopRecommendations(dto);
  }
}
