import asyncio

from app.core_api import CoreApi
from app.tools._common import PROPERTIES, has_feature, unit_brief

NAME = "search_units"
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": "Tìm căn khớp (xếp hạng theo tiết kiệm/All-in; trả chi tiết tối đa 5 căn + tổng số căn khớp). Gọi NGAY khi khách nêu bất kỳ tiêu chí nào, không cần ngân sách (thiếu ⇒ dùng trần mặc định cao).",
        "parameters": {
            "type": "object",
            "properties": {
                "max_all_in_budget": {"type": "integer", "description": "Ngân sách trần All-in VNĐ/tháng"},
                "layout": {"type": "string", "enum": ["studio", "1pn", "2pn", "3pn"]},
                "occupants": {"type": "integer", "default": 1},
                "motorbikes": {"type": "integer", "default": 0},
                "cars": {"type": "integer", "default": 0},
                "furnishing": {"type": "string", "enum": ["full", "basic", "empty"]},
                "pet": {"type": "boolean"},
                "min_floor": {"type": "integer"},
                "max_floor": {"type": "integer"},
                "must_have": {"type": "array", "items": {"type": "string"}, "description": "Tiện nghi bắt buộc"},
            },
            "required": [],
        },
    },
}

# layout -> (nhãn /properties/units, enum LayoutType gửi matchmaker)
_LAYOUTS = {
    "studio": ("Studio", ["STUDIO"]),
    "1pn": ("1PN", ["ONE_BED_PLUS"]),
    "2pn": ("2PN", ["TWO_BED_ONE_BATH", "TWO_BED_TWO_BATH"]),
    "3pn": ("3PN", ["THREE_BED"]),
}
MIN_BUDGET = 3_000_000  # MatchmakerRequestDto @Min(3000000)
DEFAULT_BUDGET = 30_000_000  # khách chưa nói ngân sách ⇒ trần cao để matchmaker xếp hạng theo All-in/tiết kiệm
# Giả định TỐI THIỂU khi khách chưa nói: không loại oan căn dưới ngân sách; bot nói rõ và nhắc mỗi người/xe thêm sẽ cộng phí.
DEFAULTS = {"occupants": 1, "motorbikes": 0, "cars": 0}
RECOMMEND_LIMIT = 20  # số căn xin matchmaker (matchedCodes ≤ 20)
DETAIL_MAX = 5  # số căn trả chi tiết cho LLM


async def run(api: CoreApi, args: dict) -> dict:
    no_budget = args.get("max_all_in_budget") is None
    budget = DEFAULT_BUDGET if no_budget else int(args["max_all_in_budget"])
    if budget < MIN_BUDGET:
        return {"units": [], "reason": "budget_below_minimum", "minimumBudget": MIN_BUDGET}
    assumed = {k: v for k, v in DEFAULTS.items() if args.get(k) is None}
    occupants = int(args.get("occupants") if args.get("occupants") is not None else DEFAULTS["occupants"])
    motorbikes = int(args.get("motorbikes") if args.get("motorbikes") is not None else DEFAULTS["motorbikes"])
    cars = int(args.get("cars") if args.get("cars") is not None else DEFAULTS["cars"])
    layout = args.get("layout")
    label, enums = _LAYOUTS.get(layout, (None, [None]))

    base = {"maxAllInBudget": budget, "motorbikes": motorbikes, "cars": cars, "occupants": occupants}
    recommend_base = {**base, "limit": RECOMMEND_LIMIT}
    bodies = [{**recommend_base, **({"preferredLayout": e} if e else {})} for e in enums]
    params = {"motorbikes": motorbikes, "cars": cars, "occupants": occupants}
    if label:
        params["layout"] = label
    recs_raw, units = await asyncio.gather(
        asyncio.gather(*(api.post("/matchmaker/recommend", b) for b in bodies)),
        api.get(f"{PROPERTIES}/units", params),
    )
    recs = [r for res in recs_raw for r in res.get("topRecommendations", [])]
    # thứ tự xếp hạng của matchmaker: tiết kiệm % giảm dần, rồi All-in tăng dần (sort ổn định ⇒ giữ thứ tự khi 1 layout)
    recs.sort(key=lambda r: (-r["comparison"]["savingPercentage"], r["allInCost"]["allInTotal"]))
    backend_total = sum(res.get("scanSummary", {}).get("totalMatched", len(res.get("topRecommendations", []))) for res in recs_raw)
    post_filtered = any(args.get(k) is not None for k in ("furnishing", "pet", "min_floor", "max_floor")) or bool(
        [m for m in args.get("must_have") or [] if m]
    )
    by_code = {u["code"]: u for u in units}

    cands = []
    for r in recs:
        u = by_code.get(r["unitCode"])
        if not u:
            continue
        if args.get("furnishing") and u.get("furnishing") != args["furnishing"]:
            continue
        if args.get("pet") and not u.get("petFriendly"):
            continue
        if args.get("min_floor") is not None and u.get("floor", 0) < args["min_floor"]:
            continue
        if args.get("max_floor") is not None and u.get("floor", 0) > args["max_floor"]:
            continue
        cands.append((u, r))
    cands = cands[:RECOMMEND_LIMIT]
    must = [m for m in args.get("must_have") or [] if m]

    # List API chỉ trả bản rút gọn (inventory rỗng) ⇒ tải chi tiết để bot có nội thất ngay ở lượt tìm.
    # Có must_have ⇒ cần chi tiết cả 20 ứng viên để lọc; không ⇒ chỉ 5 căn đầu. Lỗi ⇒ giữ bản rút gọn (không hỏng lượt tìm).
    need = cands if must else cands[:DETAIL_MAX]
    raw = await asyncio.gather(*(api.get(f"{PROPERTIES}/units/{u['code']}") for u, _ in need), return_exceptions=True)
    detailed = [((d if isinstance(d, dict) and d.get("code") else u), r) for d, (u, r) in zip(raw, need, strict=True)]
    cands = detailed + cands[len(need) :]
    if must:
        cands = [(u, r) for u, r in cands if all(has_feature(u, m) for m in must)]
    # Tổng khớp: không lọc thêm ⇒ số của matchmaker (đủ, kể cả >20); có lọc thêm ⇒ đếm trong tối đa 20 ứng viên.
    total = len(cands) if post_filtered else max(backend_total, len(cands))

    out = {
        "units": [unit_brief(u, r) for u, r in cands[:DETAIL_MAX]],
        "scanned": len(units),
        "matched": total,
        "totalMatched": total,
        "detailedCount": min(len(cands), DETAIL_MAX),  # số căn có chi tiết trong `units`; KHÔNG phải tổng số căn khớp
        "note": f"Tổng {total} căn khớp; `units` chỉ liệt kê {min(len(cands), DETAIL_MAX)} căn đầu theo xếp hạng.",
        "budget": budget,
        "_matchedCodes": [u["code"] for u, _ in cands],  # nội bộ: agent bỏ khoá này trước khi đưa cho LLM
    }
    if no_budget:
        out["budgetAssumed"] = DEFAULT_BUDGET  # khách chưa nói ngân sách: chưa lọc theo trần thật
    if assumed:
        out["assumed"] = assumed
    if not cands:
        out["nearMiss"] = await _near_miss(api, base, enums, by_code, args)
    return out


NEAR_MISS_FACTOR = 1.25  # nới trần 25% để tìm căn "gần ngân sách" khi không có căn nào khớp
NEAR_MISS_MAX = 3


async def _near_miss(api: CoreApi, base: dict, enums: list, by_code: dict, args: dict) -> list[dict]:
    """Không căn nào khớp trần ngân sách: trả tối đa 3 căn rẻ nhất VƯỢT ngân sách, kèm số tiền vượt (để bot đề xuất nới)."""
    widened = {**base, "maxAllInBudget": int(base["maxAllInBudget"] * NEAR_MISS_FACTOR)}
    bodies = [{**widened, **({"preferredLayout": e} if e else {})} for e in enums]
    try:
        raw = await asyncio.gather(*(api.post("/matchmaker/recommend", b) for b in bodies))
    except Exception:  # noqa: BLE001 — near-miss chỉ là gợi ý phụ, lỗi thì bỏ qua
        return []
    recs = sorted(
        (r for res in raw for r in res.get("topRecommendations", [])), key=lambda r: r["allInCost"]["allInTotal"]
    )
    out = []
    for r in recs:
        u = by_code.get(r["unitCode"])
        if not u:
            continue
        if args.get("furnishing") and u.get("furnishing") != args["furnishing"]:
            continue
        if args.get("pet") and not u.get("petFriendly"):
            continue
        brief = unit_brief(u, r)
        brief["overBudgetBy"] = r["allInCost"]["allInTotal"] - base["maxAllInBudget"]
        out.append(brief)
        if len(out) >= NEAR_MISS_MAX:
            break
    return out
