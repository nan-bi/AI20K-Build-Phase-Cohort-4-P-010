/** Giới hạn lượt chat của khách chưa đăng nhập: đếm theo IP trong bộ nhớ, cửa sổ trượt cố định 24h. */
export const GUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_GUEST_CHAT_TURNS = 2;

/** Hằng duy nhất: số lượt khách được chấp nhận (env `ASSISTANT_GUEST_TURNS`, mặc định 2). */
export function guestChatTurns(raw: string | undefined): number {
  const n = Number(raw);
  return raw !== undefined && raw !== '' && Number.isInteger(n) && n >= 0 ? n : DEFAULT_GUEST_CHAT_TURNS;
}

export class GuestLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private sweeper?: NodeJS.Timeout;

  constructor(
    private readonly max: number,
    private readonly now: () => number = Date.now,
    private readonly windowMs = GUEST_WINDOW_MS,
  ) {}

  /** true = lượt được chấp nhận (và đã tính); false = hết lượt, caller trả 401 LOGIN_REQUIRED. */
  take(key: string): boolean {
    const t = this.now();
    this.sweep(t);
    const cur = this.hits.get(key);
    if (!cur || cur.resetAt <= t) {
      if (this.max <= 0) return false;
      this.hits.set(key, { count: 1, resetAt: t + this.windowMs });
      this.schedule();
      return true;
    }
    if (cur.count >= this.max) return false;
    cur.count += 1;
    return true;
  }

  get size(): number {
    return this.hits.size;
  }

  stop(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = undefined;
  }

  private sweep(t: number): void {
    for (const [k, v] of this.hits) if (v.resetAt <= t) this.hits.delete(k);
  }

  private schedule(): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => this.sweep(this.now()), 60 * 60 * 1000);
    this.sweeper.unref();
  }
}
