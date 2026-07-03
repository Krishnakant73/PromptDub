import logging
import numpy as np
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("promptdub.stt")

app = FastAPI(title="PromptDub STT Service", version="0.1.0")

model: WhisperModel = None

INFERENCE_CONFIG = {
    "beam_size": 1,
    "best_of": 1,
    "patience": 1.0,
    "language": None,
    "condition_on_previous_text": False,
    "compression_ratio_threshold": 2.4,
    "log_prob_threshold": -1.0,
    "no_speech_threshold": 0.6,
    "word_timestamps": True,
    "vad_filter": True,
    "vad_parameters": {
        "threshold": 0.5,
        "min_silence_duration_ms": 300,
        "min_speech_duration_ms": 250,
        "speech_pad_ms": 100,
    },
}


@app.on_event("startup")
async def startup():
    global model
    logger.info("Loading Faster-Whisper large-v3-turbo INT8...")
    model = WhisperModel(
        "large-v3-turbo",
        device="cuda",
        compute_type="int8",
        cpu_threads=4,
        num_workers=2,
    )
    logger.info("Model loaded and ready")


@app.get("/health")
async def health():
    return {"status": "ok", "model": "large-v3-turbo", "compute_type": "int8"}


@app.post("/transcribe")
async def transcribe(request: Request):
    sample_rate = int(request.headers.get("X-Sample-Rate", "16000"))
    pcm_bytes = await request.body()

    audio = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    if len(audio) < sample_rate * 0.1:
        return JSONResponse({"text": "", "language": "", "segments": []})

    segments, info = model.transcribe(audio, **INFERENCE_CONFIG)

    result_segments = []
    full_text = ""

    for segment in segments:
        full_text += segment.text
        result_segments.append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text.strip(),
            "words": [
                {
                    "word": w.word,
                    "start": w.start,
                    "end": w.end,
                    "probability": w.probability,
                }
                for w in (segment.words or [])
            ],
        })

    return {
        "text": full_text.strip(),
        "language": info.language,
        "language_probability": info.language_probability,
        "segments": result_segments,
        "duration": info.duration,
    }
