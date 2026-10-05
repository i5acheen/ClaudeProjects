"""Settings loaded from environment variables (.env). No secrets live in code."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Free open-source models first, Gemini last. Entries without an API key are skipped.
DEFAULT_LLM_CHAIN = ",".join([
    "openrouter:google/gemma-4-31b-it:free",
    "groq:openai/gpt-oss-120b",
    "openrouter:qwen/qwen3.8-27b:free",
    "cerebras:gpt-oss-120b",
    "openrouter:nvidia/nemotron-3-super-120b-a12b:free",
    "gemini:gemini-3.5-flash-lite",
    "gemini:gemini-3.1-flash-lite",
    "gemini:gemini-3.5-flash",
])


def _resolve(path: str) -> Path:
    p = Path(path)
    return p if p.is_absolute() else BASE_DIR / p


def _bool(value: str) -> bool:
    return value.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Settings:
    whatsapp_token: str
    phone_number_id: str
    verify_token: str
    app_secret: str
    graph_api_version: str
    llm_chain: list[str]
    llm_keys: dict[str, str]
    database_url: str
    google_service_account_file: Path
    google_sheet_id: str
    google_sheet_tab: str
    google_calendar_id: str
    sqlite_path: Path
    history_limit: int
    clinic_phone: str
    log_level: str
    enable_diag: bool
    rate_limit_count: int
    rate_limit_window: int
    alert_phone: str
    alert_email: str
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str

    @property
    def sheets_enabled(self) -> bool:
        return bool(self.google_sheet_id) and self.google_service_account_file.is_file()

    @property
    def calendar_enabled(self) -> bool:
        return bool(self.google_calendar_id) and self.google_service_account_file.is_file()

    @property
    def email_alerts_enabled(self) -> bool:
        return bool(self.alert_email and self.smtp_host and self.smtp_user and self.smtp_password)

    def missing_required(self) -> list[str]:
        required = {
            "WHATSAPP_TOKEN": self.whatsapp_token,
            "PHONE_NUMBER_ID": self.phone_number_id,
            "VERIFY_TOKEN": self.verify_token,
            "APP_SECRET": self.app_secret,
        }
        missing = [k for k, v in required.items() if not v]
        if not any(self.llm_keys.values()):
            missing.append("one of OPENROUTER_API_KEY / GROQ_API_KEY / CEREBRAS_API_KEY / GEMINI_API_KEY")
        return missing


def load_settings() -> Settings:
    env = os.getenv
    return Settings(
        whatsapp_token=env("WHATSAPP_TOKEN", ""),
        phone_number_id=env("PHONE_NUMBER_ID", ""),
        verify_token=env("VERIFY_TOKEN", ""),
        app_secret=env("APP_SECRET", ""),
        graph_api_version=env("GRAPH_API_VERSION", "v26.0"),
        llm_chain=[e.strip() for e in (env("LLM_CHAIN") or DEFAULT_LLM_CHAIN).split(",") if e.strip()],
        llm_keys={
            "openrouter": env("OPENROUTER_API_KEY", ""),
            "groq": env("GROQ_API_KEY", ""),
            "cerebras": env("CEREBRAS_API_KEY", ""),
            "gemini": env("GEMINI_API_KEY", ""),
        },
        database_url=env("DATABASE_URL", ""),
        google_service_account_file=_resolve(
            env("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials/service_account.json")
        ),
        google_sheet_id=env("GOOGLE_SHEET_ID", ""),
        google_sheet_tab=env("GOOGLE_SHEET_TAB", "Leads"),
        google_calendar_id=env("GOOGLE_CALENDAR_ID", ""),
        sqlite_path=_resolve(env("SQLITE_PATH", "data/conversations.db")),
        history_limit=int(env("HISTORY_LIMIT", "15")),
        clinic_phone=env("CLINIC_PHONE", ""),
        log_level=env("LOG_LEVEL", "INFO"),
        enable_diag=_bool(env("ENABLE_DIAG", "false")),
        rate_limit_count=int(env("RATE_LIMIT_COUNT", "20")),
        rate_limit_window=int(env("RATE_LIMIT_WINDOW_SECONDS", "600")),
        alert_phone=env("ALERT_PHONE", ""),
        alert_email=env("ALERT_EMAIL", ""),
        smtp_host=env("SMTP_HOST", ""),
        smtp_port=int(env("SMTP_PORT", "587")),
        smtp_user=env("SMTP_USER", ""),
        smtp_password=env("SMTP_PASSWORD", ""),
    )


settings = load_settings()
