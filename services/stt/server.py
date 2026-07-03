import logging
import os
import numpy as np
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("promptdub.stt")

app = FastAPI(title="PromptDub STT Service", version="0.2.0")

models = {}

MODEL_CONFIGS = {
    "fast": {
        "model": "base",
        "compute_type": "int8",
        "description": "Fast mode - lower latency, good accuracy",
    },
    "balanced": {
        "model": "small",
        "compute_type": "int8",
        "description": "Balanced mode - good latency, better accuracy",
    },
    "quality": {
        "model": "deepdml/faster-whisper-large-v3-turbo-ct2",
        "compute_type": "int8",
        "description": "Quality mode - higher latency, best accuracy",
    },
}

INFERENCE_CONFIGS = {
    "fast": {
        "beam_size": 1,
        "best_of": 1,
        "language": None,
        "condition_on_previous_text": False,
        "vad_filter": True,
        "vad_parameters": {
            "threshold": 0.5,
            "min_silence_duration_ms": 300,
        },
    },
    "balanced": {
        "beam_size": 1,
        "best_of": 1,
        "language": None,
        "condition_on_previous_text": False,
        "vad_filter": True,
        "vad_parameters": {
            "threshold": 0.5,
            "min_silence_duration_ms": 300,
            "min_speech_duration_ms": 250,
            "speech_pad_ms": 100,
        },
    },
    "quality": {
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
    },
}


@app.on_event("startup")
async def startup():
    default_mode = os.environ.get("STT_MODE", "quality")

    if default_mode == "all":
        for mode, config in MODEL_CONFIGS.items():
            try:
                logger.info(f"Loading STT model for {mode} mode: {config['model']}...")
                models[mode] = WhisperModel(
                    config["model"],
                    device="cuda",
                    compute_type=config["compute_type"],
                    cpu_threads=4,
                    num_workers=2,
                )
                logger.info(f"  {mode} model loaded.")
            except Exception as e:
                logger.warning(f"  Failed to load {mode} model: {e}")
    else:
        config = MODEL_CONFIGS.get(default_mode, MODEL_CONFIGS["quality"])
        try:
            logger.info(f"Loading STT model: {config['model']} ({default_mode} mode)...")
            models[default_mode] = WhisperModel(
                config["model"],
                device="cuda",
                compute_type=config["compute_type"],
                cpu_threads=4,
                num_workers=2,
            )
            logger.info("Model loaded and ready.")
        except Exception as e:
            logger.error(f"Failed to load STT model: {e}")
            raise

    logger.info("STT service ready")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "modes": list(models.keys()),
        "configs": {mode: cfg["description"] for mode, cfg in MODEL_CONFIGS.items()},
    }


@app.get("/modes")
async def get_modes():
    return {
        "modes": MODEL_CONFIGS,
        "loaded": list(models.keys()),
    }


@app.post("/transcribe")
async def transcribe(request: Request):
    sample_rate = int(request.headers.get("X-Sample-Rate", "16000"))
    mode = request.headers.get("X-STT-Mode", "quality")

    if mode not in models:
        available = list(models.keys())
        if available:
            mode = available[-1]  # Use highest quality available
        else:
            return JSONResponse(
                {"error": "No STT models loaded"},
                status_code=503,
            )

    pcm_bytes = await request.body()

    audio = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    if len(audio) < sample_rate * 0.1:
        return JSONResponse({"text": "", "language": "", "segments": []})

    config = INFERENCE_CONFIGS.get(mode, INFERENCE_CONFIGS["quality"])
    segments, info = models[mode].transcribe(audio, **config)

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
        "mode": mode,
    }
