# PromptDub

Real-time AI live stream translation with emotional voice cloning. Hear any stream in your language — with the streamer's own voice and emotions preserved.

## Quick Start

### Prerequisites
- Docker + Docker Compose (with NVIDIA Container Toolkit)
- NVIDIA GPU with CUDA 12.4+ (A10G / 24GB VRAM recommended)
- Chrome 116+ (for extension)
- Node.js 20+ (for web landing page)

### 1. Start Backend Services
```bash
docker compose up -d
```
This starts: Gateway (FastAPI), STT (Faster-Whisper), LLM (vLLM + Qwen-2.5), TTS (CosyVoice 2), Redis (Valkey 8), PostgreSQL 16.

### 2. Load Chrome Extension
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Generate PNG icons first: `node scripts/generate-icons.mjs` (requires `sharp`)

### 3. Run Landing Page (Development)
```bash
cd web
npm install
npm run dev
```
Opens at http://localhost:3000

### 4. Use
1. Open a YouTube or Twitch livestream
2. Click the PromptDub extension icon
3. Select your target language in the popup
4. Wait 5 seconds for voice cloning (collecting reference audio)
5. Enjoy real-time translated audio with the streamer's cloned voice!

## Architecture

```
Browser Tab Audio
      │
      ▼
Chrome Extension (MV3)
├── tabCapture API → AudioWorklet (1s chunks, 200ms overlap)
├── Audio Ducking (original 20%, translated 100%)
├── Dual Subtitle Overlay
└── WebSocket Transport
      │
      ▼
FastAPI Gateway (WebSocket)
├── Phase 1: Voice Embedding (5s collection)
└── Phase 2: Streaming Pipeline
      │
      ├──→ STT (Faster-Whisper large-v3-turbo INT8) ──→ ~30ms
      ├──→ Emotion Detection ──→ ~5ms
      ├──→ Translation (vLLM + Qwen-2.5-7B AWQ) ──→ ~85ms
      └──→ TTS + Voice Clone (CosyVoice 2) ──→ ~150ms
             │
             ▼
      Streaming Audio → Chrome Extension → User
      Total Pipeline: 375–910ms (target < 1500ms)
```

## Tech Stack

| Component | Technology | Latency |
|-----------|-----------|---------|
| STT | Faster-Whisper large-v3-turbo (INT8) | ~30ms |
| Translation | Qwen-2.5-7B-Instruct via vLLM (AWQ INT4) | ~85ms TTFT |
| TTS (Multilingual) | CosyVoice 2 (streaming, voice cloning) | ~150ms |
| TTS (English) | Chatterbox Turbo (MIT license) | ~75ms |
| Backend | Python FastAPI + WebSocket | <5ms |
| Cache | Valkey 8.0 (Redis-compatible) | <1ms |
| Database | PostgreSQL 16 | N/A |
| Extension | Chrome Manifest V3 | N/A |
| Web | React 19 + Vite 6 + Tailwind CSS 4 | N/A |
| Animations | framer-motion 11 | N/A |

All AI models run on a **single NVIDIA A10G** (16GB of 24GB VRAM utilized).

## Project Structure

```
promptdub/
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json           # Permissions: tabCapture, offscreen, storage
│   ├── service-worker.js       # Tab capture orchestration + keep-alive
│   ├── offscreen.html/js       # Audio capture + WebSocket bridge
│   ├── audio-pipeline.js       # AudioDuckingPipeline (ducking + playback)
│   ├── audio-worklet-processor.js  # 1s chunks, 200ms overlap, PCM int16
│   ├── websocket-manager.js    # Reconnecting WebSocket with backoff
│   ├── content-script.js       # Subtitle overlay + platform detection
│   ├── overlay.css             # Subtitle + status pill styling
│   ├── popup/                  # Extension popup UI
│   └── icons/                  # Extension icons (SVG templates)
├── services/
│   ├── gateway/                # FastAPI WebSocket gateway
│   │   ├── main.py             # Full pipeline orchestration
│   │   ├── redis_state.py      # Session state, rate limiting, embeddings
│   │   ├── stt_client.py       # HTTP client for STT service
│   │   ├── translation_client.py   # OpenAI-compatible vLLM client
│   │   ├── tts_client.py       # Streaming TTS client
│   │   └── voice_embedding.py  # Voice embedding extraction/merging
│   ├── stt/                    # Faster-Whisper service
│   │   └── server.py           # VAD + transcription endpoint
│   └── tts/                    # CosyVoice 2 service
│       └── server.py           # Streaming TTS + emotion mapping
├── web/                        # Landing page (React + Vite + Tailwind v4)
│   ├── src/
│   │   ├── components/         # Navbar, Hero, HowItWorks, Features,
│   │   │                       # LanguageGrid, TechStack, Pricing, Footer
│   │   ├── pages/              # LandingPage, PricingPage
│   │   ├── App.tsx             # Router setup
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   └── vite.config.ts
├── migrations/
│   └── 001_initial_schema.sql  # Full PostgreSQL DDL (users, subscriptions,
│                               # sessions, analytics, 23 languages seeded)
├── scripts/
│   └── generate-icons.mjs      # SVG → PNG icon converter
├── docker-compose.yml          # 6-service local dev stack (GPU)
├── PROMPTDUB_SPECIFICATION.md  # Complete technical specification
├── MOBILE_APP_RESEARCH.md      # Mobile app feasibility research
└── .gitignore
```

## Supported Languages (23)

Hindi, Spanish, Portuguese, French, German, Japanese, Korean, Chinese, Arabic, Russian, Italian, Turkish, Vietnamese, Thai, Indonesian, Polish, Dutch, Ukrainian, Malay, Tamil, Bengali, Swedish, Greek

Source language is auto-detected. TTS engine is automatically routed (CosyVoice 2 for multilingual, Chatterbox Turbo for English).

## Key Features

- **Emotional Voice Cloning** — Hear the streamer's voice in your language with emotions preserved
- **Sub-1.5s Latency** — Streaming at every pipeline stage, no waiting for full sentences
- **Dual Subtitles** — Original + translated text overlaid on video
- **Smart Audio Ducking** — Original fades to 20% with smooth 150ms ramps
- **100% Open Source AI** — No proprietary APIs, self-hostable
- **Context-Aware Translation** — Rolling context window for coherent translations
- **YouTube & Twitch** — Works on both platforms, auto-detects player

## License

MIT
