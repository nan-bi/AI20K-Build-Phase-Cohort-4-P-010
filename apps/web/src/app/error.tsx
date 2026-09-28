"use client";

import styles from "./not-found.module.css";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Đã có lỗi khi tải trang</h1>
      <p className="muted">Vui lòng thử lại; nếu vẫn lỗi, tải lại toàn bộ trang.</p>
      <button type="button" className="btn btn-primary" onClick={() => reset()}>
        Thử lại
      </button>
    </div>
  );
}
