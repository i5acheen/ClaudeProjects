import asyncio

import pytest

from app.llm import LLMChain, build_chain, parse_turn


def run(coro):
    return asyncio.run(coro)


GOOD = '{"reply": "नमस्कार", "language": "mr", "lead": {"status": "Warm"}, "options": {"kind": "none", "choices": []}}'


def test_parse_turn_handles_fences_think_tags_and_sloppy_fields():
    text = ("<think>let me think</think>\n```json\n"
            '{"reply": "Hi", "language": "EN", "lead": {"name": "", "status": "hot"},'
            ' "options": {"kind": "none|buttons|list", "choices": []}}\n```')
    t = parse_turn(text)
    assert t.reply == "Hi" and t.language == "en"
    assert t.lead.status == "Hot" and t.lead.name is None
    assert t.options.kind == "none"


def test_parse_turn_fixes_options_without_ids_and_rejects_missing_reply():
    t = parse_turn('{"reply": "किती?", "language": "mr", "lead": {},'
                   ' "options": {"kind": "buttons", "choices": [{"title": "6 महिने"}, {"title": "2 वर्षे"}]}}')
    assert t.options.kind == "buttons" and [c.id for c in t.options.choices] == ["opt_0", "opt_1"]
    assert t.lead.status == "Warm"
    with pytest.raises(Exception):
        parse_turn('{"language": "mr"}')
    with pytest.raises(Exception):
        parse_turn("sorry, I cannot help")


class FakeProvider:
    def __init__(self, name, outcome):
        self.name, self.outcome, self.calls = name, outcome, 0

    async def generate(self, system, history):
        self.calls += 1
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return parse_turn(self.outcome)


def test_chain_falls_back_on_errors_and_invalid_json():
    a = FakeProvider("a", RuntimeError("429 rate limited"))
    b = FakeProvider("b", "not json at all")
    c = FakeProvider("c", GOOD)
    chain = LLMChain([a, b, c], retry_pause=0)
    turn = run(chain.generate("sys", [{"role": "user", "content": "hi"}]))
    assert turn.reply == "नमस्कार" and chain.last_used == "c"
    assert (a.calls, b.calls, c.calls) == (1, 1, 1)


def test_chain_retries_once_then_raises():
    a = FakeProvider("a", RuntimeError("503"))
    chain = LLMChain([a], retry_pause=0)
    with pytest.raises(RuntimeError):
        run(chain.generate("sys", [{"role": "user", "content": "hi"}]))
    assert a.calls == 2


def test_build_chain_skips_providers_without_keys():
    chain = build_chain(["openrouter:google/gemma-4-31b-it:free", "groq:openai/gpt-oss-120b",
                         "gemini:gemini-3.5-flash-lite", "bogus:x"],
                        {"openrouter": "k1", "groq": "", "gemini": "k3"})
    assert [p.name for p in chain.providers] == ["openrouter:google/gemma-4-31b-it:free",
                                                 "gemini:gemini-3.5-flash-lite"]
    with pytest.raises(RuntimeError):
        build_chain(["groq:x"], {"groq": ""})
