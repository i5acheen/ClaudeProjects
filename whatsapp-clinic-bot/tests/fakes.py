from app.llm import AgentTurn, LeadInfo


class FakeLLM:
    def __init__(self, turns=None, error=None):
        self.turns = list(turns or [])
        self.error = error
        self.calls = []

    async def generate(self, system_instruction, history):
        self.calls.append((system_instruction, [dict(m) for m in history]))
        if self.error:
            raise self.error
        return self.turns.pop(0) if self.turns else AgentTurn(
            reply="नमस्कार!", language="mr", lead=LeadInfo())


class FakeSender:
    def __init__(self):
        self.sent = []
        self.read = []

    async def send_text(self, to, body):
        self.sent.append((to, body))
        return True

    async def send_choices(self, to, body, kind, choices, button_label=""):
        self.sent.append((to, body, kind, [c["title"] for c in choices]))
        return True

    async def mark_read(self, message_id):
        self.read.append(message_id)


class FakeSheet:
    def __init__(self):
        self.rows = []

    async def upsert(self, lead):
        self.rows.append(lead)
