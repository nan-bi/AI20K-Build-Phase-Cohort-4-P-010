import styles from "./DevOtpHint.module.css";

/**
 * Gợi ý mã OTP cho môi trường thử nghiệm. Backend chỉ trả `devCode` ngoài production và khi chưa có nhà cung cấp
 * Zalo/SMS thật, nên ở production thành phần này không bao giờ hiện (devCode luôn rỗng).
 */
export function DevOtpHint({ code, onFill }: { code?: string | null; onFill?: (code: string) => void }) {
  if (!code) return null;
  return (
    <p className={styles.hint} role="note">
      <span className={styles.tag}>Bản thử nghiệm</span>
      <span>
        Mã OTP: <b className="tnum">{code}</b>
      </span>
      {onFill && (
        <button type="button" className={styles.fill} onClick={() => onFill(code)}>
          Điền mã
        </button>
      )}
    </p>
  );
}
