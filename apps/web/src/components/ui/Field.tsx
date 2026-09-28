import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Bọc một ô nhập (dùng class `.input`/`.select` có sẵn) với nhãn, gợi ý và lỗi. */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="muted xs">{hint}</span> : null}
    </label>
  );
}
