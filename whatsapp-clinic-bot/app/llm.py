"""Google Gemini client returning structured (JSON) agent turns."""

from __future__ import annotations

import logging
from typing import Literal, Optional

from google import genai
from google.genai import errors, types
from pydantic import BaseModel

log = logging.getLogger(__name__)


class LeadInfo(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    concern: Optional[str] = None
    duration: Optional[str] = None
    preferred_time: Optional[str] = None
    status: Literal["Hot", "Warm", "Cold"] = "Cold"
    summary: Optional[str] = None


class Choice(BaseModel):
    id: str
    title: str
    description: Optional[str] = None


class Options(BaseModel):
    kind: Literal["none", "buttons", "list"] = "none"
    button_label: Optional[str] = None
    choices: list[Choice] = []


class AgentTurn(BaseModel):
    reply: str
    language: Literal["mr", "hi", "en"]
    lead: LeadInfo
    details_confirmed: bool = False
    options: Options = Options()


class GeminiLLM:
    # Errors worth retrying on another model: overloaded, rate-limited, model retired/unknown.
    RETRYABLE = {404, 429, 500, 503, 504}

    def __init__(self, api_key: str, model: str, fallback_models: list[str] | None = None):
        self._client = genai.Client(api_key=api_key)
        self._models = [model] + [m for m in (fallback_models or []) if m and m != model]

    async def generate(self, system_instruction: str, history: list[dict]) -> AgentTurn:
        """history: [{'role': 'user'|'assistant', 'content': str}, ...], oldest first, last is the user."""
        contents = [
            types.Content(
                role="model" if m["role"] == "assistant" else "user",
                parts=[types.Part(text=m["content"])],
            )
            for m in history
        ]
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=AgentTurn,
            temperature=0.4,
        )
        last_exc: Exception | None = None
        for model in self._models:
            try:
                resp = await self._client.aio.models.generate_content(
                    model=model, contents=contents, config=config)
            except errors.APIError as exc:
                if exc.code not in self.RETRYABLE:
                    raise
                log.warning("Gemini model %s failed (%s), trying next model", model, exc.code)
                last_exc = exc
                continue
            if isinstance(resp.parsed, AgentTurn):
                return resp.parsed
            return AgentTurn.model_validate_json(resp.text or "")
        raise last_exc or RuntimeError("No Gemini model configured")
