from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openrouter_api_key: str = ""
    llm_model: str = "openai/gpt-4o-mini"
    core_api_url: str = "http://localhost:4000/api/v1"
    internal_key: str = ""
    llm_timeout_s: float = 20.0
    core_timeout_s: float = 5.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
