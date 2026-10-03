"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { compressPhoto } from "@/lib/landlord/compressPhoto";
import { MAX_PHOTOS, PHOTO_ACCEPT, checkPhotoFiles, tooBigAfterCompress } from "@/lib/landlord/photos";
import styles from "./Landlord.module.css";

interface PhotoPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  /** Số ảnh đã nằm trên máy chủ (hồ sơ nháp đã có ảnh) — tính vào giới hạn tổng. */
  uploadedCount?: number;
  disabled?: boolean;
}

/** Chọn ảnh tham khảo cho hồ sơ ký gửi: bấm hoặc kéo thả, xem trước, bỏ từng ảnh. Chưa tải lên — cha tải khi tạo hồ sơ. */
export function PhotoPicker({ files, onChange, uploadedCount = 0, disabled }: PhotoPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const full = uploadedCount + files.length >= MAX_PHOTOS;
  const locked = disabled || compressing;

  // Link xem trước tạo từ File; thu hồi khi danh sách đổi hoặc component bị gỡ để không rò bộ nhớ.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const add = async (picked: FileList | File[] | null) => {
    if (!picked || disabled || compressing) return;
    const { accepted, errors: errs } = checkPhotoFiles(files, Array.from(picked), uploadedCount);
    if (input.current) input.current.value = ""; // cho phép chọn lại đúng file vừa bỏ
    setErrors(errs);
    if (!accepted.length) return;

    // Nén trên trình duyệt trước: ảnh điện thoại vài MB còn vài trăm KB, tiết kiệm dung lượng lưu trữ.
    setCompressing(true);
    const ready: File[] = [];
    const after: string[] = [];
    for (const f of accepted) {
      const small = await compressPhoto(f);
      const problem = tooBigAfterCompress(small);
      if (problem) after.push(problem);
      else ready.push(small);
    }
    setCompressing(false);
    if (after.length) setErrors([...errs, ...after]);
    if (ready.length) onChange([...files, ...ready]);
  };

  return (
    <div>
      <div
        className={`${styles.dropzone} ${over ? styles.dropzoneOver : ""} ${locked || full ? styles.dropzoneDisabled : ""}`}
        onClick={() => !locked && !full && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!locked && !full) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!full) void add(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={locked || full ? -1 : 0}
        aria-disabled={locked || full}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !locked && !full) {
            e.preventDefault();
            input.current?.click();
          }
        }}
      >
        <ImagePlus size={22} style={{ color: "var(--lagoon)" }} />
        <b className="small">{compressing ? "Đang xử lý ảnh…" : full ? `Đã đủ ${MAX_PHOTOS} ảnh` : "Bấm để chọn ảnh hoặc kéo thả vào đây"}</b>
        <span className="muted xs">JPG, PNG hoặc WebP · tối đa {MAX_PHOTOS} ảnh · ảnh được tự nén nhỏ trước khi tải</span>
        <input ref={input} className={styles.srOnly} type="file" accept={PHOTO_ACCEPT} multiple tabIndex={-1} aria-label="Tải ảnh hiện trạng" onChange={(e) => void add(e.target.files)} />
      </div>

      {errors.length > 0 && (
        <ul className="field-error" role="alert" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <div className={styles.photoGrid}>
          {files.map((f, i) => (
            <div key={`${f.name}|${f.size}|${f.lastModified}`} className={styles.photoItem}>
              {/* eslint-disable-next-line @next/next/no-img-element -- xem trước từ blob URL cục bộ, next/image không áp dụng */}
              <img src={previews[i]} alt={`Ảnh ${i + 1}: ${f.name}`} />
              <button type="button" className={styles.photoRemove} aria-label={`Bỏ ảnh ${f.name}`} disabled={disabled} onClick={() => onChange(files.filter((_, j) => j !== i))}>
                <X size={14} />
              </button>
              <span className={styles.photoName}>{f.name}</span>
            </div>
          ))}
        </div>
      )}
      <p className="muted xs" style={{ marginTop: 8 }}>
        Ảnh này chỉ để Field Host và Admin tham khảo. Ảnh niêm yết chính thức (có dấu Verified) do Field Host chụp khi thẩm định.
      </p>
    </div>
  );
}
