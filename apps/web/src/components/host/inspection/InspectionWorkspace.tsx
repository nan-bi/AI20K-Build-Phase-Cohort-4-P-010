"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { inspectionApi } from "@/lib/inspection/api";
import { clearDraft, loadDraft, saveDraft } from "@/lib/inspection/draftStore";
import { blankDraft, fieldAnchorId, inspectionResErrorText, isDraftCompatible, syncPhotos, toSubmitDto, validateDraftFull } from "@/lib/inspection/logic";
import { listingForbiddenField } from "@/lib/inspection/facts";
import { LISTING_TEXT_FORBIDDEN } from "@/lib/units/listing-text";
import { useInspectionAction } from "@/lib/inspection/useInspectionAction";
import { useInspectionUploads } from "@/lib/inspection/useInspectionUploads";
import type { InspectionDetail, InspectionDraft, InspectionPhotoView, ListingRoom } from "@/lib/inspection/types";
import consign from "@/components/consign/Consign.module.css";
import { DoorPinBlock } from "./DoorPinBlock";
import { DeclaredBlock, DoorBlock, FactsBlock, LandlordInfoBlock, MeasureBlock } from "./InfoBlocks";
import { InventoryBlock } from "./InventoryBlock";
import { ListingBlock } from "./ListingBlock";
import { ProgressPanel } from "./ProgressPanel";
import type { PhotoController } from "./photoController";
import styles from "./Inspection.module.css";

/** Phiếu thẩm định ở stage `inspecting`: 7 khối, ảnh thật, nháp ở máy; kết thúc bằng một quyết định duy nhất: Đẩy căn lên (niêm yết ngay) hoặc Không duyệt (lý do gửi chủ nhà). */
export function InspectionWorkspace({ detail }: { detail: InspectionDetail }) {
  const router = useRouter();
  const { busy, run } = useInspectionAction(detail.id);

  const [draft, setDraft] = useState<InspectionDraft>(() => {
    const stored = loadDraft(detail.id);
    const blank = blankDraft(detail);
    // Nháp cũ (trước hồ sơ 18) thiếu facts/pricing/listing ⇒ bù từ chủ khai.
    return stored && isDraftCompatible(stored, detail) ? { ...blank, ...stored } : blank;
  });
  const [photos, setPhotos] = useState<InspectionPhotoView[]>(detail.photos);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<ReadonlySet<string>>(new Set());
  const [invalid, setInvalid] = useState<{ field: string; message: string } | null>(null);
  const [forcePin, setForcePin] = useState(false);
  /** Quyết định đang xác nhận; `null` = chưa mở hộp xác nhận. */
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

  // Ảnh gắn vào nháp theo slot (nháp không chứa ảnh).
  const effective = useMemo(() => syncPhotos(draft, photos), [draft, photos]);

  // Lưu nháp sau 0,4s không gõ; hỏng ⇒ bỏ qua (draftStore tự bắt lỗi).
  useEffect(() => {
    const t = setTimeout(() => saveDraft(detail.id, draft), 400);
    return () => clearTimeout(t);
  }, [detail.id, draft]);

  // Cuộn tới ô lỗi.
  const invalidField = invalid?.field ?? null;
  useEffect(() => {
    if (!invalidField) return;
    document.getElementById(fieldAnchorId(invalidField))?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [invalidField]);

  const update = useCallback((patch: (d: InspectionDraft) => InspectionDraft) => {
    setDraft(patch);
    setInvalid(null);
  }, []);

  const onUploaded = useCallback((view: InspectionPhotoView, previewUrl: string) => {
    setPhotos((prev) => (prev.some((p) => p.id === view.id) ? prev : [...prev, view]));
    setPreviews((prev) => ({ ...prev, [view.id]: previewUrl }));
  }, []);
  const uploads = useInspectionUploads(detail.id, onUploaded);

  const removePhoto = useCallback(
    async (photoId: string) => {
      setRemoving((s) => new Set(s).add(photoId));
      const res = await inspectionApi.removePhoto(detail.id, photoId);
      setRemoving((s) => {
        const n = new Set(s);
        n.delete(photoId);
        return n;
      });
      if (res.ok || res.code === "inspection_not_found") setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      else toast(inspectionResErrorText(res));
    },
    [detail.id],
  );

  const controller: PhotoController = {
    photosOf: (slot) => photos.filter((p) => p.slot === slot),
    uploadsOf: (slot) => uploads.items.filter((u) => u.slot === slot),
    previews,
    add: (slot: string, room: ListingRoom | undefined, files: File[]) => uploads.addFiles(slot, room, files),
    remove: (id) => void removePhoto(id),
    retry: uploads.retry,
    force: uploads.force,
    dismiss: uploads.dismiss,
    removing,
    totalLeft: Math.max(0, detail.limits.totalMax - photos.length - uploads.items.length),
    perLineMax: detail.limits.perLineMax,
    listingMax: detail.limits.listingMax,
  };

  const pending = uploads.items.some((u) => u.status === "measuring" || u.status === "queued" || u.status === "uploading");
  const needPin = detail.doorKind === "smart" && (!detail.doorCodeOnFile || forcePin);

  function decide(next: "approve" | "reject") {
    if (pending) {
      toast("Còn ảnh đang tải — đợi xong rồi nộp.", "info");
      return;
    }
    // Lý do không đạt nhập ở hộp xác nhận ⇒ lúc kiểm phiếu chưa đòi lý do (đặt tạm để qua V10).
    const probe: InspectionDraft = { ...effective, recommendation: next, note: next === "reject" ? effective.note.trim() || "-" : "" };
    const err = validateDraftFull(probe, { ...detail, doorCodeOnFile: detail.doorCodeOnFile && !forcePin });
    if (err) {
      setInvalid(err);
      toast(err.message);
      return;
    }
    setDecision(next);
  }

  async function submit() {
    if (!decision) return;
    const reason = effective.note.trim();
    if (decision === "reject" && !reason) return; // nút xác nhận đã khoá khi chưa có lý do
    const final: InspectionDraft = { ...effective, recommendation: decision, note: decision === "reject" ? reason : "" };
    const res = await run(() => inspectionApi.submit(detail.id, toSubmitDto(final)));
    setDecision(null);
    if (res.ok) {
      clearDraft(detail.id);
      toast(res.data.stage === "approved" ? `Đã đẩy căn ${res.data.unitCode} lên danh sách.` : "Đã gửi lý do không duyệt cho chủ nhà, hồ sơ đã đóng.", "success");
      router.push("/host/inspections");
      return;
    }
    if (res.code === LISTING_TEXT_FORBIDDEN) {
      // Server là chốt chặn: tô đỏ đúng ô theo `field`.
      const field = listingForbiddenField((res.data as { field?: string } | undefined)?.field, effective.listing);
      setInvalid({ field, message: inspectionResErrorText(res, "Nội dung giới thiệu không được chứa số điện thoại, link hoặc số tiền.") });
    } else if (res.code === "report_invalid") {
      let field = (res.data as { field?: string } | undefined)?.field;
      if (field === "listing.highlights") field = "listing.highlights.0";
      if (field) setInvalid({ field, message: res.message ?? "Phiếu chưa hợp lệ." });
    } else if (res.code === "door_code_required") {
      setForcePin(true);
      setInvalid({ field: "doorPin", message: inspectionResErrorText(res) });
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className={consign.inspectionGrid}>
      <div className={consign.mainFormCol}>
        {invalid && (
          <div className={consign.errorBanner} role="alert">
            {invalid.message}
          </div>
        )}
        <LandlordInfoBlock detail={detail} />
        <DoorBlock detail={detail} />
        <DeclaredBlock detail={detail} draft={effective} invalidField={invalidField} onChange={update} />
        <MeasureBlock detail={detail} draft={effective} invalidField={invalidField} onChange={update} />
        <FactsBlock detail={detail} draft={effective} invalidField={invalidField} onChange={update} />
        <InventoryBlock draft={effective} catalog={detail.catalog} photos={controller} invalidField={invalidField} onChange={update} />
        <ListingBlock draft={effective} photos={controller} min={detail.limits.listingMin} max={detail.limits.listingMax} invalid={invalidField === "listingPhotoIds"} onChange={update} />
        {needPin && <DoorPinBlock draft={effective} invalid={invalidField === "doorPin"} onChange={update} />}

        <div className={styles.stickyBar}>
          {pending && <span className="muted small">Đang tải ảnh…</span>}
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => decide("reject")}>
            Không duyệt
          </button>
          <button type="button" className="btn btn-primary" style={{ padding: "10px 24px" }} disabled={busy} onClick={() => decide("approve")}>
            Đẩy căn lên
          </button>
        </div>
      </div>

      <div className={consign.sideSummaryCol}>
        <ProgressPanel draft={effective} catalog={detail.catalog} listingMin={detail.limits.listingMin} />
      </div>

      <Modal
        open={decision !== null}
        onClose={() => setDecision(null)}
        title={decision === "approve" ? "Xác nhận đẩy căn lên" : "Xác nhận không duyệt"}
        footer={
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "var(--s-3)" }}>
            <button type="button" className="btn btn-quiet" onClick={() => setDecision(null)} disabled={busy}>
              Xem lại phiếu
            </button>
            {decision === "approve" ? (
              <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
                {busy ? "Đang nộp…" : "Xác nhận & niêm yết"}
              </button>
            ) : (
              <button type="button" className="btn btn-danger" onClick={() => void submit()} disabled={busy || effective.note.trim().length < 1}>
                {busy ? "Đang nộp…" : "Gửi lý do cho chủ nhà"}
              </button>
            )}
          </div>
        }
      >
        {decision === "approve" ? (
          <ul className={styles.confirmList}>
            <li>
              <b>Căn sẽ lên danh sách cho khách thuê NGAY, không qua Admin.</b>
            </li>
            <li>Giá thuê và tiền cọc giữ nguyên như chủ nhà đã khai.</li>
            <li>{effective.listingPhotoIds.length} ảnh niêm yết sẽ hiện công khai trên tin đăng.</li>
            <li>Ủy quyền ký gửi có hiệu lực; không thể nộp lại hay sửa phiếu sau khi xác nhận.</li>
          </ul>
        ) : (
          <>
            <ul className={styles.confirmList}>
              <li>
                <b>Hồ sơ ký gửi sẽ đóng, căn không lên danh sách.</b>
              </li>
              <li>Lý do dưới đây được gửi cho chủ nhà; không thể nộp lại sau khi xác nhận.</li>
            </ul>
            <label id="insp-note" className={`field ${invalidField === "note" ? styles.rowBad : ""}`}>
              <span className="label">
                Lý do không duyệt <b style={{ color: "var(--danger)" }}>*</b>
              </span>
              <textarea
                className="input"
                rows={4}
                maxLength={300}
                placeholder="Nhập lý do — chủ nhà sẽ xem nội dung này…"
                value={draft.note}
                onChange={(e) => update((d) => ({ ...d, note: e.target.value }))}
                style={{ resize: "vertical" }}
              />
            </label>
          </>
        )}
      </Modal>
    </form>
  );
}
