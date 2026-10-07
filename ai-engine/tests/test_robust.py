"""F10 (mã căn do LLM sinh) + F11 (/health) + F14 (A6 quét thêm đơn vị)."""

import json

import httpx
import pytest

from app.agent import run_turn
from app.core_api import CoreApi, CoreApiError
from app.tools import busy_slots, compare_units, get_unit
from tests.conftest import FakeLLM, make_api, text_round, tool_round

BAD = ["../../legal/deposit-terms", "VHOP\x00X", "a/b", "ab", "", "x" * 41, "VHOP S1", "../x"]


@pytest.mark.parametrize("code", BAD)
async def test_bad_code_rejected_without_http(code):
    calls: list = []
    api = make_api(calls=calls)
    assert await get_unit.run(api, {"code": code}) == {"error": "bad_code"}
    assert await busy_slots.run(api, {"code": code, "date": "2026-10-12"}) == {"error": "bad_code"}
    assert await compare_units.run(api, {"codes": [code, "VHOP-S1.02-0607"]}) == {"error": "bad_code"}
    assert calls == []


async def test_good_code_still_ok():
    res = await get_unit.run(make_api(), {"code": "VHOP-S1.02-0607"})
    assert res["unit"]["code"] == "VHOP-S1.02-0607"


async def test_invalid_url_becomes_core_api_error():
    api = CoreApi(httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, json={}))), base_url="http://core")
    with pytest.raises(CoreApiError):
        await api.get("/properties/units/bad\x00code")


async def test_llm_nul_code_ends_with_done_not_silence(api):
    llm = FakeLLM([tool_round("get_unit", json.dumps({"code": "VHOP\u0000X"})), text_round("Mã căn không hợp lệ.")])
    evs = [e async for e in run_turn([{"role": "user", "content": "x"}], "vi", None, client=llm, api=api)]
    assert evs[-1]["event"] in ("done", "error")


async def test_unexpected_exception_still_emits_error(api, monkeypatch):
    import app.agent as agent

    async def boom(*a, **k):
        raise RuntimeError("bất ngờ")

    monkeypatch.setattr(agent, "execute", boom)
    llm = FakeLLM([tool_round("get_unit", json.dumps({"code": "VHOP-S1.02-0607"}))])
    evs = [e async for e in run_turn([{"role": "user", "content": "x"}], "vi", None, client=llm, api=api)]
    assert evs[-1]["event"] == "error"


async def test_health_ok_false_without_key_true_with_key(monkeypatch):
    from app.config import get_settings
    from app.main import app

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        monkeypatch.setattr(get_settings(), "openrouter_api_key", "")
        assert (await c.get("/health")).json()["ok"] is False
        monkeypatch.setattr(get_settings(), "openrouter_api_key", "k")
        assert (await c.get("/health")).json()["ok"] is True
