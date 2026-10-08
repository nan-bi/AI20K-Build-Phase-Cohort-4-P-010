"""Backend Nest bọc response thành {success, statusCode, data}; CoreApi phải bóc lớp này (lỗi live 2026-10-07)."""

import httpx
import pytest

from app.core_api import CoreApi, unwrap
from app.tools import search_units


def _api(handler) -> CoreApi:
    return CoreApi(client=httpx.AsyncClient(transport=httpx.MockTransport(handler)), base_url="http://core/api/v1")


def test_unwrap_only_nest_envelope():
    assert unwrap({"success": True, "statusCode": 200, "data": [1]}) == [1]
    assert unwrap({"data": [1]}) == {"data": [1]}  # không có success/statusCode => giữ nguyên
    assert unwrap([1, 2]) == [1, 2]


@pytest.mark.asyncio
async def test_search_units_reads_enveloped_responses():
    unit = {"code": "VHOP-S1.02-0607", "layout": "1PN", "layoutLabel": "1PN", "floor": 6, "status": "available",
            "rent": 5_000_000, "furnishing": "full", "petFriendly": False}
    rec = {"unitCode": "VHOP-S1.02-0607", "allInCost": {"baseRent": 5_000_000, "managementFee": 446_500,
           "parkingFee": 0, "utilityCost": 300_000, "allInTotal": 5_746_500},
           "comparison": {"savingPercentage": 30, "isBargain": True}}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/matchmaker/recommend"):
            return httpx.Response(201, json={"success": True, "statusCode": 201, "data": {"topRecommendations": [rec]}})
        return httpx.Response(200, json={"success": True, "statusCode": 200, "data": [unit]})

    out = await search_units.run(_api(handler), {"max_all_in_budget": 6_000_000, "occupants": 1, "motorbikes": 0})
    assert out["matched"] == 1 and out["units"][0]["code"] == "VHOP-S1.02-0607"


@pytest.mark.asyncio
async def test_search_units_near_miss_when_nothing_in_budget():
    unit = {"code": "VHOP-X-1", "layoutLabel": "Studio", "floor": 3, "status": "available", "rent": 6_000_000}
    rec = {"unitCode": "VHOP-X-1", "allInCost": {"baseRent": 6_000_000, "managementFee": 400_000, "parkingFee": 0,
           "utilityCost": 300_000, "allInTotal": 6_700_000}, "comparison": {"savingPercentage": 5, "isBargain": False}}
    seen: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/matchmaker/recommend"):
            import json as _j
            budget = _j.loads(request.content)["maxAllInBudget"]
            seen.append(budget)
            recs = [rec] if budget >= 6_700_000 else []
            return httpx.Response(201, json={"success": True, "statusCode": 201, "data": {"topRecommendations": recs}})
        return httpx.Response(200, json={"success": True, "statusCode": 200, "data": [unit]})

    out = await search_units.run(_api(handler), {"max_all_in_budget": 6_000_000, "occupants": 1, "motorbikes": 0})
    assert out["matched"] == 0 and out["units"] == []
    assert out["nearMiss"][0]["code"] == "VHOP-X-1" and out["nearMiss"][0]["overBudgetBy"] == 700_000
    assert seen == [6_000_000, 7_500_000]


def test_unit_detail_flags_unknown_furnishing_detail():
    from app.tools._common import unit_detail

    bare = {"code": "VHOP-S1.02-0607", "furnishing": "full", "items": [], "inventory": []}
    rich = {**bare, "inventory": [{"groupLabel": "Phòng khách", "name": "Sofa", "qty": 1}]}
    assert unit_detail(bare)["furnishingDetail"] == "unknown"
    assert unit_detail(rich)["furnishingDetail"] == "known"


def test_inventory_exposes_condition_pct_and_code():
    from app.tools._common import unit_detail

    unit = {"code": "VHOP-S1.02-0607", "inventory": [
        {"code": "1", "groupLabel": "Phòng khách", "name": "Bộ ghế Sofa", "qty": 1, "spec": "Da, màu xám", "conditionPct": 90},
        {"code": "8", "groupLabel": "Bếp", "name": "Tủ lạnh", "qty": 1},
    ]}
    inv = unit_detail(unit)["inventory"]
    assert inv[0]["conditionPct"] == 90 and inv[0]["code"] == "1"
    assert inv[1]["conditionPct"] is None


@pytest.mark.asyncio
async def test_search_units_includes_furniture_summary_from_detail():
    list_unit = {"code": "VHOP-S1.02-0607", "layoutLabel": "1PN", "floor": 6, "status": "available", "rent": 5_000_000, "inventory": []}
    detail = {**list_unit, "inventory": [
        {"name": "Bộ ghế Sofa", "qty": 1, "conditionPct": 90},
        {"name": "Máy giặt", "qty": 1, "conditionPct": 60},
        {"name": "Rèm cửa", "qty": 2, "conditionPct": 30},
    ]}
    rec = {"unitCode": "VHOP-S1.02-0607", "allInCost": {"baseRent": 5_000_000, "managementFee": 446_500, "parkingFee": 0,
           "utilityCost": 300_000, "allInTotal": 5_746_500}, "comparison": {"savingPercentage": 30, "isBargain": True}}

    def handler(request: httpx.Request) -> httpx.Response:
        p = request.url.path
        if p.endswith("/matchmaker/recommend"):
            return httpx.Response(201, json={"success": True, "statusCode": 201, "data": {"topRecommendations": [rec]}})
        if p.endswith("/units/VHOP-S1.02-0607"):
            return httpx.Response(200, json={"success": True, "statusCode": 200, "data": detail})
        return httpx.Response(200, json={"success": True, "statusCode": 200, "data": [list_unit]})

    out = await search_units.run(_api(handler), {"max_all_in_budget": 6_000_000, "occupants": 1, "motorbikes": 0})
    f = out["units"][0]["furniture"]
    assert f["itemCount"] == 3 and f["avgConditionPct"] == 60
    assert f["main"][0]["name"] == "Bộ ghế Sofa"  # món chính xếp trước


@pytest.mark.asyncio
async def test_search_units_survives_detail_failure():
    unit = {"code": "VHOP-S1.02-0607", "layoutLabel": "1PN", "floor": 6, "status": "available", "rent": 5_000_000}
    rec = {"unitCode": "VHOP-S1.02-0607", "allInCost": {"baseRent": 5_000_000, "managementFee": 446_500, "parkingFee": 0,
           "utilityCost": 300_000, "allInTotal": 5_746_500}, "comparison": {"savingPercentage": 30, "isBargain": True}}

    def handler(request: httpx.Request) -> httpx.Response:
        p = request.url.path
        if p.endswith("/matchmaker/recommend"):
            return httpx.Response(201, json={"success": True, "statusCode": 201, "data": {"topRecommendations": [rec]}})
        if p.endswith("/units/VHOP-S1.02-0607"):
            return httpx.Response(500)
        return httpx.Response(200, json={"success": True, "statusCode": 200, "data": [unit]})

    out = await search_units.run(_api(handler), {"max_all_in_budget": 6_000_000})
    assert out["matched"] == 1 and "furniture" not in out["units"][0]
