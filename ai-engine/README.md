# VinStay ai-engine

Dịch vụ trợ lý AI (FastAPI + OpenRouter, không dùng framework agent bên thứ ba). Chỉ backend NestJS gọi (`X-Internal-Key`); web đi qua relay `POST /api/v1/assistant/chat`.

```bash
cd ai-engine
cp .env.example .env     # điền OPENROUTER_API_KEY, INTERNAL_KEY, CORE_API_URL
uv sync
uv run uvicorn app.main:app --port 8001   # /health, POST /chat (SSE)
uv run ruff check . && uv run pytest      # không cần key thật
uv run python -m app.eval                 # eval 39 ca, cần key thật
```

Backend cần `AI_ENGINE_URL=http://localhost:8001` và `AI_ENGINE_INTERNAL_KEY` trùng `INTERNAL_KEY`. Contract: `planning/18_*/specs/01-CONTRACTS.md` §5.
