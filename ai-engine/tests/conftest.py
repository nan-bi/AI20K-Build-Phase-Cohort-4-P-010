import os
from types import SimpleNamespace as Ns

import httpx
import openai
import pytest

os.environ.setdefault("INTERNAL_KEY", "test-internal")
os.environ.setdefault("OPENROUTER_API_KEY", "")

from app.config import get_settings  # noqa: E402
from app.core_api import CoreApi  # noqa: E402

get_settings.cache_clear()

UNIT_A = {
    "code": "VHOP-S1.02-0607",
    "layoutLabel": "1PN",
    "layout": "1PN",
    "areaM2": 45,
    "floor": 6,
    "bathrooms": 1,
    "direction": "Đông",
    "view": "Hồ",
    "furnishing": "full",
    "items": ["Máy giặt", "Điều hòa"],
    "rent": 8_000_000,
    "managementFee": 400_000,
    "parkingFeeEstimate": 150_000,
    "utilityCostEstimate": 600_000,
    "petFriendly": True,
    "minMonths": 6,
    "status": "available",
    "title": "Căn đẹp",
    "description": "Thoáng",
    "holdHours": 48,
    "highlights": ["Ban công"],
    "securityDeposit": 8_000_000,
    "holdingDeposit": 2_000_000,
    "inventory": [{"group": "II", "groupLabel": "Phòng khách", "name": "Sofa", "qty": 1, "spec": None}],
}
UNIT_B = {**UNIT_A, "code": "VHOP-S1.05-1203", "floor": 12, "rent": 9_000_000, "items": ["Điều hòa"], "inventory": []}
RECS = {
    "topRecommendations": [
        {
            "unitCode": u["code"],
            "allInCost": {"baseRent": u["rent"], "allInTotal": u["rent"] + 1_150_000},
            "comparison": {"savingPercentage": 12, "isBargain": True},
        }
        for u in (UNIT_A, UNIT_B)
    ]
}


def core_handler(calls: list | None = None, fail: bool = False, unit_a: dict | None = None):
    units = [unit_a or UNIT_A, UNIT_B]
    def handler(req: httpx.Request) -> httpx.Response:
        if calls is not None:
            calls.append((req.method, req.url.path))
        if fail:
            return httpx.Response(503)
        p = req.url.path
        if p.endswith("/matchmaker/recommend"):
            return httpx.Response(200, json=RECS)
        if p.endswith("/properties/units"):
            return httpx.Response(200, json=units)
        if p.endswith("/busy-slots"):
            return httpx.Response(200, json={"slots": ["2026-10-12T10:00:00+07:00"]})
        if p.endswith("/legal/deposit-terms"):
            return httpx.Response(200, json={"amount": 2000000, "holdHours": 48})
        for u in units:
            if p.endswith("/properties/units/" + u["code"]):
                return httpx.Response(200, json=u)
        return httpx.Response(404)

    return handler


def make_api(**kw) -> CoreApi:
    return CoreApi(httpx.AsyncClient(transport=httpx.MockTransport(core_handler(**kw))), base_url="http://core/api/v1")


def text_round(text: str):
    return {"text": text}


def tool_round(name: str, args: str, call_id: str = "c1"):
    return {"tool": (call_id, name, args)}


class FakeLLM:
    """Mỗi phần tử `script` = 1 lần gọi LLM: {"text":...} hoặc {"tool":(id,name,args)} hoặc {"raise": exc}."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0
        self.chat = Ns(completions=Ns(create=self._create))

    async def _create(self, **kwargs):
        step = self.script[min(self.calls, len(self.script) - 1)]
        self.calls += 1
        self.last_kwargs = kwargs
        if "raise" in step:
            raise step["raise"]

        async def gen():
            if "text" in step:
                for i in range(0, len(step["text"]), 8):
                    yield Ns(choices=[Ns(delta=Ns(content=step["text"][i : i + 8], tool_calls=None))], usage=None)
            else:
                cid, name, args = step["tool"]
                tc = Ns(index=0, id=cid, function=Ns(name=name, arguments=args))
                yield Ns(choices=[Ns(delta=Ns(content=None, tool_calls=[tc]))], usage=None)
            yield Ns(choices=[], usage=Ns(prompt_tokens=10, completion_tokens=5))

        return gen()


def llm_error():
    return openai.APIConnectionError(request=httpx.Request("POST", "https://openrouter.ai"))


@pytest.fixture
def api():
    return make_api()
