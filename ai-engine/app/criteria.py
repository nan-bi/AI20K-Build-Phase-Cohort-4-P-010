"""Tiêu chí tìm căn (search_units) — dùng chung cho event `units.criteria` và request `searchContext`."""

import json
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

CRITERIA_KEYS = (
    "max_all_in_budget",
    "occupants",
    "motorbikes",
    "cars",
    "layout",
    "furnishing",
    "pet",
    "min_floor",
    "max_floor",
    "must_have",
)


class SearchContext(BaseModel):
    """Giới hạn kiểu/độ lớn do client gửi lên; khoá lạ bị bỏ qua."""

    model_config = ConfigDict(extra="ignore")

    max_all_in_budget: int | None = Field(default=None, ge=0, le=1_000_000_000)
    occupants: int | None = Field(default=None, ge=0, le=20)
    motorbikes: int | None = Field(default=None, ge=0, le=10)
    cars: int | None = Field(default=None, ge=0, le=10)
    layout: Literal["studio", "1pn", "2pn", "3pn"] | None = None
    furnishing: Literal["full", "basic", "empty"] | None = None
    pet: bool | None = None
    min_floor: int | None = Field(default=None, ge=0, le=100)
    max_floor: int | None = Field(default=None, ge=0, le=100)
    must_have: list[Annotated[str, StringConstraints(min_length=1, max_length=40)]] | None = Field(
        default=None, max_length=5
    )


def criteria_from_args(args: dict) -> dict[str, Any]:
    """Tiêu chí của 1 lần gọi search_units: chỉ các khoá cho phép, bỏ None / sai kiểu."""
    out: dict[str, Any] = {}
    for k in CRITERIA_KEYS:
        v = args.get(k)
        if v is None:
            continue
        if k in ("pet",):
            if isinstance(v, bool):
                out[k] = v
        elif k == "must_have":
            if isinstance(v, list):
                items = [str(x).strip()[:40] for x in v if isinstance(x, str) and x.strip()][:5]
                if items:
                    out[k] = items
        elif k in ("layout", "furnishing"):
            if isinstance(v, str):
                out[k] = v
        elif isinstance(v, int) and not isinstance(v, bool):
            out[k] = v
    return out


def criteria_prompt(ctx: dict[str, Any]) -> str:
    return (
        "\nTiêu chí tìm đang áp dụng cho khách: "
        + json.dumps(ctx, ensure_ascii=False)
        + ". Khi khách thêm hoặc đổi điều kiện (vd 'thích căn có bàn ghế', 'tầng cao', 'cho nuôi mèo'), "
        "HỢP NHẤT với tiêu chí này rồi gọi search_units NGAY — KHÔNG hỏi lại điều đã có. "
        "Khi khách bỏ điều kiện thì bỏ nó khỏi tiêu chí."
    )
