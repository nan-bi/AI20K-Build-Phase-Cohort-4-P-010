import { Portal } from './auth.constants';

/**
 * Tài khoản demo (1-click ở màn hình đăng nhập). Chỉ tồn tại khi chạy `npm run seed:auth` và chỉ
 * đăng nhập được khi AUTH_DEMO_MODE=true — bản chất vẫn là đăng nhập thật qua Supabase.
 */
export const DEMO_ACCOUNTS: Record<Portal, { email: string; fullName: string }> = {
  tenant: { email: 'khachthue.demo@vinstay.vn', fullName: 'Khách thuê Demo' },
  landlord: { email: 'chunha.oceanpark@vinstay.vn', fullName: 'Chủ nhà Demo' },
  host: { email: 'host.oceanpark@vinstay.vn', fullName: 'Field Host Demo' },
  admin: { email: 'admin@vinstay.vn', fullName: 'Admin Demo' },
};

export const DEFAULT_DEMO_PASSWORD = 'vinstay-demo-pass';
export const DEMO_HOST_RFID = 'RFID-DEMO-0001';
