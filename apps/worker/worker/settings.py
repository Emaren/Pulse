from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    database_url: str = "sqlite:///../api/pulse.db"
    worker_poll_seconds: int = 30
    worker_batch_size: int = 20
    worker_max_attempts: int = 3
    pulse_api_base_url: str = "http://127.0.0.1:3390"
    automation_request_timeout_seconds: float = 10.0

    token_encryption_key: str = ""

    # HTTP
    http_timeout_seconds: float = 20.0

    # X API
    x_api_base: str = "https://api.x.com"
    x_dry_run: bool = False

    # Facebook Graph API
    facebook_api_base: str = "https://graph.facebook.com/v25.0"
    facebook_dry_run: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = WorkerSettings()
