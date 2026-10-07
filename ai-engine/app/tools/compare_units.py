import asyncio

from app.core_api import CoreApi
from app.tools._common import PROPERTIES, unit_detail, valid_code

NAME = "compare_units"
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": "So sánh 2-3 căn: chênh lệch giá thuê, diện tích, tầng, hướng, nội thất.",
        "parameters": {
            "type": "object",
            "properties": {"codes": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 3}},
            "required": ["codes"],
        },
    },
}


async def run(api: CoreApi, args: dict) -> dict:
    codes = list(dict.fromkeys(args["codes"]))[:3]
    if not all(valid_code(c) for c in codes):
        return {"error": "bad_code"}
    if len(codes) < 2:
        return {"error": "need_2_to_3_codes"}
    units = await asyncio.gather(*(api.get(f"{PROPERTIES}/units/{c}") for c in codes))
    rows = []
    for u in units:
        d = unit_detail(u)
        rows.append(
            {
                "code": d["code"],
                "rent": d["rent"],
                "allInEstimate": (d.get("rent") or 0)
                + (d.get("managementFee") or 0)
                + (d.get("parkingFeeEstimate") or 0)
                + (d.get("utilityCostEstimate") or 0),
                "area": d["area"],
                "floor": d["floor"],
                "direction": d["direction"],
                "bathrooms": d["bathrooms"],
                "furnishing": d["furnishing"],
                "furnitureItems": len(d["inventory"]) or len(d["items"]),
                "securityDeposit": d["securityDeposit"],
                "highlights": d["highlights"],
            }
        )
    return {"compare": rows}
