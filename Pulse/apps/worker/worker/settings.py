from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    database_url: str = "sqlite:///../api/pulse.db"
    worker_poll_seconds: int = 30
    worker_batch_size: int = 20
    worker_max_attempts: int = 3

    # Must match API if you set it there.
    token_encryption_key: str = ""

    # X API
    x_api_base: str = "https://api.x.com"
    x_dry_run: bool = False
    http_timeout_seconds: float = 20.0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = WorkerSettings()