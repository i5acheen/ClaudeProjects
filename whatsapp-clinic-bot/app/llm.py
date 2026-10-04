"""LLM providers (OpenRouter / Groq / Cerebras / Gemini) behind one fallback chain.

Every provider returns a validated `AgentTurn`. If a provider is rate-limited, down, slow
or returns invalid JSON, the chain moves on to the next one."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Literal, Optional, Protocol

from google import genai
from google.genai import errors, types
from openai import AsyncOpenAI, BadRequestError
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


class Provider(Protocol):
    name: str

    async def generate(self, system_instruction: str, history: list[dict]) -> AgentTurn: ...


# ---------- lenient JSON parsing (open models don't always follow schemas exactly) ----------

def _extract_json(text: str) -> dict:
    text = re.sub(r"(?s)<think>.*?</think>", "", text or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in model output")
    return json.loads(text[start:end + 1])


def parse_turn(text: str) -> AgentTurn:
    """Parse and normalise a model's JSON reply into an AgentTurn (raises if unusable)."""
    data = _extract_json(text)
    if not isinstance(data.get("reply"), str) or not data["reply"].strip():
        raise ValueError("missing reply")
    lang = str(data.get("language") or "").lower()[:2]
    data["language"] = lang if lang in ("mr", "hi", "en") else "mr"
    lead = data.get("lead") if isinstance(data.get("lead"), dict) else {}
    status = str(lead.get("status") or "").capitalize()
    lead["status"] = status if status in ("Hot", "Warm", "Cold") else "Warm"
    for k in ("name", "city", "concern", "duration", "preferred_time", "summary"):
        v = lead.get(k)
        lead[k] = None if v in (None, "", "null", "None") else str(v)
    data["lead"] = {k: lead.get(k) for k in LeadInfo.model_fields}
    data["details_confirmed"] = bool(data.get("details_confirmed"))
    opts = data.get("options") if isinstance(data.get("options"), dict) else {}
    kind = opts.get("kind") if opts.get("kind") in ("buttons", "list") else "none"
    choices = []
    for i, c in enumerate(opts.get("choices") or []):
        if isinstance(c, dict) and c.get("title"):
            choices.append({"id": str(c.get("id") or f"opt_{i}"), "title": str(c["title"]),
                            "description": c.get("description") or None})
    data["options"] = {"kind": kind if choices else "none",
                       "button_label": opts.get("button_label") or None, "choices": choices}
    return AgentTurn.model_validate(data)


# ---------- providers ----------

class OpenAICompatProvider:
    """Any OpenAI-compatible chat API: OpenRouter, Groq, Cerebras."""

    BASE_URLS = {
        "openrouter": "https://openrouter.ai/api/v1",
        "groq": "https://api.groq.com/openai/v1",
        "cerebras": "https://api.cerebras.ai/v1",
    }

    def __init__(self, provider: str, model: str, api_key: str, timeout: float = 25):
        self.name = f"{provider}:{model}"
        self._model = model
        headers = ({"HTTP-Referer": "https://dramollahoti.com", "X-Title": "Vascular Center Assistant"}
                   if provider == "openrouter" else None)
        self._client = AsyncOpenAI(base_url=self.BASE_URLS[provider], api_key=api_key,
                                   timeout=timeout, max_retries=0, default_headers=headers)
        self._extras = True  # json mode / reasoning_effort; dropped if the model rejects them

    async def generate(self, system_instruction: str, history: list[dict]) -> AgentTurn:
        messages = [{"role": "system", "content": system_instruction}] + [
            {"role": m["role"], "content": m["content"]} for m in history]
        kwargs = {"model": self._model, "messages": messages, "temperature": 0.4, "max_tokens": 1500}
        extras: dict = {"response_format": {"type": "json_object"}}
        if "gpt-oss" in self._model:
            extras["reasoning_effort"] = "low"
        try:
            resp = await self._client.chat.completions.create(**kwargs, **(extras if self._extras else {}))
        except BadRequestError:
            if not self._extras:
                raise
            self._extras = False  # model doesn't support an extra parameter: retry plainly
            resp = await self._client.chat.completions.create(**kwargs)
        return parse_turn(resp.choices[0].message.content or "")


class GeminiProvider:
    """Google Gemini with native JSON-schema output."""

    def __init__(self, model: str, api_key: str):
        self.name = f"gemini:{model}"
        self._model = model
        self._client = genai.Client(api_key=api_key)

    async def generate(self, system_instruction: str, history: list[dict]) -> AgentTurn:
        contents = [types.Content(role="model" if m["role"] == "assistant" else "user",
                                  parts=[types.Part(text=m["content"])]) for m in history]
        config = types.GenerateContentConfig(system_instruction=system_instruction,
                                             response_mime_type="application/json",
                                             response_schema=AgentTurn, temperature=0.4)
        resp = await self._client.aio.models.generate_content(model=self._model, contents=contents,
                                                              config=config)
        if isinstance(resp.parsed, AgentTurn):
            return resp.parsed
        return parse_turn(resp.text or "")


# ---------- chain ----------

class LLMChain:
    """Try providers in order; on any failure move to the next. Retry the chain once."""

    def __init__(self, providers: list[Provider], retry_pause: float = 3):
        if not providers:
            raise RuntimeError("No LLM provider configured: set at least one API key")
        self.providers = providers
        self.retry_pause = retry_pause
        self.last_used: str | None = None

    async def generate(self, system_instruction: str, history: list[dict]) -> AgentTurn:
        last_exc: Exception | None = None
        for round_ in range(2):
            if round_:
                await asyncio.sleep(self.retry_pause)
            for p in self.providers:
                t0 = time.monotonic()
                try:
                    turn = await p.generate(system_instruction, history)
                except Exception as exc:  # rate limit, outage, timeout, invalid JSON...
                    code = getattr(exc, "status_code", None) or getattr(exc, "code", None) or ""
                    log.warning("LLM %s failed: %s %s", p.name, type(exc).__name__, code)
                    last_exc = exc
                    continue
                self.last_used = p.name
                log.info("LLM %s answered in %d ms", p.name, (time.monotonic() - t0) * 1000)
                return turn
        raise last_exc or RuntimeError("all LLM providers failed")


def build_provider(entry: str, keys: dict[str, str]) -> Provider | None:
    """entry = 'provider:model' (model may itself contain ':'). Returns None if no key."""
    provider, _, model = entry.strip().partition(":")
    key = keys.get(provider, "")
    if not model or not key:
        return None
    if provider == "gemini":
        return GeminiProvider(model, key)
    if provider in OpenAICompatProvider.BASE_URLS:
        return OpenAICompatProvider(provider, model, key)
    log.warning("Unknown LLM provider in LLM_CHAIN: %s", provider)
    return None


def build_chain(chain: list[str], keys: dict[str, str]) -> LLMChain:
    providers = [p for p in (build_provider(e, keys) for e in chain) if p]
    return LLMChain(providers)
