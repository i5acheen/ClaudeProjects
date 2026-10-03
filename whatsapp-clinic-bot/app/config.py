"""Settings loaded from environment variables (.env). No secrets live in code."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _resolve(path: str) -> Path:
    p = Path(path)
    return p if p.is_absolute() else BASE_DIR / p


@dataclass(frozen=True)
class Settings:
    whatsapp_token: str
    phone_number_id: str
    verify_token: str
    app_secret: str
    graph_api_version: str
    gemini_api_key: str
    gemini_model: str
    gemini_fallback_models: list[str]
    google_service_account_file: Path
    google_sheet_id: str
    google_sheet_tab: str
    sqlite_path: Path
    history_limit: int
    clinic_phone: str
    log_level: str

    @property
    def sheets_enabled(self) -> bool:
        return bool(self.google_sheet_id) and self.google_service_account_file.is_file()

    def missing_required(self) -> list[str]:
        required = {
            "WHATSAPP_TOKEN": self.whatsapp_token,
            "PHONE_NUMBER_ID": self.phone_number_id,
            "VERIFY_TOKEN": self.verify_token,
            "APP_SECRET": self.app_secret,
            "GEMINI_API_KEY": self.gemini_api_key,
        }
        return [k for k, v in required.items() if not v]


def load_settings() -> Settings:
    env = os.getenv
    return Settings(
        whatsapp_token=env("WHATSAPP_TOKEN", ""),
        phone_number_id=env("PHONE_NUMBER_ID", ""),
        verify_token=env("VERIFY_TOKEN", ""),
        app_secret=env("APP_SECRET", ""),
        graph_api_version=env("GRAPH_API_VERSION", "v26.0"),
        gemini_api_key=env("GEMINI_API_KEY", ""),
        gemini_model=env("GEMINI_MODEL", "gemini-3.5-flash"),
        gemini_fallback_models=[m.strip() for m in env(
            "GEMINI_FALLBACK_MODELS", "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.8-flash").split(",")],
        google_service_account_file=_resolve(
            env("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials/service_account.json")
        ),
        google_sheet_id=env("GOOGLE_SHEET_ID", ""),
        google_sheet_tab=env("GOOGLE_SHEET_TAB", "Leads"),
        sqlite_path=_resolve(env("SQLITE_PATH", "data/conversations.db")),
        history_limit=int(env("HISTORY_LIMIT", "15")),
        clinic_phone=env("CLINIC_PHONE", ""),
        log_level=env("LOG_LEVEL", "INFO"),
    )


settings = load_settings()
