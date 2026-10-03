"""Google Gemini client returning structured (JSON) agent turns."""

from __future__ import annotations

import logging
from typing import Literal, Optional

from google import genai
from google.genai import types
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


class AgentTurn(BaseModel):
    reply: str
    language: Literal["mr", "hi", "en"]
    lead: LeadInfo
    details_confirmed: bool = False


class GeminiLLM:
    def __init__(self, api_key: str, model: str):
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def generate(self, system_instruction: str, history: list[dict]) -> AgentTurn:
        """history: [{'role': 'user'|'assistant', 'content': str}, ...], oldest first, last is the user."""
        contents = [
            types.Content(
                role="model" if m["role"] == "assistant" else "user",
                parts=[types.Part(text=m["content"])],
            )
            for m in history
        ]
        resp = await self._client.aio.models.generate_content(
            model=self._model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=AgentTurn,
                temperature=0.4,
            ),
        )
        if isinstance(resp.parsed, AgentTurn):
            return resp.parsed
        return AgentTurn.model_validate_json(resp.text or "")
