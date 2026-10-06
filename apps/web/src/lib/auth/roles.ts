export type PortalRole = "tenant" | "landlord" | "host" | "admin";

export const PORTAL_ROLE_LABEL: Record<PortalRole, string> = {
  tenant: "Khách thuê",
  landlord: "Chủ nhà",
  host: "Field Host",
  admin: "Quản trị viên",
};
