import json
import os
import struct
import logging
import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, Response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("promptdub.tts")

app = FastAPI(title="PromptDub TTS Service", version="0.4.0")

cosyvoice_model = None
svara_model = None
svara_tokenizer = None

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

INDIC_LANGUAGES = {
    "hi": "Hindi", "bn": "Bengali", "mr": "Marathi", "te": "Telugu",
    "kn": "Kannada", "ta": "Tamil", "ml": "Malayalam", "gu": "Gujarati",
    "pa": "Punjabi", "as": "Assamese", "ne": "Nepali", "sa": "Sanskrit",
}

TTS_LANG_MAP = {
    "hi": "Chinese", "en": "English", "ja": "Japanese", "ko": "Korean",
    "de": "German", "es": "Spanish", "fr": "French", "it": "Italian",
    "ru": "Russian", "zh": "Chinese",
}

MODE_CONFIGS = {
    "fast": {
        "use_svara": True,
        "use_cosyvoice": False,
        "speed": 1.2,
        "description": "Fast mode - lowest latency",
    },
    "balanced": {
        "use_svara": True,
        "use_cosyvoice": True,
        "speed": 1.0,
        "description": "Balanced mode - good quality and speed",
    },
    "quality": {
        "use_svara": True,
        "use_cosyvoice": True,
        "speed": 1.0,
        "description": "Quality mode - best quality",
    },
}


@app.on_event("startup")
async def startup():
    global cosyvoice_model, svara_model, svara_tokenizer

    tts_provider = os.environ.get("TTS_PROVIDER", "cosyvoice")
    load_all = os.environ.get("TTS_LOAD_ALL", "false").lower() == "true"

    if tts_provider in ("cosyvoice", "both") or load_all:
        try:
            from cosyvoice.cli.cosyvoice import CosyVoice3
            model_dir = os.environ.get("COSYVOICE_MODEL_DIR", "pretrained_models/Fun-CosyVoice3-0.5B")
            cosyvoice_model = CosyVoice3(model_dir, load_jit=True, load_trt=False)
            logger.info(f"CosyVoice3 loaded from {model_dir}")
        except ImportError:
            try:
                from cosyvoice.cli.cosyvoice import CosyVoice2
                model_dir = os.environ.get("COSYVOICE_MODEL_DIR", "pretrained_models/CosyVoice2-0.5B")
                cosyvoice_model = CosyVoice2(model_dir, load_jit=True, load_trt=False)
                logger.info(f"CosyVoice2 loaded from {model_dir}")
            except Exception as e:
                logger.warning(f"CosyVoice not available: {e}")
        except Exception as e:
            logger.warning(f"CosyVoice3 not available: {e}")

    if tts_provider in ("svara", "both") or load_all:
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            model_name = os.environ.get("SVARATTS_MODEL", "kenpath/svara-tts-v1")
            logger.info(f"Loading Svara-TTS model: {model_name}...")
            svara_tokenizer = AutoTokenizer.from_pretrained(model_name)
            svara_model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16,
                device_map="auto",
            )
            logger.info(f"Svara-TTS loaded from {model_name}")
        except Exception as e:
            logger.warning(f"Svara-TTS not available: {e}")

    logger.info("TTS service ready")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "cosyvoice": cosyvoice_model is not None,
        "svara": svara_model is not None,
        "modes": list(MODE_CONFIGS.keys()),
    }


@app.get("/modes")
async def get_modes():
    return {
        "modes": MODE_CONFIGS,
        "available": {
            "cosyvoice": cosyvoice_model is not None,
            "svara": svara_model is not None,
        },
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
    speed = metadata.get("speed", 1.0)
    mode = metadata.get("mode", "quality")

    mode_config = MODE_CONFIGS.get(mode, MODE_CONFIGS["quality"])

    async def generate_audio():
        use_svara = target_lang in INDIC_LANGUAGES and svara_model is not None
        use_cosyvoice = cosyvoice_model is not None

        if use_svara and (mode_config["use_svara"] or not use_cosyvoice):
            try:
                emotion_prefix = SVARA_EMOTION_MAP.get(emotion, "")
                full_text = f"{emotion_prefix}{text}"

                lang_name = INDIC_LANGUAGES.get(target_lang, "Hindi")
                prompt = f"{lang_name} (Female): {full_text}"

                inputs = svara_tokenizer(prompt, return_tensors="pt").to(svara_model.device)

                with torch.no_grad():
                    outputs = svara_model.generate(
                        **inputs,
                        max_new_tokens=1024,
                        temperature=0.7,
                        top_p=0.9,
                    )

                audio_tokens = svara_tokenizer.decode(
                    outputs[0][inputs["input_ids"].shape[1]:],
                    skip_special_tokens=False,
                )

                if hasattr(svara_model, 'decode_audio'):
                    audio = svara_model.decode_audio(audio_tokens)
                    audio_np = audio.cpu().numpy().squeeze()
                    pcm = (audio_np * 32767).astype(np.int16).tobytes()
                    yield pcm
                else:
                    silence = np.zeros(16000, dtype=np.int16)
                    yield silence.tobytes()

            except Exception as e:
                logger.error(f"Svara-TTS synthesis failed: {e}")
                silence = np.zeros(16000, dtype=np.int16)
                yield silence.tobytes()

        elif use_cosyvoice and embedding_data:
            try:
                emotion_prefix = EMOTION_MAP.get(emotion, "")
                full_text = f"{emotion_prefix}{text}"
                embedding_tensor = torch.frombuffer(embedding_data, dtype=torch.float32)

                mode_speed = mode_config.get("speed", speed)

                for chunk in cosyvoice_model.inference_zero_shot_streaming(
                    tts_text=full_text,
                    prompt_text="",
                    prompt_speech=embedding_tensor,
                    stream=True,
                    speed=mode_speed,
                ):
                    audio = chunk["tts_speech"].squeeze()
                    audio_16k = torchaudio.functional.resample(audio, 24000, 16000)
                    pcm = (audio_16k * 32767).to(torch.int16).numpy().tobytes()
                    yield pcm
            except Exception as e:
                logger.error(f"CosyVoice synthesis failed: {e}")
                silence = np.zeros(16000, dtype=np.int16)
                yield silence.tobytes()
        else:
            silence = np.zeros(16000, dtype=np.int16)
            yield silence.tobytes()

    return StreamingResponse(generate_audio(), media_type="application/octet-stream")


@app.post("/embedding/extract")
async def extract_embedding(request: Request):
    pcm_bytes = await request.body()

    if cosyvoice_model:
        try:
            audio = torch.frombuffer(pcm_bytes, dtype=torch.int16).float() / 32768.0
            embedding = cosyvoice_model.frontend.extract_speaker_embedding(audio, 16000)
            return Response(
                content=embedding.cpu().numpy().tobytes(),
                media_type="application/octet-stream",
            )
        except Exception as e:
            logger.error(f"Embedding extraction failed: {e}")

    embedding = np.random.randn(192).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)
    return Response(
        content=embedding.tobytes(),
        media_type="application/octet-stream",
    )
