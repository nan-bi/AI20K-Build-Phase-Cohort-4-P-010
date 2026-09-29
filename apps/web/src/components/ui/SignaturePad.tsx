"use client";

import { useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import styles from "./SignaturePad.module.css";

interface SignaturePadProps {
  onChange: (hasInk: boolean) => void;
  onCapture?: (dataUrl: string | null) => void;
  label?: string;
}

/** Xuất thumbnail PNG 320px, trả null nếu kích thước > 40KB hoặc có lỗi */
function exportThumbnail(canvas: HTMLCanvasElement, maxWidth = 320): string | null {
  try {
    const ratio = maxWidth / canvas.width;
    const targetWidth = maxWidth;
    const targetHeight = Math.max(1, Math.round(canvas.height * ratio));
    const offscreen = document.createElement("canvas");
    offscreen.width = targetWidth;
    offscreen.height = targetHeight;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    const dataUrl = offscreen.toDataURL("image/png");
    // Ước tính byteSize từ chuỗi base64
    const byteSize = Math.round((dataUrl.length * 3) / 4);
    if (byteSize > 40 * 1024) return null;
    return dataUrl;
  } catch {
    return null;
  }
}

/** Khung ký tay bằng chuột/cảm ứng. Chữ ký này đi kèm OTP để tạo chữ ký số (mô phỏng). */
export function SignaturePad({ onChange, onCapture, label = "Ký tên của bạn ở đây" }: SignaturePadProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inked = useRef(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b2530";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const handleStrokeEnd = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (inked.current && onCapture && canvas.current) {
      const thumb = exportThumbnail(canvas.current);
      onCapture(thumb);
    }
  };

  const clear = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    inked.current = false;
    onChange(false);
    onCapture?.(null);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.box}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          aria-label={label}
          onPointerDown={(e) => {
            const ctx = canvas.current!.getContext("2d")!;
            canvas.current!.setPointerCapture(e.pointerId);
            drawing.current = true;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + 0.01, p.y);
            ctx.stroke();
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = canvas.current!.getContext("2d")!;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            if (!inked.current) {
              inked.current = true;
              onChange(true);
            }
          }}
          onPointerUp={handleStrokeEnd}
          onPointerLeave={handleStrokeEnd}
        />
        <span className={styles.hint}>{label}</span>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
        <Eraser size={15} /> Ký lại
      </button>
    </div>
  );
}
