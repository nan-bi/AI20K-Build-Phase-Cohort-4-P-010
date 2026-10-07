"""Đọc tri thức theo topic từ ai-engine/knowledge/*.md (định dạng SPEC-P04 §2) và thay biến động từ Core API."""

import re
from pathlib import Path

from app.core_api import CoreApi, CoreApiError

NAME = "lookup_policy"
KNOWLEDGE_DIR = Path(__file__).resolve().parents[2] / "knowledge"
TOPICS = [
    "op1", "all_in", "viewing", "holding_deposit", "holding_expiry", "first_to_pay",
    "security_deposit", "contract", "bql_rules", "maintenance", "move_out", "privacy",
]  # fmt: skip
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": "Tra chính sách/quy trình VinStay (cọc, hợp đồng, xem nhà, nội quy, sửa chữa...).",
        "parameters": {
            "type": "object",
            "properties": {"topic": {"type": "string", "enum": TOPICS}},
            "required": ["topic"],
        },
    },
}

_VAR = re.compile(r"\{(holding_deposit|hold_hours|hold_hours_min|hold_hours_max)\}")
_FM = re.compile(r"\A---\n(.*?)\n---\n?(.*)\Z", re.S)


def knowledge_files(directory: Path | None = None) -> list[Path]:
    """File topic hợp lệ: *.md không bắt đầu bằng `_` (loại `_sample.md`, `_conflicts.md`)."""
    d = directory or KNOWLEDGE_DIR
    return sorted(p for p in d.glob("*.md") if not p.name.startswith("_"))


def parse_file(path: Path) -> tuple[dict, str]:
    m = _FM.match(path.read_text(encoding="utf-8"))
    if not m:
        return {}, path.read_text(encoding="utf-8")
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, m.group(2).strip()


def load_topic(topic: str, directory: Path | None = None) -> tuple[dict, str] | None:
    for p in knowledge_files(directory):
        meta, body = parse_file(p)
        if meta.get("topic") == topic:
            return meta, body
    return None


def _vn(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def substitute(body: str, terms: dict | None) -> tuple[str, list[str]]:
    """Thay biến từ DepositTermsDoc (`amount`, `holdHours`). API không có min/max ⇒ luôn missing_params, CẤM đoán."""
    values: dict[str, str] = {}
    if terms:
        if isinstance(terms.get("amount"), int | float):
            values["holding_deposit"] = _vn(int(terms["amount"]))
        if isinstance(terms.get("holdHours"), int | float):
            values["hold_hours"] = str(int(terms["holdHours"]))
        for k, src in (("hold_hours_min", "holdHoursMin"), ("hold_hours_max", "holdHoursMax")):
            if isinstance(terms.get(src), int | float):
                values[k] = str(int(terms[src]))
    missing: list[str] = []

    def repl(m: re.Match) -> str:
        name = m.group(1)
        if name in values:
            return values[name]
        if name not in missing:
            missing.append(name)
        return m.group(0)

    return _VAR.sub(repl, body), missing


async def run(api: CoreApi, args: dict) -> dict:
    topic = args["topic"]
    found = load_topic(topic)
    if not found:
        return {"error": "not_found"}
    meta, body = found
    terms = None
    if _VAR.search(body):
        try:
            terms = await api.get("/legal/deposit-terms")
        except CoreApiError:
            terms = None
    text, missing = substitute(body, terms)
    out = {"topic": topic, "title": meta.get("title"), "markdown": text, "missing_params": missing}
    if missing:
        out["hint"] = "Thiếu tham số: nói mức cụ thể hiển thị ở bước đặt cọc, KHÔNG đoán số."
    return out
