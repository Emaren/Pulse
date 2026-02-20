from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    database_url: str = "sqlite:///../api/pulse.db"
    worker_poll_seconds: int = 30
    worker_batch_size: int = 20
    worker_max_attempts: int = 3

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = WorkerSettings()
