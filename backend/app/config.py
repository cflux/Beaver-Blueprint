from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Beaver Blueprint"
    database_url: str = f"sqlite+aiosqlite:///{Path(__file__).resolve().parent.parent / 'data' / 'beaver.db'}"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_prefix": "BB_"}


settings = Settings()
