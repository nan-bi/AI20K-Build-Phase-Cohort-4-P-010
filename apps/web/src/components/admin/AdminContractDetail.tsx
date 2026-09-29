"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { CONTRACT_KIND_META, CONTRACT_STATUS_META } from "@/components/contracts/status";
import { KeyValue } from "@/components/ui/KeyValue";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { completeMandateExit, remindLeaseRenewal } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { contractByKey, contractEvents } from "@/lib/mock/contracts";
import { templatesForKind } from "@/lib/mock/contract-templates";
import { fmtDate, fmtDateTime, maskPhone, vnd } from "@/lib/mock/format";
import { HOSTS } from "@/lib/mock/units";
import { useMock } from "@/lib/mock/store";
import { useNow } from "@/lib/useNow";
import styles from "./Contracts.module.css";

interface Props {
  contractKey: string;
}

export function AdminContractDetail({ contractKey }: Props) {
  const state = useMock();
  const now = useNow(1000);
  const [modalExit, setModalExit] = useState(false);
  const [loading, setLoading] = useState(false);

  const row = useMemo(() => {
    if (!state.ready || !now) return undefined;
    return contractByKey(state, contractKey, now);
  }, [state, now, contractKey]);

  if (!state.ready || !now) {
    return <div className="skeleton" style={{ height: 480 }} />;
  }

  if (!row) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Không tìm thấy hợp đồng"
          description="Hợp đồng không tồn tại hoặc đã bị đặt lại dữ liệu."
          actions={
            <Link href="/admin/contracts" className="btn btn-secondary">
              <ArrowLeft size={16} /> Về sổ hợp đồng
            </Link>
          }
        />
        <div className={styles.empty}>
          Mã hợp đồng <code>{contractKey}</code> không có trong hệ thống.
        </div>
      </div>
    );
  }

  const kindMeta = CONTRACT_KIND_META[row.kind];
  const statusMeta = CONTRACT_STATUS_META[row.status];
  const events = contractEvents(state, row, now);
  const booking = row.bookingId ? state.bookings.find((b) => b.id === row.bookingId) : undefined;

  // Tính số ngày còn lại / quá hạn cho mandate
  const effectiveMs = row.endAt ? Date.parse(row.endAt) : 0;
  const daysDiff = row.endAt ? Math.ceil((effectiveMs - now) / (24 * 3600 * 1000)) : 0;

  const handleCompleteExit = () => {
    if (!row.unitId) return;
    setLoading(true);
    const res = completeMandateExit(row.unitId, DEMO_USERS.admin.name);
    setLoading(false);
    setModalExit(false);

    if (res.ok) {
      toast("Đã hoàn tất thoát uỷ quyền và offboard căn hộ.", "success");
    } else {
      toast(`Không thể hoàn tất: ${res.reason}`);
    }
  };

  const handleRemindRenewal = () => {
    if (!row.bookingId) return;
    setLoading(true);
    const res = remindLeaseRenewal(row.bookingId, DEMO_USERS.admin.name);
    setLoading(false);

    if (res.ok) {
      toast("Đã gửi Zalo thông báo nhắc gia hạn cho Chủ nhà và Khách thuê.", "success");
    } else {
      toast(`Không thể nhắc gia hạn: ${res.reason}`);
    }
  };

  // Điều khoản chính theo loại hợp đồng
  const termItems = [];
  if (row.kind === "mandate") {
    termItems.push({
      label: "Ngày ký uỷ quyền",
      value: row.signedAt ? fmtDateTime(row.signedAt) : "—",
    });
    termItems.push({
      label: "Trạng thái uỷ quyền",
      value: statusMeta.label,
    });
    termItems.push({
      label: "Điều khoản thoát",
      value: "Báo trước 15 ngày kèm theo trạng thái nhà trống.",
    });

    if (row.status === "exiting") {
      termItems.push({
        label: "Thời hạn đếm ngược",
        value: `Hiệu lực đến ${row.endAt ? fmtDate(row.endAt) : "—"} (còn ${Math.max(1, daysDiff)} ngày)`,
      });
    } else if (row.status === "exit_due") {
      termItems.push({
        label: "Thời hạn đếm ngược",
        value: (
          <span style={{ color: "var(--danger)", fontWeight: 600 }}>
            Đã hết 15 ngày (quá hạn {Math.abs(daysDiff)} ngày) — Chờ Admin hoàn tất offboard
          </span>
        ),
      });
    } else if (row.status === "ended") {
      termItems.push({
        label: "Thời điểm offboard",
        value: row.endAt ? fmtDateTime(row.endAt) : "Đã offboard",
      });
    }
  } else if (row.kind === "holding") {
    termItems.push({
      label: "Số tiền cọc giữ chỗ",
      value: "2.000.000đ (VietQR động)",
    });
    termItems.push({
      label: "Hạn giữ chỗ (7 ngày)",
      value: row.endAt ? fmtDateTime(row.endAt) : "7 ngày kể từ lúc thanh toán",
    });
    termItems.push({
      label: "Thoả thuận cọc số",
      value: booking?.agreement ? booking.agreement.docId : "Chờ ký qua OTP Zalo",
    });
    termItems.push({
      label: "Quy tắc cọc bảo đảm",
      value: (
        <span className={styles.infoBox} style={{ display: "block", marginTop: 4 }}>
          Khi ký HĐ thuê chính thức, 100% khoản này (2.000.000đ) chuyển đổi thành một phần của Tiền cọc bảo đảm tài sản — tuyệt đối KHÔNG khấu trừ vào tiền thuê tháng đầu tiên.
        </span>
      ),
    });
    if (row.status === "converted" && row.bookingId) {
      termItems.push({
        label: "Hợp đồng thuê chuyển đổi",
        value: (
          <Link href={`/admin/contracts/lease.${row.bookingId}`} className="link">
            Xem HĐ thuê liên quan ({booking?.lease?.docId}) →
          </Link>
        ),
      });
    }
  } else if (row.kind === "lease") {
    termItems.push({
      label: "Kỳ hạn thuê",
      value: `${booking?.lease?.months ?? 12} tháng`,
    });
    termItems.push({
      label: "Thời hạn thuê",
      value: `Từ ${row.startAt ? fmtDate(row.startAt) : "—"} đến ${row.endAt ? fmtDate(row.endAt) : "—"}`,
    });
    termItems.push({
      label: "Tiền thuê hàng tháng",
      value: `${vnd(row.amount ?? 0)}đ/tháng`,
    });
    termItems.push({
      label: "Tiền cọc bảo đảm",
      value: (
        <span>
          <strong>{vnd(row.securityDeposit ?? 0)}đ</strong> (gồm 2.000.000đ chuyển từ cọc giữ chỗ + {vnd((row.securityDeposit ?? 0) - 2_000_000)}đ nộp thêm khi ký)
        </span>
      ),
    });
    termItems.push({
      label: "Tiền thuê tháng đầu",
      value: `${vnd(row.amount ?? 0)}đ (nguyên tiền thuê, không trừ 2.000.000đ cọc giữ chỗ)`,
    });
    if (row.bookingId) {
      termItems.push({
        label: "Cọc giữ chỗ ban đầu",
        value: (
          <Link href={`/admin/contracts/holding.${row.bookingId}`} className="link">
            Xem thỏa thuận cọc ({booking?.agreement?.docId ?? `COC-${booking?.ref}`}) →
          </Link>
        ),
      });
    }
  } else if (row.kind === "partnership") {
    termItems.push({
      label: "Phân khu phụ trách",
      value: row.unitLabel,
    });
    termItems.push({
      label: "Ngày ký hợp tác",
      value: row.signedAt ? fmtDate(row.signedAt) : "—",
    });
    termItems.push({
      label: "Chế độ thù lao",
      value: (
        <span>
          100% biến phí — cấu hình tại{" "}
          <Link href="/admin/commission" className="link">
            Biến phí Host →
          </Link>
        </span>
      ),
    });
  }

  // Vai trò tiếng Việt
  const roleLabels = {
    landlord: "Bên Cho Thuê (Chủ nhà)",
    tenant: "Bên Thuê (Khách thuê)",
    host: "Đối tác thực địa (Field Host)",
    platform: "Đơn vị vận hành & làm chứng",
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={row.docId}
        description={`${kindMeta.label} · ${row.unitLabel}`}
        back={{ href: "/admin/contracts", label: "Sổ hợp đồng" }}
        actions={<StatusBadge tone={statusMeta.tone}>{statusMeta.label}</StatusBadge>}
      />

      <ContractsSubnav />

      <div className={styles.detailLayout}>
        {/* Cột chính */}
        <div className={styles.mainCol}>
          <Section title="Điều khoản chính">
            <KeyValue items={termItems} />
          </Section>

          <Section title="Mốc tiến trình hợp đồng">
            <ul className={styles.events}>
              {events.map((ev, i) => (
                <li key={i} className={`${styles.eventItem} ${ev.done ? styles.eventDoneItem : styles.eventPending}`}>
                  <span className={`${styles.eventDot} ${ev.done ? styles.eventDone : ""}`} />
                  <div className={styles.eventContent}>
                    <span className={styles.eventLabel}>{ev.label}</span>
                    <span className={styles.eventTime}>
                      {ev.at ? fmtDateTime(ev.at) : "Chưa thực hiện"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Cột phụ */}
        <div className={styles.sideCol}>
          {/* Section Hành động khi cần */}
          {row.status === "exit_due" && (
            <div className={`${styles.actionSection} ${styles.actionDue}`}>
              <div className={styles.actionTitle}>Hoàn tất thoát uỷ quyền</div>
              <p className={styles.actionDesc}>
                Căn hộ đã hoàn tất đủ 15 ngày báo trước. Xác nhận để hoàn tất offboard, gỡ mã cửa khỏi Field Host và thông báo bàn giao chìa cơ.
              </p>
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={() => setModalExit(true)}
              >
                Hoàn tất thoát uỷ quyền
              </button>
            </div>
          )}

          {row.status === "exiting" && (
            <div className={styles.actionSection}>
              <div className={styles.actionTitle}>Đang đếm ngược 15 ngày</div>
              <p className={styles.actionDesc}>
                Trong thời gian này căn vẫn hiển thị đón nốt khách. Nút hoàn tất offboard sẽ mở vào ngày {row.endAt ? fmtDate(row.endAt) : "—"}.
              </p>
              <button type="button" className="btn btn-secondary btn-block" disabled>
                Hoàn tất thoát uỷ quyền (Mở khi hết 15 ngày)
              </button>
            </div>
          )}

          {row.status === "expiring" && (
            <div className={`${styles.actionSection} ${styles.actionExpiring}`}>
              <div className={styles.actionTitle}>Hợp đồng thuê sắp hết hạn</div>
              <p className={styles.actionDesc}>
                Thời hạn thuê còn ≤ 30 ngày. Gửi thông báo Zalo đồng thời cho Chủ nhà & Khách thuê để chủ động kế hoạch gia hạn hoặc tìm khách mới sớm.
              </p>
              {booking?.lease?.renewalRemindedAt ? (
                <div className="badge badge-ok">
                  <CheckCircle2 size={13} /> Đã gửi nhắc lúc {fmtDateTime(booking.lease.renewalRemindedAt)}
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                  onClick={handleRemindRenewal}
                >
                  <Clock size={16} /> Gửi nhắc gia hạn (Zalo)
                </button>
              )}
            </div>
          )}

          {/* Các bên tham gia */}
          <Section title="Các bên tham gia">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {row.parties.map((p, i) => (
                <div
                  key={i}
                  style={{
                    borderBottom:
                      i < row.parties.length - 1 || (row.hostId && (row.kind === "holding" || row.kind === "lease"))
                        ? "1px solid var(--line)"
                        : "none",
                    paddingBottom: 8,
                  }}
                >
                  <div className="muted small">{roleLabels[p.role]}</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    {p.id && p.role !== "platform" ? (
                      <Link href={`/admin/contracts/parties/${p.role}.${p.id}`} className="link">
                        {p.name}
                      </Link>
                    ) : (
                      p.name
                    )}
                  </div>
                  {p.phoneMasked && <div className="muted small fontMono">{p.phoneMasked}</div>}
                </div>
              ))}
              {row.hostId && (row.kind === "holding" || row.kind === "lease") && (
                <div style={{ paddingBottom: 8 }}>
                  <div className="muted small">Host phụ trách thực địa</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    <Link href={`/admin/contracts/parties/host.${row.hostId}`} className="link">
                      {HOSTS.find((h) => h.id === row.hostId)?.name ?? `Host ${row.hostId}`}
                    </Link>
                  </div>
                  {HOSTS.find((h) => h.id === row.hostId)?.phone && (
                    <div className="muted small fontMono">
                      {maskPhone(HOSTS.find((h) => h.id === row.hostId)!.phone)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* Chứng cứ ký số */}
          <Section title="Chứng cứ ký số điện tử">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div>
                <span className="muted">Số định danh: </span>
                <strong>{row.docId}</strong>
              </div>
              <div>
                <span className="muted">Thời điểm ký: </span>
                <span>{row.signedAt ? fmtDateTime(row.signedAt) : "Chưa ký"}</span>
              </div>
              <div>
                <span className="muted">Phương thức xác thực: </span>
                <span>OTP Zalo (AES-256)</span>
              </div>
              {row.parties.find((p) => p.phoneMasked)?.phoneMasked && (
                <div>
                  <span className="muted">SĐT xác thực: </span>
                  <span>{row.parties.find((p) => p.phoneMasked)?.phoneMasked}</span>
                </div>
              )}
              <p className="muted small" style={{ marginTop: 6, lineHeight: 1.4 }}>
                Bản PDF niêm phong và nhật ký đầy đủ 7 yếu tố theo quy chuẩn Nghị định 13/2023/NĐ-CP được lưu trữ bảo mật trên hệ thống thật — bản demo không hiển thị.
              </p>
            </div>
          </Section>

          {/* Mẫu áp dụng */}
          <Section title="Mẫu áp dụng">
            {(() => {
              const { primary, attached } = templatesForKind(row.kind);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                  <div>
                    <div className="muted small" style={{ marginBottom: 4 }}>
                      Mẫu ký chính:
                    </div>
                    <Link
                      href={`/admin/contracts/templates/${primary.id}`}
                      style={{ display: "inline-flex", flexDirection: "column", gap: 2, textDecoration: "none" }}
                    >
                      <div style={{ fontWeight: 600, color: "var(--lagoon)" }}>
                        {primary.id} · {primary.title}
                      </div>
                      {primary.refCode && <div className="muted small fontMono">{primary.refCode}</div>}
                    </Link>
                  </div>
                  {attached.length > 0 && (
                    <div>
                      <div className="muted small" style={{ marginBottom: 6 }}>
                        Văn bản kèm ({attached.length}):
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {attached.map((att) => (
                          <Link
                            key={att.id}
                            href={`/admin/contracts/templates/${att.id}`}
                            className="link"
                            style={{ fontSize: 13 }}
                          >
                            <strong>{att.id}</strong> — {att.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </Section>

          {/* Liên kết căn hộ */}
          {row.unitId && (
            <Section title="Liên kết kho căn hộ">
              <Link href={`/admin/inventory/${row.unitId}`} className="link" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                Xem căn {row.unitLabel} trên kho <ExternalLink size={14} />
              </Link>
            </Section>
          )}
        </div>
      </div>

      {/* Modal xác nhận hoàn tất thoát uỷ quyền */}
      <Modal
        open={modalExit}
        onClose={() => setModalExit(false)}
        title="Xác nhận hoàn tất thoát uỷ quyền"
        footer={
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalExit(false)}>
              Đóng
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={loading}
              onClick={handleCompleteExit}
            >
              Xác nhận Offboard căn hộ
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
          <p>
            Bạn đang thực hiện hoàn tất thủ tục chấm dứt uỷ quyền độc quyền cho căn hộ <strong>{row.unitLabel}</strong>.
          </p>
          <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Căn hộ sẽ <strong>ngừng hiển thị</strong> trên rổ hàng cho thuê của Field Host và khách thuê.</li>
            <li>Mã khóa điện tử sẽ được <strong>gỡ bỏ hoàn toàn</strong> khỏi mạng lưới Field Host phân khu.</li>
            <li>Hệ thống gửi Zalo mời Chủ nhà đến nhận lại chìa khóa cơ tại văn phòng phân khu Vinhomes Ocean Park.</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}
