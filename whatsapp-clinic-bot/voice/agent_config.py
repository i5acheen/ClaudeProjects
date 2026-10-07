"""Loads the Neha agent (JSON + Marathi prompt files) into the format the Bolna engine expects."""

from __future__ import annotations

import copy
import json
import os
from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parent / "agent"
AGENT_ID = "neha"


GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"


def use_gemini_for_helper_llms() -> None:
    """The Bolna engine always builds small OpenAI-client helpers (end-of-call check, voicemail check).
    Point them at Gemini's OpenAI-compatible endpoint with the free GOOGLE_API_KEY, unless an
    OPENAI_API_KEY was given on purpose."""
    key = os.getenv("GOOGLE_API_KEY", "")
    if key and not os.getenv("OPENAI_API_KEY"):
        model = os.getenv("VOICE_LLM_MODEL", "gemini-3.5-flash-lite")
        os.environ["OPENAI_API_KEY"] = key
        os.environ.setdefault("OPENAI_BASE_URL", GEMINI_OPENAI_BASE_URL)
        os.environ.setdefault("CHECK_FOR_COMPLETION_LLM", model)
        os.environ.setdefault("VOICEMAIL_DETECTION_LLM", model)
        os.environ.setdefault("LANGUAGE_DETECTION_LLM", model)


def _read(name: str) -> str:
    return (AGENT_DIR / name).read_text(encoding="utf-8").strip()


def load_agent(io_provider: str = "plivo") -> dict:
    """Agent config for one call. io_provider: "plivo" for phone calls, "default" for the laptop mic test."""
    config = json.loads(_read("neha_agent.json"))
    welcome = config.get("agent_welcome_message", "")
    if welcome.startswith("@"):
        config["agent_welcome_message"] = _read(welcome[1:])
    task = config["tasks"][0]["tools_config"]
    task["input"]["provider"] = task["output"]["provider"] = io_provider
    # Optional overrides from the environment (no code change needed to try another model/voice).
    llm = task["llm_agent"]["llm_config"]
    llm["model"] = os.getenv("VOICE_LLM_MODEL", llm["model"])
    voice = task["synthesizer"]["provider_config"]
    if os.getenv("VOICE_TTS_VOICE"):
        voice["voice_id"] = os.environ["VOICE_TTS_VOICE"].lower()
        voice["voice"] = voice["voice_id"].capitalize()
    return config


def load_prompts() -> dict:
    """Prompts in Bolna's {"task_1": {"system_prompt": ...}} shape."""
    return {"task_1": {"system_prompt": _read("neha_prompt_mr.md")}}


def recipient_data(patient_name: str = "", concern: str = "", call_reason: str = "", **extra) -> dict:
    """Variables substituted into {{patient_name}}, {{concern}}, {{call_reason}} in the prompt/welcome."""
    data = {
        "patient_name": (patient_name or "").strip() or "",
        "concern": (concern or "").strip() or "पायाच्या शिरांचा त्रास",
        "call_reason": (call_reason or "").strip() or "WhatsApp वर कॉलसाठी विनंती",
        "timezone": "Asia/Kolkata",
    }
    data.update({k: v for k, v in extra.items() if isinstance(v, (str, int, float))})
    return copy.deepcopy(data)
