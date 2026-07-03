import os
from openai import AsyncOpenAI


SYSTEM_PROMPT = """You are a real-time stream translator. Translate the following speech transcript.

RULES:
- Translate naturally, not literally. Preserve the speaker's tone, slang, and intent.
- Keep numbers, proper nouns, brand names, and technical terms as-is when appropriate.
- For gaming/streaming jargon, use the target language's community-accepted terms.
- Output ONLY the translation. No explanations, no notes, no quotes.
- If input is unclear or partial, translate what you can. Never output "I cannot translate".
- Preserve emotional markers: excitement (!), questions (?), hesitation (...).
- Match the register: casual speech stays casual, formal stays formal."""


class TranslationClient:
    def __init__(self, base_url: str = None):
        base_url = base_url or os.environ.get("LLM_SERVICE_URL", "http://localhost:8001/v1")
        api_key = os.environ.get("LLM_API_KEY", "not-needed")
        self.client = AsyncOpenAI(base_url=base_url, api_key=api_key)
        self.model = os.environ.get("LLM_MODEL", "Qwen/Qwen3-8B")

    async def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        context_window: list[str] | None = None,
    ) -> str:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        user_content = f"Translate from {source_lang} to {target_lang}:\n{text}"
        if context_window:
            context_str = "\n".join(context_window[-3:])
            user_content = f"Previous context:\n{context_str}\n\n{user_content}"

        messages.append({"role": "user", "content": user_content})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=256,
            temperature=0.3,
            top_p=0.9,
        )

        if not response.choices or response.choices[0].message.content is None:
            raise ValueError("Empty LLM response")

        return response.choices[0].message.content.strip()

    async def close(self):
        await self.client.close()
