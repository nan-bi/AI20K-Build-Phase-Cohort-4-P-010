/** Lời mời đăng nhập khi server trả 401 LOGIN_REQUIRED (giới hạn lượt khách do server chốt, web không tự đếm). */
export const LOGIN_HREF = "/login?next=/";

export function loginPrompt(en: boolean): { text: string; cta: { label: string; href: string } } {
  return en
    ? { text: "You have used your 2 trial advisory turns. Sign in (free) so I can keep advising you in detail.", cta: { label: "Sign in", href: LOGIN_HREF } }
    : { text: "Bạn đã dùng 2 lượt tư vấn thử. Đăng nhập (miễn phí) để mình tiếp tục tư vấn chi tiết cho bạn nhé.", cta: { label: "Đăng nhập", href: LOGIN_HREF } };
}
