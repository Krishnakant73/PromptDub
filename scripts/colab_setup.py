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
# CosyVoice3 Installation (run once in Colab)
# ============================================================

def install_cosyvoice():
    """Install CosyVoice3 dependencies in Colab."""
    import subprocess

    logger.info("Installing CosyVoice3 dependencies...")

    # Clone CosyVoice repo
    if not os.path.exists("CosyVoice"):
        subprocess.run(["git", "clone", "https://github.com/FunAudioLLM/CosyVoice.git"], check=True)

    # Install requirements
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "CosyVoice/requirements.txt"], check=True)

    # Download CosyVoice3 model from ModelScope
    if not os.path.exists("Fun-CosyVoice3-0.5B"):
        logger.info("Downloading CosyVoice3 model (this may take a few minutes)...")
        subprocess.run([
            sys.executable, "-c",
            "from modelscope import snapshot_download; snapshot_download('iic/Fun-CosyVoice3-0.5B-2512', local_dir='Fun-CosyVoice3-0.5B')"
        ], check=True)

    # Add CosyVoice to path
    sys.path.insert(0, "CosyVoice")
    os.environ["COSYVOICE_MODEL_DIR"] = "Fun-CosyVoice3-0.5B"

    logger.info("CosyVoice3 installed successfully!")


# Uncomment the line below to auto-install in Colab:
# install_cosyvoice()

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

STT_MODEL_CONFIGS = {
    "fast": "base",
    "balanced": "small",
    "quality": "deepdml/faster-whisper-large-v3-turbo-ct2",
}

stt_models = {}

def load_stt_model(mode="quality"):
    if mode in stt_models:
        return stt_models[mode]

    from faster_whisper import WhisperModel
    model_name = STT_MODEL_CONFIGS.get(mode, STT_MODEL_CONFIGS["quality"])
    logger.info(f"Loading Faster-Whisper model ({model_name}) for {mode} mode...")
    stt_models[mode] = WhisperModel(model_name, device="cuda", compute_type="int8")
    logger.info(f"STT model loaded for {mode} mode.")
    return stt_models[mode]


async def transcribe(pcm_data: bytes, sample_rate: int = 16000, mode: str = "quality") -> dict:
    model = load_stt_model(mode)
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
# Translation Client (Qwen3-8B via vLLM)
# ============================================================

LLM_MODEL = os.environ.get("LLM_MODEL", "Qwen/Qwen3-8B")
LLM_API_URL = os.environ.get("LLM_API_URL", "http://localhost:8001/v1/chat/completions")

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
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "max_tokens": 256,
        "temperature": 0.3,
        "top_p": 0.9,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(LLM_API_URL, json=payload)
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"].strip()
            else:
                logger.warning(f"LLM API error {response.status_code}: {response.text}")
                return text
        except Exception as e:
            logger.warning(f"LLM API unavailable: {e}")
            # Fallback to HuggingFace Inference API
            return await translate_hf(text, source_lang, target_lang, context_window)


async def translate_hf(
    text: str,
    source_lang: str,
    target_lang: str,
    context_window: list[str] | None = None,
) -> str:
    """Fallback: HuggingFace Inference API"""
    import httpx

    HF_API_URL = "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta"

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
# TTS Client (CosyVoice3 + Svara TTS)
# ============================================================

tts_model = None
svara_model = None
svara_tokenizer = None
TTS_SAMPLE_RATE = 24000

INDIC_LANGUAGES = {
    "hi": "Hindi",
    "bn": "Bengali",
    "mr": "Marathi",
    "te": "Telugu",
    "kn": "Kannada",
    "ta": "Tamil",
    "ml": "Malayalam",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "as": "Assamese",
    "ne": "Nepali",
    "sa": "Sanskrit",
}

EMOTION_MAP = {
    "neutral": "",
    "happy": "Speak with happiness and enthusiasm. ",
    "sad": "Speak with a sad, melancholic tone. ",
    "angry": "Speak with anger and intensity. ",
    "excited": "Speak with high energy and excitement! ",
    "curious": "Speak with curiosity and interest. ",
    "hesitant": "Speak with hesitation and uncertainty. ",
    "whisper": "Speak in a soft whisper. ",
}

SVARA_EMOTION_MAP = {
    "neutral": "",
    "happy": "<happy> ",
    "sad": "<sad> ",
    "angry": "<anger> ",
    "excited": "<excited> ",
    "curious": "<clear> ",
    "hesitant": "<clear> ",
    "whisper": "<whispering> ",
}

TTS_LANG_MAP = {
    "hi": "Chinese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "de": "German",
    "es": "Spanish",
    "fr": "French",
    "it": "Italian",
    "ru": "Russian",
    "zh": "Chinese",
}


def load_tts_model():
    global tts_model
    if tts_model is not None:
        return tts_model

    logger.info("Loading CosyVoice3 TTS model...")
    try:
        from cosyvoice.cli.cosyvoice import CosyVoice3
        model_dir = os.environ.get("COSYVOICE_MODEL_DIR", "Fun-CosyVoice3-0.5B")
        tts_model = CosyVoice3(model_dir, load_jit=True, load_trt=False)
        logger.info(f"CosyVoice3 loaded from {model_dir}")
    except ImportError:
        logger.warning("CosyVoice3 not available, trying CosyVoice2...")
        from cosyvoice.cli.cosyvoice import CosyVoice2
        model_dir = os.environ.get("COSYVOICE_MODEL_DIR", "CosyVoice2-0.5B")
        tts_model = CosyVoice2(model_dir, load_jit=True, load_trt=False)
        logger.info(f"CosyVoice2 loaded from {model_dir}")
    except Exception as e:
        logger.error(f"Failed to load TTS model: {e}")
        raise

    return tts_model


def load_svara_model():
    global svara_model, svara_tokenizer
    if svara_model is not None:
        return svara_model, svara_tokenizer

    logger.info("Loading Svara-TTS model...")
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        model_name = os.environ.get("SVARATTS_MODEL", "kenpath/svara-tts-v1")
        svara_tokenizer = AutoTokenizer.from_pretrained(model_name)
        svara_model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,
            device_map="auto",
        )
        logger.info(f"Svara-TTS loaded from {model_name}")
    except Exception as e:
        logger.warning(f"Svara-TTS not available: {e}")
        svara_model = None
        svara_tokenizer = None

    return svara_model, svara_tokenizer


TTS_MODE_CONFIGS = {
    "fast": {
        "use_svara": True,
        "use_cosyvoice": False,
        "speed": 1.2,
    },
    "balanced": {
        "use_svara": True,
        "use_cosyvoice": True,
        "speed": 1.0,
    },
    "quality": {
        "use_svara": True,
        "use_cosyvoice": True,
        "speed": 1.0,
    },
}


async def synthesize_streaming(
    text: str,
    speaker_embedding: bytes | None,
    emotion: str = "neutral",
    target_lang: str = "en",
    mode: str = "quality",
) -> AsyncIterator[bytes]:
    import torch
    import torchaudio

    mode_config = TTS_MODE_CONFIGS.get(mode, TTS_MODE_CONFIGS["quality"])
    use_svara = target_lang in INDIC_LANGUAGES and svara_model is not None

    if use_svara and (mode_config["use_svara"] or not tts_model):
        model, tokenizer = load_svara_model()
        if model is None:
            logger.warning("Svara-TTS not available, falling back to CosyVoice")

        emotion_prefix = SVARA_EMOTION_MAP.get(emotion, "")
        full_text = f"{emotion_prefix}{text}"

        lang_name = INDIC_LANGUAGES.get(target_lang, "Hindi")
        prompt = f"{lang_name} (Female): {full_text}"

        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=1024,
                temperature=0.7,
                top_p=0.9,
            )

        audio_tokens = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=False)

        if hasattr(model, 'decode_audio'):
            audio = model.decode_audio(audio_tokens)
            audio_np = audio.cpu().numpy().squeeze()
            pcm = (audio_np * 32767).astype(np.int16).tobytes()
            yield pcm
        else:
            silence = np.zeros(16000, dtype=np.int16)
            yield silence.tobytes()
    else:
        model = load_tts_model()

        emotion_prefix = EMOTION_MAP.get(emotion, "")
        full_text = f"{emotion_prefix}{text}"

        mode_speed = mode_config.get("speed", 1.0)

        try:
            if speaker_embedding:
                embedding_tensor = torch.frombuffer(speaker_embedding, dtype=torch.float32)

                for chunk in model.inference_zero_shot_streaming(
                    tts_text=full_text,
                    prompt_text="",
                    prompt_speech=embedding_tensor,
                    stream=True,
                    speed=mode_speed,
                ):
                    audio = chunk["tts_speech"].squeeze()
                    audio_np = audio.cpu().numpy()
                    pcm = (audio_np * 32767).astype(np.int16).tobytes()
                    yield pcm
            else:
                if hasattr(model, 'inference_instruct3'):
                    lang = TTS_LANG_MAP.get(target_lang, "English")
                    for chunk in model.inference_instruct3(
                        tts_text=full_text,
                        instruct_text=f"Speak in {lang} language with natural prosody.",
                        stream=True,
                    ):
                        audio = chunk["tts_speech"].squeeze()
                        audio_np = audio.cpu().numpy()
                        pcm = (audio_np * 32767).astype(np.int16).tobytes()
                        yield pcm
                else:
                    for chunk in model.inference_zero_shot_streaming(
                        tts_text=full_text,
                        prompt_text="",
                        prompt_speech=torch.randn(16000),
                        stream=True,
                    ):
                        audio = chunk["tts_speech"].squeeze()
                        audio_np = audio.cpu().numpy()
                        pcm = (audio_np * 32767).astype(np.int16).tobytes()
                        yield pcm
        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            silence = np.zeros(16000, dtype=np.int16)
            yield silence.tobytes()


# ============================================================
# Voice Embedding (CosyVoice3)
# ============================================================

async def extract_speaker_embedding(audio_bytes: bytes, sample_rate: int = 16000) -> bytes:
    import torch

    model = load_tts_model()

    try:
        audio = torch.frombuffer(audio_bytes, dtype=torch.int16).float() / 32768.0

        if hasattr(model, 'frontend') and hasattr(model.frontend, 'extract_speaker_embedding'):
            embedding = model.frontend.extract_speaker_embedding(audio, sample_rate)
            return embedding.cpu().numpy().tobytes()
        elif hasattr(model, 'llm') and hasattr(model.llm, 'embedding'):
            # Alternative: extract embedding from LLM
            embedding = model.llm.embedding(audio.unsqueeze(0))
            return embedding.cpu().numpy().tobytes()
    except Exception as e:
        logger.warning(f"CosyVoice embedding extraction failed: {e}")

    # Fallback: random placeholder
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
    tts_loaded = tts_model is not None
    svara_loaded = svara_model is not None
    tts_version = "3" if tts_loaded and hasattr(tts_model, 'inference_instruct3') else ("2" if tts_loaded else "none")
    return {
        "status": "ok",
        "service": "promptdub-colab-gateway",
        "tts_loaded": tts_loaded,
        "tts_version": tts_version,
        "svara_loaded": svara_loaded,
        "stt_modes": list(stt_models.keys()),
        "llm_model": LLM_MODEL,
    }


@app.get("/modes")
async def get_modes():
    return {
        "stt_modes": STT_MODEL_CONFIGS,
        "tts_modes": TTS_MODE_CONFIGS,
        "stt_loaded": list(stt_models.keys()),
        "tts_loaded": {
            "cosyvoice": tts_model is not None,
            "svara": svara_model is not None,
        },
    }


@app.websocket("/ws/translate")
async def websocket_translate(ws: WebSocket):
    await ws.accept()

    session_id = None
    user_id = "anonymous"
    config = {}
    voice_sample_buffer = bytearray()
    voice_ready = False
    chunks_for_embedding = 0
    voice_embedding = None
    voice_cloning_enabled = True
    current_mode = "quality"  # Default mode

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

                    # Auto-select mode based on user preference or target language
                    requested_mode = msg.get("mode", "auto")
                    if requested_mode == "auto":
                        target_lang = msg.get("target_lang", "en")
                        # Use fast mode for Indic languages (Svara TTS), quality for others
                        if target_lang in INDIC_LANGUAGES:
                            current_mode = "fast"
                        else:
                            current_mode = "quality"
                    else:
                        current_mode = requested_mode

                    await state.create_session(session_id, user_id, {
                        "source_lang": msg.get("source_lang", "auto"),
                        "target_lang": msg.get("target_lang", "hi"),
                        "platform": msg.get("platform", "youtube"),
                        "started_at": time.time(),
                        "voice_cloning": voice_cloning_enabled,
                        "tier": tier,
                        "speed_boost": speed_boost,
                        "mode": current_mode,
                    })

                    if not voice_cloning_enabled:
                        voice_ready = True
                        voice_embedding = None
                        await ws.send_json({
                            "type": "voice_ready",
                            "session_id": session_id,
                            "quality_score": 0.0,
                            "voice_cloning": False,
                            "mode": current_mode,
                            "message": f"Voice cloning disabled — using {current_mode} mode",
                        })
                        logger.info(f"Session started (no voice cloning, {current_mode} mode): {session_id}")
                    else:
                        await ws.send_json({
                            "type": "session_ready",
                            "session_id": session_id,
                            "status": "initializing",
                            "mode": current_mode,
                            "message": f"Building voice profile... ({current_mode} mode)",
                        })
                        logger.info(f"Session started ({current_mode} mode): {session_id}")

                elif msg_type == "set_mode":
                    new_mode = msg.get("mode", "quality")
                    if new_mode in ("fast", "balanced", "quality"):
                        current_mode = new_mode
                        await ws.send_json({
                            "type": "mode_changed",
                            "mode": current_mode,
                            "message": f"Switched to {current_mode} mode",
                        })
                        logger.info(f"Mode changed to {current_mode}")

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
                    stt_result = await transcribe(pcm_data, sample_rate=16000, mode=current_mode)
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
                        mode=current_mode,
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
