from openai import AsyncOpenAI

from app.config import get_settings

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def get_client() -> AsyncOpenAI:
    """Client OpenRouter. Không có key thì dùng chuỗi giả để khởi tạo được; gọi thật sẽ lỗi 401 => LLM_UNAVAILABLE."""
    s = get_settings()
    return AsyncOpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=s.openrouter_api_key or "missing-key",
        timeout=s.llm_timeout_s,
        max_retries=0,
    )
