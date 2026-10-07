import json
import logging

from app.agent import MAX_TOOL_ROUNDS, run_turn
from tests.conftest import FakeLLM, llm_error, make_api, text_round, tool_round

MSG = [{"role": "user", "content": "Ngân sách 10 triệu all-in, 2 người, 1 xe máy"}]


async def collect(llm, api, msgs=MSG):
    return [e async for e in run_turn(msgs, "vi", None, client=llm, api=api)]


async def test_a1_search_then_answer(api):
    llm = FakeLLM(
        [
            tool_round("search_units", json.dumps({"max_all_in_budget": 10_000_000})),
            text_round("Mình gợi ý VHOP-S1.02-0607 vì giá tốt, đánh đổi là tầng thấp."),
        ]
    )
    evs = await collect(llm, api)
    names = [e["event"] for e in evs]
    assert names[0] == "delta" and names[-1] == "done"
    assert names.index("units") < names.index("done")
    units = next(e for e in evs if e["event"] == "units")
    assert units["data"]["unitCodes"] == ["VHOP-S1.02-0607"]
    assert evs[-1]["data"]["toolCalls"] == 1
    # system prompt + kết quả tool không bị đẩy ra client
    blob = json.dumps(evs, ensure_ascii=False)
    assert "Vai trò" not in blob and "allInTotal" not in blob


async def test_a2_invented_code_filtered(api):
    llm = FakeLLM(
        [
            tool_round("search_units", json.dumps({"max_all_in_budget": 10_000_000})),
            text_round("Thử VHOP-S9.99-9999 và VHOP-S1.05-1203 nhé."),
        ]
    )
    evs = await collect(llm, api)
    codes = next(e for e in evs if e["event"] == "units")["data"]["unitCodes"]
    assert codes == ["VHOP-S1.05-1203"]


async def test_no_units_event_without_tool_results(api):
    evs = await collect(FakeLLM([text_round("Căn VHOP-S1.02-0607 rất đẹp.")]), api)
    assert [e["event"] for e in evs if e["event"] == "units"] == []


async def test_a3_tool_loop_capped(api):
    llm = FakeLLM([tool_round("get_unit", json.dumps({"code": "VHOP-S1.02-0607"}))])  # luôn xin tool
    evs = await collect(llm, api)
    assert evs[-1]["event"] == "done"
    assert evs[-1]["data"]["toolCalls"] == MAX_TOOL_ROUNDS
    assert llm.calls == MAX_TOOL_ROUNDS + 1
    assert "tools" not in llm.last_kwargs  # vòng cuối bỏ tools


async def test_a4_llm_error(api):
    evs = await collect(FakeLLM([{"raise": llm_error()}]), api)
    assert evs[-1]["event"] == "error" and evs[-1]["data"]["code"] == "LLM_UNAVAILABLE"
    assert all(e["event"] != "done" for e in evs)


async def test_tool_failed_after_apology():
    api = make_api(fail=True)
    llm = FakeLLM(
        [tool_round("get_unit", json.dumps({"code": "VHOP-S1.02-0607"})), text_round("Xin lỗi, bạn xem /units nhé.")]
    )
    evs = await collect(llm, api)
    names = [e["event"] for e in evs]
    assert names[0] == "delta" and names[-1] == "error"
    assert evs[-1]["data"]["code"] == "TOOL_FAILED"
    tool_msg = [m for m in llm.last_kwargs["messages"] if m["role"] == "tool"][0]
    assert json.loads(tool_msg["content"]) == {"error": "unavailable"}


async def test_not_found_is_not_infra_error(api):
    llm = FakeLLM([tool_round("get_unit", json.dumps({"code": "NOPE"})), text_round("Không thấy căn đó.")])
    evs = await collect(llm, api)
    assert evs[-1]["event"] == "done"


async def test_log_has_no_message_content(api, caplog):
    caplog.set_level(logging.INFO, logger="ai-engine.turn")
    await collect(FakeLLM([text_round("Chào bạn, ngân sách của bạn là bao nhiêu?")]), api)
    line = [r.getMessage() for r in caplog.records if r.name == "ai-engine.turn"][-1]
    data = json.loads(line)
    assert set(data) == {"model", "toolCalls", "ms", "promptTokens", "completionTokens"}
    assert "ngân sách" not in line.lower() and data["promptTokens"] == 10


async def test_search_filters_and_must_have():
    calls: list = []
    api = make_api(calls=calls)
    llm = FakeLLM(
        [
            tool_round("search_units", json.dumps({"max_all_in_budget": 10_000_000, "must_have": ["máy giặt"]})),
            text_round("ok"),
        ]
    )
    await collect(llm, make_api(calls=calls))
    tool_msg = [m for m in llm.last_kwargs["messages"] if m["role"] == "tool"][0]
    res = json.loads(tool_msg["content"])
    assert [u["code"] for u in res["units"]] == ["VHOP-S1.02-0607"]  # B không có máy giặt
    assert res["units"][0]["savingPct"] == 12
    assert ("POST", "/api/v1/matchmaker/recommend") in calls
    assert api is not None


async def test_busy_slots_and_compare(api):
    llm = FakeLLM(
        [
            tool_round("busy_slots", json.dumps({"code": "VHOP-S1.02-0607", "date": "2026-10-12"})),
            text_round("x"),
        ]
    )
    await collect(llm, api)
    res = json.loads([m for m in llm.last_kwargs["messages"] if m["role"] == "tool"][0]["content"])
    assert res["busy"] == ["2026-10-12T10:00:00+07:00"] and res["bookUrl"] == "/units/VHOP-S1.02-0607?book=1"
    llm2 = FakeLLM(
        [tool_round("compare_units", json.dumps({"codes": ["VHOP-S1.02-0607", "VHOP-S1.05-1203"]})), text_round("x")]
    )
    await collect(llm2, api)
    res2 = json.loads([m for m in llm2.last_kwargs["messages"] if m["role"] == "tool"][0]["content"])
    assert len(res2["compare"]) == 2



async def test_units_event_mode_search_vs_focus(api):
    """Có search_units trong lượt ⇒ mode=search; chỉ get_unit ⇒ mode=focus (preview giữ danh sách, đưa căn được nhắc lên đầu)."""
    search = FakeLLM(
        [
            tool_round("search_units", json.dumps({"max_all_in_budget": 10_000_000})),
            text_round("Gợi ý VHOP-S1.02-0607."),
        ]
    )
    focus = FakeLLM(
        [
            tool_round("get_unit", json.dumps({"code": "VHOP-S1.02-0607"})),
            text_round("Căn VHOP-S1.02-0607 như sau."),
        ]
    )
    for llm, mode in ((search, "search"), (focus, "focus")):
        evs = await collect(llm, api)
        assert next(e for e in evs if e["event"] == "units")["data"]["mode"] == mode
