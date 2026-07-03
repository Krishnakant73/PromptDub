import httpx
import numpy as np


class STTClient:
    def __init__(self, base_url: str = "http://localhost:8010"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=5.0)

    async def transcribe(self, pcm_data: bytes, sample_rate: int = 16000) -> dict:
        response = await self.client.post(
            f"{self.base_url}/transcribe",
            content=pcm_data,
            headers={
                "Content-Type": "application/octet-stream",
                "X-Sample-Rate": str(sample_rate),
            },
        )
        response.raise_for_status()
        return response.json()
