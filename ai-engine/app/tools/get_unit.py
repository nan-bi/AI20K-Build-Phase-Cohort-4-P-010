from app.core_api import CoreApi
from app.tools._common import PROPERTIES, unit_detail, valid_code

NAME = "get_unit"
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": "Chi tiết 1 căn: nội thất, cọc bảo đảm, cọc giữ chỗ, giờ giữ chỗ, mô tả.",
        "parameters": {
            "type": "object",
            "properties": {"code": {"type": "string", "description": "Mã căn, vd VHOP-S1.02-0607"}},
            "required": ["code"],
        },
    },
}


async def run(api: CoreApi, args: dict) -> dict:
    if not valid_code(args.get("code")):
        return {"error": "bad_code"}
    unit = await api.get(f"{PROPERTIES}/units/{args['code']}")
    return {"unit": unit_detail(unit)}
