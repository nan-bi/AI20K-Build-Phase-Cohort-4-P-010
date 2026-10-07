"""Client httpx tới Nest (nơi duy nhất đọc/ghi DB — B2)."""

import json as _json
import time

import httpx

from app.config import get_settings


def unwrap(body):
    """Nest bọc mọi response thành `{success, statusCode, data}` — tool chỉ cần phần `data`."""
    if isinstance(body, dict) and "data" in body and "success" in body and "statusCode" in body:
        return body["data"]
    return body


CACHE_TTL_S = 60.0
CACHE_MAX = 256
_CACHE: dict[str, tuple[float, object]] = {}  # chỉ dùng khi KHÔNG truyền client (production); test truyền client ⇒ không cache


def _cache_get(key: str):
    hit = _CACHE.get(key)
    if hit and time.monotonic() - hit[0] < CACHE_TTL_S:
        return hit[1]
    _CACHE.pop(key, None)
    return None


def _cache_put(key: str, value) -> None:
    if len(_CACHE) >= CACHE_MAX:
        _CACHE.pop(next(iter(_CACHE)), None)
    _CACHE[key] = (time.monotonic(), value)


def clear_cache() -> None:
    _CACHE.clear()


class CoreApiError(Exception):
    def __init__(self, kind: str, status: int | None = None):
        super().__init__(kind)
        self.kind = kind  # "not_found" | "unavailable"
        self.status = status


class CoreApi:
    def __init__(self, client: httpx.AsyncClient | None = None, base_url: str | None = None):
        s = get_settings()
        self._base = (base_url or s.core_api_url).rstrip("/")
        self._cacheable = client is None
        self._client = client or httpx.AsyncClient(timeout=s.core_timeout_s)

    async def request(self, method: str, path: str, *, params: dict | None = None, json: dict | None = None):
        try:
            r = await self._client.request(method, self._base + path, params=params, json=json)
        except (httpx.HTTPError, httpx.InvalidURL) as e:
            raise CoreApiError("unavailable") from e
        if r.status_code == 404:
            raise CoreApiError("not_found", 404)
        if r.status_code >= 400:
            raise CoreApiError("unavailable", r.status_code)
        try:
            body = r.json()
        except ValueError as e:
            raise CoreApiError("unavailable", r.status_code) from e
        return unwrap(body)

    async def get(self, path: str, params: dict | None = None):
        if not self._cacheable:
            return await self.request("GET", path, params=params)
        key = f"GET {path} {_json.dumps(params or {}, sort_keys=True)}"
        hit = _cache_get(key)
        if hit is not None:
            return hit
        res = await self.request("GET", path, params=params)
        _cache_put(key, res)
        return res

    async def post(self, path: str, json: dict):
        # /matchmaker/recommend chỉ đọc (POST vì có body) ⇒ cache được; các POST khác không bao giờ cache
        if not self._cacheable or not path.endswith("/matchmaker/recommend"):
            return await self.request("POST", path, json=json)
        key = f"POST {path} {_json.dumps(json, sort_keys=True)}"
        hit = _cache_get(key)
        if hit is not None:
            return hit
        res = await self.request("POST", path, json=json)
        _cache_put(key, res)
        return res

    async def aclose(self) -> None:
        await self._client.aclose()
