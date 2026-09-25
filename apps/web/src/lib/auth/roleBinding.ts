import { Portal } from "./profile";

export const PORTAL_LABELS: Record<Portal, string> = {
  tenant: "Khách thuê",
  landlord: "Chủ nhà",
  host: "Field Host",
  admin: "Quản trị viên",
};

export interface RoleBindingResult {
  allowed: boolean;
  boundRole?: Portal;
  message?: string;
  updatedCookie?: string;
}

// In-memory registry for server runtime session
const serverRoleRegistry = new Map<string, Portal>([
  ["chunha.oceanpark@vinstay.vn", "landlord"],
  ["khachthue.demo@vinstay.vn", "tenant"],
  ["host.s218@vinstay.vn", "host"],
  ["host.oceanpark@vinstay.vn", "host"],
  ["admin@vinstay.vn", "admin"],
]);

/**
 * Parses the role binding cookie: JSON object mapping email -> Portal
 */
export function parseRoleBindings(cookieHeader?: string | null): Record<string, Portal> {
  if (!cookieHeader) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieHeader));
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return {};
}

/**
 * Verifies if an email is already bound to a different role.
 * If not bound yet, binds it to targetPortal.
 * If already bound to targetPortal, allows it.
 * If already bound to another portal (e.g. landlord vs tenant), strictly blocks it!
 */
export function verifyAndBindEmailRole(
  email: string,
  targetPortal: Portal,
  existingCookieBindings?: string | null
): RoleBindingResult {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check in-memory registry
  let boundRole = serverRoleRegistry.get(normalizedEmail);

  // 2. Check cookie bindings (persisted across user requests)
  const cookieBindings = parseRoleBindings(existingCookieBindings);
  if (!boundRole && cookieBindings[normalizedEmail]) {
    boundRole = cookieBindings[normalizedEmail];
  }

  // 3. If bound to a different role -> Strictly BLOCK!
  if (boundRole && boundRole !== targetPortal) {
    const boundLabel = PORTAL_LABELS[boundRole] || boundRole;
    const targetLabel = PORTAL_LABELS[targetPortal] || targetPortal;
    return {
      allowed: false,
      boundRole,
      message: `Tài khoản Google (${email}) đã được đăng ký cố định với vai trò "${boundLabel}". Hệ thống không cho phép đăng nhập sang cổng "${targetLabel}" trên cùng một email để đảm bảo an toàn phân quyền. Vui lòng chuyển sang cổng "${boundLabel}" hoặc dùng email khác.`,
    };
  }

  // 4. If not bound or already bound to targetPortal -> Allow & update binding
  serverRoleRegistry.set(normalizedEmail, targetPortal);
  cookieBindings[normalizedEmail] = targetPortal;

  return {
    allowed: true,
    boundRole: targetPortal,
    updatedCookie: encodeURIComponent(JSON.stringify(cookieBindings)),
  };
}
