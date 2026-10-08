import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AssistantService } from './assistant.service';
import { AssistantChatDto } from './dto/assistant-chat.dto';

@ApiTags('Trợ lý AI')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Public()
  @Post('chat')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Chat với trợ lý AI (relay SSE tới ai-engine)' })
  async chat(@Body() dto: AssistantChatDto, @Req() req: Request, @Res() res: Response): Promise<void> {
    const firstName = await this.assistant.firstNameFrom(req);
    if (!firstName && !(await this.assistant.hasSession(req))) this.assistant.assertGuestQuota(req);
    await this.assistant.relay(dto, firstName, res);
  }
}
