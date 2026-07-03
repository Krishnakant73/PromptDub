import redis.asyncio as redis
import time


class SessionStateManager:
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis = redis.from_url(redis_url, decode_responses=False)

    async def close(self):
        await self.redis.close()

    async def create_session(self, session_id: str, user_id: str, config: dict):
        pipe = self.redis.pipeline()

        session_key = f"session:{session_id}:meta"
        pipe.hset(session_key, mapping={
            b"user_id": user_id.encode(),
            b"source_lang": config["source_lang"].encode(),
            b"target_lang": config["target_lang"].encode(),
            b"platform": config.get("platform", "youtube").encode(),
            b"status": b"initializing",
            b"started_at": str(int(config["started_at"])).encode(),
            b"last_heartbeat": str(int(config["started_at"])).encode(),
            b"chunks_processed": b"0",
        })
        pipe.expire(session_key, 7200)

        user_key = f"user:{user_id}:active_sessions"
        pipe.sadd(user_key, session_id.encode())
        pipe.expire(user_key, 7200)

        await pipe.execute()

    async def end_session(self, session_id: str):
        meta = await self.redis.hgetall(f"session:{session_id}:meta")
        if not meta:
            return

        user_id = meta.get(b"user_id", b"").decode()
        if user_id:
            await self.redis.srem(f"user:{user_id}:active_sessions", session_id.encode())

        keys_to_delete = [
            f"session:{session_id}:meta",
            f"chunks:{session_id}:incoming",
            f"chunks:{session_id}:outgoing",
            f"context:{session_id}:history",
            f"subtitle:{session_id}:current",
            f"metrics:{session_id}:latencies",
        ]
        await self.redis.delete(*keys_to_delete)

    async def store_voice_embedding(self, session_id: str, embedding: bytes):
        pipe = self.redis.pipeline()
        pipe.set(f"speaker:{session_id}:embedding", embedding, ex=3600)
        pipe.set(f"speaker:{session_id}:quality", b"0.72", ex=3600)
        await pipe.execute()

    async def get_voice_embedding(self, session_id: str) -> bytes | None:
        return await self.redis.get(f"speaker:{session_id}:embedding")

    async def update_context_window(self, session_id: str, translated_text: str):
        key = f"context:{session_id}:history"
        pipe = self.redis.pipeline()
        pipe.lpush(key, translated_text.encode("utf-8"))
        pipe.ltrim(key, 0, 4)
        pipe.expire(key, 3600)
        await pipe.execute()

    async def get_context_window(self, session_id: str) -> list[str]:
        items = await self.redis.lrange(f"context:{session_id}:history", 0, 4)
        return [item.decode("utf-8") for item in reversed(items)]

    async def record_latency(self, session_id: str, latency_ms: int, timestamp: float):
        key = f"metrics:{session_id}:latencies"
        pipe = self.redis.pipeline()
        pipe.zadd(key, {str(latency_ms).encode(): timestamp})
        pipe.zremrangebyrank(key, 0, -1001)
        pipe.expire(key, 3600)
        await pipe.execute()

    async def check_rate_limit(self, user_id: str, max_per_minute: int = 120) -> bool:
        key = f"ratelimit:{user_id}:minute"
        current = await self.redis.incr(key)
        if current == 1:
            await self.redis.expire(key, 60)
        return current <= max_per_minute

    async def check_concurrent_sessions(self, user_id: str, max_sessions: int) -> bool:
        count = await self.redis.scard(f"user:{user_id}:active_sessions")
        return (count or 0) < max_sessions

    async def increment_chunks(self, session_id: str):
        await self.redis.hincrby(f"session:{session_id}:meta", b"chunks_processed", 1)

    async def heartbeat(self, session_id: str):
        pipe = self.redis.pipeline()
        pipe.hset(f"session:{session_id}:meta", b"last_heartbeat", str(int(time.time())).encode())
        pipe.expire(f"session:{session_id}:meta", 7200)
        await pipe.execute()
