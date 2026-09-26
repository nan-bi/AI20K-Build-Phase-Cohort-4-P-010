"use client";

import { useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import styles from "./SignaturePad.module.css";

interface SignaturePadProps {
  onChange: (hasInk: boolean) => void;
  label?: string;
}

/** Khung ký tay bằng chuột/cảm ứng. Chữ ký này đi kèm OTP để tạo chữ ký số (mô phỏng). */
export function SignaturePad({ onChange, label = "Ký tên của bạn ở đây" }: SignaturePadProps) {
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

  const clear = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    inked.current = false;
    onChange(false);
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
          onPointerUp={() => {
            drawing.current = false;
          }}
          onPointerLeave={() => {
            drawing.current = false;
          }}
        />
        <span className={styles.hint}>{label}</span>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
        <Eraser size={15} /> Ký lại
      </button>
    </div>
  );
}
