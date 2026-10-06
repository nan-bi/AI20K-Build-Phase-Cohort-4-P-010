import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ViewingStatus } from '@prisma/client';
import { statusToWeb } from '../tenant/tenant.mappers';

/** Mã lỗi cổng Sale (01-CONTRACTS §6). Web map câu tiếng Việt theo `code` ở `lib/host/api.ts`. */
const CONFLICTS = {
  ticket_taken: 'Đã có Sale khác nhận ca này.',
  ticket_expired: 'Ticket đã quá 3 phút, ca chuyển sang Open Pool — dùng "Nhận ticket" nếu vẫn muốn nhận.',
  ticket_not_open: 'Ca vẫn đang dành cho Sale được giao.',
  host_schedule_conflict: 'Bạn đã có ca khác trong vòng 45 phút.',
  host_off_duty: 'Bạn đang tắt trực. Bật trực để nhận ca.',
  host_busy: 'Đang dẫn khách — chưa tắt trực được.',
  too_early_reminder: 'Chỉ gửi nhắc trong 10 phút trước giờ hẹn.',
  too_early_no_show: 'Chỉ báo khách không đến sau giờ hẹn 15 phút.',
  door_code_missing: 'Căn chưa có mã cửa hợp lệ. Dùng hỗ trợ khẩn cấp để lấy mã từ chủ nhà.',
  no_host_available: 'Không có Sale phù hợp để tiếp nhận ca này.',
} as const;

export type HostConflictCode = keyof typeof CONFLICTS;

export function hostConflict(code: HostConflictCode): ConflictException {
  return new ConflictException({ message: CONFLICTS[code], code });
}

export function ticketNotFound(): NotFoundException {
  return new NotFoundException({ message: 'Ticket không còn tồn tại.', code: 'ticket_not_found' });
}

/** B3: không phải chủ ca ⇒ 404, không lộ ca có tồn tại. */
export function viewingNotFound(): NotFoundException {
  return new NotFoundException({
    message: 'Không tìm thấy lịch hoặc lịch không thuộc bạn.',
    code: 'viewing_not_found',
  });
}

export function zoneMismatch(): ForbiddenException {
  return new ForbiddenException({ message: 'Ca thuộc phân khu khác.', code: 'zone_mismatch' });
}

export function badStatus(expected: ViewingStatus[], actual: ViewingStatus, message?: string): ConflictException {
  return new ConflictException({
    message: message ?? 'Trạng thái lịch đã thay đổi. Đang tải lại…',
    code: 'bad_status',
    errors: { expected: expected.map(statusToWeb), actual: statusToWeb(actual) },
  });
}
