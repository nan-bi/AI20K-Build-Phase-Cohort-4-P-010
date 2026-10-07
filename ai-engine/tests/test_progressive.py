"""Fix6: tìm trước, thu hẹp sau — không cần ngân sách, limit=20, matchedCodes theo xếp hạng, assumed."""

import json

import httpx

from app.agent import run_turn
from app.core_api import CoreApi
from tests.conftest import RECS, FakeLLM, core_handler, text_round, tool_round

MSG = [{"role": "user", "content": "thích có bàn ghế"}]


def api_with_bodies(bodies: list, recs=None):
    base = core_handler()

    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.path.endswith("/matchmaker/recommend"):
            bodies.append(json.loads(req.content))
            return httpx.Response(200, json=recs or RECS)
        return base(req)

    return CoreApi(httpx.AsyncClient(transport=httpx.MockTransport(handler)), base_url="http://core/api/v1")


async def go(args: dict, reply="Gợi ý VHOP-S1.05-1203 nhé.", recs=None):
    bodies: list = []
    llm = FakeLLM([tool_round("search_units", json.dumps(args)), text_round(reply)])
    evs = [e async for e in run_turn(MSG, "vi", None, client=llm, api=api_with_bodies(bodies, recs))]
    tool = json.loads([m for m in llm.last_kwargs["messages"] if m["role"] == "tool"][0]["content"])
    return evs, bodies, tool


async def test_no_budget_still_searches_with_assumed():
    evs, bodies, tool = await go({"must_have": ["sofa"]})
    assert bodies and bodies[0]["maxAllInBudget"] == 30_000_000
    assert tool["assumed"] == {"occupants": 1, "motorbikes": 0, "cars": 0}
    assert tool["budgetAssumed"] == 30_000_000 and tool["matched"] == 1
    ev = next(e for e in evs if e["event"] == "units")["data"]
    assert ev["assumed"] == {"occupants": 1, "motorbikes": 0, "cars": 0}
    assert "max_all_in_budget" not in ev["criteria"]


async def test_assumed_only_missing_keys():
    _, bodies, tool = await go({"max_all_in_budget": 9_000_000, "occupants": 1, "motorbikes": 0})
    assert tool["assumed"] == {"cars": 0} and "budgetAssumed" not in tool
    assert bodies[0]["occupants"] == 1 and bodies[0]["maxAllInBudget"] == 9_000_000


async def test_all_given_no_assumed():
    evs, _, tool = await go({"max_all_in_budget": 9_000_000, "occupants": 1, "motorbikes": 0, "cars": 0})
    assert "assumed" not in tool
    assert "assumed" not in next(e for e in evs if e["event"] == "units")["data"]


async def test_recommend_gets_limit_20():
    _, bodies, _ = await go({"max_all_in_budget": 10_000_000})
    assert bodies and all(b["limit"] == 20 for b in bodies)


async def test_matched_codes_ranked_subset_and_internal_key_hidden():
    evs, _, tool = await go({"max_all_in_budget": 10_000_000}, reply="Mình thấy VHOP-S1.05-1203.")
    ev = next(e for e in evs if e["event"] == "units")["data"]
    assert ev["matchedCodes"] == ["VHOP-S1.02-0607", "VHOP-S1.05-1203"]  # thứ tự xếp hạng (cùng 12% ⇒ All-in thấp trước)
    assert ev["unitCodes"] == ["VHOP-S1.05-1203"] and ev["matched"] == tool["totalMatched"] == 2
    assert set(ev["matchedCodes"]) <= {u["code"] for u in tool["units"]} and len(ev["matchedCodes"]) <= 20
    assert "_matchedCodes" not in tool and tool["detailedCount"] == 2 and "căn khớp" in tool["note"]


async def test_matched_codes_capped_at_20_and_total_from_backend():
    many = [
        {"unitCode": f"VHOP-X-{i:04d}", "allInCost": {"allInTotal": 7_000_000 + i}, "comparison": {"savingPercentage": 10, "isBargain": True}}
        for i in range(30)
    ]
    recs = {"topRecommendations": many[:20], "scanSummary": {"totalMatched": 30}}
    evs, _, tool = await go({"max_all_in_budget": 30_000_000}, recs=recs)
    # list API giả chỉ có 2 căn ⇒ chỉ mã có dữ liệu mới vào kết quả; total lấy từ backend (>= số căn có dữ liệu)
    ev = next((e for e in evs if e["event"] == "units"), None)
    assert tool["matched"] >= len(tool["units"])
    assert ev is None or len(ev["data"].get("matchedCodes", [])) <= 20


async def test_units_event_when_bot_mentions_nothing():
    evs, _, _ = await go({"max_all_in_budget": 10_000_000}, reply="Có 2 căn khớp, bạn cho mình ngân sách nhé.")
    ev = next(e for e in evs if e["event"] == "units")["data"]
    assert ev["unitCodes"] == [] and len(ev["matchedCodes"]) == 2 and ev["mode"] == "search"


async def test_zero_match_keeps_near_miss():
    evs, _, tool = await go({"must_have": ["bồn tắm"]}, reply="Không có.")
    assert tool["matched"] == 0 and "nearMiss" in tool
    ev = next(e for e in evs if e["event"] == "units")["data"]
    assert ev["matched"] == 0 and "matchedCodes" not in ev

