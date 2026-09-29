"use client";

import { Printer } from "lucide-react";

interface PrintDocButtonProps {
  label?: string;
  className?: string;
}

/** Nút in / tải văn bản dạng PDF bằng cửa sổ in của trình duyệt */
export function PrintDocButton({ label = "Tải văn bản (PDF)", className }: PrintDocButtonProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      type="button"
      className={className ?? "btn btn-outline btn-sm no-print"}
      onClick={handlePrint}
      title="In hoặc lưu dạng PDF bằng trình duyệt"
    >
      <Printer size={16} />
      <span>{label}</span>
    </button>
  );
}
