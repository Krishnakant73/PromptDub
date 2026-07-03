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
    def __init__(self, base_url: str = "http://localhost:8001/v1"):
        self.client = AsyncOpenAI(base_url=base_url, api_key="not-needed")
        self.model = "Qwen/Qwen2.5-7B-Instruct-AWQ"

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

        return response.choices[0].message.content.strip()
