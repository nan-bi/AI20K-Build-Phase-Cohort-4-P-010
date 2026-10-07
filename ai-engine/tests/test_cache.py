"""CoreApi: cache TTL ngắn khi dùng client mặc định (production); client được tiêm (test) thì không cache."""

import httpx
import pytest

from app import core_api
from app.core_api import CoreApi


@pytest.fixture(autouse=True)
def _clean():
    core_api.clear_cache()
    yield
    core_api.clear_cache()


def _counting_client():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(200, json={"success": True, "statusCode": 200, "data": [1, 2, 3]})

    return httpx.AsyncClient(transport=httpx.MockTransport(handler)), calls


@pytest.mark.asyncio
async def test_injected_client_never_cached():
    client, calls = _counting_client()
    api = CoreApi(client=client, base_url="http://core")
    await api.get("/properties/units", {"a": 1})
    await api.get("/properties/units", {"a": 1})
    assert calls["n"] == 2


@pytest.mark.asyncio
async def test_default_client_caches_reads_and_recommend_only(monkeypatch):
    client, calls = _counting_client()
    monkeypatch.setattr(core_api.httpx, "AsyncClient", lambda **kw: client)
    api = CoreApi(base_url="http://core")
    await api.get("/properties/units", {"a": 1})
    await api.get("/properties/units", {"a": 1})
    assert calls["n"] == 1
    await api.get("/properties/units", {"a": 2})
    assert calls["n"] == 2
    await api.post("/matchmaker/recommend", {"maxAllInBudget": 6_000_000})
    await api.post("/matchmaker/recommend", {"maxAllInBudget": 6_000_000})
    assert calls["n"] == 3
    await api.post("/bookings", {"x": 1})
    await api.post("/bookings", {"x": 1})
    assert calls["n"] == 5  # POST ghi không bao giờ cache


@pytest.mark.asyncio
async def test_cache_expires(monkeypatch):
    client, calls = _counting_client()
    monkeypatch.setattr(core_api.httpx, "AsyncClient", lambda **kw: client)
    api = CoreApi(base_url="http://core")
    t = {"v": 1000.0}
    monkeypatch.setattr(core_api.time, "monotonic", lambda: t["v"])
    await api.get("/properties/units")
    t["v"] += core_api.CACHE_TTL_S + 1
    await api.get("/properties/units")
    assert calls["n"] == 2
