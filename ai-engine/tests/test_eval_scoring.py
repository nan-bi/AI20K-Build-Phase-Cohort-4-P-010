"""F4: chấm eval nhóm luật cứng — câu trả lời ĐÚNG (có phủ định) phải ok, câu SAI (khẳng định điều cấm) phải fail."""

import json

import pytest

from app.eval import CASES, HARD_GROUPS, score_case

CASES_BY_ID = {json.loads(line)["id"]: json.loads(line) for line in CASES.read_text(encoding="utf-8").splitlines() if line}
TOOLS = ["lookup_policy"]

# id -> (câu đúng, câu sai)
ANSWERS = {
    "expiry_1": (
        "Cọc giữ chỗ không bị trừ vào tiền thuê; hết hạn giữ chỗ thì căn mở lại và bạn không cần ký thỏa thuận cọc riêng.",
        "Cọc giữ chỗ sẽ được trừ vào tiền thuê tháng đầu nếu bạn ký.",
    ),
    "expiry_2": (
        "Căn được giữ theo số giờ Admin cài đặt, khoản cọc không được khấu trừ vào tiền thuê tháng đầu.",
        "Căn giữ 24 giờ, sau đó ký thỏa thuận cọc riêng với chủ nhà.",
    ),
    "expiry_3": (
        "Không, cọc 2 triệu không trừ vào tiền thuê tháng đầu mà chuyển 100% thành Tiền Cọc Bảo Đảm.",
        "Có, cọc giữ chỗ sẽ được trừ vào tiền thuê tháng đầu.",
    ),
    "expiry_5": (
        "Không, bạn không phải ký thỏa thuận cọc riêng; chỉ cần tick đồng ý điều khoản cọc trước khi quét VietQR.",
        "Đúng, bạn phải ký thỏa thuận cọc riêng trước khi thuê.",
    ),
    "maint_1": (
        "VinStay không cử thợ sửa; Field Host chỉ giới thiệu thợ ngoài trong danh bạ, bạn tự thỏa thuận giá.",
        "VinStay sẽ cử thợ sửa máy lạnh cho bạn ngay hôm nay.",
    ),
    "maint_2": (
        "Bạn gọi thợ trong danh bạ thợ ngoài do Field Host giới thiệu; VinStay không tự sửa.",
        "Đừng lo, VinStay tự sửa giúp bạn.",
    ),
    "view_1": (
        "Host đón bạn ở sảnh, không dùng lockbox hay hộp khóa treo cửa; mã cửa gửi trong app khi Host xác nhận.",
        "Bạn lấy chìa trong lockbox treo cửa rồi tự lên xem.",
    ),
    "view_2": (
        "Không cần quét QR ở sảnh: bấm nút 1-chạm 'Tôi đã có mặt tại sảnh' trên Zalo, Host sẽ đón bạn.",
        "Bạn quét QR ở sảnh để vào thang máy.",
    ),
    "en_2": (
        "No - it is never deducted from the first month rent; it converts in full into the security deposit. Not deducted.",
        "Yes, the holding deposit is deducted from the first month rent.",
    ),
    "en_3": (
        "VinStay does not repair anything; the Field Host refers a handyman from the directory.",
        "VinStay will send a technician to repair it.",
    ),
}


def test_every_hard_group_policy_case_covered():
    hard = {i for i, c in CASES_BY_ID.items() if c.get("group") in HARD_GROUPS - {"injection"} and "forbid" in json.dumps(c)}
    assert {i for i in hard if CASES_BY_ID[i].get("forbid_regex") or CASES_BY_ID[i].get("forbid_unless_negated")} <= set(
        ANSWERS
    )


@pytest.mark.parametrize("cid", sorted(ANSWERS))
def test_correct_answer_ok_wrong_answer_fails(cid):
    good, bad = ANSWERS[cid]
    case = CASES_BY_ID[cid]
    assert score_case(case, good, TOOLS) == [], f"{cid}: câu đúng bị chấm sai"
    assert score_case(case, bad, TOOLS) != [], f"{cid}: câu sai lọt"


def test_expiry_4_and_all_cases_have_valid_regex():
    import re

    for c in CASES_BY_ID.values():
        for k in ("forbid_regex", "forbid_unless_negated", "must_regex"):
            for rx in c.get(k, []):
                re.compile(rx)
