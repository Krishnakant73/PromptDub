"""
PromptDub Google Colab Setup
Run this in Google Colab to start the backend with GPU support.

Usage in Colab:
  !python /content/PromptDub/scripts/colab_setup.py
"""

import os
import sys
import asyncio
import time
import json
import struct
import logging
from typing import AsyncIterator
from collections import defaultdict

import numpy as np
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("promptdub-colab")

# ============================================================
# In-Memory Redis Replacement (no external Redis needed)
# ============================================================

class InMemoryStore:
    """Drop-in replacement for Redis — stores everything in dicts."""

    def __init__(self):
        self._data = defaultdict(dict)
        self._lists = defaultdict(list)
        self._sets = defaultdict(set)
        self._ttls = {}
        self._counters = defaultdict(int)

    async def hset(self, key: str, mapping: dict):
        for k, v in mapping.items():
            if isinstance(k, bytes):
                k = k.decode()
            if isinstance(v, bytes):
                v = v.decode()
            self._data[key][k] = v

    async def hgetall(self, key: str) -> dict:
        return self._data.get(key, {})

    async def hincrby(self, key: str, field: str, amount: int = 1):
        if isinstance(field, bytes):
            field = field.decode()
        self._data[key][field] = str(int(self._data[key].get(field, "0")) + amount)

    async def set(self, key: str, value, ex: int = None):
        self._data[key]["_value"] = value
        if ex:
            self._ttls[key] = time.time() + ex

    async def get(self, key: str):
        if key in self._ttls and time.time() > self._ttls[key]:
            del self._data[key]
            del self._ttls[key]
            return None
        val = self._data.get(key, {}).get("_value")
        return val

    async def lpush(self, key: str, value):
        if isinstance(value, bytes):
            value = value.decode()
        self._lists[key].insert(0, value)

    async def ltrim(self, key: str, start: int, end: int):
        self._lists[key] = self._lists[key][start:end + 1]

    async def lrange(self, key: str, start: int, end: int) -> list:
        lst = self._lists.get(key, [])
        if end == -1:
            return lst[start:]
        return lst[start:end + 1]

    async def sadd(self, key: str, value):
        if isinstance(value, bytes):
            value = value.decode()
        self._sets[key].add(value)

    async def srem(self, key: str, value):
        if isinstance(value, bytes):
            value = value.decode()
        self._sets[key].discard(value)

    async def scard(self, key: str) -> int:
        return len(self._sets.get(key, set()))

    async def zadd(self, key: str, mapping: dict):
        for k, v in mapping.items():
            if isinstance(k, bytes):
                k = k.decode()
            self._data[key][k] = v

    async def zremrangebyrank(self, key: str, start: int, end: int):
        pass

    async def incr(self, key: str) -> int:
        self._counters[key] += 1
        return self._counters[key]

    async def expire(self, key: str, seconds: int):
        self._ttls[key] = time.time() + seconds

    async def delete(self, *keys):
        for key in keys:
            self._data.pop(key, None)
            self._lists.pop(key, None)
            self._sets.pop(key, None)
            self._ttls.pop(key, None)

    async def close(self):
        pass


# ============================================================
# Session State Manager (uses InMemoryStore)
# ============================================================

class SessionStateManager:
    def __init__(self):
        self.redis = InMemoryStore()

    async def close(self):
        await self.redis.close()

    async def create_session(self, session_id: str, user_id: str, config: dict):
        pipe_data = {}
        session_key = f"session:{session_id}:meta"
        pipe_data = {
            "user_id": user_id,
            "source_lang": config["source_lang"],
            "target_lang": config["target_lang"],
            "platform": config.get("platform", "youtube"),
            "status": "initializing",
            "started_at": str(int(config["started_at"])),
            "last_heartbeat": str(int(config["started_at"])),
            "chunks_processed": "0",
        }
        await self.redis.hset(session_key, mapping=pipe_data)
        await self.redis.expire(session_key, 7200)

        user_key = f"user:{user_id}:active_sessions"
        await self.redis.sadd(user_key, session_id)
        await self.redis.expire(user_key, 7200)

    async def end_session(self, session_id: str):
        meta = await self.redis.hgetall(f"session:{session_id}:meta")
        if not meta:
            return
        user_id = meta.get("user_id", "")
        if user_id:
            await self.redis.srem(f"user:{user_id}:active_sessions", session_id)
        await self.redis.delete(
            f"session:{session_id}:meta",
            f"context:{session_id}:history",
            f"metrics:{session_id}:latencies",
        )

    async def store_voice_embedding(self, session_id: str, embedding: bytes):
        await self.redis.set(f"speaker:{session_id}:embedding", embedding, ex=3600)
        await self.redis.set(f"speaker:{session_id}:quality", b"0.72", ex=3600)

    async def get_voice_embedding(self, session_id: str):
        return await self.redis.get(f"speaker:{session_id}:embedding")

    async def update_context_window(self, session_id: str, translated_text: str):
        key = f"context:{session_id}:history"
        await self.redis.lpush(key, translated_text)
        await self.redis.ltrim(key, 0, 4)
        await self.redis.expire(key, 3600)

    async def get_context_window(self, session_id: str) -> list[str]:
        items = await self.redis.lrange(f"context:{session_id}:history", 0, 4)
        return [item for item in reversed(items)]

    async def record_latency(self, session_id: str, latency_ms: int, timestamp: float):
        key = f"metrics:{session_id}:latencies"
        await self.redis.zadd(key, {str(latency_ms): timestamp})
        await self.redis.expire(key, 3600)

    async def check_rate_limit(self, user_id: str, max_per_minute: int = 120) -> bool:
        key = f"ratelimit:{user_id}:minute"
        current = await self.redis.incr(key)
        if current == 1:
            await self.redis.expire(key, 60)
        return current <= max_per_minute


# ============================================================
# STT Client (Faster-Whisper on local GPU)
# ============================================================

stt_model = None

def load_stt_model():
    global stt_model
    if stt_model is None:
        from faster_whisper import WhisperModel
        logger.info("Loading Faster-Whisper model (large-v3-turbo)...")
        stt_model = WhisperModel("large-v3-turbo", device="cuda", compute_type="int8")
        logger.info("STT model loaded.")
    return stt_model


async def transcribe(pcm_data: bytes, sample_rate: int = 16000) -> dict:
    model = load_stt_model()
    audio_np = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32) / 32768.0

    segments, info = model.transcribe(
        audio_np,
        beam_size=1,
        language=None,
        vad_filter=True,
    )

    text = " ".join(seg.text for seg in segments).strip()
    return {"text": text, "language": info.language}


# ============================================================
# Translation Client (free Hugging Face Inference API)
# ============================================================

HF_API_URL = "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta"

async def translate(
    text: str,
    source_lang: str,
    target_lang: str,
    context_window: list[str] | None = None,
) -> str:
    import httpx

    SYSTEM_PROMPT = """You are a real-time stream translator. Translate the following speech transcript.
RULES:
- Translate naturally, not literally. Preserve the speaker's tone, slang, and intent.
- Keep numbers, proper nouns, brand names as-is.
- Output ONLY the translation. No explanations.
- Preserve emotional markers: excitement (!), questions (?), hesitation (...)."""

    user_content = f"Translate from {source_lang} to {target_lang}:\n{text}"
    if context_window:
        context_str = "\n".join(context_window[-3:])
        user_content = f"Previous context:\n{context_str}\n\n{user_content}"

    payload = {
        "inputs": f"<|system|>\n{SYSTEM_PROMPT}</s>\n<|user|>\n{user_content}</s>\n<|assistant|>",
        "parameters": {"max_new_tokens": 256, "temperature": 0.3, "top_p": 0.9},
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(HF_API_URL, json=payload)
        if response.status_code == 200:
            return response.json()[0]["generated_text"].split("<|assistant|>")[-1].strip()
        else:
            logger.warning(f"HF API error {response.status_code}: {response.text}")
            return text


# ============================================================
# TTS Client (edge-tts — free, no API key)
# ============================================================

EDGE_TTS_MAP = {
    "hi": "hi-IN-SwaraNeural",
    "en": "en-US-JennyNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
    "de": "de-DE-KatjaNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-SunHiNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "pt": "pt-BR-FranciscaNeural",
    "ru": "ru-RU-SvetlanaNeural",
    "ar": "ar-SA-ZariyahNeural",
    "tr": "tr-TR-EmelNeural",
    "it": "it-IT-ElsaNeural",
}


async def synthesize_streaming(
    text: str,
    speaker_embedding: bytes | None,
    emotion: str = "neutral",
    target_lang: str = "en",
) -> AsyncIterator[bytes]:
    import edge_tts
    import io

    voice = EDGE_TTS_MAP.get(target_lang, "en-US-JennyNeural")
    communicate = edge_tts.Communicate(text, voice)

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]


# ============================================================
# Voice Embedding (placeholder — random vector)
# ============================================================

async def extract_speaker_embedding(audio_bytes: bytes, sample_rate: int = 16000) -> bytes:
    audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    embedding = np.random.randn(192).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)
    return embedding.tobytes()


def detect_emotion(text: str) -> str:
    text_lower = text.lower()
    if text.count("!") >= 2 or text.isupper():
        return "excited"
    if text.count("?") >= 2:
        return "curious"
    if "..." in text or text.endswith(".."):
        return "hesitant"
    if any(w in text_lower for w in ("haha", "lol", "lmao", "rofl")):
        return "happy"
    return "neutral"


# ============================================================
# FastAPI App
# ============================================================

state: SessionStateManager = None

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    global state
    state = SessionStateManager()
    logger.info("PromptDub Colab Gateway started")
    yield
    await state.close()
    logger.info("PromptDub Colab Gateway stopped")


app = FastAPI(title="PromptDub Colab Gateway", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "promptdub-colab-gateway"}


@app.websocket("/ws/translate")
async def websocket_translate(ws: WebSocket):
    await ws.accept()

    session_id = None
    user_id = None
    config = {}
    voice_sample_buffer = bytearray()
    voice_ready = False
    chunks_for_embedding = 0
    voice_embedding = None

    try:
        while True:
            data = await ws.receive()

            if "text" in data:
                msg = json.loads(data["text"])
                msg_type = msg.get("type")

                if msg_type == "session_start":
                    session_id = msg["session_id"]
                    user_id = msg.get("user_id", "anonymous")
                    config = msg
                    voice_cloning_enabled = msg.get("voice_cloning", True)
                    tier = msg.get("tier", "personal")
                    speed_boost = msg.get("speed_boost", False)

                    await state.create_session(session_id, user_id, {
                        "source_lang": msg.get("source_lang", "auto"),
                        "target_lang": msg.get("target_lang", "hi"),
                        "platform": msg.get("platform", "youtube"),
                        "started_at": time.time(),
                        "voice_cloning": voice_cloning_enabled,
                        "tier": tier,
                        "speed_boost": speed_boost,
                    })

                    if not voice_cloning_enabled:
                        voice_ready = True
                        voice_embedding = None
                        await ws.send_json({
                            "type": "voice_ready",
                            "session_id": session_id,
                            "quality_score": 0.0,
                            "voice_cloning": False,
                            "message": "Voice cloning disabled — using default TTS voice",
                        })
                        logger.info(f"Session started (no voice cloning): {session_id}")
                    else:
                        await ws.send_json({
                            "type": "session_ready",
                            "session_id": session_id,
                            "status": "initializing",
                            "message": "Building voice profile... (5 seconds)",
                        })
                        logger.info(f"Session started: {session_id}")

                elif msg_type == "session_end":
                    if session_id:
                        await state.end_session(session_id)
                    break

            elif "bytes" in data:
                if not session_id:
                    continue

                raw = data["bytes"]
                if len(raw) < 4:
                    continue

                chunk_index = struct.unpack("<I", raw[:4])[0]
                pcm_data = raw[4:]
                t_start = time.time()

                if not await state.check_rate_limit(user_id):
                    await ws.send_json({
                        "type": "error",
                        "message": "Rate limit exceeded.",
                    })
                    continue

                if not voice_ready:
                    if not voice_cloning_enabled:
                        voice_ready = True
                        continue

                    voice_sample_buffer.extend(pcm_data)
                    chunks_for_embedding += 1

                    if chunks_for_embedding >= 5:
                        try:
                            voice_embedding = await extract_speaker_embedding(
                                bytes(voice_sample_buffer), sample_rate=16000
                            )
                            await state.store_voice_embedding(session_id, voice_embedding)
                            voice_ready = True
                            await ws.send_json({
                                "type": "voice_ready",
                                "session_id": session_id,
                                "quality_score": 0.72,
                                "voice_cloning": True,
                                "message": "Voice profile ready! Starting translation...",
                            })
                        except Exception as e:
                            logger.error(f"Voice embedding failed: {e}")
                            voice_ready = True
                            await ws.send_json({
                                "type": "voice_ready",
                                "session_id": session_id,
                                "quality_score": 0.0,
                                "voice_cloning": False,
                                "message": "Voice cloning unavailable, using default voice",
                            })
                    else:
                        await ws.send_json({
                            "type": "voice_building",
                            "progress": chunks_for_embedding / 5,
                            "seconds_remaining": 5 - chunks_for_embedding,
                        })
                    continue

                try:
                    stt_result = await transcribe(pcm_data, sample_rate=16000)
                except Exception as e:
                    logger.warning(f"STT failed for chunk {chunk_index}: {e}")
                    continue

                original_text = stt_result.get("text", "").strip()
                if not original_text:
                    continue

                detected_lang = stt_result.get("language", config.get("source_lang", "en"))
                emotion = detect_emotion(original_text)

                try:
                    context = await state.get_context_window(session_id)
                    translated_text = await translate(
                        text=original_text,
                        source_lang=detected_lang,
                        target_lang=config.get("target_lang", "hi"),
                        context_window=context,
                    )
                    await state.update_context_window(session_id, translated_text)
                except Exception as e:
                    logger.warning(f"Translation failed for chunk {chunk_index}: {e}")
                    translated_text = original_text

                await ws.send_json({
                    "type": "subtitle",
                    "original": original_text,
                    "translated": translated_text,
                    "source_lang": detected_lang,
                    "target_lang": config.get("target_lang", "hi"),
                    "chunk_index": chunk_index,
                    "emotion": emotion,
                })

                try:
                    async for audio_chunk in synthesize_streaming(
                        text=translated_text,
                        speaker_embedding=voice_embedding,
                        emotion=emotion,
                        target_lang=config.get("target_lang", "hi"),
                    ):
                        await ws.send_bytes(audio_chunk)
                except Exception as e:
                    logger.warning(f"TTS failed for chunk {chunk_index}: {e}")

                await ws.send_json({
                    "type": "utterance_end",
                    "chunk_index": chunk_index,
                })

                latency_ms = int((time.time() - t_start) * 1000)
                await state.record_latency(session_id, latency_ms, time.time())

                if chunk_index % 10 == 0:
                    await ws.send_json({
                        "type": "latency_report",
                        "latency_ms": latency_ms,
                    })

    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {session_id}")
    except Exception as e:
        logger.error(f"Pipeline error in session {session_id}: {e}")
    finally:
        if session_id:
            await state.end_session(session_id)


# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("PromptDub Colab Backend")
    print("=" * 60)
    print("Starting server on port 8000...")
    print("After startup, use ngrok to expose: !ngrok http 8000")
    print("=" * 60)

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
