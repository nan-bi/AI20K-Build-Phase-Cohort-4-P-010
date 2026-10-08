"""Luật cứng dạng máy đọc: dò câu trả lời KHẲNG ĐỊNH điều bị cấm (không có phủ định liền trước).

Dùng ở 2 nơi: bộ lọc đầu ra của agent (F5b) và bộ chấm eval `forbid_unless_negated` (F4).
"""

import re

NEGATION_WINDOW = 30  # ký tự trước chỗ khớp được xét phủ định (cắt tại dấu kết câu; đủ cho 'không dùng X hay Y')
NEGATION = re.compile(
    r"không|chẳng|chưa|thay vì|khác với|tuyệt đối|\b(?:not|no|never|without|instead of|isn't|won't|doesn't|don't)\b",
    re.I,
)

# Mỗi mẫu = một khẳng định bị cấm (AGENTS.md "Hard constraints").
FORBIDDEN: dict[str, str] = {
    "deposit_deducted_from_rent": r"trừ\s+(?:thẳng\s+)?vào\s+(?:tiền\s+)?thuê|deducted\s+from\s+(?:the\s+)?first\s+month",
    "separate_deposit_agreement": r"ký\s+(?:một\s+)?thỏa\s+thuận\s+(?:đặt\s+)?cọc\s+riêng",
    "lockbox_iot_qr": r"lockbox|hộp\s+khóa|ổ\s+khóa\s+thông\s+minh|smart[\s-]?lock|\biot\b|quét\s+QR\s+(?:ở|tại)\s+sảnh",
    "vinstay_repairs": r"VinStay\s+(?:sẽ\s+)?(?:cử|tự|nhận|trực\s+tiếp)\s+(?:thợ\s+)?sửa|VinStay\s+chịu\s+(?:chi\s+phí\s+)?sửa"
    r"|VinStay\s+(?:will\s+)?(?:send|repair|fix)",
}


def is_negated(text: str, start: int) -> bool:
    before = re.split(r"[.;!?\n]", text[max(0, start - NEGATION_WINDOW) : start])[-1]
    return bool(NEGATION.search(before))


def affirmed(rx: str, text: str) -> bool:
    """Có ít nhất một chỗ khớp `rx` mà KHÔNG có phủ định trong NEGATION_WINDOW ký tự liền trước."""
    return any(not is_negated(text, m.start()) for m in re.finditer(rx, text, re.I))


def find_violations(text: str) -> list[str]:
    return [name for name, rx in FORBIDDEN.items() if affirmed(rx, text)]
