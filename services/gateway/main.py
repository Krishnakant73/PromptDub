import asyncio
import os
import struct
import time
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from redis_state import SessionStateManager
from stt_client import STTClient
from translation_client import TranslationClient
from tts_client import TTSClient
from voice_embedding import extract_speaker_embedding, refine_embedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("promptdub.gateway")

state: SessionStateManager = None
stt_client: STTClient = None
translation_client: TranslationClient = None
tts_client: TTSClient = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global state, stt_client, translation_client, tts_client
    state = SessionStateManager()
    stt_client = STTClient()
    translation_client = TranslationClient()
    tts_client = TTSClient()
    logger.info("PromptDub Gateway started")
    yield
    await stt_client.close()
    await translation_client.close()
    await tts_client.close()
    await state.close()
    logger.info("PromptDub Gateway stopped")


app = FastAPI(title="PromptDub Gateway", version="0.1.0", lifespan=lifespan)

cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "promptdub-gateway"}


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
    current_mode = "quality"

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
                    current_mode = msg.get("mode", "quality")

                    await state.create_session(session_id, user_id, {
                        "source_lang": msg.get("source_lang", "auto"),
                        "target_lang": msg.get("target_lang", "hi"),
                        "platform": msg.get("platform", "youtube"),
                        "started_at": time.time(),
                        "voice_cloning": voice_cloning_enabled,
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

                elif msg_type == "session_resume":
                    session_id = msg["session_id"]
                    session_data = await state.get_session(session_id)
                    if session_data:
                        voice_cloning_enabled = session_data.get("voice_cloning", True)
                        config = session_data
                    voice_embedding = await state.get_voice_embedding(session_id)
                    if voice_embedding:
                        voice_ready = True
                        await ws.send_json({
                            "type": "voice_ready",
                            "session_id": session_id,
                            "quality_score": 0.78,
                            "voice_cloning": voice_cloning_enabled,
                            "message": "Session resumed with existing voice profile",
                        })
                    elif not voice_cloning_enabled:
                        voice_ready = True
                        await ws.send_json({
                            "type": "voice_ready",
                            "session_id": session_id,
                            "quality_score": 0.0,
                            "voice_cloning": False,
                            "message": "Session resumed (voice cloning disabled)",
                        })
                    logger.info(f"Session resumed: {session_id}")

                elif msg_type == "session_end":
                    if session_id:
                        await state.end_session(session_id)
                        logger.info(f"Session ended: {session_id}")
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
                        "message": "Rate limit exceeded. Please upgrade your plan.",
                    })
                    continue

                # Phase 1: Voice embedding collection (first 5 seconds)
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
                                "voice_cloning": voice_cloning_enabled,
                                "message": "Voice profile ready! Starting translation...",
                            })
                            logger.info(f"Voice embedding ready for session {session_id}")
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

                # Phase 2: Full pipeline (STT → Translation → TTS)
                try:
                    stt_result = await stt_client.transcribe(pcm_data, sample_rate=16000, mode=current_mode)
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
                    translated_text = await translation_client.translate(
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
                    async for audio_chunk in tts_client.synthesize_streaming(
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
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        if session_id:
            await state.end_session(session_id)
