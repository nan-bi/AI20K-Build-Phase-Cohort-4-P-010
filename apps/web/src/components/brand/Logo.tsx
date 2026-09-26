import Link from "next/link";

/** Ký hiệu: một toà nhà, một ô cửa sáng đèn — cùng ngôn ngữ với ảnh mặt tiền ở trang chủ. */
export function LogoMark({ size = 30, inverse = false }: { size?: number; inverse?: boolean }) {
  const body = inverse ? "#f2f7f6" : "#0b2530";
  const dim = inverse ? "#c5d6d3" : "#3a6472";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect x="4" y="2" width="24" height="28" rx="5" fill={body} />
      {[0, 1, 2].map((r) =>
        [0, 1].map((c) => {
          const lit = r === 0 && c === 1;
          return <rect key={`${r}-${c}`} x={9 + c * 8} y={7 + r * 7} width="5" height="4" rx="1.2" fill={lit ? "#e0a03c" : dim} />;
        }),
      )}
    </svg>
  );
}

export function Logo({ href = "/", inverse = false, sub }: { href?: string; inverse?: boolean; sub?: string }) {
  return (
    <Link href={href} aria-label="VinStay AI — trang chủ" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark inverse={inverse} />
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "-0.03em",
            color: inverse ? "#fff" : "var(--ink)",
          }}
        >
          VinStay<span style={{ color: "var(--amber)" }}> AI</span>
        </span>
        {sub && <span style={{ fontSize: 11.5, marginTop: 4, color: inverse ? "#9fb9bf" : "var(--slate)" }}>{sub}</span>}
      </span>
    </Link>
  );
}
