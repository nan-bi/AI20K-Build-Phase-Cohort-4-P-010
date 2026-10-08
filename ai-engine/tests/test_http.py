import httpx
import pytest

from app.main import app

BODY = {"messages": [{"role": "user", "content": "xin chào"}], "locale": "vi"}


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c


@pytest.mark.parametrize("headers", [{}, {"X-Internal-Key": "wrong"}, {"X-Internal-Key": ""}])
async def test_a7_chat_requires_key(client, headers):
    r = await client.post("/chat", json=BODY, headers=headers)
    assert r.status_code == 401


async def test_health_open(client):
    r = await client.get("/health")  # không cần key nội bộ; test env không có OPENROUTER_API_KEY ⇒ ok:false (F11)
    assert r.status_code == 200 and r.json()["ok"] is False


async def test_bad_body_422_with_key(client):
    r = await client.post("/chat", json={"messages": []}, headers={"X-Internal-Key": "test-internal"})
    assert r.status_code == 422


async def test_chat_streams_sse(client, monkeypatch):
    import app.main as m

    async def fake_run(messages, locale, user, search_context=None):
        yield {"event": "delta", "data": {"text": "xin chào"}}
        yield {"event": "done", "data": {"model": "x", "toolCalls": 0, "ms": 1}}

    monkeypatch.setattr(m, "run_turn", fake_run)
    r = await client.post("/chat", json=BODY, headers={"X-Internal-Key": "test-internal"})
    assert r.status_code == 200
    assert "event: delta" in r.text and "event: done" in r.text
