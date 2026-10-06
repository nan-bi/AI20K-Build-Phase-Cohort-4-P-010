import { Injectable } from '@nestjs/common';
import { HostDutyStatus, Prisma, TicketStatus, ViewingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PhoneService } from '../auth/phone/phone.service';
import { DispatchAssignerService } from '../dispatch/dispatch-assigner.service';
import {
  LIVE_VIEWING_STATUSES,
  MIN_GAP_MIN,
  NO_SHOW_GRACE_MIN,
  REMINDER_LEAD_MIN,
} from '../dispatch/dispatch.constants';
import { inZone, ticketTierAt } from '../dispatch/ticket-tier';
import { DoorCodeService } from '../door/door-code.service';
import type { EmergencyKind } from './dto/host-viewings.dto';
import {
  badStatus,
  hostConflict,
  ticketNotFound,
  viewingNotFound,
  zoneMismatch,
} from './host-viewings.errors';
import { toDetail as toHostDetail, toDoorView, UNIT_INCLUDE } from './host-viewings.mappers';
import type { DoorAccessView, HostActor, HostViewingDetail, ReqCtx } from './host-viewings.types';

type Tx = Prisma.TransactionClient;

/**
 * NGUỒN DUY NHẤT chuyển `viewings.status` phía Host (B7).
 * Mọi thao tác: nạp ca + kiểm chủ ca (B3) → `updateMany … where status in from` (chống bấm đồng thời) →
 * AuditLog trong cùng transaction → trả `HostViewingDetail` mới.
 */
@Injectable()
export class ViewingFlowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phones: PhoneService,
    private readonly assigner: DispatchAssignerService,
    private readonly doors: DoorCodeService,
  ) {}

  // ===========================================================================
  // Nhận / claim / từ chối (SPEC-P01 §4)
  // ===========================================================================

  async accept(ticketId: string, host: HostActor, ctx: ReqCtx = {}): Promise<HostViewingDetail> {
    const ref = await this.prisma.$transaction(async (tx) => {
      const ticket = await this.loadTicket(tx, ticketId);
      if (!ticket || ticket.hostId !== host.hostId) throw ticketNotFound();
      if (ticket.status !== TicketStatus.OFFERED) throw hostConflict('ticket_taken');
      const now = new Date();
      if (ticketTierAt(ticket, now) !== 'ASSIGNED') throw hostConflict('ticket_expired');
      return this.take(tx, ticket, host, 'VIEWING_ACCEPT', now, ctx, { requireOwner: true });
    });
    return this.detail(ref, host);
  }

  async claim(ticketId: string, host: HostActor, ctx: ReqCtx = {}): Promise<HostViewingDetail> {
    const ref = await this.prisma.$transaction(async (tx) => {
      const ticket = await this.loadTicket(tx, ticketId);
      if (!ticket) throw ticketNotFound();
      if (ticket.status !== TicketStatus.OFFERED) throw hostConflict('ticket_taken');
      const now = new Date();
      const tier = ticketTierAt(ticket, now);
      const own = ticket.hostId === host.hostId;
      if (tier === 'ASSIGNED' && !own) throw hostConflict('ticket_not_open');
      if (tier === 'ZONE_POOL' && !own && !inZone(host.assignedZone, ticket.viewing.unit.building.zoneName)) {
        throw zoneMismatch();
      }
      // Sale đã từ chối ca này không được nhận lại qua pool.
      const rejectedByMe = await tx.dispatchTicket.count({
        where: { viewingId: ticket.viewingId, hostId: host.hostId, status: TicketStatus.ESCALATED },
      });
      if (rejectedByMe > 0) throw hostConflict('ticket_not_open');
      return this.take(tx, ticket, host, 'VIEWING_CLAIM', now, ctx, { requireOwner: false });
    });
    return this.detail(ref, host);
  }

  async reject(ticketId: string, host: HostActor, reason: string, ctx: ReqCtx = {}): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await this.loadTicket(tx, ticketId);
      if (!ticket || ticket.hostId !== host.hostId) throw ticketNotFound();
      if (ticket.status !== TicketStatus.OFFERED) throw hostConflict('ticket_taken');
      const now = new Date();
      if (ticketTierAt(ticket, now) !== 'ASSIGNED') throw hostConflict('ticket_expired');

      const res = await tx.dispatchTicket.updateMany({
        where: { id: ticket.id, status: TicketStatus.OFFERED, hostId: host.hostId },
        data: { status: TicketStatus.ESCALATED, rejectReason: reason, closedAt: now },
      });
      if (res.count !== 1) throw hostConflict('ticket_taken');

      const previous = await tx.dispatchTicket.findMany({
        where: { viewingId: ticket.viewingId, status: TicketStatus.ESCALATED, hostId: { not: null } },
        select: { hostId: true },
      });
      await this.assigner.offer(tx, {
        viewingId: ticket.viewingId,
        zoneName: ticket.viewing.unit.building.zoneName,
        slot: ticket.viewing.viewingSlot,
        excludeHostIds: [...new Set([host.hostId, ...previous.map((p) => p.hostId as string)])],
      });
      await this.audit(tx, host, 'VIEWING_REJECT', 'viewings', ticket.viewingId, { ticketId, reason }, ctx);
    });
  }

  /** Giành ca: ticket OFFERED → ACCEPTED (nguyên tử) và ca PENDING_CONFIRMATION → CONFIRMED. Trả mã ref. */
  private async take(
    tx: Tx,
    ticket: any,
    host: HostActor,
    action: 'VIEWING_ACCEPT' | 'VIEWING_CLAIM',
    now: Date,
    ctx: ReqCtx,
    opts: { requireOwner: boolean },
  ): Promise<string> {
    // `host` có thể lấy từ cache 30s: trạng thái trực phải đọc lại cho đúng.
    const fresh = await tx.fieldHost.findUnique({ where: { id: host.hostId }, select: { dutyStatus: true } });
    if ((fresh?.dutyStatus ?? host.dutyStatus) === HostDutyStatus.OFF_DUTY) throw hostConflict('host_off_duty');
    await this.assertNoConflict(tx, host, ticket.viewing.viewingSlot, ticket.viewingId);

    const res = await tx.dispatchTicket.updateMany({
      where: {
        id: ticket.id,
        status: TicketStatus.OFFERED,
        ...(opts.requireOwner ? { hostId: host.hostId } : {}),
      },
      data: { status: TicketStatus.ACCEPTED, acceptedAt: now, hostId: host.hostId },
    });
    if (res.count !== 1) throw hostConflict('ticket_taken');

    const v = await tx.viewing.updateMany({
      where: { id: ticket.viewingId, status: ViewingStatus.PENDING_CONFIRMATION },
      data: { status: ViewingStatus.CONFIRMED, confirmedAt: now },
    });
    // Khách vừa huỷ ⇒ rollback cả việc nhận ticket.
    if (v.count !== 1) throw badStatus([ViewingStatus.PENDING_CONFIRMATION], ticket.viewing.status);

    await this.audit(tx, host, action, 'viewings', ticket.viewingId, { ticketId: ticket.id }, ctx);
    return ticket.viewing.bookingRefCode;
  }

  /** Sale không nhận 2 ca ACCEPTED cách nhau < 45′ (OFFERED chưa là cam kết nên không chặn). */
  private async assertNoConflict(tx: Tx, host: HostActor, slot: Date, viewingId: string): Promise<void> {
    const gapMs = MIN_GAP_MIN * 60_000;
    const clash = await tx.dispatchTicket.count({
      where: {
        hostId: host.hostId,
        status: TicketStatus.ACCEPTED,
        viewing: {
          id: { not: viewingId },
          status: { in: LIVE_VIEWING_STATUSES },
          viewingSlot: { gt: new Date(slot.getTime() - gapMs), lt: new Date(slot.getTime() + gapMs) },
        },
      },
    });
    if (clash > 0) throw hostConflict('host_schedule_conflict');
  }

  private loadTicket(tx: Tx, ticketId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) return Promise.resolve(null);
    return tx.dispatchTicket.findUnique({
      relationLoadStrategy: 'join', // 1 truy vấn thay vì nhiều (DB ở xa, mỗi vòng ~0,6s)
      where: { id: ticketId },
      include: { viewing: { include: { unit: { include: { building: true } } } } },
    });
  }

  // ===========================================================================
  // Ca xem phòng (SPEC-P02 §1)
  // ===========================================================================

  async detail(ref: string, host: HostActor): Promise<HostViewingDetail> {
    const v = await this.loadOwned(this.prisma, ref, host);
    return this.toDetail(v, host);
  }

  async remind(ref: string, host: HostActor, ctx: ReqCtx = {}): Promise<HostViewingDetail> {
    const v = await this.loadOwned(this.prisma, ref, host);
    this.assertFrom(v, [ViewingStatus.CONFIRMED]);
    const now = new Date();
    if (now.getTime() < new Date(v.viewingSlot).getTime() - REMINDER_LEAD_MIN * 60_000) {
      throw hostConflict('too_early_reminder');
    }
    const merged = await this.commit(host, v, [ViewingStatus.CONFIRMED], 'VIEWING_REMIND', ctx, async (tx) => ({
      reminderSentAt: v.reminderSentAt ?? now,
    }));
    return this.render(merged, host);
  }

  async receive(ref: string, host: HostActor, ctx: ReqCtx = {}): Promise<HostViewingDetail> {
    const v = await this.loadOwned(this.prisma, ref, host);
    const from = [ViewingStatus.CONFIRMED, ViewingStatus.LOBBY];
    this.assertFrom(v, from);
    const now = new Date();
    const merged = await this.commit(host, v, from, 'VIEWING_RECEIVE', ctx, async (tx) => {
      // OFF_DUTY thì giữ nguyên: Sale tự bật lại khi sẵn sàng.
      await tx.fieldHost.updateMany({
        where: { id: host.hostId, dutyStatus: HostDutyStatus.ONLINE_AVAILABLE },
        data: { dutyStatus: HostDutyStatus.BUSY_VIEWING },
      });
      return {
        status: ViewingStatus.RECEIVING,
        receivingAt: now,
        // Sale thấy khách tại sảnh dù khách chưa bấm nút (Q3).
        lobbyCheckInAt: v.lobbyCheckInAt ?? now,
      };
    });
    return this.render(merged, host);
  }

  async openDoor(
    ref: string,
    host: HostActor,
    ctx: ReqCtx = {},
  ): Promise<{ viewing: HostViewingDetail; door: DoorAccessView }> {
    const v = await this.loadOwned(this.prisma, ref, host);
    this.assertFrom(v, [ViewingStatus.RECEIVING]);
    // Đọc mã TRƯỚC khi đổi trạng thái: thiếu mã ⇒ ca vẫn RECEIVING (SPEC-P02 §1).
    const read = this.doors.decode(v.unit.doorKey); // đã nạp cùng ca: không tốn thêm vòng truy vấn
    if (!read) throw hostConflict('door_code_missing');

    const now = new Date();
    const door = toDoorView(read, v.unit.building.zoneName, now);
    const merged = await this.commit(host, v, [ViewingStatus.RECEIVING], 'VIEWING_OPEN_DOOR', ctx, async (tx) => {
      if (read.type === 'PHYSICAL_KEY') await this.doors.markKeyWithHost(tx, v.unitId, host.hostId);
      await this.auditDoorReveal(tx, host, v, read.type, door.expiresAt, now, ctx);
      return { status: ViewingStatus.VIEWING, viewingStartedAt: now };
    });
    return { viewing: this.render(merged, host, now), door };
  }

  async revealDoorCode(ref: string, host: HostActor, ctx: ReqCtx = {}): Promise<DoorAccessView> {
    const v = await this.loadOwned(this.prisma, ref, host);
    this.assertFrom(v, [ViewingStatus.VIEWING]);
    const read = this.doors.decode(v.unit.doorKey); // đã nạp cùng ca: không tốn thêm vòng truy vấn
    if (!read) throw hostConflict('door_code_missing');
    const now = new Date();
    const door = toDoorView(read, v.unit.building.zoneName, now);
    await this.prisma.$transaction(async (tx) => {
      // Ca có thể vừa đóng ở tab khác: kiểm lại trạng thái trong transaction trước khi ghi audit.
      const still = await tx.viewing.count({ where: { id: v.id, status: ViewingStatus.VIEWING } });
      if (still !== 1) throw badStatus([ViewingStatus.VIEWING], v.status);
      await this.auditDoorReveal(tx, host, v, read.type, door.expiresAt, now, ctx);
    });
    return door;
  }

  async noShow(ref: string, host: HostActor, ctx: ReqCtx = {}): Promise<HostViewingDetail> {
    const v = await this.loadOwned(this.prisma, ref, host);
    const from = [ViewingStatus.CONFIRMED, ViewingStatus.LOBBY];
    this.assertFrom(v, from);
    const now = new Date();
    if (now.getTime() < new Date(v.viewingSlot).getTime() + NO_SHOW_GRACE_MIN * 60_000) {
      throw hostConflict('too_early_no_show');
    }
    const merged = await this.commit(host, v, from, 'VIEWING_NO_SHOW', ctx, async (tx) => {
      await this.endOwnership(tx, host, v, now);
      return { status: ViewingStatus.NO_SHOW, completedAt: now, closedReason: 'no_show' };
    });
    return this.render(merged, host);
  }

  async startDeposit(ref: string, host: HostActor, ctx: ReqCtx = {}): Promise<HostViewingDetail> {
    const v = await this.loadOwned(this.prisma, ref, host);
    this.assertFrom(v, [ViewingStatus.VIEWING]);
    const now = new Date();
    const merged = await this.commit(host, v, [ViewingStatus.VIEWING], 'VIEWING_START_DEPOSIT', ctx, async (tx) => {
      // Ticket vẫn ACCEPTED (Sale còn theo dõi cọc); chỉ nhả trạng thái bận + trả chìa.
      await this.releaseHost(tx, host);
      await this.doors.markKeyAtDesk(tx, v.unitId);
      return { status: ViewingStatus.CLOSING, viewEndedAt: now };
    });
    return this.render(merged, host);
  }

  async notInterested(
    ref: string,
    host: HostActor,
    reason: string,
    ctx: ReqCtx = {},
  ): Promise<HostViewingDetail> {
    const v = await this.loadOwned(this.prisma, ref, host);
    const from = [ViewingStatus.VIEWING, ViewingStatus.CLOSING];
    this.assertFrom(v, from);
    if (v.deposit?.paymentStatus === 'PAID_HOLDING') {
      throw badStatus(from, v.status, 'Khách đã cọc giữ chỗ — không đóng ca thủ công được.');
    }
    const now = new Date();
    const merged = await this.commit(host, v, from, 'VIEWING_NOT_INTERESTED', ctx, async (tx) => {
      await this.endOwnership(tx, host, v, now);
      return {
        status: ViewingStatus.COMPLETED,
        completedAt: now,
        viewEndedAt: v.viewEndedAt ?? now,
        closedReason: `not_interested: ${reason}`.slice(0, 200),
      };
    });
    return this.render(merged, host);
  }

  async emergency(
    ref: string,
    host: HostActor,
    kind: EmergencyKind,
    note: string | undefined,
    ctx: ReqCtx = {},
  ): Promise<{ recorded: true; message: string }> {
    const v = await this.loadOwned(this.prisma, ref, host);
    this.assertFrom(v, [ViewingStatus.RECEIVING, ViewingStatus.VIEWING]);
    await this.prisma.$transaction((tx) =>
      this.audit(tx, host, 'HOST_EMERGENCY', 'viewings', v.id, { ref, kind, note: note ?? null }, ctx),
    );
    return {
      recorded: true,
      message: 'Đã ghi nhận sự cố vào nhật ký ca xem. Hãy gọi hỗ trợ vận hành nếu cần mở cửa gấp.',
    };
  }

  // ===========================================================================
  // Nội bộ
  // ===========================================================================

  /** Ca + kiểm chủ ca (B3). Chủ ca = Host của ticket đã nhận (`ACCEPTED|COMPLETED`, có `acceptedAt`). */
  private async loadOwned(db: PrismaService | Tx, ref: string, host: HostActor): Promise<any> {
    const v = await db.viewing.findUnique({
      relationLoadStrategy: 'join', // 1 truy vấn thay vì nhiều (DB ở xa, mỗi vòng ~0,6s)
      where: { bookingRefCode: ref },
      include: {
        unit: { include: { ...UNIT_INCLUDE, doorKey: true } },
        deposit: { include: { contract: true } },
        tickets: {
          where: { hostId: host.hostId, acceptedAt: { not: null }, status: { in: [TicketStatus.ACCEPTED, TicketStatus.COMPLETED] } },
          take: 1,
        },
      },
    });
    if (!v || v.tickets.length === 0) throw viewingNotFound();
    return v;
  }

  private assertFrom(v: any, from: ViewingStatus[]): void {
    if (!from.includes(v.status)) throw badStatus(from, v.status);
  }

  /**
   * `updateMany … where status in from` + AuditLog trong một transaction. `build` chạy trong transaction,
   * có thể ghi phụ (duty, chìa, ticket) và trả dữ liệu `viewings` cần đổi.
   */
  private async commit(
    host: HostActor,
    v: any,
    from: ViewingStatus[],
    action: string,
    ctx: ReqCtx,
    build: (tx: Tx) => Promise<Prisma.ViewingUpdateManyMutationInput>,
  ): Promise<any> {
    let applied: Prisma.ViewingUpdateManyMutationInput = {};
    await this.prisma.$transaction(async (tx) => {
      const data = await build(tx);
      applied = data;
      const res = await tx.viewing.updateMany({ where: { id: v.id, status: { in: from } }, data });
      if (res.count !== 1) {
        const now = await tx.viewing.findUnique({ where: { id: v.id }, select: { status: true } });
        throw badStatus(from, now?.status ?? v.status);
      }
      await this.audit(tx, host, action, 'viewings', v.id, { ref: v.bookingRefCode }, ctx);
    });
    // Phản hồi dựng từ ca đã nạp + phần vừa ghi: không tốn thêm vòng truy vấn nào (DB ở xa).
    return { ...v, ...applied };
  }

  /** Ca kết thúc phần của Sale: ticket chủ ca → COMPLETED, nhả trạng thái bận, trả chìa. */
  private async endOwnership(tx: Tx, host: HostActor, v: any, now: Date): Promise<void> {
    await tx.dispatchTicket.updateMany({
      where: { viewingId: v.id, hostId: host.hostId, status: TicketStatus.ACCEPTED },
      data: { status: TicketStatus.COMPLETED, closedAt: now },
    });
    await this.releaseHost(tx, host);
    await this.doors.markKeyAtDesk(tx, v.unitId);
  }

  private async releaseHost(tx: Tx, host: HostActor): Promise<void> {
    await tx.fieldHost.updateMany({
      where: { id: host.hostId, dutyStatus: HostDutyStatus.BUSY_VIEWING },
      data: { dutyStatus: HostDutyStatus.ONLINE_AVAILABLE },
    });
  }

  /** Dựng chi tiết ca từ dữ liệu đã có (không truy vấn). `revealedAt` chỉ biết khi vừa mở cửa. */
  private render(v: any, _host: HostActor, revealedAt: Date | null = null): HostViewingDetail {
    return toHostDetail(v, this.phones, revealedAt, new Date());
  }

  private async toDetail(v: any, host: HostActor): Promise<HostViewingDetail> {
    let revealedAt: Date | null = null;
    if (v.viewingStartedAt) {
      const log = await this.prisma.auditLog.findFirst({
        where: {
          entityName: 'Unit',
          entityId: v.unitId,
          actionType: 'DOOR_KEY_REVEAL',
          actorId: host.profileId,
          newValue: { path: ['viewingRef'], equals: v.bookingRefCode },
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      revealedAt = log?.createdAt ?? null;
    }
    return toHostDetail(v, this.phones, revealedAt, new Date());
  }

  private audit(
    tx: Tx,
    host: HostActor,
    actionType: string,
    entityName: string,
    entityId: string,
    newValue: Prisma.InputJsonValue,
    ctx: ReqCtx,
  ) {
    return tx.auditLog.create({
      data: {
        actorId: host.profileId,
        actorRole: 'field_host',
        actionType,
        entityName,
        entityId,
        newValue,
        ipAddress: ctx.ipAddress?.slice(0, 45) ?? null,
        userAgent: ctx.userAgent ?? null,
      },
    });
  }

  /** B5: bản ghi cho chủ nhà xem ở audit-trail của căn. KHÔNG bao giờ chứa PIN. */
  private auditDoorReveal(
    tx: Tx,
    host: HostActor,
    v: any,
    lockType: string,
    expiresAt: string,
    now: Date,
    ctx: ReqCtx,
  ) {
    return this.audit(
      tx,
      host,
      'DOOR_KEY_REVEAL',
      'Unit',
      v.unitId,
      {
        viewingRef: v.bookingRefCode,
        lockType,
        revealedAt: now.toISOString(),
        expiresAt,
      },
      ctx,
    );
  }
}
