import re
from pathlib import Path

from app.tools.lookup_policy import KNOWLEDGE_DIR, TOPICS, knowledge_files, parse_file

# SPEC-P04 §2: không có số tiền/giờ cứng ngoài biến {…}
HARD_NUMBER = re.compile(r"\d[\d.,]*\s*(đ|vnđ|vnd|triệu|tr|k|giờ|h|tiếng|phút|ngày)\b", re.I)
VARS = {"holding_deposit", "hold_hours", "hold_hours_min", "hold_hours_max"}


def test_a6_no_hardcoded_numbers():
    offenders = []
    for p in knowledge_files(Path(KNOWLEDGE_DIR)):
        _, body = parse_file(p)
        for m in HARD_NUMBER.finditer(body):
            offenders.append(f"{p.name}: {m.group(0)!r}")
    assert offenders == []


def test_scanner_catches_hardcoded():
    assert HARD_NUMBER.search("Cọc 2.000.000 đ") and HARD_NUMBER.search("giữ 48 giờ") and HARD_NUMBER.search("5 triệu")
    assert HARD_NUMBER.search("giữ 48 tiếng") and HARD_NUMBER.search("nhắc 10 phút") and HARD_NUMBER.search("trong 3 ngày")
    assert not HARD_NUMBER.search("Cọc {holding_deposit} trong {hold_hours} giờ")


def test_topics_valid_and_vars_known():
    for p in knowledge_files(Path(KNOWLEDGE_DIR)):
        meta, body = parse_file(p)
        assert meta.get("topic") in TOPICS, f"{p.name}: topic không thuộc enum"
        assert set(re.findall(r"\{(\w+)\}", body)) <= VARS, f"{p.name}: biến lạ"
