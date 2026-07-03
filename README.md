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
This starts: Gateway (FastAPI), STT (Faster-Whisper), LLM (vLLM + Qwen3-8B), TTS (CosyVoice3 + Svara), Redis (Valkey 8), PostgreSQL 16.

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
4. Select quality mode (Auto/Fast/Balanced/Quality)
5. Wait 5 seconds for voice cloning (collecting reference audio)
6. Enjoy real-time translated audio with the streamer's cloned voice!

## Architecture

```
Browser Tab Audio
      │
      ▼
Chrome Extension (MV3)
├── tabCapture API → AudioWorklet (1s chunks, 200ms overlap)
├── Audio Ducking (original 20%, translated 100%)
├── Dual Subtitle Overlay
├── Quality Mode Selector (Auto/Fast/Balanced/Quality)
└── WebSocket Transport
      │
      ▼
FastAPI Gateway (WebSocket)
├── Phase 1: Voice Embedding (5s collection)
└── Phase 2: Streaming Pipeline
      │
      ├──→ STT (Faster-Whisper large-v3-turbo-ct2) ──→ ~30ms
      ├──→ Emotion Detection ──→ ~5ms
      ├──→ Translation (vLLM + Qwen3-8B) ──→ ~85ms
      └──→ TTS + Voice Clone
             ├──→ CosyVoice3 (multilingual) ──→ ~150ms
             └──→ Svara TTS (19 Indian languages) ──→ ~100ms
                   │
                   ▼
            Streaming Audio → Chrome Extension → User
            Total Pipeline: 375–910ms (target < 1500ms)
```

## Tech Stack

| Component | Technology | Latency |
|-----------|-----------|---------|
| STT | Faster-Whisper large-v3-turbo-ct2 (INT8) | ~30ms |
| Translation | Qwen3-8B via vLLM | ~85ms TTFT |
| TTS (Multilingual) | CosyVoice3 (streaming, voice cloning) | ~150ms |
| TTS (Indian Languages) | Svara TTS (19 Indic languages) | ~100ms |
| Backend | Python FastAPI + WebSocket | <5ms |
| Cache | Valkey 8.0 (Redis-compatible) | <1ms |
| Database | PostgreSQL 16 | N/A |
| Extension | Chrome Manifest V3 | N/A |
| Web | React 19 + Vite 6 + Tailwind CSS 4 | N/A |

All AI models run on a **single NVIDIA A10G** (24GB VRAM recommended).

## Quality Modes

| Mode | STT Model | TTS Model | Speed | Best For |
|------|-----------|-----------|-------|----------|
| **Auto** | Auto-select | Auto-select | - | Default (recommended) |
| **Fast** | base | Svara TTS | 1.2x | Low latency, Indian languages |
| **Balanced** | small | CosyVoice3/Svara | 1.0x | Good quality and speed |
| **Quality** | large-v3-turbo-ct2 | CosyVoice3 | 1.0x | Best quality |

Auto mode selects:
- **Fast** for Indian languages (Hindi, Bengali, Marathi, etc.)
- **Quality** for all other languages

## Supported Languages (37)

### Multilingual (CosyVoice3)
Hindi, English, Spanish, Portuguese, French, German, Japanese, Korean, Chinese, Arabic, Russian, Italian, Turkish, Vietnamese, Thai, Indonesian, Polish, Dutch, Ukrainian, Malay, Tamil, Bengali, Swedish, Greek, Nepali, Sanskrit

### Indian Languages (Svara TTS)
Hindi, Bengali, Marathi, Telugu, Kannada, Tamil, Malayalam, Gujarati, Punjabi, Assamese, Nepali, Sanskrit, Bhojpuri, Magahi, Chhattisgarhi, Maithili, Dogri, Bodo

Source language is auto-detected. TTS engine is automatically routed based on language and quality mode.

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
│   ├── content-script.js       # Subtitle overlay + quality mode selector
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
│   │   ├── server.py           # VAD + transcription endpoint
│   │   └── Dockerfile
│   └── tts/                    # CosyVoice3 + Svara TTS service
│       ├── server.py           # Streaming TTS + emotion mapping
│       ├── requirements.txt
│       └── Dockerfile
├── web/                        # Landing page (React + Vite + Tailwind v4)
│   ├── src/
│   │   ├── components/         # Navbar, Hero, HowItWorks, Features,
│   │   │                       # LanguageGrid, TechStack, Pricing, Footer
│   │   ├── pages/              # LandingPage, PricingPage
│   │   ├── App.tsx             # Router setup
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   ├── colab_setup.py          # Google Colab setup script
│   └── generate-icons.mjs      # SVG → PNG icon converter
├── migrations/
│   └── 001_initial_schema.sql  # Full PostgreSQL DDL
├── docker-compose.yml          # 6-service local dev stack (GPU)
├── DEPLOYMENT.md               # Complete deployment guide
├── PROMPTDUB_SPECIFICATION.md  # Technical specification
└── .gitignore
```

## Deployment Options

| Option | Cost | Best For | Guide |
|--------|------|----------|-------|
| **Local Docker** | $0 | Development | See Quick Start |
| **Google Colab** | $0 | Testing | [DEPLOYMENT.md](DEPLOYMENT.md#google-colab) |
| **RunPod** | $50+/mo | Production | [DEPLOYMENT.md](DEPLOYMENT.md#runpod) |
| **Chrome Web Store** | $5 one-time | Distribution | [DEPLOYMENT.md](DEPLOYMENT.md#chrome-extension) |

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

## API Endpoints

### Gateway (port 8000)
```
GET  /health              # Health check
GET  /modes               # Available quality modes
WS   /ws/translate        # WebSocket for real-time translation
```

### STT Service (port 8010)
```
GET  /health              # Health check
GET  /modes               # Available STT modes
POST /transcribe          # Transcribe audio (PCM16)
```

### TTS Service (port 8020)
```
GET  /health              # Health check
GET  /modes               # Available TTS modes
POST /synthesize/stream   # Synthesize speech (streaming)
POST /embedding/extract   # Extract voice embedding
```

## Environment Variables

### Gateway
```bash
REDIS_URL=redis://redis:6379/0
STT_SERVICE_URL=http://stt:8010
LLM_SERVICE_URL=http://llm:8001
TTS_SERVICE_URL=http://tts:8020
```

### STT Service
```bash
STT_MODEL=deepdml/faster-whisper-large-v3-turbo-ct2
STT_COMPUTE_TYPE=int8
STT_MODE=quality  # fast, balanced, quality, all
```

### TTS Service
```bash
TTS_PROVIDER=both  # cosyvoice, svara, both
TTS_LOAD_ALL=true
COSYVOICE_MODEL_DIR=/models/Fun-CosyVoice3-0.5B
SVARATTS_MODEL=kenpath/svara-tts-v1
```

### LLM Service (vLLM)
```bash
--model Qwen/Qwen3-8B
--max-model-len 2048
--gpu-memory-utilization 0.85
```

## Key Features

- **Emotional Voice Cloning** — Hear the streamer's voice in your language with emotions preserved
- **Sub-1.5s Latency** — Streaming at every pipeline stage, no waiting for full sentences
- **Dual Subtitles** — Original + translated text overlaid on video
- **Smart Audio Ducking** — Original fades to 20% with smooth 150ms ramps
- **100% Open Source AI** — No proprietary APIs, self-hostable
- **Context-Aware Translation** — Rolling context window for coherent translations
- **YouTube & Twitch** — Works on both platforms, auto-detects player
- **Quality Modes** — Auto/Fast/Balanced/Quality for different use cases
- **Indian Language Support** — 19 Indic languages via Svara TTS
- **Voice Cloning** — Clone speaker's voice with 5 seconds of audio

## Models Used

| Model | Source | License | Size |
|-------|--------|---------|------|
| CosyVoice3 | [FunAudioLLM/CosyVoice](https://github.com/FunAudioLLM/CosyVoice) | Apache 2.0 | 0.5B |
| Svara TTS | [kenpath/svara-tts-v1](https://huggingface.co/kenpath/svara-tts-v1) | Apache 2.0 | 3B |
| Qwen3-8B | [Qwen/Qwen3-8B](https://huggingface.co/Qwen/Qwen3-8B) | Apache 2.0 | 8B |
| Faster-Whisper | [deepdml/faster-whisper-large-v3-turbo-ct2](https://huggingface.co/deepdml/faster-whisper-large-v3-turbo-ct2) | MIT | 1.6GB |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker and Colab
5. Submit a pull request

## License

MIT

## Support

- GitHub Issues: https://github.com/yourusername/PromptDub/issues
- Documentation: [DEPLOYMENT.md](DEPLOYMENT.md)
