import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthSessionService } from '../auth/session/auth-session.service';
import { SessionCookieService } from '../auth/session/session-cookies.service';
import { AssistantChatDto } from './dto/assistant-chat.dto';
import { GuestLimiter, guestChatTurns } from './guest-limiter';

const upstreamDown = () =>
  new ServiceUnavailableException({ code: 'AI_UPSTREAM_DOWN', message: 'Trợ lý AI tạm thời không khả dụng' });

/** Relay SSE tới ai-engine. Chỉ tên riêng đi qua — không bao giờ gửi id/email/SĐT. */
@Injectable()
export class AssistantService implements OnModuleDestroy {
  private readonly logger = new Logger(AssistantService.name);
  private readonly guests: GuestLimiter;

  constructor(
    private readonly config: ConfigService,
    private readonly sessions: AuthSessionService,
    private readonly cookies: SessionCookieService,
  ) {
    this.guests = new GuestLimiter(guestChatTurns(this.config.get<string>('ASSISTANT_GUEST_TURNS')));
  }

  onModuleDestroy(): void {
    this.guests.stop();
  }

  /** Chốt chặn thật: khách (không phiên) quá số lượt trong 24h theo IP ⇒ 401 LOGIN_REQUIRED, không gọi ai-engine. */
  assertGuestQuota(request: { ip?: string }): void {
    // `req.ip` chỉ tin X-Forwarded-For khi bật TRUST_PROXY (main.ts) — không tự đọc header để khách khỏi giả IP lách giới hạn.
    const key = request.ip || 'unknown';
    if (!this.guests.take(key)) {
      throw new UnauthorizedException({
        code: 'LOGIN_REQUIRED',
        message: 'Bạn đã dùng hết lượt tư vấn thử. Vui lòng đăng nhập (miễn phí) để tiếp tục.',
      });
    }
  }

  /** Có phiên hợp lệ không (mọi lỗi ⇒ khách). */
  async hasSession(request: unknown): Promise<boolean> {
    try {
      const token = this.cookies.readAccessToken(request as never);
      return !!token && !!(await this.sessions.authenticate(token));
    } catch {
      return false;
    }
  }

  /** Tên gọi (từ cuối của họ tên) nếu có phiên hợp lệ; mọi lỗi ⇒ khách vãng lai. */
  async firstNameFrom(request: unknown): Promise<string | undefined> {
    try {
      const token = this.cookies.readAccessToken(request as never);
      if (!token) return undefined;
      const user = await this.sessions.authenticate(token);
      const first = user?.fullName?.trim().split(/\s+/).pop();
      return first ? first.slice(0, 40) : undefined;
    } catch {
      return undefined;
    }
  }

  async relay(dto: AssistantChatDto, firstName: string | undefined, res: Response): Promise<void> {
    const base = this.config.get<string>('AI_ENGINE_URL')?.replace(/\/+$/, '');
    if (!base) throw upstreamDown();

    const abort = new AbortController();
    res.on('close', () => abort.abort());

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${base}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': this.config.get<string>('AI_ENGINE_INTERNAL_KEY') ?? '',
        },
        body: JSON.stringify({
          messages: dto.messages.map(({ role, content }) => ({ role, content })),
          locale: dto.locale,
          ...(dto.searchContext ? { searchContext: dto.searchContext } : {}),
          ...(firstName ? { user: { firstName } } : {}),
        }),
        signal: abort.signal,
      });
    } catch (error) {
      this.logger.warn(`ai-engine không nối được: ${(error as Error).message}`);
      throw upstreamDown();
    }
    if (!upstream.ok || !upstream.body) {
      this.logger.warn(`ai-engine trả HTTP ${upstream.status}`);
      await upstream.body?.cancel().catch(() => undefined);
      throw upstreamDown();
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const reader = upstream.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } catch (error) {
      if (!abort.signal.aborted) this.logger.warn(`Luồng ai-engine đứt giữa chừng: ${(error as Error).message}`);
    } finally {
      abort.abort();
      res.end();
    }
  }
}
