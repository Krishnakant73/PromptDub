import numpy as np


async def extract_speaker_embedding(audio_bytes: bytes, sample_rate: int = 16000) -> bytes:
    """
    Extract speaker embedding from reference audio.
    In production, this calls the TTS service's embedding endpoint.
    Returns a 768-byte embedding (192 x float32).
    """
    audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    # Placeholder: generate a normalized random embedding
    # Replace with actual CosyVoice 2 speaker encoder call
    embedding = np.random.randn(192).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)

    return embedding.tobytes()


async def refine_embedding(
    existing: bytes, new_sample: bytes, weight: float = 0.3
) -> bytes:
    existing_emb = np.frombuffer(existing, dtype=np.float32).copy()
    new_emb = np.frombuffer(new_sample, dtype=np.float32).copy()

    merged = (1 - weight) * existing_emb + weight * new_emb
    merged = merged / np.linalg.norm(merged)

    return merged.tobytes()
