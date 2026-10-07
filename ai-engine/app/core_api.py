"""Client httpx tới Nest (nơi duy nhất đọc/ghi DB — B2)."""

import httpx

from app.config import get_settings


def unwrap(body):
    """Nest bọc mọi response thành `{success, statusCode, data}` — tool chỉ cần phần `data`."""
    if isinstance(body, dict) and "data" in body and "success" in body and "statusCode" in body:
        return body["data"]
    return body


class CoreApiError(Exception):
    def __init__(self, kind: str, status: int | None = None):
        super().__init__(kind)
        self.kind = kind  # "not_found" | "unavailable"
        self.status = status


class CoreApi:
    def __init__(self, client: httpx.AsyncClient | None = None, base_url: str | None = None):
        s = get_settings()
        self._base = (base_url or s.core_api_url).rstrip("/")
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
        return await self.request("GET", path, params=params)

    async def post(self, path: str, json: dict):
        return await self.request("POST", path, json=json)

    async def aclose(self) -> None:
        await self._client.aclose()
