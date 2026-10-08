"""Talk to Neha from your laptop microphone (local test, no phone line).

Replaces Bolna's quickstart_client.py, which breaks with websockets>=14 (extra_headers) and never
acknowledges "mark" messages. The engine uses those acknowledgements to know when Neha has finished
speaking, which affects turn-taking, the welcome message and hang-up.

Usage (server running with ENABLE_MIC_TEST=true):
    python mic_client.py            # or: python mic_client.py --url ws://localhost:5001/chat/v1/neha
Use headphones. Press Ctrl+C to end the call.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import collections
import json
import threading

MIC_RATE = 16000          # what the engine's transcriber expects (linear16 PCM)
SPEAKER_RATE = 24000      # what the engine sends back for non-phone calls
MIC_BLOCK = 1600          # 100 ms


def strip_wav_header(data: bytes) -> bytes:
    """Sarvam audio can arrive as small WAV files; play only the PCM samples."""
    if data[:4] == b"RIFF":
        idx = data.find(b"data", 12)
        if idx != -1:
            return data[idx + 8:]
    return data


class Player:
    """Ordered queue of audio and marks. A mark is acknowledged only after the audio before it has played."""

    def __init__(self, on_mark):
        self._items: collections.deque = collections.deque()   # ("audio", bytearray) | ("mark", name)
        self._lock = threading.Lock()
        self._on_mark = on_mark

    def add_audio(self, pcm: bytes) -> None:
        if len(pcm) % 2:
            pcm = pcm[:-1]
        if pcm:
            with self._lock:
                self._items.append(("audio", bytearray(pcm)))

    def add_mark(self, name: str) -> None:
        with self._lock:
            self._items.append(("mark", name))
        self.pull(0)   # acknowledges immediately if nothing is waiting to play

    def clear(self) -> None:
        """Patient interrupted: drop unplayed audio (the engine forgets its pending marks too)."""
        with self._lock:
            self._items.clear()

    def pull(self, nbytes: int) -> bytes:
        """Take up to nbytes of audio for the speaker, acknowledging marks reached on the way."""
        out = bytearray()
        marks = []
        with self._lock:
            while self._items:
                kind, val = self._items[0]
                if kind == "mark":
                    marks.append(val)
                    self._items.popleft()
                    continue
                if len(out) >= nbytes:
                    break
                take = min(nbytes - len(out), len(val))
                out += val[:take]
                del val[:take]
                if not val:
                    self._items.popleft()
        for name in marks:
            self._on_mark(name)
        return bytes(out)


async def run(url: str) -> None:
    import numpy as np
    import sounddevice as sd
    import websockets

    loop = asyncio.get_running_loop()
    mic_q: asyncio.Queue = asyncio.Queue()
    mark_q: asyncio.Queue = asyncio.Queue()
    player = Player(lambda name: loop.call_soon_threadsafe(mark_q.put_nowait, name))

    def on_mic(indata, frames, t, status):
        loop.call_soon_threadsafe(mic_q.put_nowait, bytes(indata))

    def on_speaker(outdata, frames, t, status):
        pcm = player.pull(frames * 2)
        samples = np.frombuffer(pcm, dtype=np.int16)
        outdata[: len(samples), 0] = samples
        outdata[len(samples):, 0] = 0

    async with websockets.connect(url, open_timeout=20, max_size=None) as ws:
        # Web-call handshake: the engine starts the greeting after "init" (context is set on the server).
        await ws.send(json.dumps({"type": "init", "meta_data": {"context_data": {}}}))
        print("Connected. Neha will greet you in a moment. Speak after she finishes. (Ctrl+C to end)")

        async def send_mic():
            while True:
                chunk = await mic_q.get()
                await ws.send(json.dumps({"type": "audio", "data": base64.b64encode(chunk).decode()}))

        async def send_marks():
            while True:
                name = await mark_q.get()
                await ws.send(json.dumps({"type": "mark", "name": name}))

        async def receive():
            async for raw in ws:
                msg = json.loads(raw)
                kind = msg.get("type")
                if kind == "audio" and msg.get("data"):
                    player.add_audio(strip_wav_header(base64.b64decode(msg["data"])))
                elif kind == "mark":
                    player.add_mark(msg["name"])
                elif kind == "clear":
                    player.clear()
                elif kind == "ack":
                    pass
                elif kind == "text" and msg.get("data"):
                    print("Neha:", msg["data"])
            print("Call ended by Neha.")

        with sd.RawInputStream(samplerate=MIC_RATE, channels=1, dtype="int16", blocksize=MIC_BLOCK,
                               callback=on_mic), \
             sd.OutputStream(samplerate=SPEAKER_RATE, channels=1, dtype="int16", blocksize=1200,
                             callback=on_speaker):
            tasks = [asyncio.create_task(c) for c in (send_mic(), send_marks(), receive())]
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for t in pending:
                t.cancel()
            for t in done:
                if t.exception():
                    raise t.exception()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="ws://localhost:5001/chat/v1/neha")
    args = parser.parse_args()
    try:
        asyncio.run(run(args.url))
    except KeyboardInterrupt:
        print("\nCall ended. The result is saved in data/calls.jsonl (give it a few seconds).")


if __name__ == "__main__":
    main()
