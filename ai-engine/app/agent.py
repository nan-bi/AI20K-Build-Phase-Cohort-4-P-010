"""Vòng tool-calling tự viết (không dùng framework agent bên thứ ba). Tối đa MAX_TOOL_ROUNDS vòng gọi tool / lượt."""

import json
import logging
import time
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from openai import OpenAIError

from app.config import get_settings
from app.core_api import CoreApi
from app.criteria import criteria_from_args, criteria_prompt
from app.policy import find_violations
from app.tools._common import UNTRUSTED_OPEN
from app.tools.registry import TOOL_SCHEMAS, collect_codes, execute

MAX_TOOL_ROUNDS = 5
MAX_UNITS = 3
MAX_MATCHED_CODES = 20
TEMPERATURE = 0.3
SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "system.vi.md").read_text(encoding="utf-8")

log = logging.getLogger("ai-engine.turn")
Event = dict[str, Any]  # {"event": "delta|units|done|error", "data": {...}}


def _ev(event: str, **data: Any) -> Event:
    return {"event": event, "data": data}


def _system(locale: str, user: dict | None, search_context: dict | None = None) -> str:
    extra = ""
    if search_context:
        extra += criteria_prompt(search_context)
    if locale == "en":
        extra += "\nNgười dùng chọn tiếng Anh: trả lời bằng tiếng Anh, giữ nguyên mã căn và đơn vị VNĐ."
    first = (user or {}).get("firstName")
    if first:
        extra += f"\nTên khách (chỉ để xưng hô): {first}"
    return SYSTEM_PROMPT + extra


async def _stream_round(client, model: str, messages: list[dict], with_tools: bool):
    """Một lượt gọi LLM có stream. Yield ("text", str) rồi cuối cùng ("end", {tool_calls, usage})."""
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": TEMPERATURE,
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    if with_tools:
        kwargs["tools"] = TOOL_SCHEMAS
    stream = await client.chat.completions.create(**kwargs)
    calls: dict[int, dict] = {}
    usage = None
    async for chunk in stream:
        if getattr(chunk, "usage", None):
            usage = chunk.usage
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if getattr(delta, "content", None):
            yield "text", delta.content
        for tc in getattr(delta, "tool_calls", None) or []:
            slot = calls.setdefault(tc.index, {"id": "", "name": "", "arguments": ""})
            if tc.id:
                slot["id"] = tc.id
            if tc.function and tc.function.name:
                slot["name"] += tc.function.name
            if tc.function and tc.function.arguments:
                slot["arguments"] += tc.function.arguments
    yield "end", {"tool_calls": [calls[i] for i in sorted(calls)], "usage": usage}


async def run_turn(
    messages: list[dict],
    locale: str = "vi",
    user: dict | None = None,
    *,
    client=None,
    api: CoreApi | None = None,
    search_context: dict | None = None,
) -> AsyncIterator[Event]:
    settings = get_settings()
    if client is None:
        from app.llm import get_client

        client = get_client()
    own_api = api is None
    api = api or CoreApi()
    t0 = time.monotonic()
    convo: list[dict] = [{"role": "system", "content": _system(locale, user, search_context)}, *messages]
    allowed: set[str] = set()
    tool_names: list[str] = []
    tool_failed = False
    last_search: dict | None = None  # {criteria, matched} của lần search_units cuối trong lượt
    tainted = False  # đã có kết quả tool chứa text chủ nhà nhập ⇒ buffer câu trả lời để lọc trước khi phát (F5b)
    answer = ""
    p_tok = c_tok = 0
    try:
        for round_no in range(MAX_TOOL_ROUNDS + 1):
            # vòng cuối (sau 5 vòng tool) bỏ tools để buộc trả lời bằng dữ liệu đã có
            with_tools = round_no < MAX_TOOL_ROUNDS
            end: dict = {}
            round_text = ""
            async for kind, val in _stream_round(client, settings.llm_model, convo, with_tools):
                if kind == "text":
                    round_text += val
                    if not tainted:
                        yield _ev("delta", text=val)
                else:
                    end = val
            if tainted:
                bad = find_violations(round_text)
                if bad:
                    log.warning(json.dumps({"event": "policy_violation", "rules": bad}))
                    yield _ev("error", code="POLICY_VIOLATION", message="Câu trả lời bị chặn do vi phạm quy định nền tảng.")
                    return
                if round_text:
                    yield _ev("delta", text=round_text)
            answer += round_text
            usage = end.get("usage")
            if usage:
                p_tok += getattr(usage, "prompt_tokens", 0) or 0
                c_tok += getattr(usage, "completion_tokens", 0) or 0
            calls = end.get("tool_calls") or []
            if not calls or not with_tools:
                break
            convo.append(
                {
                    "role": "assistant",
                    "content": round_text or None,
                    "tool_calls": [
                        {
                            "id": c["id"],
                            "type": "function",
                            "function": {"name": c["name"], "arguments": c["arguments"]},
                        }
                        for c in calls
                    ],
                }
            )
            for c in calls:
                result, infra_err = await execute(api, c["name"], c["arguments"])
                matched_codes = result.pop("_matchedCodes", None) if isinstance(result, dict) else None  # nội bộ, không đưa LLM
                tool_failed = tool_failed or infra_err
                tool_names.append(c["name"])
                if c["name"] == "search_units" and isinstance(result.get("units"), list) and "error" not in result:
                    try:
                        raw_args = json.loads(c["arguments"] or "{}")
                    except ValueError:
                        raw_args = {}
                    last_search = {
                        "criteria": criteria_from_args(raw_args if isinstance(raw_args, dict) else {}),
                        "matched": result.get("totalMatched", len(result["units"])),
                        "matchedCodes": [x for x in matched_codes or [] if isinstance(x, str)][:MAX_MATCHED_CODES],
                        "assumed": result.get("assumed") or None,
                    }
                allowed |= collect_codes(result)
                tainted = tainted or UNTRUSTED_OPEN in json.dumps(result, ensure_ascii=False)
                convo.append(
                    {"role": "tool", "tool_call_id": c["id"], "content": json.dumps(result, ensure_ascii=False)}
                )
    except OpenAIError as e:
        log.warning(json.dumps({"event": "llm_error", "type": type(e).__name__}))
        yield _ev("error", code="LLM_UNAVAILABLE", message="Trợ lý AI tạm thời không phản hồi.")
        return
    except Exception as e:  # noqa: BLE001 — không bao giờ để stream im lặng: luôn có error hoặc done (F10)
        log.warning(json.dumps({"event": "turn_error", "type": type(e).__name__}))
        yield _ev("error", code="TOOL_FAILED", message="Không tra cứu được dữ liệu căn hộ lúc này.")
        return
    finally:
        if own_api:
            await api.aclose()

    low = answer.lower()
    mentioned = sorted((low.find(c.lower()), c) for c in allowed if c.lower() in low)
    codes = [c for _, c in mentioned][:MAX_UNITS]
    if last_search and last_search["matched"] == 0:
        # search 0 căn: báo web GIỮ kết quả cũ (không xoá preview) và nhớ tiêu chí mới; căn nearMiss (vượt ngân sách) không ghim
        yield _ev("units", unitCodes=[], mode="search", matched=0, criteria=last_search["criteria"])
    elif codes or (last_search and last_search["matchedCodes"]):
        # search = lượt vừa tìm mới (thay danh sách preview); focus = hỏi sâu/so sánh các căn đã có (giữ danh sách, đưa căn được nhắc lên đầu)
        if last_search:
            extra: dict[str, Any] = {"matchedCodes": last_search["matchedCodes"]}
            if last_search["assumed"]:
                extra["assumed"] = last_search["assumed"]
            yield _ev(
                "units", unitCodes=codes, mode="search", criteria=last_search["criteria"], matched=last_search["matched"], **extra
            )
        else:
            yield _ev("units", unitCodes=codes, mode="focus")
    ms = int((time.monotonic() - t0) * 1000)
    log.info(
        json.dumps(
            {
                "model": settings.llm_model,
                "toolCalls": tool_names,
                "ms": ms,
                "promptTokens": p_tok,
                "completionTokens": c_tok,
            }
        )
    )
    if tool_failed:
        yield _ev("error", code="TOOL_FAILED", message="Không tra cứu được dữ liệu căn hộ lúc này.")
        return
    yield _ev("done", model=settings.llm_model, toolCalls=len(tool_names), ms=ms)
