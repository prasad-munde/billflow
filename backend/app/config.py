from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./billflow.db"
    secret_key: str = "development-secret-change-me"
    frontend_url: str = "http://localhost:3000"
    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
