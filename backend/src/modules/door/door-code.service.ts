import { Injectable } from '@nestjs/common';
import { DoorLockType, PhysicalKeyState, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PhoneService } from '../auth/phone/phone.service';
import { classifyDoorRef, PIN_PATTERN, stripAesPrefix, withAesPrefix } from './door-code.util';

type Db = PrismaService | Prisma.TransactionClient;

export type DoorRead = { type: 'ELECTRONIC_PIN'; pin: string } | { type: 'PHYSICAL_KEY' };

/**
 * Mã cửa (B5): chỉ đọc PIN dạng `aes:<AES-256-GCM>`. Chuỗi giữ chỗ / PIN để trần / thiếu ⇒ `null`
 * (caller báo `door_code_missing`) — CẤM PIN giả hay mặc định.
 */
@Injectable()
export class DoorCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phones: PhoneService,
  ) {}

  encryptDoorPin(pin: string): string {
    return withAesPrefix(this.phones.encrypt(pin));
  }

  async readPin(unitId: string, db: Db = this.prisma): Promise<DoorRead | null> {
    return this.decode(await db.doorAccessKey.findUnique({ where: { unitId } }));
  }

  /** Giải mã từ dòng khoá đã nạp sẵn (vd. cùng truy vấn với ca xem). Thiếu / thu hồi / mã không hợp lệ ⇒ null. */
  decode(key: { keyType: DoorLockType; status: string; vaultSecretRef: string | null } | null | undefined): DoorRead | null {
    if (!key || key.status !== 'ACTIVE') return null;
    if (key.keyType === DoorLockType.PHYSICAL_KEY) return { type: 'PHYSICAL_KEY' };
    if (classifyDoorRef(key.vaultSecretRef) !== 'aes') return null;
    try {
      const pin = this.phones.decrypt(stripAesPrefix(key.vaultSecretRef as string));
      return PIN_PATTERN.test(pin) ? { type: 'ELECTRONIC_PIN', pin } : null;
    } catch {
      return null;
    }
  }

  /** Chìa cơ: Sale lấy chìa ở quầy phân khu → ghi người giữ. Căn không dùng chìa cơ ⇒ không làm gì. */
  async markKeyWithHost(db: Db, unitId: string, hostId: string): Promise<void> {
    await db.doorAccessKey.updateMany({
      where: { unitId, keyType: DoorLockType.PHYSICAL_KEY },
      data: { physicalKeyState: PhysicalKeyState.WITH_HOST, physicalKeyHolderId: hostId },
    });
  }

  /** Trả chìa về quầy (kết thúc phần dẫn). */
  async markKeyAtDesk(db: Db, unitId: string): Promise<void> {
    await db.doorAccessKey.updateMany({
      where: { unitId, keyType: DoorLockType.PHYSICAL_KEY },
      data: { physicalKeyState: PhysicalKeyState.AT_DESK, physicalKeyHolderId: null },
    });
  }
}
