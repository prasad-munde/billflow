from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./billflow.db"
    secret_key: str = "development-secret-change-me"
    frontend_url: str = "http://localhost:3000"
    gemini_api_key: str | None = None
    groq_api_key: str | None = None
    openai_api_key: str | None = None
    llm_provider: str = "gemini-3.5-flash"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

