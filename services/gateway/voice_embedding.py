import os
import httpx
import numpy as np
import logging

logger = logging.getLogger("promptdub.voice_embedding")

TTS_SERVICE_URL = os.environ.get("TTS_SERVICE_URL", "http://localhost:8020")


async def extract_speaker_embedding(audio_bytes: bytes, sample_rate: int = 16000) -> bytes:
    """
    Extract speaker embedding from reference audio via TTS service.
    Returns a 768-byte embedding (192 x float32).
    Falls back to a placeholder if TTS service is unavailable.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{TTS_SERVICE_URL}/embedding/extract",
                content=audio_bytes,
                headers={
                    "Content-Type": "application/octet-stream",
                    "X-Sample-Rate": str(sample_rate),
                },
            )
            response.raise_for_status()
            embedding = np.frombuffer(response.content, dtype=np.float32)
            if embedding.shape[0] == 192:
                embedding = embedding / np.linalg.norm(embedding)
                return embedding.tobytes()
            logger.warning(f"Unexpected embedding shape: {embedding.shape}, falling back to placeholder")
    except Exception as e:
        logger.warning(f"TTS embedding extraction failed: {e}, using placeholder")

    audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    if len(audio_np) > 0:
        embedding = np.random.randn(192).astype(np.float32)
        embedding = embedding / np.linalg.norm(embedding)
        return embedding.tobytes()

    return np.zeros(192, dtype=np.float32).tobytes()


async def refine_embedding(
    existing: bytes, new_sample: bytes, weight: float = 0.3
) -> bytes:
    existing_emb = np.frombuffer(existing, dtype=np.float32).copy()
    new_emb = np.frombuffer(new_sample, dtype=np.float32).copy()

    if existing_emb.shape[0] != 192 or new_emb.shape[0] != 192:
        logger.warning("Invalid embedding dimensions, returning existing")
        return existing

    merged = (1 - weight) * existing_emb + weight * new_emb
    norm = np.linalg.norm(merged)
    if norm > 0:
        merged = merged / norm

    return merged.tobytes()
