"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { inspectionApi } from "@/lib/inspection/api";
import { clearDraft, loadDraft, saveDraft } from "@/lib/inspection/draftStore";
import { blankDraft, fieldAnchorId, inspectionResErrorText, isDraftCompatible, syncPhotos, toSubmitDto, validateDraftFull } from "@/lib/inspection/logic";
import { PRICE_CHANGE_WARNING, listingForbiddenField, pricingChanged, submitLabel } from "@/lib/inspection/facts";
import { LISTING_TEXT_FORBIDDEN } from "@/lib/units/listing-text";
import { useInspectionAction } from "@/lib/inspection/useInspectionAction";
import { useInspectionUploads } from "@/lib/inspection/useInspectionUploads";
import type { InspectionDetail, InspectionDraft, InspectionPhotoView, ListingRoom } from "@/lib/inspection/types";
import consign from "@/components/consign/Consign.module.css";
import { ConclusionBlock } from "./ConclusionBlock";
import { DeclaredBlock, DoorBlock, FactsBlock, LandlordInfoBlock, MeasureBlock } from "./InfoBlocks";
import { InventoryBlock } from "./InventoryBlock";
import { ListingBlock } from "./ListingBlock";
import { ListingTextBlock } from "./ListingTextBlock";
import { ProgressPanel } from "./ProgressPanel";
import type { PhotoController } from "./photoController";
import styles from "./Inspection.module.css";

/** Phiếu thẩm định ở stage `inspecting`: 8 khối, ảnh thật, nháp ở máy, nộp một lần (Đạt ⇒ niêm yết ngay). */
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
  const [confirm, setConfirm] = useState(false);
  /** Đã nộp và đang chờ chủ nhà đồng ý giá ⇒ màn kết thúc (không chuyển trang). */
  const [sentToLandlord, setSentToLandlord] = useState(false);

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

  const approve = effective.recommendation === "approve";
  const pending = uploads.items.some((u) => u.status === "measuring" || u.status === "queued" || u.status === "uploading");

  function tryOpenConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (pending) {
      toast("Còn ảnh đang tải — đợi xong rồi nộp.", "info");
      return;
    }
    const err = validateDraftFull(effective, { ...detail, doorCodeOnFile: detail.doorCodeOnFile && !forcePin });
    if (err) {
      setInvalid(err);
      toast(err.message);
      return;
    }
    setConfirm(true);
  }

  async function submit() {
    const res = await run(() => inspectionApi.submit(detail.id, toSubmitDto(effective)));
    setConfirm(false);
    if (res.ok) {
      clearDraft(detail.id);
      if (res.data.stage === "awaiting_landlord") {
        toast("Đã gửi đề xuất giá cho chủ nhà.", "success");
        setSentToLandlord(true);
        return;
      }
      toast(res.data.stage === "approved" ? `Đạt — căn ${res.data.unitCode} đã lên danh sách.` : "Đã nộp: hồ sơ không đạt, đã đóng.", "success");
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

  if (sentToLandlord) {
    return (
      <div className={consign.formCard}>
        <div className={styles.doneBox} role="status">
          <h3 style={{ margin: 0 }}>Đã gửi đề xuất giá cho chủ nhà</h3>
          <p className="muted small" style={{ margin: "var(--s-2) 0 var(--s-5)" }}>
            Căn chưa được đăng. Khi chủ nhà đồng ý giá mới, căn sẽ lên danh sách; nếu chủ nhà không đồng ý, hồ sơ ký gửi đóng lại.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => router.push("/host/inspections")}>
            Về danh sách thẩm định
          </button>
        </div>
      </div>
    );
  }

  const awaitingLandlord = approve && pricingChanged(effective.pricing, detail);

  return (
    <form onSubmit={tryOpenConfirm} className={consign.inspectionGrid}>
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
        <ListingTextBlock detail={detail} draft={effective} invalidField={invalidField} invalidMessage={invalid?.message ?? null} onChange={update} />
        <ConclusionBlock detail={detail} draft={effective} invalidField={invalidField} forcePin={forcePin} onChange={update} />

        <div className={styles.stickyBar}>
          {pending && <span className="muted small">Đang tải ảnh…</span>}
          <button type="submit" className="btn btn-primary" style={{ padding: "10px 24px" }} disabled={busy}>
            {submitLabel(effective, detail)}
          </button>
        </div>
      </div>

      <div className={consign.sideSummaryCol}>
        <ProgressPanel draft={effective} catalog={detail.catalog} listingMin={detail.limits.listingMin} />
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={approve ? "Xác nhận thẩm định ĐẠT" : "Xác nhận KHÔNG ĐẠT"}
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirm(false)} disabled={busy}>
              Xem lại phiếu
            </button>
            <button type="button" className={approve ? "btn btn-primary" : "btn btn-danger"} onClick={() => void submit()} disabled={busy}>
              {busy ? "Đang nộp…" : awaitingLandlord ? "Xác nhận & gửi chủ nhà" : approve ? "Xác nhận & niêm yết" : "Xác nhận không đạt"}
            </button>
          </>
        }
      >
        {awaitingLandlord ? (
          <ul className={styles.confirmList}>
            <li>
              <b>{PRICE_CHANGE_WARNING}.</b>
            </li>
            <li>Căn KHÔNG lên danh sách cho tới khi chủ nhà đồng ý; chủ nhà không đồng ý thì hồ sơ đóng lại.</li>
            <li>Không thể nộp lại hay sửa phiếu sau khi xác nhận.</li>
          </ul>
        ) : approve ? (
          <ul className={styles.confirmList}>
            <li>
              <b>Căn sẽ lên danh sách cho khách thuê NGAY, không qua Admin.</b>
            </li>
            <li>{effective.listingPhotoIds.length} ảnh niêm yết sẽ hiện công khai trên tin đăng.</li>
            <li>Ủy quyền ký gửi có hiệu lực; không thể nộp lại hay sửa phiếu sau khi xác nhận.</li>
          </ul>
        ) : (
          <ul className={styles.confirmList}>
            <li>
              <b>Hồ sơ ký gửi sẽ đóng, căn không lên danh sách.</b>
            </li>
            <li>Chủ nhà sẽ thấy lý do: “{effective.note.trim()}”.</li>
          </ul>
        )}
      </Modal>
    </form>
  );
}
