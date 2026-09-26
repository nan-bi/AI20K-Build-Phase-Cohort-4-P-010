import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { authError } from '../auth.errors';
import { CreateHostInviteDto } from '../dto/auth.dto';

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === 'P2002';

/** Admin mời Field Host bằng email + mã RFID. Host tự đăng ký bằng email đó rồi nhập đúng RFID. */
@Injectable()
export class HostInvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const invites = await this.prisma.hostInvite.findMany({
      orderBy: { createdAt: 'desc' },
      include: { claimedBy: { select: { fullName: true } } },
    });
    return invites.map(({ claimedBy, ...invite }) => ({
      ...invite,
      registered: invite.claimedAt !== null,
      fullName: claimedBy?.fullName ?? null,
    }));
  }

  async create(dto: CreateHostInviteDto) {
    const email = dto.email.trim().toLowerCase();

    // Email đã là tài khoản vai trò khác thì lời mời không bao giờ dùng được (wrong_portal).
    const existingProfile = await this.prisma.profile.findUnique({ where: { email }, include: { role: true } });
    if (existingProfile && existingProfile.role.code !== 'field_host') throw authError('account_conflict');

    try {
      return await this.prisma.hostInvite.create({
        data: {
          email,
          rfidCardNumber: dto.rfidCardNumber.trim(),
          ...(dto.assignedZone ? { assignedZone: dto.assignedZone.trim() } : {}),
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw authError('email_already_registered');
      throw err;
    }
  }
}
