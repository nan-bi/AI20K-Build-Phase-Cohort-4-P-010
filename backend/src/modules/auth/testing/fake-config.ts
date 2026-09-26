import { ConfigService } from '@nestjs/config';

/**
 * ConfigService giả chỉ đọc từ `env` truyền vào. ConfigService thật ưu tiên `process.env`
 * (jest luôn đặt NODE_ENV=test) nên không ghi đè được NODE_ENV/biến môi trường trong test.
 */
export const fakeConfig = (env: Record<string, string | undefined> = {}) =>
  ({ get: (key: string) => env[key] }) as unknown as ConfigService;
