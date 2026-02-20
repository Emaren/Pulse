from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Pulse API"
    app_env: str = "development"
    database_url: str = "sqlite:///./pulse.db"
    admin_api_key: str = "change-me"
    token_encryption_key: str = ""
    queue_default_delay_minutes: int = 5
    queue_jitter_minutes: int = 20

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
