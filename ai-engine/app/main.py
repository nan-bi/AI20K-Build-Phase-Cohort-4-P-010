import hmac
import json
import logging
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator
from sse_starlette.sse import EventSourceResponse

from app.agent import run_turn
from app.config import get_settings
from app.criteria import SearchContext

logging.basicConfig(level=logging.INFO, format="%(message)s")

app = FastAPI(title="VinStay AI Engine", version="0.1.0")


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class ChatUser(BaseModel):
    firstName: str | None = Field(default=None, max_length=50)  # noqa: N815


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    locale: Literal["vi", "en"] = "vi"
    user: ChatUser | None = None
    searchContext: SearchContext | None = None  # noqa: N815 — tiêu chí tìm đang áp dụng (từ event units.criteria)

    @field_validator("messages")
    @classmethod
    def _last_is_user(cls, v: list[ChatMessage]):
        if v[-1].role != "user":
            raise ValueError("last message must be from user")
        return v


def require_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    expected = get_settings().internal_key
    if not expected or not x_internal_key or not hmac.compare_digest(x_internal_key, expected):
        raise HTTPException(status_code=401, detail="invalid internal key")


@app.get("/health")
async def health():
    s = get_settings()
    return {"ok": bool(s.openrouter_api_key), "model": s.llm_model}


@app.post("/chat", dependencies=[Depends(require_internal_key)])
async def chat(req: ChatRequest):
    messages = [m.model_dump() for m in req.messages]
    user = req.user.model_dump(exclude_none=True) if req.user else None
    ctx = req.searchContext.model_dump(exclude_none=True) if req.searchContext else None

    async def gen():
        async for ev in run_turn(messages, req.locale, user, search_context=ctx or None):
            yield {"event": ev["event"], "data": json.dumps(ev["data"], ensure_ascii=False)}

    return EventSourceResponse(gen())
