import os
import httpx
from typing import AsyncIterator


class TTSClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.environ.get("TTS_SERVICE_URL", "http://localhost:8020")
        self.client = httpx.AsyncClient(timeout=10.0)

    async def synthesize_streaming(
        self,
        text: str,
        speaker_embedding: bytes | None,
        emotion: str = "neutral",
        target_lang: str = "en",
        speed: float = 1.0,
        mode: str = "quality",
    ) -> AsyncIterator[bytes]:
        async with self.client.stream(
            "POST",
            f"{self.base_url}/synthesize/stream",
            content=self._build_request(text, speaker_embedding, emotion, target_lang, speed, mode),
            headers={"Content-Type": "application/octet-stream"},
        ) as response:
            response.raise_for_status()
            async for chunk in response.aiter_bytes(chunk_size=4096):
                yield chunk

    def _build_request(
        self,
        text: str,
        speaker_embedding: bytes | None,
        emotion: str,
        target_lang: str,
        speed: float = 1.0,
        mode: str = "quality",
    ) -> bytes:
        import json
        import struct

        metadata = json.dumps({
            "text": text,
            "emotion": emotion,
            "target_lang": target_lang,
            "has_embedding": speaker_embedding is not None,
            "speed": speed,
            "mode": mode,
        }).encode("utf-8")

        meta_len = struct.pack("<I", len(metadata))
        embedding_data = speaker_embedding or b""

        return meta_len + metadata + embedding_data

    async def close(self):
        await self.client.aclose()
