import os
import httpx


class STTClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.environ.get("STT_SERVICE_URL", "http://localhost:8010")
        self.client = httpx.AsyncClient(timeout=5.0)

    async def transcribe(self, pcm_data: bytes, sample_rate: int = 16000, mode: str = "quality") -> dict:
        response = await self.client.post(
            f"{self.base_url}/transcribe",
            content=pcm_data,
            headers={
                "Content-Type": "application/octet-stream",
                "X-Sample-Rate": str(sample_rate),
                "X-STT-Mode": mode,
            },
        )
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self.client.aclose()
