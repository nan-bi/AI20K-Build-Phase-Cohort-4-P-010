import json

import httpx
import pytest

from app.agent import run_turn
from app.main import app
from app.tools._common import has_feature
from tests.conftest import FakeLLM, make_api, text_round, tool_round

MSG = [{"role": "user", "content": "thích căn có bàn ghế"}]
CTX = {"max_all_in_budget": 6_000_000, "occupants": 1, "motorbikes": 0, "cars": 0}


async def run(llm, ctx=None):
    return [e async for e in run_turn(MSG, "vi", None, client=llm, api=make_api(), search_context=ctx)]


def test_has_feature_ban_ghe_synonyms():
    with_sofa = {"inventory": [{"name": "Bộ ghế Sofa"}]}
    dining = {"inventory": [{"name": "Bộ bàn ghế ăn"}]}
    assert has_feature(with_sofa, "bàn ghế")
    assert has_feature(with_sofa, "ban ghe")
    assert has_feature(dining, "Bàn Ghế")
    assert not has_feature({"inventory": []}, "bàn ghế")
    assert not has_feature({"inventory": [{"name": "Tủ lạnh"}]}, "bàn ghế")


def test_has_feature_other_synonyms():
    assert has_feature({"inventory": [{"name": "Điều hòa không khí Phòng ngủ"}]}, "máy lạnh")
    assert has_feature({"inventory": [{"name": "Tivi thông minh & Smart Box"}]}, "tv")
    assert has_feature({"inventory": [{"name": "Bình nước nóng lạnh"}]}, "nóng lạnh")
    assert has_feature({"items": ["Máy giặt"]}, "may giat")
    assert not has_feature({"items": ["Máy giặt"]}, "tủ lạnh")


async def test_criteria_in_units_event():
    args = {"max_all_in_budget": 10_000_000, "occupants": 1, "pet": None, "must_have": ["sofa"], "evil": 1}
    llm = FakeLLM([tool_round("search_units", json.dumps(args)), text_round("Gợi ý VHOP-S1.02-0607 nhé.")])
    ev = next(e for e in await run(llm) if e["event"] == "units")["data"]
    assert ev["mode"] == "search" and ev["unitCodes"] == ["VHOP-S1.02-0607"]
    assert ev["criteria"] == {"max_all_in_budget": 10_000_000, "occupants": 1, "must_have": ["sofa"]}
    assert ev["matched"] >= 1


async def test_zero_match_emits_empty_units_with_criteria():
    args = {"max_all_in_budget": 10_000_000, "must_have": ["bồn tắm"]}
    llm = FakeLLM([tool_round("search_units", json.dumps(args)), text_round("Không có; gần nhất VHOP-S1.02-0607.")])
    evs = await run(llm)
    ev = next(e for e in evs if e["event"] == "units")["data"]
    assert ev == {"unitCodes": [], "mode": "search", "matched": 0, "criteria": args}
    assert evs[-1]["event"] == "done"


async def test_no_search_no_criteria():
    llm = FakeLLM([tool_round("get_unit", json.dumps({"code": "VHOP-S1.02-0607"})), text_round("Căn VHOP-S1.02-0607 ok.")])
    ev = next(e for e in await run(llm) if e["event"] == "units")["data"]
    assert ev["mode"] == "focus" and "criteria" not in ev


async def test_search_context_in_system_prompt():
    llm = FakeLLM([text_round("ok")])
    await run(llm, CTX)
    sys = llm.last_kwargs["messages"][0]["content"]
    assert "Tiêu chí tìm đang áp dụng" in sys and '"max_all_in_budget": 6000000' in sys and "KHÔNG hỏi lại" in sys
    llm2 = FakeLLM([text_round("ok")])
    await run(llm2, None)
    assert "Tiêu chí tìm đang áp dụng cho khách" not in llm2.last_kwargs["messages"][0]["content"]


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c


BODY = {"messages": [{"role": "user", "content": "xin chào"}]}
H = {"X-Internal-Key": "test-internal"}


async def test_http_search_context_validation(client, monkeypatch):
    import app.main as m

    seen = {}

    async def fake_run(messages, locale, user, search_context=None):
        seen["ctx"] = search_context
        yield {"event": "done", "data": {"model": "x", "toolCalls": 0, "ms": 1}}

    monkeypatch.setattr(m, "run_turn", fake_run)
    ok = {**BODY, "searchContext": {**CTX, "must_have": ["bàn ghế"], "zzz": 1}}
    r = await client.post("/chat", json=ok, headers=H)
    assert r.status_code == 200 and seen["ctx"] == {**CTX, "must_have": ["bàn ghế"]}
    for bad in (
        {"occupants": -1},
        {"occupants": "abc"},
        {"must_have": ["a"] * 6},
        {"must_have": ["x" * 41]},
        {"layout": "5pn"},
        {"max_all_in_budget": 10**12},
    ):
        r = await client.post("/chat", json={**BODY, "searchContext": bad}, headers=H)
        assert r.status_code == 422, bad
    r = await client.post("/chat", json=BODY, headers=H)
    assert r.status_code == 200 and seen["ctx"] is None
