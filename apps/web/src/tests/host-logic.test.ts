import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOST_ERRORS, hostErrorText, isReminderWindow, nextAction, shouldAutoRemind, slaLeftMs } from "@/lib/host/logic";

const T0 = Date.parse("2026-10-06T01:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

describe("W1 slaLeftMs — đồng hồ theo giờ máy chủ", () => {
  const slaEndsAt = iso(T0 + 180_000);
  it("máy Sale đúng giờ: còn 180 giây lúc nhận", () => {
    expect(slaLeftMs(slaEndsAt, iso(T0), T0, T0)).toBe(180_000);
  });
  it.each([+5, -5])("máy Sale lệch %i phút vẫn ra cùng kết quả", (offsetMin) => {
    const skewMs = offsetMin * 60_000;
    const received = T0 + skewMs; // giờ máy Sale lúc nhận bảng
    expect(slaLeftMs(slaEndsAt, iso(T0), received, received)).toBe(180_000);
    // 60 giây sau theo đồng hồ máy Sale
    expect(slaLeftMs(slaEndsAt, iso(T0), received + 60_000, received)).toBe(120_000);
  });
  it("quá hạn ⇒ số âm", () => {
    expect(slaLeftMs(slaEndsAt, iso(T0), T0 + 200_000, T0)).toBeLessThan(0);
  });
});

describe("W2 nextAction — cột Việc tiếp theo", () => {
  const slot = iso(T0 + 9 * 60_000);
  it("confirmed còn 9′ ⇒ Xuống sảnh đón khách", () => {
    expect(nextAction({ status: "confirmed", slot, receivingAt: null }, T0)).toBe("Xuống sảnh đón khách");
  });
  it("confirmed còn 2 giờ ⇒ chuẩn bị", () => {
    expect(nextAction({ status: "confirmed", slot: iso(T0 + 120 * 60_000), receivingAt: null }, T0)).toBe("Xem chi tiết & chuẩn bị");
  });
  it("lobby / closing / holding", () => {
    expect(nextAction({ status: "lobby", slot, receivingAt: null }, T0)).toBe("Đón khách ngay");
    expect(nextAction({ status: "closing", slot, receivingAt: null }, T0)).toBe("Chờ khách cọc");
    expect(nextAction({ status: "holding", slot, receivingAt: null }, T0)).toBe("Chờ khách làm HĐ");
  });
  it("cửa sổ T-10 kết thúc sau giờ hẹn 15′", () => {
    expect(isReminderWindow({ status: "confirmed", slot: iso(T0 - 14 * 60_000) }, T0)).toBe(true);
    expect(isReminderWindow({ status: "confirmed", slot: iso(T0 - 16 * 60_000) }, T0)).toBe(false);
  });
});

describe("W3 shouldAutoRemind — đúng 1 lần/ca trong [slot−10′, slot+30′]", () => {
  const s = { status: "confirmed" as const, slot: iso(T0 + 600_000), ref: "VS-AAAAA" };
  it("đúng 1 lần trong cửa sổ", () => {
    const sent = new Set<string>();
    expect(shouldAutoRemind(s, T0 - 1, sent)).toBe(false); // còn 10′01″
    expect(shouldAutoRemind(s, T0, sent)).toBe(true);
    sent.add(s.ref);
    expect(shouldAutoRemind(s, T0 + 60_000, sent)).toBe(false);
  });
  it("hết cửa sổ sau giờ hẹn 30′; backend đã có mốc nhắc; ca không còn confirmed ⇒ không nhắc", () => {
    expect(shouldAutoRemind(s, T0 + 600_000 + 29 * 60_000, new Set())).toBe(true);
    expect(shouldAutoRemind(s, T0 + 600_000 + 31 * 60_000, new Set())).toBe(false);
    expect(shouldAutoRemind(s, T0, new Set(), true)).toBe(false);
    expect(shouldAutoRemind({ ...s, status: "lobby" as never }, T0, new Set())).toBe(false);
  });
});

describe("W4 hostErrorText — đủ 13 mã lỗi của hồ sơ 15 (01 §6)", () => {
  const CODES = [
    "ticket_not_found", "ticket_taken", "ticket_expired", "ticket_not_open", "zone_mismatch", "host_schedule_conflict",
    "host_off_duty", "host_busy", "viewing_not_found", "bad_status", "too_early_reminder", "too_early_no_show", "door_code_missing",
  ];
  it.each(CODES)("%s có câu tiếng Việt", (code) => {
    expect(HOST_ERRORS[code]).toBeTruthy();
    expect(hostErrorText({ code, message: "english" })).toBe(HOST_ERRORS[code]);
  });
  it("mã lạ ⇒ message của backend; không có gì ⇒ câu chung", () => {
    expect(hostErrorText({ code: "x", message: "Lỗi riêng" })).toBe("Lỗi riêng");
    expect(hostErrorText({})).toMatch(/thử lại/);
  });
});

describe("W5 kiểm tĩnh — màn Sale không còn đụng mock hành động / PIN không vào storage", () => {
  const read = (f: string) => readFileSync(join(__dirname, "../components/host", f), "utf8");
  it.each(["DispatchBoard.tsx", "ViewingWorkflow.tsx", "WorkflowSteps.tsx"])("%s không import mock actions/store/selectors/actors/units", (f) => {
    expect(read(f)).not.toMatch(/@\/lib\/mock\/(actions|store|selectors|actors|units)/);
  });
  it("không lưu PIN vào localStorage/sessionStorage; không có nút xác nhận UNC / ngân hàng báo có", () => {
    const src = ["WorkflowSteps.tsx", "ViewingWorkflow.tsx"].map(read).join("\n");
    expect(src).not.toMatch(/localStorage|sessionStorage/);
    expect(src).not.toMatch(/confirmDepositPaid|đã thấy UNC|Ngân hàng báo có/);
  });
});
