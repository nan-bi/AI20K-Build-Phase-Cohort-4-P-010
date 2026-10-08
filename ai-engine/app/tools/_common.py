"""Rút gọn dữ liệu căn trả về cho LLM. Chỉ dùng trường API công khai (B6: không condition/compensation/ảnh bằng chứng)."""

import re
import unicodedata
from typing import Any

PROPERTIES = "/properties"
UNTRUSTED_OPEN = "<untrusted_listing_text>"
UNTRUSTED_CLOSE = "</untrusted_listing_text>"
CODE_RE = re.compile(r"[A-Za-z0-9._-]{3,40}")


def valid_code(code: Any) -> bool:
    """Mã căn do LLM sinh: chỉ ký tự an toàn, chặn `..`/`/`/NUL trước khi ghép URL (F10)."""
    return isinstance(code, str) and CODE_RE.fullmatch(code) is not None and ".." not in code


def untrusted(text: Any, limit: int | None = None) -> str | None:
    """Bọc text do chủ nhà/Inspector nhập: là DỮ LIỆU, không phải lệnh. Cắt `limit` ký tự; chặn giả thẻ đóng."""
    if text is None or str(text).strip() == "":
        return None
    t = str(text).replace(UNTRUSTED_CLOSE, "").replace(UNTRUSTED_OPEN, "")
    if limit:
        t = t[:limit]
    return f"{UNTRUSTED_OPEN}{t}{UNTRUSTED_CLOSE}"


def _inventory(unit: dict) -> list[dict]:
    out = []
    for line in unit.get("inventory") or []:
        out.append(
            {
                "code": line.get("code"),
                "group": line.get("groupLabel") or line.get("group"),
                "name": line.get("name"),
                "qty": line.get("qty", 1),
                "spec": untrusted(line.get("spec"), 80),
                "conditionPct": line.get("conditionPct"),  # độ mới % (ước lượng của Host kiểm định)
            }
        )
    return out


_PRIORITY = ("sofa", "giường", "tủ lạnh", "máy giặt", "điều hòa", "tivi", "bếp", "tủ quần áo", "bàn", "nóng lạnh")


def furniture_summary(unit: dict) -> dict[str, Any] | None:
    """Tóm tắt nội thất cho lượt TÌM (list API không có inventory): số món, độ mới TB, các món chính kèm độ mới."""
    inv = [i for i in unit.get("inventory") or [] if i.get("name")]
    if not inv:
        return None
    conds = [i["conditionPct"] for i in inv if isinstance(i.get("conditionPct"), (int, float))]

    def rank(i: dict) -> int:
        n = str(i["name"]).lower()
        return next((k for k, w in enumerate(_PRIORITY) if w in n), len(_PRIORITY))

    top = sorted(inv, key=rank)[:6]
    return {
        "itemCount": len(inv),
        "avgConditionPct": round(sum(conds) / len(conds)) if conds else None,
        "main": [{"name": i["name"], "qty": i.get("qty", 1), "conditionPct": i.get("conditionPct")} for i in top],
    }


def unit_brief(unit: dict, rec: dict | None = None) -> dict[str, Any]:
    """Tóm tắt 1 căn. `rec` = phần tử topRecommendations của /matchmaker/recommend (All-in + tiết kiệm)."""
    brief: dict[str, Any] = {
        "code": unit.get("code"),
        "layoutLabel": unit.get("layoutLabel") or unit.get("layout"),
        "area": unit.get("areaM2"),
        "building": unit.get("building"),
        "zone": unit.get("zoneName"),
        "floor": unit.get("floor"),
        "bathrooms": unit.get("bathrooms"),
        "direction": unit.get("direction"),
        "view": unit.get("view"),
        "furnishing": unit.get("furnishing"),
        "highlights": [h for h in (untrusted(x, 120) for x in unit.get("highlights") or []) if h],
        "petFriendly": unit.get("petFriendly"),
        "minMonths": unit.get("minMonths"),
        "rent": unit.get("rent"),
        "status": unit.get("status"),
    }
    fs = furniture_summary(unit)
    if fs:
        brief["furniture"] = fs
    if rec:
        brief["allInTotal"] = rec["allInCost"]["allInTotal"]
        brief["breakdown"] = rec["allInCost"]
        brief["savingPct"] = rec["comparison"]["savingPercentage"]
        brief["isBargain"] = rec["comparison"]["isBargain"]
    return brief


def unit_detail(unit: dict) -> dict[str, Any]:
    d = unit_brief(unit)
    d.update(
        {
            "items": unit.get("items") or [],
            "inventory": _inventory(unit),
            # Chưa có danh mục từng món ⇒ chỉ có mức nội thất chung; bot KHÔNG được suy diễn món cụ thể hay "hợp hơn" từ đó.
            "furnishingDetail": "known" if (unit.get("inventory") or unit.get("items")) else "unknown",
            "securityDeposit": unit.get("securityDeposit"),
            "holdingDeposit": unit.get("holdingDeposit"),
            "holdHours": unit.get("holdHours"),
            "managementFee": unit.get("managementFee"),
            "parkingFeeEstimate": unit.get("parkingFeeEstimate"),
            "utilityCostEstimate": unit.get("utilityCostEstimate"),
        }
    )
    return d


def _fold(text: Any) -> str:
    """Hạ chữ thường + bỏ dấu tiếng Việt (đ -> d) để khớp có dấu/không dấu."""
    t = unicodedata.normalize("NFD", str(text).lower().replace("đ", "d"))
    return "".join(c for c in t if unicodedata.category(c) != "Mn").strip()


# Từ khoá khách hay nói (đã fold) -> các cách gọi tên món thật trong inventory (catalog Inspector) / items
_SYNONYMS: dict[str, tuple[str, ...]] = {
    "ban ghe": ("ban ghe", "sofa", "ghe", "ban tra", "ban an", "ban lam viec"),
    "ghe": ("ghe", "sofa"),
    "sofa": ("sofa", "ghe"),
    "ban an": ("ban an", "ban ghe an"),
    "ban lam viec": ("ban lam viec", "ban hoc", "ban lam"),
    "tu lanh": ("tu lanh",),
    "may giat": ("may giat",),
    "dieu hoa": ("dieu hoa", "may lanh", "may dieu hoa"),
    "may lanh": ("may lanh", "dieu hoa"),
    "tivi": ("tivi", "tv", "smart box"),
    "tv": ("tv", "tivi"),
    "bep": ("bep",),
    "giuong": ("giuong", "dem", "nem"),
    "tu quan ao": ("tu quan ao", "tu ao"),
    "tu ao": ("tu ao", "tu quan ao"),
    "nong lanh": ("nong lanh", "binh nuoc nong", "binh nong lanh"),
    "binh nong lanh": ("binh nong lanh", "nong lanh", "binh nuoc nong"),
    "rem": ("rem",),
    "may giat say": ("may giat", "may say"),
}


def has_feature(unit: dict, needle: str) -> bool:
    n = _fold(needle)
    if not n:
        return True
    alts = {n, *_SYNONYMS.get(n, ())}
    hay = [_fold(i) for i in unit.get("items") or []]
    hay += [_fold(i.get("name", "")) for i in unit.get("inventory") or []]
    return any(a in h for a in alts for h in hay)
