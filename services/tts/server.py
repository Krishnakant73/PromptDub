import json
import struct
import logging
import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("promptdub.tts")

app = FastAPI(title="PromptDub TTS Service", version="0.1.0")

cosyvoice_model = None
chatterbox_model = None

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


@app.on_event("startup")
async def startup():
    global cosyvoice_model
    logger.info("Loading TTS models...")

    try:
        from cosyvoice.cli.cosyvoice import CosyVoice2
        cosyvoice_model = CosyVoice2("pretrained/CosyVoice2-0.5B", load_jit=True, load_trt=False)
        logger.info("CosyVoice 2 loaded")
    except Exception as e:
        logger.warning(f"CosyVoice 2 not available: {e}")

    logger.info("TTS service ready")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "cosyvoice": cosyvoice_model is not None,
    }


@app.post("/synthesize/stream")
async def synthesize_stream(request: Request):
    body = await request.body()

    meta_len = struct.unpack("<I", body[:4])[0]
    metadata = json.loads(body[4 : 4 + meta_len])
    embedding_data = body[4 + meta_len :] if metadata.get("has_embedding") else None

    text = metadata["text"]
    emotion = metadata.get("emotion", "neutral")
    target_lang = metadata.get("target_lang", "en")

    async def generate_audio():
        emotion_prefix = EMOTION_MAP.get(emotion, "")
        full_text = f"{emotion_prefix}{text}"

        if cosyvoice_model and embedding_data:
            embedding_tensor = torch.frombuffer(embedding_data, dtype=torch.float32)

            for chunk in cosyvoice_model.inference_zero_shot_streaming(
                tts_text=full_text,
                prompt_text="",
                prompt_speech=embedding_tensor,
                stream=True,
                speed=1.0,
            ):
                audio = chunk["tts_speech"].squeeze()
                audio_16k = torchaudio.functional.resample(audio, 24000, 16000)
                pcm = (audio_16k * 32767).to(torch.int16).numpy().tobytes()
                yield pcm
        else:
            # Fallback: generate silence (replace with default TTS)
            silence = np.zeros(16000, dtype=np.int16)
            yield silence.tobytes()

    return StreamingResponse(generate_audio(), media_type="application/octet-stream")


@app.post("/embedding/extract")
async def extract_embedding(request: Request):
    pcm_bytes = await request.body()

    if cosyvoice_model:
        audio = torch.frombuffer(pcm_bytes, dtype=torch.int16).float() / 32768.0
        embedding = cosyvoice_model.frontend.extract_speaker_embedding(audio, 16000)
        return {"embedding": embedding.cpu().numpy().tobytes().hex()}

    # Fallback
    embedding = np.random.randn(192).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)
    return {"embedding": embedding.tobytes().hex()}
