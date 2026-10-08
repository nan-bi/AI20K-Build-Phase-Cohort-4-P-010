import json
from typing import Any

from app.core_api import CoreApi, CoreApiError
from app.tools import busy_slots, compare_units, get_unit, lookup_policy, search_units

_MODULES = [search_units, get_unit, compare_units, busy_slots, lookup_policy]
TOOL_SCHEMAS = [m.SCHEMA for m in _MODULES]
_RUNNERS = {m.NAME: m.run for m in _MODULES}


def collect_codes(result: Any) -> set[str]:
    """Mã căn xuất hiện trong kết quả tool (khoá `code`) — tập hợp cho phép của event `units` (B3)."""
    found: set[str] = set()
    if isinstance(result, dict):
        for k, v in result.items():
            if k == "code" and isinstance(v, str):
                found.add(v)
            else:
                found |= collect_codes(v)
    elif isinstance(result, list):
        for v in result:
            found |= collect_codes(v)
    return found


async def execute(api: CoreApi, name: str, raw_args: str) -> tuple[dict, bool]:
    """Chạy 1 tool. Trả (kết quả cho LLM, có_lỗi_hạ_tầng). Lỗi 5xx/timeout ⇒ {"error":"unavailable"}, 404 ⇒ not_found."""
    runner = _RUNNERS.get(name)
    if runner is None:
        return {"error": "unknown_tool"}, False
    try:
        args = json.loads(raw_args or "{}")
        if not isinstance(args, dict):
            raise ValueError
    except ValueError:
        return {"error": "bad_arguments"}, False
    try:
        return await runner(api, args), False
    except CoreApiError as e:
        if e.kind == "not_found":
            return {"error": "not_found"}, False
        return {"error": "unavailable"}, True
    except (KeyError, TypeError, ValueError):
        return {"error": "bad_arguments"}, False
