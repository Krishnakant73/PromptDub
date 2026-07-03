# PromptDub — Production-Grade Specification Document
## Real-Time, Low-Latency AI Live Stream Translation & Emotional Voice Cloning Engine

**Version:** 1.0  
**Date:** July 2026  
**Architecture Class:** Microservices, Event-Driven, GPU-Accelerated  

---

# Table of Contents

1. [Executive Product Architecture Blueprint](#1-executive-product-architecture-blueprint)
2. [Complete Open-Source Tech Stack & Justification](#2-complete-open-source-tech-stack--justification)
3. [Production-Ready Database Schema & In-Memory State Architecture](#3-production-ready-database-schema--in-memory-state-architecture)
4. [Comprehensive End-to-End System Flow & Orchestration](#4-comprehensive-end-to-end-system-flow--orchestration)
5. [Detailed UI/UX Blueprint & Front-End Engineering](#5-detailed-uiux-blueprint--front-end-engineering)
6. [Concrete Technical Implementation Roadmap & Phase Plan](#6-concrete-technical-implementation-roadmap--phase-plan)

---

# 1. Executive Product Architecture Blueprint

## 1.1 System Overview

PromptDub is a modular, microservices-based real-time translation engine that intercepts live audio from YouTube/Twitch streams, transcribes it, translates it contextually, and plays back the translation using the original speaker's cloned voice — preserving full emotional nuances — with a target end-to-end latency under 1500ms.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER (Browser)                           │
│                                                                        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  Chrome Extension │    │  Content Script   │    │  Offscreen Doc   │  │
│  │  (Manifest V3)   │    │  (YouTube/Twitch  │    │  (AudioWorklet   │  │
│  │                  │    │   DOM Overlay)    │    │   + WebSocket)   │  │
│  └──────┬───────────┘    └──────┬───────────┘    └──────┬───────────┘  │
│         │                       │                       │              │
│         │    Service Worker      │    UI Overlay          │  Audio I/O   │
│         └───────────────────────┴───────────────────────┘              │
│                                    │ WebSocket (wss://)                │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
┌────────────────────────────────────┼───────────────────────────────────┐
│                        GATEWAY TIER                                    │
│                                    ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              NGINX / Traefik (TLS Termination + LB)              │  │
│  │              WebSocket Upgrade + Sticky Sessions                 │  │
│  └──────────────────────────┬───────────────────────────────────────┘  │
│                              │                                         │
│  ┌──────────────────────────▼───────────────────────────────────────┐  │
│  │           FastAPI WebSocket Gateway (uvicorn + uvloop)           │  │
│  │           - Session Management                                   │  │
│  │           - Audio Chunk Router                                   │  │
│  │           - Connection Health Monitor                            │  │
│  └──────────────────────────┬───────────────────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────────────────┘
                               │
┌──────────────────────────────┼─────────────────────────────────────────┐
│                     AI PROCESSING TIER (GPU)                           │
│                              ▼                                         │
│  ┌────────────┐    ┌────────────────┐    ┌──────────────────────────┐  │
│  │            │    │                │    │                          │  │
│  │  STT Node  │───▶│  LLM Node      │───▶│  TTS + Voice Clone Node  │  │
│  │            │    │                │    │                          │  │
│  │ Faster-    │    │ Qwen-2.5-7B   │    │ CosyVoice 2 (multilang) │  │
│  │ Whisper    │    │ via vLLM       │    │ Chatterbox Turbo (EN)   │  │
│  │ large-v3   │    │                │    │                          │  │
│  │ Turbo INT8 │    │ AWQ INT4       │    │ Streaming Mode           │  │
│  │            │    │                │    │                          │  │
│  │ ~30ms      │    │ TTFT ~100ms    │    │ First-packet ~150ms      │  │
│  │            │    │ Decode ~50ms   │    │                          │  │
│  └────────────┘    └────────────────┘    └──────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Voice Embedding Cache (Redis)                  │  │
│  │              Speaker fingerprint stored per session              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼─────────────────────────────────────────┐
│                     DATA TIER                                          │
│                              ▼                                         │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────────┐  │
│  │  PostgreSQL    │    │  Redis         │    │  Object Storage     │  │
│  │  (Users, Subs, │    │  (Sessions,    │    │  (S3/MinIO)         │  │
│  │   Sessions,    │    │   Embeddings,  │    │  (Voice samples,    │  │
│  │   Analytics)   │    │   Audio Chunks,│    │   session recordings│  │
│  │                │    │   Rate Limits) │    │   if enabled)       │  │
│  └────────────────┘    └────────────────┘    └─────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

## 1.2 Latency Budget Breakdown (Target: < 1500ms E2E)

Every millisecond is budgeted across the pipeline:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LATENCY BUDGET (Target: < 1500ms)                │
├────────────────────────────────────┬────────────────┬───────────────┤
│ Stage                              │ Budget (ms)    │ Strategy      │
├────────────────────────────────────┼────────────────┼───────────────┤
│ Audio Capture + Chunking           │ 100 - 200      │ 1-2s chunks   │
│ WebSocket Upload (wss://)          │ 20 - 80        │ Opus encode   │
│ STT (Faster-Whisper Turbo INT8)    │ 25 - 50        │ beam_size=1   │
│ Translation (Qwen-2.5 AWQ via vLLM)│ 85 - 200       │ Speculative   │
│ TTS Voice Clone (Streaming)        │ 75 - 200       │ Chunk stream  │
│ WebSocket Download (wss://)        │ 20 - 80        │ Opus chunks   │
│ Audio Playback Buffer              │ 50 - 100       │ Pre-buffer    │
├────────────────────────────────────┼────────────────┼───────────────┤
│ TOTAL                              │ 375 - 910      │ WITHIN TARGET │
└────────────────────────────────────┴────────────────┴───────────────┘
```

### Latency Combat Strategies Per Node

**Audio Capture Layer (100-200ms):**
- Use 1-second audio chunks (not 2s) for lower latency at the cost of slightly more overhead
- Overlap windows: 1s chunk with 200ms overlap prevents word-boundary cuts
- Encode as Opus 16kHz mono (48 kbps) — 10x smaller than raw PCM
- Start sending as soon as VAD detects speech onset (skip silence)

**Network Layer (40-160ms round-trip):**
- WebSocket over TLS (wss://) — persistent connection, no handshake per chunk
- Binary frames (not text) — zero JSON serialization overhead for audio
- Server co-located with GPU (same AZ) — eliminates internal network hops
- Client-side Opus encoding at 16kHz mono reduces payload from 32KB to ~3KB per second

**STT Node (25-50ms):**
- Faster-Whisper large-v3 Turbo (809M params vs 1550M for full large-v3)
- INT8 quantization: halves VRAM, doubles speed, <0.2% WER loss
- `beam_size=1` (greedy decode): fastest possible decoding
- `condition_on_previous_text=False`: prevents hypothesis drift in streaming
- Silero VAD pre-filter: skips silence chunks entirely (<1ms CPU overhead)
- Warm model in GPU memory (never unload between requests)

**Translation Node (85-200ms):**
- Qwen-2.5-7B-Instruct via vLLM with AWQ INT4 quantization
- TTFT ~85ms at batch=1 on A10G
- Speculative decoding with draft model: 1.8x latency reduction
- `max_model_len=2048` (translation needs short context)
- Stream tokens to TTS as they generate (don't wait for full translation)

**TTS/Voice Clone Node (75-200ms):**
- CosyVoice 2 streaming mode: first audio chunk at ~150ms
- OR Chatterbox Turbo: first audio chunk at ~75ms
- Stream audio chunks back as they're synthesized (don't wait for full sentence)
- Voice embedding pre-loaded in GPU memory from Redis cache

**Playback Layer (50-100ms):**
- Pre-buffer 50ms of audio before starting playback (prevents choppy start)
- AudioWorklet-based playback with jitter compensation
- Adaptive buffer: grows during network jitter, shrinks when stable

## 1.3 Zero-Shot Voice Cloning — 5-Second Background Sampling

The system continuously builds a speaker voice profile without interrupting live translation:

```
Timeline (seconds):  0    5    10   15   20   25   30
                     │    │    │    │    │    │    │
Audio Stream:        ████████████████████████████████
                     │    │
                     ├────┤ Initial 5s sample → Build base embedding
                     │         │
                     │         ├────┤ Refinement sample (5-10s)
                     │              │
                     │              ├────┤ Refinement sample (10-15s)
                     │
Phase 1 (0-5s):     ▶ Buffer audio, DO NOT translate yet
                      Show "Building voice profile..." in UI
                      Extract voice embedding using CosyVoice 2 encoder
                      Store embedding in Redis: speaker:{session_id}:embedding
                      
Phase 2 (5s+):      ▶ Start real-time translation with cloned voice
                      Continue collecting 5s samples every 30s in background
                      Merge new samples with existing embedding (weighted average)
                      Quality score improves: 0.72 → 0.78 → 0.81 speaker similarity
```

### Voice Embedding Pipeline

```python
# Voice embedding extraction (runs once at session start, refines periodically)
import torch
from cosyvoice.cli.cosyvoice import CosyVoice

cosyvoice = CosyVoice("pretrained/CosyVoice2-0.5B", load_jit=True, load_trt=False)

async def extract_speaker_embedding(audio_samples: list[bytes], sample_rate: int = 16000) -> bytes:
    """
    Extracts speaker embedding from 5-10 seconds of reference audio.
    Returns serialized embedding tensor for Redis storage.
    """
    combined = b"".join(audio_samples)
    waveform = torch.frombuffer(combined, dtype=torch.int16).float() / 32768.0
    
    # CosyVoice 2 speaker encoder produces 192-dim embedding
    embedding = cosyvoice.frontend.extract_speaker_embedding(waveform, sample_rate)
    
    return embedding.cpu().numpy().tobytes()

async def refine_embedding(existing: bytes, new_sample: bytes, weight: float = 0.3) -> bytes:
    """
    Weighted merge of existing embedding with new sample.
    New sample gets 30% weight to gradually refine without disrupting.
    """
    existing_emb = torch.frombuffer(existing, dtype=torch.float32)
    new_emb = torch.frombuffer(new_sample, dtype=torch.float32)
    
    merged = (1 - weight) * existing_emb + weight * new_emb
    merged = merged / merged.norm()  # L2 normalize
    
    return merged.numpy().tobytes()
```

### Redis Storage for Voice Embeddings

```
Key:     speaker:{session_id}:embedding
Type:    Binary string (768 bytes = 192 float32 values)
TTL:     3600s (1 hour, refreshed on activity)
Access:  ~0.1ms read latency (sub-millisecond)

Key:     speaker:{session_id}:quality_score
Type:    Float string
Value:   0.72 → 0.81 (improves with more samples)
TTL:     3600s
```

---

# 2. Complete Open-Source Tech Stack & Justification

## 2.1 Ingestion Layer — Audio Capture & Transport

### Chrome Extension Architecture (Manifest V3)

```
┌──────────────────────────────────────────────────────────────┐
│                   Chrome Extension (MV3)                      │
│                                                                │
│  ┌─────────────┐     ┌──────────────────┐     ┌────────────┐  │
│  │  Service     │────▶│  Offscreen Doc   │────▶│  Content    │  │
│  │  Worker      │     │                  │     │  Script     │  │
│  │              │     │  - AudioContext   │     │            │  │
│  │  - Lifecycle │     │  - AudioWorklet  │     │ - Subtitle  │  │
│  │  - Tab       │     │  - WebSocket     │     │   Overlay   │  │
│  │    Capture   │     │  - Opus Encoder  │     │ - Controls  │  │
│  │  - Message   │     │  - Ducking Mixer │     │ - Settings  │  │
│  │    Router    │     │  - Ring Buffer   │     │   Panel     │  │
│  └─────────────┘     └──────────────────┘     └────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Reference: intruth-factcheck extension** uses the identical MV3 pattern — tabCapture → offscreen document → content script — validated on Chrome Web Store.

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "PromptDub",
  "version": "1.0.0",
  "description": "Real-time AI stream translation with voice cloning",
  "permissions": [
    "tabCapture",
    "activeTab",
    "scripting",
    "storage",
    "offscreen"
  ],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://www.twitch.tv/*"
  ],
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.youtube.com/*",
        "https://www.twitch.tv/*"
      ],
      "js": ["content-script.js"],
      "css": ["overlay.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["audio-worklet-processor.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Audio Chunking Strategy

```
Audio Format:  Opus encoded, 16kHz sample rate, mono channel
Chunk Size:    1 second (1000ms) with 200ms overlap
Chunk Payload: ~3KB per chunk (Opus at 48kbps)
Send Rate:     Every 800ms (1000ms chunk - 200ms overlap)

Raw PCM (pre-encoding):
  Sample Rate:    16,000 Hz
  Bit Depth:      16-bit (int16)
  Channels:       1 (mono)
  Bytes/second:   32,000 bytes
  Bytes/chunk:    32,000 bytes (1s)

After Opus encoding:
  Bitrate:        48 kbps
  Bytes/second:   6,000 bytes
  Bytes/chunk:    ~3,000 bytes (1s)
  Compression:    ~10x reduction
```

### Offscreen Document — Audio Capture + WebSocket

```javascript
// offscreen.js — runs in offscreen document context
let audioContext;
let websocket;
let originalGainNode;
let translatedGainNode;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === "start-capture") {
    await startCapture(message.streamId, message.config);
  }
  if (message.type === "stop-capture") {
    stopCapture();
  }
  if (message.type === "set-duck-level") {
    if (originalGainNode) {
      const now = audioContext.currentTime;
      originalGainNode.gain.setValueAtTime(originalGainNode.gain.value, now);
      originalGainNode.gain.linearRampToValueAtTime(message.level, now + 0.3);
    }
  }
});

async function startCapture(streamId, config) {
  // 1. Get MediaStream from tab capture stream ID
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  // 2. Initialize AudioContext
  audioContext = new AudioContext({ sampleRate: 16000 });
  await audioContext.resume();

  // 3. Build audio graph
  const sourceNode = audioContext.createMediaStreamSource(mediaStream);
  
  // Original audio gain (for ducking to 20%)
  originalGainNode = audioContext.createGain();
  originalGainNode.gain.setValueAtTime(1.0, audioContext.currentTime);

  // Translated audio gain (stays at 100%)
  translatedGainNode = audioContext.createGain();
  translatedGainNode.gain.setValueAtTime(1.0, audioContext.currentTime);

  // AudioWorklet for chunking raw PCM
  await audioContext.audioWorklet.addModule("audio-worklet-processor.js");
  const chunkingNode = new AudioWorkletNode(audioContext, "audio-chunker", {
    processorOptions: {
      chunkDurationMs: 1000,
      overlapMs: 200,
      sampleRate: 16000,
    },
  });

  // Route: source → originalGain → destination (user hears ducked original)
  sourceNode.connect(originalGainNode);
  originalGainNode.connect(audioContext.destination);

  // Route: source → chunkingNode (capture for server processing)
  sourceNode.connect(chunkingNode);

  // Receive chunks from AudioWorklet
  chunkingNode.port.onmessage = (event) => {
    if (event.data.type === "audio-chunk") {
      sendChunkToServer(event.data.pcmData, event.data.chunkIndex);
    }
  };

  // 4. Connect WebSocket
  websocket = new WebSocket(config.serverUrl);
  websocket.binaryType = "arraybuffer";

  websocket.onopen = () => {
    websocket.send(JSON.stringify({
      type: "session_start",
      session_id: config.sessionId,
      source_lang: config.sourceLang,
      target_lang: config.targetLang,
      sample_rate: 16000,
      channels: 1,
    }));
  };

  websocket.onmessage = (event) => {
    if (typeof event.data === "string") {
      const msg = JSON.parse(event.data);
      handleTextMessage(msg);
    } else {
      handleAudioResponse(event.data);
    }
  };
}

function sendChunkToServer(pcmData, chunkIndex) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    // Header: 4 bytes chunk index + raw PCM data
    const header = new Uint32Array([chunkIndex]);
    const payload = new Uint8Array(header.byteLength + pcmData.byteLength);
    payload.set(new Uint8Array(header.buffer), 0);
    payload.set(new Uint8Array(pcmData), header.byteLength);
    websocket.send(payload.buffer);
  }
}

function handleTextMessage(msg) {
  // Forward subtitles and status to content script
  chrome.runtime.sendMessage({
    type: "subtitle-update",
    original: msg.original_text,
    translated: msg.translated_text,
    speaker: msg.speaker_id,
    confidence: msg.confidence,
  });
}

async function handleAudioResponse(arrayBuffer) {
  // Decode received translated audio and play through translated gain node
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(translatedGainNode);
  translatedGainNode.connect(audioContext.destination);
  
  // Duck original audio while translated plays
  const now = audioContext.currentTime;
  originalGainNode.gain.setValueAtTime(originalGainNode.gain.value, now);
  originalGainNode.gain.linearRampToValueAtTime(0.2, now + 0.15);
  
  source.onended = () => {
    const endTime = audioContext.currentTime;
    originalGainNode.gain.setValueAtTime(0.2, endTime);
    originalGainNode.gain.linearRampToValueAtTime(1.0, endTime + 0.5);
  };
  
  source.start();
}

function stopCapture() {
  if (websocket) {
    websocket.send(JSON.stringify({ type: "session_end" }));
    websocket.close();
  }
  if (audioContext) {
    audioContext.close();
  }
}
```

### AudioWorklet Processor — Chunking

```javascript
// audio-worklet-processor.js
class AudioChunker extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { chunkDurationMs, overlapMs, sampleRate } = options.processorOptions;
    
    this.chunkSize = Math.floor((chunkDurationMs / 1000) * sampleRate);
    this.overlapSize = Math.floor((overlapMs / 1000) * sampleRate);
    this.stepSize = this.chunkSize - this.overlapSize;
    
    this.buffer = new Float32Array(this.chunkSize * 2); // ring buffer
    this.writeIndex = 0;
    this.chunkIndex = 0;
    this.samplesSinceLastChunk = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0]; // mono

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.writeIndex % (this.chunkSize * 2)] = channelData[i];
      this.writeIndex++;
      this.samplesSinceLastChunk++;

      if (this.samplesSinceLastChunk >= this.stepSize && this.writeIndex >= this.chunkSize) {
        const chunk = new Float32Array(this.chunkSize);
        const startIdx = this.writeIndex - this.chunkSize;
        
        for (let j = 0; j < this.chunkSize; j++) {
          chunk[j] = this.buffer[(startIdx + j) % (this.chunkSize * 2)];
        }

        // Convert float32 [-1, 1] to int16 [-32768, 32767]
        const pcm16 = new Int16Array(this.chunkSize);
        for (let j = 0; j < this.chunkSize; j++) {
          const s = Math.max(-1, Math.min(1, chunk[j]));
          pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        this.port.postMessage({
          type: "audio-chunk",
          pcmData: pcm16.buffer,
          chunkIndex: this.chunkIndex++,
        }, [pcm16.buffer]);

        this.samplesSinceLastChunk = 0;
      }
    }

    return true;
  }
}

registerProcessor("audio-chunker", AudioChunker);
```

## 2.2 Speech-to-Text — Faster-Whisper Configuration

### Server Deployment

```python
# stt_service.py
from faster_whisper import WhisperModel
import numpy as np

# Model Configuration — Optimized for Real-Time
STT_CONFIG = {
    "model_size": "large-v3-turbo",       # 809M params (vs 1550M for large-v3)
    "device": "cuda",
    "compute_type": "int8",               # 2x speed, <0.2% WER loss, half VRAM
    "cpu_threads": 4,
    "num_workers": 2,                      # parallel decoding workers
}

# Inference Configuration — Optimized for Latency
INFERENCE_CONFIG = {
    "beam_size": 1,                        # greedy decode (fastest)
    "best_of": 1,                          # no sampling overhead
    "patience": 1.0,
    "language": None,                      # auto-detect (or pin for known streams)
    "condition_on_previous_text": False,   # prevents drift in streaming mode
    "compression_ratio_threshold": 2.4,
    "log_prob_threshold": -1.0,
    "no_speech_threshold": 0.6,
    "word_timestamps": True,               # needed for subtitle alignment
    "vad_filter": True,                    # Silero VAD: skips silence, <1ms overhead
    "vad_parameters": {
        "threshold": 0.5,
        "min_silence_duration_ms": 300,    # detect pauses > 300ms
        "min_speech_duration_ms": 250,     # ignore speech < 250ms
        "speech_pad_ms": 100,              # pad detected speech by 100ms each side
    },
}

class STTService:
    def __init__(self):
        self.model = WhisperModel(
            STT_CONFIG["model_size"],
            device=STT_CONFIG["device"],
            compute_type=STT_CONFIG["compute_type"],
            cpu_threads=STT_CONFIG["cpu_threads"],
            num_workers=STT_CONFIG["num_workers"],
        )
    
    async def transcribe_chunk(self, audio_bytes: bytes, sample_rate: int = 16000) -> dict:
        audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        
        segments, info = self.model.transcribe(audio_np, **INFERENCE_CONFIG)
        
        result_segments = []
        full_text = ""
        
        for segment in segments:
            full_text += segment.text
            result_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "words": [
                    {"word": w.word, "start": w.start, "end": w.end, "probability": w.probability}
                    for w in (segment.words or [])
                ],
            })
        
        return {
            "text": full_text.strip(),
            "language": info.language,
            "language_probability": info.language_probability,
            "segments": result_segments,
            "duration": info.duration,
        }
```

### Performance Benchmarks (Expected)

```
┌──────────────────────────────────────────────────────────────┐
│              Faster-Whisper large-v3-turbo INT8              │
├──────────────────┬───────────────────────────────────────────┤
│ GPU              │ Latency (1s chunk)  │ RTF     │ VRAM     │
├──────────────────┼─────────────────────┼─────────┼──────────┤
│ NVIDIA A10G      │ 25 - 35 ms          │ 0.03    │ ~1.6 GB  │
│ NVIDIA T4        │ 35 - 50 ms          │ 0.05    │ ~1.6 GB  │
│ RTX 4090         │ 20 - 25 ms          │ 0.02    │ ~1.6 GB  │
└──────────────────┴─────────────────────┴─────────┴──────────┘
```

## 2.3 Translation Engine — vLLM + Qwen-2.5-7B-Instruct

### vLLM Server Configuration

```bash
# Launch vLLM server optimized for low-latency translation
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct-AWQ \
    --quantization awq \
    --dtype float16 \
    --max-model-len 2048 \
    --gpu-memory-utilization 0.85 \
    --enable-chunked-prefill \
    --max-num-seqs 32 \
    --port 8001 \
    --host 0.0.0.0 \
    --disable-log-requests \
    --enforce-eager
```

### Translation Prompt Engineering

```python
# translation_service.py
from openai import AsyncOpenAI

vllm_client = AsyncOpenAI(base_url="http://localhost:8001/v1", api_key="dummy")

SYSTEM_PROMPT = """You are a real-time stream translator. Translate the following speech transcript.

RULES:
- Translate naturally, not literally. Preserve the speaker's tone, slang, and intent.
- Keep numbers, proper nouns, brand names, and technical terms as-is when appropriate.
- For gaming/streaming jargon, use the target language's community-accepted terms.
- Output ONLY the translation. No explanations, no notes, no quotes.
- If input is unclear or partial, translate what you can. Never output "I cannot translate".
- Preserve emotional markers: excitement (!), questions (?), hesitation (...).
- Match the register: casual speech stays casual, formal stays formal."""

async def translate_text(
    text: str,
    source_lang: str,
    target_lang: str,
    context_window: list[str] = None,
) -> str:
    """
    Translate text with streaming context.
    context_window: last 3-5 translated segments for coherence.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    if context_window:
        context_str = "\n".join(context_window[-3:])
        messages.append({
            "role": "user",
            "content": f"Previous context:\n{context_str}\n\nTranslate from {source_lang} to {target_lang}:\n{text}",
        })
    else:
        messages.append({
            "role": "user",
            "content": f"Translate from {source_lang} to {target_lang}:\n{text}",
        })
    
    response = await vllm_client.chat.completions.create(
        model="Qwen/Qwen2.5-7B-Instruct-AWQ",
        messages=messages,
        max_tokens=256,
        temperature=0.3,
        top_p=0.9,
        stream=True,
    )
    
    translated = ""
    async for chunk in response:
        if chunk.choices[0].delta.content:
            translated += chunk.choices[0].delta.content
    
    return translated.strip()
```

### Performance (Qwen-2.5-7B AWQ on A10G)

```
┌───────────────────────────────────────────────────────┐
│       Qwen-2.5-7B-Instruct AWQ INT4 on A10G         │
├────────────────────┬──────────────────────────────────┤
│ Metric             │ Value                            │
├────────────────────┼──────────────────────────────────┤
│ TTFT (batch=1)     │ ~85 ms                           │
│ Decode speed       │ ~72 tok/s                        │
│ Inter-token latency│ ~14 ms                           │
│ Translation length │ ~20-40 tokens avg                │
│ Total decode time  │ ~280-560 ms                      │
│ VRAM usage         │ ~3.7 GB (batch=1)                │
│ Effective latency  │ ~100-200 ms (first tokens)       │
│                    │ Stream to TTS as tokens arrive    │
└────────────────────┴──────────────────────────────────┘
```

## 2.4 TTS & Voice Cloning — CosyVoice 2 + Chatterbox Turbo

### Dual Engine Strategy

```
┌────────────────────────────────────────────────────────────┐
│                  TTS ENGINE SELECTOR                        │
│                                                             │
│  Input: target_language, quality_preference                 │
│                                                             │
│  ┌─────────────────────┐    ┌────────────────────────────┐ │
│  │ if target == "en":  │    │ else (non-English):        │ │
│  │                     │    │                            │ │
│  │  Chatterbox Turbo   │    │  CosyVoice 2              │ │
│  │  - 350M params      │    │  - 500M params            │ │
│  │  - MIT license      │    │  - 9+ languages           │ │
│  │  - ~75ms first pkt  │    │  - ~150ms first pkt       │ │
│  │  - Emotion param    │    │  - Instruct-based emotion │ │
│  │  - Paralinguistic   │    │  - Cross-lingual clone    │ │
│  │    tags support      │    │  - 18 Chinese dialects    │ │
│  │  - ~6 GB VRAM       │    │  - ~8 GB VRAM             │ │
│  └─────────────────────┘    └────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### CosyVoice 2 Streaming TTS Service

```python
# tts_service.py
import torch
import torchaudio
from cosyvoice.cli.cosyvoice import CosyVoice2

class TTSService:
    def __init__(self, model_dir: str = "pretrained/CosyVoice2-0.5B"):
        self.cosyvoice = CosyVoice2(model_dir, load_jit=True, load_trt=False)
        self.speaker_embeddings = {}  # session_id -> embedding tensor
    
    async def synthesize_streaming(
        self,
        text: str,
        session_id: str,
        speaker_embedding: bytes,
        emotion: str = "neutral",
        target_lang: str = "en",
    ):
        """
        Streaming TTS: yields audio chunks as they're generated.
        Each chunk is ~200ms of audio at 24kHz.
        """
        embedding_tensor = torch.frombuffer(speaker_embedding, dtype=torch.float32)
        
        # Construct instruct prompt for emotional control
        instruct_text = self._build_instruct_prompt(text, emotion)
        
        # CosyVoice 2 streaming inference
        for chunk in self.cosyvoice.inference_zero_shot_streaming(
            tts_text=instruct_text,
            prompt_text="",  # empty when using embedding directly
            prompt_speech=embedding_tensor,
            stream=True,
            speed=1.0,
        ):
            # chunk['tts_speech'] is a tensor of shape [1, N] at 24kHz
            audio_data = chunk["tts_speech"].squeeze()
            
            # Resample to 16kHz for WebSocket transport
            audio_16k = torchaudio.functional.resample(audio_data, 24000, 16000)
            
            # Convert to int16 PCM bytes
            pcm_bytes = (audio_16k * 32767).to(torch.int16).numpy().tobytes()
            
            yield pcm_bytes
    
    def _build_instruct_prompt(self, text: str, emotion: str) -> str:
        emotion_map = {
            "neutral": "",
            "happy": "Speak with happiness and enthusiasm. ",
            "sad": "Speak with a sad, melancholic tone. ",
            "angry": "Speak with anger and intensity. ",
            "excited": "Speak with high energy and excitement! ",
            "whisper": "Speak in a soft whisper. ",
        }
        prefix = emotion_map.get(emotion, "")
        return f"{prefix}{text}"
```

### Chatterbox Turbo Service (English-optimized)

```python
# tts_chatterbox_service.py
from chatterbox.tts import ChatterboxTTS

class ChatterboxTTSService:
    def __init__(self):
        self.model = ChatterboxTTS.from_pretrained(
            "resemble-ai/chatterbox-turbo",
            device="cuda",
        )
    
    async def synthesize(
        self,
        text: str,
        reference_audio_path: str,
        exaggeration: float = 0.5,
    ) -> bytes:
        """
        Single-shot TTS with voice cloning and emotion control.
        exaggeration: 0.0 (monotone) to 1.0 (dramatic). Default 0.5.
        """
        audio = self.model.generate(
            text=text,
            audio_prompt_path=reference_audio_path,
            exaggeration=exaggeration,
        )
        
        pcm_bytes = (audio.squeeze() * 32767).to(torch.int16).numpy().tobytes()
        return pcm_bytes
```

## 2.5 Infrastructure — Orchestration & Data Layer

### Docker Compose — Development Stack

```yaml
# docker-compose.yml
version: "3.9"

services:
  # ── API Gateway ──
  gateway:
    build: ./services/gateway
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql://promptdub:promptdub@postgres:5432/promptdub
      - STT_SERVICE_URL=http://stt:8010
      - LLM_SERVICE_URL=http://llm:8001
      - TTS_SERVICE_URL=http://tts:8020
    depends_on:
      - redis
      - postgres
    deploy:
      resources:
        limits:
          cpus: "4"
          memory: 4G

  # ── STT Service (GPU) ──
  stt:
    build: ./services/stt
    ports:
      - "8010:8010"
    environment:
      - MODEL_SIZE=large-v3-turbo
      - COMPUTE_TYPE=int8
      - DEVICE=cuda
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
        limits:
          memory: 8G

  # ── LLM Translation Service (GPU) ──
  llm:
    build: ./services/llm
    ports:
      - "8001:8001"
    command: >
      python -m vllm.entrypoints.openai.api_server
      --model Qwen/Qwen2.5-7B-Instruct-AWQ
      --quantization awq
      --max-model-len 2048
      --gpu-memory-utilization 0.85
      --port 8001
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
        limits:
          memory: 16G

  # ── TTS + Voice Cloning Service (GPU) ──
  tts:
    build: ./services/tts
    ports:
      - "8020:8020"
    environment:
      - COSYVOICE_MODEL_DIR=/models/CosyVoice2-0.5B
      - CHATTERBOX_MODEL=resemble-ai/chatterbox-turbo
    volumes:
      - model-cache:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
        limits:
          memory: 16G

  # ── Redis (In-Memory State) ──
  redis:
    image: valkey/valkey:8.0-alpine
    ports:
      - "6379:6379"
    command: >
      valkey-server
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
      --save ""
      --appendonly no
    volumes:
      - redis-data:/data
    deploy:
      resources:
        limits:
          memory: 2G

  # ── PostgreSQL ──
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=promptdub
      - POSTGRES_USER=promptdub
      - POSTGRES_PASSWORD=promptdub
    volumes:
      - postgres-data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 1G

volumes:
  model-cache:
  redis-data:
  postgres-data:
```

### GPU VRAM Allocation Plan (Single A10G — 24GB)

```
┌─────────────────────────────────────────────────┐
│            A10G 24GB VRAM Allocation             │
├──────────────────────────┬──────────────────────┤
│ Faster-Whisper Turbo INT8│  1.6 GB              │
│ Qwen-2.5-7B AWQ INT4    │  3.7 GB              │
│ CosyVoice 2             │  8.0 GB              │
│ CUDA overhead + buffers  │  2.7 GB              │
├──────────────────────────┼──────────────────────┤
│ TOTAL                    │ 16.0 GB / 24 GB      │
│ Headroom                 │  8.0 GB (33%)        │
└──────────────────────────┴──────────────────────┘

Note: All 3 models fit on a SINGLE A10G GPU.
For production: split across 2 GPUs for isolation.
  GPU 1: STT + LLM (5.3 GB)
  GPU 2: TTS/Voice Clone (8.0 GB)
```

---

# 3. Production-Ready Database Schema & In-Memory State Architecture

## 3.1 PostgreSQL DDL Schema

```sql
-- ============================================================
-- PromptDub Database Schema
-- PostgreSQL 16+
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────
-- ENUM Types
-- ────────────────────────────────────────────────

CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');
CREATE TYPE session_status AS ENUM ('initializing', 'cloning_voice', 'active', 'paused', 'ended', 'error');
CREATE TYPE platform_type AS ENUM ('youtube', 'twitch', 'other');
CREATE TYPE tts_engine AS ENUM ('cosyvoice2', 'chatterbox_turbo');

-- ────────────────────────────────────────────────
-- Users & Authentication
-- ────────────────────────────────────────────────

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(320) NOT NULL,
    password_hash   VARCHAR(128) NOT NULL,
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(512),
    
    preferred_lang  VARCHAR(10) NOT NULL DEFAULT 'en',
    timezone        VARCHAR(50) DEFAULT 'UTC',
    
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_created_at ON users (created_at);

-- ────────────────────────────────────────────────
-- API Keys (for extension authentication)
-- ────────────────────────────────────────────────

CREATE TABLE api_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    key_hash    VARCHAR(128) NOT NULL,
    key_prefix  VARCHAR(8) NOT NULL,       -- first 8 chars for identification (pd_xxxx)
    name        VARCHAR(100) NOT NULL DEFAULT 'Default',
    
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_api_keys_hash UNIQUE (key_hash)
);

CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX idx_api_keys_hash ON api_keys (key_hash) WHERE is_active = TRUE;

-- ────────────────────────────────────────────────
-- Subscriptions & Billing
-- ────────────────────────────────────────────────

CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    tier                subscription_tier NOT NULL DEFAULT 'free',
    status              subscription_status NOT NULL DEFAULT 'active',
    
    -- Usage Limits (per billing period)
    monthly_minutes     INTEGER NOT NULL DEFAULT 60,        -- free: 60 min/mo
    minutes_used        INTEGER NOT NULL DEFAULT 0,
    concurrent_sessions INTEGER NOT NULL DEFAULT 1,
    
    -- Billing
    stripe_customer_id      VARCHAR(64),
    stripe_subscription_id  VARCHAR(64),
    
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at        TIMESTAMPTZ,
    
    CONSTRAINT uq_subscriptions_user UNIQUE (user_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_stripe ON subscriptions (stripe_customer_id);

-- Tier Limits Reference:
-- free:       60 min/mo,  1 concurrent session,  5 languages
-- starter:    300 min/mo, 2 concurrent sessions, 10 languages   ($9.99/mo)
-- pro:        unlimited,  5 concurrent sessions, 23 languages   ($19.99/mo)
-- enterprise: unlimited,  unlimited,             23 languages   (custom)

-- ────────────────────────────────────────────────
-- Translation Sessions
-- ────────────────────────────────────────────────

CREATE TABLE translation_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session Config
    source_lang     VARCHAR(10) NOT NULL,
    target_lang     VARCHAR(10) NOT NULL,
    platform        platform_type NOT NULL DEFAULT 'youtube',
    stream_url      VARCHAR(2048),
    stream_title    VARCHAR(500),
    
    -- Status
    status          session_status NOT NULL DEFAULT 'initializing',
    tts_engine_used tts_engine NOT NULL DEFAULT 'cosyvoice2',
    
    -- Metrics
    duration_seconds    INTEGER DEFAULT 0,
    chunks_processed    INTEGER DEFAULT 0,
    words_translated    INTEGER DEFAULT 0,
    avg_latency_ms      INTEGER,
    p95_latency_ms      INTEGER,
    
    -- Voice Cloning
    voice_profile_ready BOOLEAN NOT NULL DEFAULT FALSE,
    speaker_similarity  REAL,           -- 0.0-1.0 score
    
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON translation_sessions (user_id);
CREATE INDEX idx_sessions_status ON translation_sessions (status) WHERE status IN ('initializing', 'active');
CREATE INDEX idx_sessions_started ON translation_sessions (started_at DESC);
CREATE INDEX idx_sessions_user_date ON translation_sessions (user_id, started_at DESC);

-- ────────────────────────────────────────────────
-- Session Transcripts (for history/replay)
-- ────────────────────────────────────────────────

CREATE TABLE session_transcripts (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES translation_sessions(id) ON DELETE CASCADE,
    
    chunk_index     INTEGER NOT NULL,
    
    original_text   TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_lang     VARCHAR(10) NOT NULL,
    target_lang     VARCHAR(10) NOT NULL,
    
    -- Timing
    chunk_start_ms  INTEGER NOT NULL,         -- offset from session start
    chunk_end_ms    INTEGER NOT NULL,
    latency_ms      INTEGER NOT NULL,         -- e2e processing latency
    
    -- Quality
    stt_confidence  REAL,
    translation_confidence REAL,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcripts_session ON session_transcripts (session_id, chunk_index);
CREATE INDEX idx_transcripts_session_time ON session_transcripts (session_id, chunk_start_ms);

-- Partition by month for scalability (optional, add when > 10M rows)
-- CREATE TABLE session_transcripts_y2026m07 PARTITION OF session_transcripts
--     FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- ────────────────────────────────────────────────
-- Analytics & Usage Tracking
-- ────────────────────────────────────────────────

CREATE TABLE usage_events (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id      UUID REFERENCES translation_sessions(id) ON DELETE SET NULL,
    
    event_type      VARCHAR(50) NOT NULL,
    -- event_types: 'session_start', 'session_end', 'language_switch',
    --              'voice_clone_ready', 'error', 'subscription_upgrade'
    
    metadata        JSONB DEFAULT '{}',
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_user_id ON usage_events (user_id);
CREATE INDEX idx_usage_event_type ON usage_events (event_type, created_at DESC);
CREATE INDEX idx_usage_created_at ON usage_events (created_at DESC);
CREATE INDEX idx_usage_metadata ON usage_events USING GIN (metadata);

-- ────────────────────────────────────────────────
-- Daily Aggregated Analytics
-- ────────────────────────────────────────────────

CREATE TABLE daily_analytics (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    
    total_sessions      INTEGER NOT NULL DEFAULT 0,
    total_minutes       INTEGER NOT NULL DEFAULT 0,
    total_words         INTEGER NOT NULL DEFAULT 0,
    total_chunks        INTEGER NOT NULL DEFAULT 0,
    
    avg_latency_ms      INTEGER,
    p95_latency_ms      INTEGER,
    
    languages_used      VARCHAR(10)[] DEFAULT '{}',
    platforms_used      platform_type[] DEFAULT '{}',
    
    CONSTRAINT uq_daily_analytics UNIQUE (user_id, date)
);

CREATE INDEX idx_daily_analytics_user_date ON daily_analytics (user_id, date DESC);

-- ────────────────────────────────────────────────
-- Language Pairs Supported
-- ────────────────────────────────────────────────

CREATE TABLE supported_languages (
    code            VARCHAR(10) PRIMARY KEY,
    name_english    VARCHAR(100) NOT NULL,
    name_native     VARCHAR(100) NOT NULL,
    
    stt_supported   BOOLEAN NOT NULL DEFAULT FALSE,
    translation_supported BOOLEAN NOT NULL DEFAULT FALSE,
    tts_supported   BOOLEAN NOT NULL DEFAULT FALSE,
    
    tts_engine      tts_engine,
    tts_quality     VARCHAR(20) DEFAULT 'standard',   -- 'high', 'standard', 'experimental'
    
    min_tier        subscription_tier NOT NULL DEFAULT 'free',
    
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed initial language data
INSERT INTO supported_languages (code, name_english, name_native, stt_supported, translation_supported, tts_supported, tts_engine, tts_quality, min_tier) VALUES
('en', 'English',    'English',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('hi', 'Hindi',      'हिन्दी',      TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('es', 'Spanish',    'Español',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('fr', 'French',     'Français',   TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('de', 'German',     'Deutsch',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('ja', 'Japanese',   '日本語',      TRUE, TRUE, TRUE, 'cosyvoice2',       'high',     'starter'),
('ko', 'Korean',     '한국어',       TRUE, TRUE, TRUE, 'cosyvoice2',       'high',     'starter'),
('zh', 'Chinese',    '中文',        TRUE, TRUE, TRUE, 'cosyvoice2',       'high',     'starter'),
('pt', 'Portuguese', 'Português',  TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('it', 'Italian',    'Italiano',   TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'starter'),
('ru', 'Russian',    'Русский',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'starter'),
('ar', 'Arabic',     'العربية',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'starter'),
('tr', 'Turkish',    'Türkçe',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('pl', 'Polish',     'Polski',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('nl', 'Dutch',      'Nederlands', TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('sv', 'Swedish',    'Svenska',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('cs', 'Czech',      'Čeština',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('ro', 'Romanian',   'Română',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('hu', 'Hungarian',  'Magyar',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('el', 'Greek',      'Ελληνικά',   TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('fi', 'Finnish',    'Suomi',      TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('da', 'Danish',     'Dansk',      TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('no', 'Norwegian',  'Norsk',      TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro');

-- ────────────────────────────────────────────────
-- Helpful Views
-- ────────────────────────────────────────────────

CREATE VIEW v_user_dashboard AS
SELECT
    u.id AS user_id,
    u.email,
    u.display_name,
    s.tier,
    s.status AS subscription_status,
    s.monthly_minutes,
    s.minutes_used,
    s.monthly_minutes - s.minutes_used AS minutes_remaining,
    (
        SELECT COUNT(*)
        FROM translation_sessions ts
        WHERE ts.user_id = u.id AND ts.status = 'active'
    ) AS active_sessions,
    s.concurrent_sessions AS max_concurrent,
    u.last_login_at
FROM users u
JOIN subscriptions s ON s.user_id = u.id
WHERE u.is_active = TRUE;

CREATE VIEW v_session_summary AS
SELECT
    ts.id AS session_id,
    ts.user_id,
    ts.source_lang,
    ts.target_lang,
    ts.platform,
    ts.status,
    ts.duration_seconds,
    ts.words_translated,
    ts.avg_latency_ms,
    ts.speaker_similarity,
    ts.started_at,
    ts.ended_at,
    COUNT(st.id) AS total_chunks,
    AVG(st.latency_ms)::INTEGER AS computed_avg_latency
FROM translation_sessions ts
LEFT JOIN session_transcripts st ON st.session_id = ts.id
GROUP BY ts.id;
```

## 3.2 Redis In-Memory State Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    REDIS KEY STRUCTURE                                │
│                    (Valkey 8.0 compatible)                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ── ACTIVE SESSION STATE ──                                          │
│                                                                      │
│  session:{session_id}:meta          HASH                             │
│    ├── user_id                      UUID                             │
│    ├── source_lang                  "en"                             │
│    ├── target_lang                  "hi"                             │
│    ├── platform                     "youtube"                        │
│    ├── status                       "active"                         │
│    ├── tts_engine                   "cosyvoice2"                     │
│    ├── started_at                   "1751500000"                     │
│    ├── last_heartbeat               "1751500120"                     │
│    └── chunks_processed             "42"                             │
│    TTL: 7200s (2hr, refreshed on heartbeat)                          │
│                                                                      │
│  ── VOICE EMBEDDINGS ──                                              │
│                                                                      │
│  speaker:{session_id}:embedding     STRING (binary)                  │
│    └── 768 bytes (192 x float32)                                     │
│    TTL: 3600s (refreshed on session activity)                        │
│                                                                      │
│  speaker:{session_id}:quality       STRING                           │
│    └── "0.78" (speaker similarity score)                             │
│    TTL: 3600s                                                        │
│                                                                      │
│  speaker:{session_id}:ref_audio     STRING (binary)                  │
│    └── Raw PCM reference audio (5-10s, ~160KB)                       │
│    TTL: 3600s                                                        │
│                                                                      │
│  ── AUDIO CHUNK BUFFER ──                                            │
│                                                                      │
│  chunks:{session_id}:incoming       LIST (LPUSH/RPOP)                │
│    └── [chunk_N, chunk_N-1, ..., chunk_0]                            │
│    Each item: binary PCM data (3-32KB)                               │
│    Max length: 30 items (30 seconds buffer)                          │
│    TTL: 300s                                                         │
│                                                                      │
│  chunks:{session_id}:outgoing       LIST (LPUSH/RPOP)                │
│    └── [audio_N, audio_N-1, ..., audio_0]                            │
│    Each item: translated audio PCM (binary)                          │
│    Max length: 30 items                                              │
│    TTL: 300s                                                         │
│                                                                      │
│  ── TRANSCRIPT CONTEXT WINDOW ──                                     │
│                                                                      │
│  context:{session_id}:history       LIST (capped at 5 items)         │
│    └── ["translated sentence 4", "translated sentence 3", ...]       │
│    Used by LLM for contextual coherence                              │
│    TTL: 3600s                                                        │
│                                                                      │
│  ── LIVE SUBTITLES ──                                                │
│                                                                      │
│  subtitle:{session_id}:current      HASH                             │
│    ├── original_text                "Hello everyone"                  │
│    ├── translated_text              "सबको नमस्ते"                     │
│    ├── chunk_index                  "42"                              │
│    └── timestamp                    "1751500120"                      │
│    TTL: 60s (auto-clears old subtitles)                              │
│                                                                      │
│  ── RATE LIMITING ──                                                 │
│                                                                      │
│  ratelimit:{user_id}:minute         STRING (counter)                 │
│    └── "15" (chunks this minute)                                     │
│    TTL: 60s (auto-reset every minute)                                │
│                                                                      │
│  ratelimit:{user_id}:daily_minutes  STRING (counter)                 │
│    └── "45" (minutes used today)                                     │
│    TTL: 86400s                                                       │
│                                                                      │
│  ── USER SESSION TRACKING ──                                         │
│                                                                      │
│  user:{user_id}:active_sessions     SET                              │
│    └── {session_id_1, session_id_2}                                  │
│    Used to enforce concurrent session limits                         │
│    TTL: 7200s                                                        │
│                                                                      │
│  ── LATENCY METRICS (rolling window) ──                              │
│                                                                      │
│  metrics:{session_id}:latencies     SORTED SET                       │
│    └── Score: timestamp, Member: latency_ms                          │
│    Used for live p50/p95/p99 calculation                             │
│    Max 1000 entries (ZREMRANGEBYRANK for cleanup)                     │
│    TTL: 3600s                                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Redis Access Patterns — Code Examples

```python
# redis_state.py
import redis.asyncio as redis
import struct

class SessionStateManager:
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis = redis.from_url(redis_url, decode_responses=False)
    
    async def create_session(self, session_id: str, user_id: str, config: dict):
        pipe = self.redis.pipeline()
        
        session_key = f"session:{session_id}:meta"
        pipe.hset(session_key, mapping={
            "user_id": user_id,
            "source_lang": config["source_lang"],
            "target_lang": config["target_lang"],
            "platform": config["platform"],
            "status": "initializing",
            "tts_engine": config.get("tts_engine", "cosyvoice2"),
            "started_at": str(int(config["started_at"])),
            "last_heartbeat": str(int(config["started_at"])),
            "chunks_processed": "0",
        })
        pipe.expire(session_key, 7200)
        
        # Add to user's active sessions
        user_sessions_key = f"user:{user_id}:active_sessions"
        pipe.sadd(user_sessions_key, session_id)
        pipe.expire(user_sessions_key, 7200)
        
        await pipe.execute()
    
    async def store_voice_embedding(self, session_id: str, embedding: bytes):
        pipe = self.redis.pipeline()
        pipe.set(f"speaker:{session_id}:embedding", embedding, ex=3600)
        pipe.set(f"speaker:{session_id}:quality", "0.72", ex=3600)
        await pipe.execute()
    
    async def get_voice_embedding(self, session_id: str) -> bytes | None:
        return await self.redis.get(f"speaker:{session_id}:embedding")
    
    async def push_audio_chunk(self, session_id: str, chunk_data: bytes):
        key = f"chunks:{session_id}:incoming"
        pipe = self.redis.pipeline()
        pipe.lpush(key, chunk_data)
        pipe.ltrim(key, 0, 29)  # keep max 30 chunks
        pipe.expire(key, 300)
        await pipe.execute()
    
    async def pop_audio_chunk(self, session_id: str) -> bytes | None:
        return await self.redis.rpop(f"chunks:{session_id}:incoming")
    
    async def update_context_window(self, session_id: str, translated_text: str):
        key = f"context:{session_id}:history"
        pipe = self.redis.pipeline()
        pipe.lpush(key, translated_text.encode("utf-8"))
        pipe.ltrim(key, 0, 4)  # keep last 5 translations
        pipe.expire(key, 3600)
        await pipe.execute()
    
    async def get_context_window(self, session_id: str) -> list[str]:
        items = await self.redis.lrange(f"context:{session_id}:history", 0, 4)
        return [item.decode("utf-8") for item in reversed(items)]
    
    async def record_latency(self, session_id: str, latency_ms: int, timestamp: float):
        key = f"metrics:{session_id}:latencies"
        pipe = self.redis.pipeline()
        pipe.zadd(key, {str(latency_ms): timestamp})
        pipe.zremrangebyrank(key, 0, -1001)  # keep last 1000
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
        return count < max_sessions
```

---

# 4. Comprehensive End-to-End System Flow & Orchestration

## 4.1 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          END-TO-END DATA FLOW                              │
│                                                                             │
│  BROWSER (Chrome Extension)                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  1. User clicks extension icon on YouTube/Twitch tab                   │ │
│  │     └─▶ service-worker.js receives chrome.action.onClicked             │ │
│  │                                                                        │ │
│  │  2. Service Worker gets stream ID                                      │ │
│  │     └─▶ chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id })    │ │
│  │                                                                        │ │
│  │  3. Service Worker creates offscreen document                          │ │
│  │     └─▶ chrome.offscreen.createDocument({                              │ │
│  │           url: "offscreen.html",                                       │ │
│  │           reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],                   │ │
│  │           justification: "Audio capture and playback"                  │ │
│  │         })                                                             │ │
│  │                                                                        │ │
│  │  4. Offscreen doc redeems stream ID → MediaStream                      │ │
│  │     └─▶ navigator.mediaDevices.getUserMedia({                          │ │
│  │           audio: { mandatory: { chromeMediaSource: "tab",              │ │
│  │                                  chromeMediaSourceId: streamId }}       │ │
│  │         })                                                             │ │
│  │                                                                        │ │
│  │  5. Audio graph constructed:                                           │ │
│  │     MediaStream ──▶ AudioWorklet (chunker) ──▶ WebSocket send          │ │
│  │          │                                                             │ │
│  │          └──▶ GainNode(0.2) ──▶ destination (user hears ducked audio)  │ │
│  │                                                                        │ │
│  │  6. AudioWorklet collects 1s PCM chunks (16kHz, mono, int16)           │ │
│  │     └─▶ Every 800ms (1s chunk with 200ms overlap)                      │ │
│  │     └─▶ Posts chunk to offscreen main thread via port.postMessage()    │ │
│  │                                                                        │ │
│  │  7. Offscreen doc sends binary chunk over WebSocket (wss://)           │ │
│  │     └─▶ [4-byte chunk_index][PCM data] → server                       │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────┬───────────────────────────┘ │
│                                                │                            │
│                                    wss:// (persistent connection)           │
│                                                │                            │
│  SERVER (FastAPI + GPU Pipeline)               │                            │
│  ┌────────────────────────────────────────────▼───────────────────────────┐ │
│  │                                                                        │ │
│  │  8. FastAPI WebSocket endpoint receives binary frame                    │ │
│  │     └─▶ Parse: chunk_index (uint32) + PCM audio bytes                  │ │
│  │     └─▶ Push to Redis: LPUSH chunks:{session_id}:incoming              │ │
│  │                                                                        │ │
│  │  9. Pipeline Orchestrator picks up chunk                                │ │
│  │     └─▶ RPOP chunks:{session_id}:incoming                              │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ STEP A: STT (Faster-Whisper) ─── ~30ms                         │   │ │
│  │  │                                                                 │   │ │
│  │  │  Input:  PCM int16, 16kHz, 1 second                            │   │ │
│  │  │  Model:  large-v3-turbo, INT8, beam_size=1                     │   │ │
│  │  │  VAD:    Silero, min_silence=300ms                             │   │ │
│  │  │  Output: { text, language, segments[], word_timestamps[] }     │   │ │
│  │  │                                                                 │   │ │
│  │  │  ► If VAD detects no speech → skip to next chunk               │   │ │
│  │  │  ► If first 5s → also fork audio to voice embedding extractor  │   │ │
│  │  └──────────────────────────┬──────────────────────────────────────┘   │ │
│  │                              │                                         │ │
│  │                              ▼                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ STEP B: Translation (vLLM + Qwen-2.5-7B) ─── ~100-200ms       │   │ │
│  │  │                                                                 │   │ │
│  │  │  Input:  STT text + context window (last 3 translations)       │   │ │
│  │  │  Model:  Qwen-2.5-7B-Instruct-AWQ, temp=0.3                   │   │ │
│  │  │  Prompt: System prompt + contextual translation instruction    │   │ │
│  │  │  Output: Translated text (streamed token by token)             │   │ │
│  │  │                                                                 │   │ │
│  │  │  ► Tokens stream directly to TTS as they arrive                │   │ │
│  │  │  ► Update context window: LPUSH context:{sid}:history          │   │ │
│  │  │  ► Detect emotion from STT text (! ? ... caps → tag)          │   │ │
│  │  └──────────────────────────┬──────────────────────────────────────┘   │ │
│  │                              │                                         │ │
│  │                              ▼ (streaming — tokens arrive as produced) │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ STEP C: TTS + Voice Clone ─── ~150ms (first audio chunk)       │   │ │
│  │  │                                                                 │   │ │
│  │  │  Input:  Translated text + speaker embedding + emotion tag     │   │ │
│  │  │  Model:  CosyVoice 2 (multilingual) / Chatterbox Turbo (EN)   │   │ │
│  │  │  Embed:  GET speaker:{session_id}:embedding from Redis         │   │ │
│  │  │  Output: Streaming PCM audio chunks (200ms each)               │   │ │
│  │  │                                                                 │   │ │
│  │  │  ► Each 200ms audio chunk sent immediately via WebSocket       │   │ │
│  │  │  ► Don't wait for full sentence synthesis                      │   │ │
│  │  └──────────────────────────┬──────────────────────────────────────┘   │ │
│  │                              │                                         │ │
│  │  10. Send results back via WebSocket                                   │ │
│  │      ├─▶ Text frame (JSON):  { original, translated, emotion }        │ │
│  │      └─▶ Binary frames:      Streamed TTS audio chunks                │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────┬───────────────────────────┘ │
│                                                │                            │
│                                    wss:// (same persistent connection)      │
│                                                │                            │
│  BROWSER (Playback)                            │                            │
│  ┌────────────────────────────────────────────▼───────────────────────────┐ │
│  │                                                                        │ │
│  │  11. Offscreen doc receives translated audio chunks                    │ │
│  │      └─▶ Decode PCM → AudioBuffer                                     │ │
│  │      └─▶ Queue in playback buffer (50ms pre-buffer)                    │ │
│  │                                                                        │ │
│  │  12. Audio ducking activates                                           │ │
│  │      └─▶ Original GainNode: ramp to 0.2 over 150ms                    │ │
│  │      └─▶ Translated AudioBufferSource: play at gain 1.0               │ │
│  │      └─▶ On playback end: ramp original back to 1.0 over 500ms        │ │
│  │                                                                        │ │
│  │  13. Content Script receives subtitle data                             │ │
│  │      └─▶ chrome.runtime.onMessage listener                             │ │
│  │      └─▶ Update dual subtitle overlay in YouTube/Twitch player         │ │
│  │      └─▶ Original text (top, 14px, 60% opacity)                       │ │
│  │      └─▶ Translated text (bottom, 18px, 100% opacity)                 │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 FastAPI WebSocket Gateway

```python
# gateway.py
import asyncio
import time
import struct
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager

from stt_service import STTService
from translation_service import translate_text
from tts_service import TTSService
from redis_state import SessionStateManager

app = FastAPI()
stt = STTService()
tts = TTSService()
state = SessionStateManager()


@app.websocket("/ws/translate")
async def websocket_translate(ws: WebSocket):
    await ws.accept()
    session_id = None
    user_id = None
    config = {}
    voice_sample_buffer = bytearray()
    voice_ready = False
    chunks_for_embedding = 0

    try:
        while True:
            data = await ws.receive()

            # ── Text message: control commands ──
            if "text" in data:
                import json
                msg = json.loads(data["text"])

                if msg["type"] == "session_start":
                    session_id = msg["session_id"]
                    user_id = msg.get("user_id")
                    config = msg
                    
                    await state.create_session(session_id, user_id, {
                        "source_lang": msg["source_lang"],
                        "target_lang": msg["target_lang"],
                        "platform": msg.get("platform", "youtube"),
                        "started_at": time.time(),
                    })
                    
                    await ws.send_json({
                        "type": "session_ready",
                        "session_id": session_id,
                        "status": "initializing",
                        "message": "Building voice profile... (5 seconds)",
                    })

                elif msg["type"] == "session_end":
                    if session_id:
                        await state.end_session(session_id)
                    break

            # ── Binary message: audio chunk ──
            elif "bytes" in data:
                if not session_id:
                    continue

                raw = data["bytes"]
                chunk_index = struct.unpack("<I", raw[:4])[0]
                pcm_data = raw[4:]
                
                t_start = time.time()

                # Rate limit check
                if not await state.check_rate_limit(user_id):
                    await ws.send_json({"type": "error", "message": "Rate limit exceeded"})
                    continue

                # ── Phase 1: Voice embedding (first 5 seconds) ──
                if not voice_ready:
                    voice_sample_buffer.extend(pcm_data)
                    chunks_for_embedding += 1
                    
                    if chunks_for_embedding >= 5:  # 5 x 1s chunks = 5 seconds
                        embedding = await extract_speaker_embedding(
                            [bytes(voice_sample_buffer)],
                            sample_rate=16000,
                        )
                        await state.store_voice_embedding(session_id, embedding)
                        await state.store_reference_audio(session_id, bytes(voice_sample_buffer))
                        voice_ready = True
                        
                        await ws.send_json({
                            "type": "voice_ready",
                            "session_id": session_id,
                            "quality_score": 0.72,
                            "message": "Voice profile ready! Starting translation...",
                        })
                    else:
                        await ws.send_json({
                            "type": "voice_building",
                            "progress": chunks_for_embedding / 5,
                            "seconds_remaining": 5 - chunks_for_embedding,
                        })
                    continue

                # ── Phase 2: Full pipeline (STT → LLM → TTS) ──
                
                # Step A: Speech-to-Text
                stt_result = await stt.transcribe_chunk(pcm_data, sample_rate=16000)
                
                if not stt_result["text"].strip():
                    continue  # silence or noise, skip
                
                original_text = stt_result["text"]
                detected_lang = stt_result["language"]
                
                # Detect emotion from text patterns
                emotion = detect_emotion(original_text)
                
                # Step B: Translation
                context = await state.get_context_window(session_id)
                translated_text = await translate_text(
                    text=original_text,
                    source_lang=config.get("source_lang", detected_lang),
                    target_lang=config["target_lang"],
                    context_window=context,
                )
                
                await state.update_context_window(session_id, translated_text)
                
                # Send subtitle update immediately (don't wait for TTS)
                await ws.send_json({
                    "type": "subtitle",
                    "original": original_text,
                    "translated": translated_text,
                    "source_lang": detected_lang,
                    "target_lang": config["target_lang"],
                    "chunk_index": chunk_index,
                    "emotion": emotion,
                })
                
                # Step C: TTS with voice cloning (streaming)
                speaker_embedding = await state.get_voice_embedding(session_id)
                
                async for audio_chunk in tts.synthesize_streaming(
                    text=translated_text,
                    session_id=session_id,
                    speaker_embedding=speaker_embedding,
                    emotion=emotion,
                    target_lang=config["target_lang"],
                ):
                    await ws.send_bytes(audio_chunk)
                
                # Send end-of-utterance marker
                await ws.send_json({"type": "utterance_end", "chunk_index": chunk_index})
                
                # Record latency
                latency_ms = int((time.time() - t_start) * 1000)
                await state.record_latency(session_id, latency_ms, time.time())

    except WebSocketDisconnect:
        if session_id:
            await state.end_session(session_id)
    except Exception as e:
        if session_id:
            await state.set_session_error(session_id, str(e))
        await ws.send_json({"type": "error", "message": str(e)})


def detect_emotion(text: str) -> str:
    if text.count("!") >= 2 or text.isupper():
        return "excited"
    if text.count("?") >= 2:
        return "curious"
    if "..." in text or text.endswith(".."):
        return "hesitant"
    if any(w in text.lower() for w in ["haha", "lol", "lmao", "😂"]):
        return "happy"
    return "neutral"
```

## 4.3 Failure Modes & Stream Healing

```
┌────────────────────────────────────────────────────────────────────────┐
│                    FAILURE MODES & RECOVERY                            │
├──────────────────────┬─────────────────────────────────────────────────┤
│ Failure              │ Recovery Strategy                               │
├──────────────────────┼─────────────────────────────────────────────────┤
│ WebSocket drop       │ 1. Client auto-reconnect with exponential       │
│                      │    backoff (1s, 2s, 4s, max 30s)               │
│                      │ 2. Send session_id on reconnect                 │
│                      │ 3. Server resumes from last chunk_index         │
│                      │ 4. Redis session state survives disconnects     │
│                      │ 5. Voice embedding persists (no re-sampling)    │
├──────────────────────┼─────────────────────────────────────────────────┤
│ STT timeout (>2s)    │ 1. Skip chunk, log warning                      │
│                      │ 2. Continue with next chunk                      │
│                      │ 3. If 3 consecutive timeouts → switch to        │
│                      │    smaller model (base.en) temporarily          │
├──────────────────────┼─────────────────────────────────────────────────┤
│ LLM timeout (>3s)    │ 1. Use cached previous translation as fallback  │
│                      │ 2. Show original text as subtitle               │
│                      │ 3. Skip TTS for this chunk                      │
│                      │ 4. Resume normal pipeline on next chunk          │
├──────────────────────┼─────────────────────────────────────────────────┤
│ TTS failure          │ 1. Skip audio playback for this chunk            │
│                      │ 2. Subtitle still displays (text-only mode)      │
│                      │ 3. Retry with simpler voice (no emotion tags)    │
├──────────────────────┼─────────────────────────────────────────────────┤
│ GPU OOM              │ 1. Kill largest batch, free CUDA cache           │
│                      │ 2. Reduce max_num_seqs for vLLM                  │
│                      │ 3. Alert: suggest fewer concurrent sessions      │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Tab switch (Chrome)  │ 1. Audio may gap due to background throttling    │
│                      │ 2. Detect via visibilitychange event             │
│                      │ 3. Show "Tab not focused" warning                │
│                      │ 4. Buffer and resume when tab regains focus      │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Stream ends          │ 1. Detect silence > 10s via VAD                  │
│                      │ 2. Send session_end automatically                │
│                      │ 3. Save session analytics to PostgreSQL          │
│                      │ 4. Clean up Redis keys                           │
└──────────────────────┴─────────────────────────────────────────────────┘
```

### WebSocket Auto-Reconnect (Client-Side)

```javascript
// websocket-manager.js
class ReconnectingWebSocket {
  constructor(url, sessionId) {
    this.url = url;
    this.sessionId = sessionId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.lastChunkIndex = 0;
    this.onAudioChunk = null;
    this.onSubtitle = null;
    this.onStatus = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      
      // Resume session if reconnecting
      this.ws.send(JSON.stringify({
        type: "session_resume",
        session_id: this.sessionId,
        last_chunk_index: this.lastChunkIndex,
      }));
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws.close();
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } else {
        this.onAudioChunk?.(event.data);
      }
    };
  }

  scheduleReconnect() {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;
    
    this.onStatus?.({
      type: "reconnecting",
      attempt: this.reconnectAttempts,
      delay,
    });
    
    setTimeout(() => this.connect(), delay);
  }

  handleMessage(msg) {
    switch (msg.type) {
      case "subtitle":
        this.lastChunkIndex = msg.chunk_index;
        this.onSubtitle?.(msg);
        break;
      case "utterance_end":
        this.lastChunkIndex = msg.chunk_index;
        break;
      case "voice_ready":
      case "voice_building":
      case "error":
        this.onStatus?.(msg);
        break;
    }
  }

  sendAudioChunk(pcmData, chunkIndex) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const header = new Uint32Array([chunkIndex]);
      const payload = new Uint8Array(header.byteLength + pcmData.byteLength);
      payload.set(new Uint8Array(header.buffer), 0);
      payload.set(new Uint8Array(pcmData), header.byteLength);
      this.ws.send(payload.buffer);
    }
  }

  close() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "session_end" }));
      this.ws.close(1000, "Session ended by user");
    }
  }
}
```

---

# 5. Detailed UI/UX Blueprint & Front-End Engineering

## 5.1 Technology Stack

```
Frontend:    React 19 + TypeScript + Vite
UI Framework: UIPro (uipro init --ai claude)
              - 57 UI Styles, 95 Color Palettes, 56 Font Pairings
Animations:  framer-motion (npm i framer-motion)
State:       Zustand (lightweight, no boilerplate)
Extension:   Chrome Manifest V3
Styling:     Tailwind CSS 4 + UIPro themes
```

## 5.2 User Journey — 4 Key Phases

### Phase 1: Onboarding (Extension Popup)

```
┌─────────────────────────────────────────────┐
│           PromptDub Popup (400x500px)        │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │                                      │   │
│   │        🎙️  PromptDub                 │   │
│   │     "Hear any stream, your way"      │   │
│   │                                      │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   Step 1 of 3: Choose your language          │
│   ┌──────────────────────────────────────┐   │
│   │  I speak:  [English        ▼]       │   │
│   │  Translate to: [Hindi      ▼]       │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   Step 2 of 3: Sign in                       │
│   ┌──────────────────────────────────────┐   │
│   │  [Continue with Google]              │   │
│   │  [Sign in with Email]                │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   Step 3 of 3: Choose your plan              │
│   ┌──────────────────────────────────────┐   │
│   │  ○ Free  (60 min/mo, 5 langs)       │   │
│   │  ● Pro   ($19.99/mo, unlimited)      │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   [  Get Started  ─────────────────────▶]    │
│                                              │
│   Powered by open-source AI                  │
└─────────────────────────────────────────────┘
```

### Phase 2: Extension Overlay Injection

```javascript
// content-script.js — Injected into YouTube/Twitch pages

function injectPromptDubOverlay() {
  const playerContainer = 
    document.querySelector("#movie_player") ||           // YouTube
    document.querySelector('[data-a-target="video-player"]'); // Twitch

  if (!playerContainer || document.getElementById("promptdub-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "promptdub-overlay";
  overlay.innerHTML = `
    <div id="pd-subtitle-container" style="
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      max-width: 800px;
      z-index: 60;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    ">
      <!-- Original text (smaller, dimmed) -->
      <div id="pd-original-subtitle" style="
        background: rgba(0, 0, 0, 0.5);
        color: rgba(255, 255, 255, 0.6);
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 14px;
        font-family: 'Inter', system-ui, sans-serif;
        text-align: center;
        display: none;
      "></div>
      
      <!-- Translated text (larger, bright) -->
      <div id="pd-translated-subtitle" style="
        background: rgba(0, 0, 0, 0.75);
        color: #ffffff;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 18px;
        font-weight: 500;
        font-family: 'Inter', system-ui, sans-serif;
        text-align: center;
        display: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    </div>
    
    <!-- PromptDub control pill (top-right of player) -->
    <div id="pd-control-pill" style="
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 61;
      pointer-events: auto;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        padding: 6px 12px;
        border-radius: 20px;
        cursor: pointer;
        user-select: none;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 13px;
        color: white;
      ">
        <div id="pd-status-dot" style="
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
          animation: pd-pulse 2s infinite;
        "></div>
        <span id="pd-status-text">PromptDub</span>
        <span id="pd-latency" style="color: rgba(255,255,255,0.5);">420ms</span>
      </div>
    </div>
  `;

  // Inject CSS animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pd-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes pd-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #pd-translated-subtitle {
      animation: pd-fade-in 0.2s ease-out;
    }
  `;
  document.head.appendChild(style);
  playerContainer.style.position = "relative";
  playerContainer.appendChild(overlay);
}

// Handle YouTube SPA navigation
document.addEventListener("yt-navigate-finish", () => {
  setTimeout(injectPromptDubOverlay, 500);
});

// MutationObserver for robustness
const observer = new MutationObserver(() => {
  if (!document.getElementById("promptdub-overlay")) {
    injectPromptDubOverlay();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for subtitle updates from offscreen document
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "subtitle-update") {
    updateSubtitles(msg.original, msg.translated);
  }
  if (msg.type === "status-update") {
    updateStatusPill(msg);
  }
});

function updateSubtitles(original, translated) {
  const origEl = document.getElementById("pd-original-subtitle");
  const transEl = document.getElementById("pd-translated-subtitle");
  
  if (original && origEl) {
    origEl.textContent = original;
    origEl.style.display = "block";
  }
  if (translated && transEl) {
    transEl.textContent = translated;
    transEl.style.display = "block";
    
    // Auto-hide after 5 seconds of no update
    clearTimeout(transEl._hideTimer);
    transEl._hideTimer = setTimeout(() => {
      origEl.style.display = "none";
      transEl.style.display = "none";
    }, 5000);
  }
}

function updateStatusPill(msg) {
  const dot = document.getElementById("pd-status-dot");
  const text = document.getElementById("pd-status-text");
  const latency = document.getElementById("pd-latency");
  
  if (msg.status === "voice_building") {
    dot.style.background = "#f59e0b";
    text.textContent = `Building voice... ${Math.round(msg.progress * 100)}%`;
  } else if (msg.status === "active") {
    dot.style.background = "#22c55e";
    text.textContent = "PromptDub";
    if (msg.latency_ms) latency.textContent = `${msg.latency_ms}ms`;
  } else if (msg.status === "error") {
    dot.style.background = "#ef4444";
    text.textContent = "Error";
  } else if (msg.status === "reconnecting") {
    dot.style.background = "#f59e0b";
    text.textContent = "Reconnecting...";
  }
}
```

### Phase 3: Activation / Buffering State

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   YouTube Video Player                                       │
│   ┌──────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │                    VIDEO CONTENT                     │   │
│   │                                                      │   │
│   │                                              ┌─────┐│   │
│   │                                              │ 🟡  ││   │
│   │                                              │Build││   │
│   │                                              │voice││   │
│   │                                              │ 60% ││   │
│   │                                              └─────┘│   │
│   │                                                      │   │
│   │          ┌─────────────────────────────┐             │   │
│   │          │  Building voice profile...  │             │   │
│   │          │  ████████░░░░  3/5 seconds  │             │   │
│   │          └─────────────────────────────┘             │   │
│   │                                                      │   │
│   │  ▶  ━━━━━━━━━━━━━━━━━━━━━━━━━ 12:34 / 1:24:56     │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   AFTER 5 SECONDS → Transitions to:                          │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │                    VIDEO CONTENT                     │   │
│   │              (original audio at 20%)                 │   │
│   │                                              ┌─────┐│   │
│   │                                              │ 🟢  ││   │
│   │                                              │Promp││   │
│   │                                              │tDub ││   │
│   │                                              │420ms││   │
│   │                                              └─────┘│   │
│   │                                                      │   │
│   │      And I think this is really important for us     │   │ ← Original (dim)
│   │     और मुझे लगता है कि यह हमारे लिए बहुत ज़रूरी है     │   │ ← Translated (bright)
│   │                                                      │   │
│   │  ▶  ━━━━━━━━━━━━━━━━━━━━━━━━━ 12:39 / 1:24:56     │   │
│   └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4: Live Playback with Dual Subtitles

The full playback state is shown above. Key UX details:

**Audio Ducking Implementation:**

```
Normal state:     Original audio = 100%, Translated = 0%
During speech:    Original audio =  20%, Translated = 100%
Transition in:    150ms linear ramp (no clicks)
Transition out:   500ms linear ramp (smooth restore)
Gap between:      If next utterance arrives within 800ms, stay ducked
```

**Subtitle Behavior:**
- Original text: 14px, 60% opacity, top subtitle bar
- Translated text: 18px, 100% opacity, bottom subtitle bar (dominant)
- Fade-in animation: 200ms ease-out (framer-motion)
- Auto-hide after 5s of no new text
- Positioned 80px above player controls (clears YouTube's control bar)

## 5.3 Web Audio API Pipeline — Complete Audio Ducking

```javascript
// audio-pipeline.js — Complete ducking pipeline

class AudioDuckingPipeline {
  constructor() {
    this.audioCtx = null;
    this.originalGain = null;
    this.translatedGain = null;
    this.playbackQueue = [];
    this.isPlaying = false;
    this.duckTimeout = null;
  }

  async initialize(tabMediaStream) {
    this.audioCtx = new AudioContext({ sampleRate: 16000 });
    await this.audioCtx.resume();

    // Source: captured tab audio
    const source = this.audioCtx.createMediaStreamSource(tabMediaStream);

    // Original audio path (user hears this at 20% during translation)
    this.originalGain = new GainNode(this.audioCtx, { gain: 1.0 });
    source.connect(this.originalGain);
    this.originalGain.connect(this.audioCtx.destination);

    // Translated audio path (user hears this at 100%)
    this.translatedGain = new GainNode(this.audioCtx, { gain: 1.0 });
    this.translatedGain.connect(this.audioCtx.destination);

    // AudioWorklet for chunking (sends to server)
    await this.audioCtx.audioWorklet.addModule("audio-worklet-processor.js");
    this.chunkerNode = new AudioWorkletNode(this.audioCtx, "audio-chunker", {
      processorOptions: {
        chunkDurationMs: 1000,
        overlapMs: 200,
        sampleRate: 16000,
      },
    });
    source.connect(this.chunkerNode);

    return this.chunkerNode;
  }

  duckOriginal() {
    if (!this.audioCtx || !this.originalGain) return;
    
    clearTimeout(this.duckTimeout);
    const now = this.audioCtx.currentTime;
    
    this.originalGain.gain.cancelScheduledValues(now);
    this.originalGain.gain.setValueAtTime(this.originalGain.gain.value, now);
    this.originalGain.gain.linearRampToValueAtTime(0.2, now + 0.15);
  }

  restoreOriginal() {
    if (!this.audioCtx || !this.originalGain) return;
    
    // Delay restore by 800ms — if next utterance arrives, stay ducked
    clearTimeout(this.duckTimeout);
    this.duckTimeout = setTimeout(() => {
      const now = this.audioCtx.currentTime;
      this.originalGain.gain.cancelScheduledValues(now);
      this.originalGain.gain.setValueAtTime(this.originalGain.gain.value, now);
      this.originalGain.gain.linearRampToValueAtTime(1.0, now + 0.5);
    }, 800);
  }

  async playTranslatedAudio(pcmArrayBuffer) {
    this.playbackQueue.push(pcmArrayBuffer);
    
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.duckOriginal();
      await this.processQueue();
    }
  }

  async processQueue() {
    while (this.playbackQueue.length > 0) {
      const pcmData = this.playbackQueue.shift();
      
      // Convert PCM int16 to float32 AudioBuffer
      const int16Array = new Int16Array(pcmData);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const audioBuffer = this.audioCtx.createBuffer(1, float32Array.length, 16000);
      audioBuffer.getChannelData(0).set(float32Array);
      
      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.translatedGain);
      
      // Play and wait for completion
      await new Promise((resolve) => {
        source.onended = resolve;
        source.start();
      });
    }
    
    this.isPlaying = false;
    this.restoreOriginal();
  }

  destroy() {
    clearTimeout(this.duckTimeout);
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
```

---

# 6. Concrete Technical Implementation Roadmap & Phase Plan

## 6.1 Four-Phase Engineering Sprint Plan

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        PROMPTDUB ENGINEERING ROADMAP                      │
│                                                                            │
│  Phase 1          Phase 2          Phase 3          Phase 4               │
│  MVP/PoC          Beta             Production       Enterprise            │
│  (6 weeks)        (8 weeks)        (8 weeks)        (8 weeks)             │
│                                                                            │
│  ████████░░        ████████████░░    ████████████░░    ████████████░░       │
│  Week 1-6         Week 7-14        Week 15-22       Week 23-30            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: MVP / Proof of Concept (Weeks 1-6)

**Goal:** Prove the pipeline works end-to-end. English → Hindi, single GPU, basic extension.

| Week | Sprint | Deliverables |
|------|--------|-------------|
| 1-2 | Foundation | FastAPI WebSocket server, Faster-Whisper INT8 integration, basic Chrome extension with tabCapture + offscreen document |
| 3 | Translation | vLLM + Qwen-2.5-7B AWQ deployment, translation prompt engineering, context window implementation |
| 4 | Voice Clone | CosyVoice 2 streaming integration, 5-second voice sampling, embedding storage in Redis |
| 5 | Extension UI | Content script overlay injection, dual subtitles, audio ducking pipeline, framer-motion animations |
| 6 | Integration | End-to-end pipeline testing, latency benchmarking, bug fixes |

**Testing Benchmarks:**
- E2E latency < 1500ms on YouTube live stream
- Voice cloning quality > 0.70 speaker similarity
- Extension works on YouTube (desktop Chrome 116+)
- Single GPU (A10G) handles 5 concurrent sessions

**Infrastructure:**
```
1x AWS g5.xlarge (A10G, 24GB VRAM)
  - All 3 models co-located
  - Faster-Whisper: 1.6 GB
  - Qwen-2.5 AWQ:  3.7 GB  
  - CosyVoice 2:   8.0 GB
  - Total: 13.3 GB / 24 GB

1x t3.medium (Gateway + Redis + Postgres)

Estimated cost: ~$1.00/hr ($730/mo)
```

### Phase 2: Beta Release (Weeks 7-14)

**Goal:** Multi-language, user authentication, subscription tiers, Twitch support.

| Week | Sprint | Deliverables |
|------|--------|-------------|
| 7-8 | Auth & Billing | User registration, JWT auth, Stripe integration, subscription tiers (free/starter/pro) |
| 9-10 | Multi-Language | Add 10 languages, Chatterbox Turbo for English, language auto-detection, UIPro theming |
| 11-12 | Platform Expansion | Twitch content script, MutationObserver for dynamic DOM, platform-specific audio handling |
| 13-14 | Quality & Polish | Session analytics dashboard, latency optimization, Chrome Web Store submission |

**Testing Benchmarks:**
- 10 languages fully functional (EN, HI, ES, FR, DE, JA, KO, ZH, PT, IT)
- Twitch support validated on 20 channels
- Subscription flow complete (Stripe checkout → usage tracking)
- Chrome Web Store review submission
- Handle 20 concurrent sessions on 2 GPUs

**Infrastructure:**
```
2x AWS g5.xlarge (A10G)
  GPU 1: STT + LLM (5.3 GB)
  GPU 2: TTS (8.0 GB)
  
1x t3.large (Gateway)
1x t3.medium (Redis + Postgres)

Estimated cost: ~$1.80/hr ($1,314/mo)
```

### Phase 3: Production Launch (Weeks 15-22)

**Goal:** Production hardening, OBS plugin, auto-scaling, 23 languages.

| Week | Sprint | Deliverables |
|------|--------|-------------|
| 15-16 | Auto-Scaling | Kubernetes (k3s) cluster, GPU node auto-scaling, horizontal pod autoscaler for gateway |
| 17-18 | OBS Plugin | C++ OBS plugin (obs-plugintemplate), audio filter pipeline, WebSocket client, streaming integration |
| 19-20 | All Languages | Add remaining 13 languages, quality validation per language, TTS engine routing |
| 21-22 | Production Hardening | Load testing (k6), monitoring (Prometheus + Grafana), alerting, CDN for static assets, rate limiting |

**Testing Benchmarks:**
- 23 languages operational
- 100 concurrent sessions across GPU cluster
- p95 latency < 1200ms
- 99.5% uptime over 2-week burn-in
- OBS plugin tested with OBS 30+ on Windows/Mac/Linux
- Load test: sustained 1000 req/s on gateway

**Infrastructure:**
```
Kubernetes cluster (k3s or EKS):
  3x g5.xlarge (A10G) — GPU pool
    Auto-scale: 2-6 nodes based on session count
  2x t3.large — gateway replicas
  1x r6g.large — Redis (Valkey)
  1x r6g.large — PostgreSQL (RDS)
  
ALB + CloudFront for static assets

Estimated cost: ~$4.50/hr ($3,285/mo)
Handles: ~100-200 concurrent users
```

### Phase 4: Enterprise Scale (Weeks 23-30)

**Goal:** Enterprise APIs, multi-region, SLA, B2B features.

| Week | Sprint | Deliverables |
|------|--------|-------------|
| 23-24 | Enterprise API | REST API for B2B customers, API key management, usage metering, bulk pricing |
| 25-26 | Multi-Region | Deploy to EU (Frankfurt) + Asia (Singapore), geo-routing, data residency compliance |
| 27-28 | Advanced Features | Speaker diarization (multi-speaker), custom voice training, priority queue for enterprise |
| 29-30 | SLA & Compliance | 99.9% SLA, SOC2 prep, GDPR compliance, security audit, documentation |

**Testing Benchmarks:**
- Multi-region failover < 30s
- Enterprise API: 1000 req/s per customer
- Speaker diarization accuracy > 85% (2-4 speakers)
- 99.9% uptime SLA validated
- GDPR data deletion within 72 hours
- 500+ concurrent users globally

**Infrastructure:**
```
Multi-region Kubernetes (EKS):
  US-East:
    4x g5.xlarge (A10G) — GPU pool
    3x t3.large — gateway
  EU-Frankfurt:
    2x g5.xlarge (A10G)
    2x t3.large — gateway
  Asia-Singapore:
    2x g5.xlarge (A10G)
    2x t3.large — gateway

RDS Multi-AZ (PostgreSQL)
ElastiCache Multi-AZ (Valkey)
CloudFront Global CDN
Route53 latency-based routing

Estimated cost: ~$15/hr ($10,950/mo)
Handles: ~500-1000 concurrent users globally
```

## 6.2 Unit Economics Summary

```
┌────────────────────────────────────────────────────────────┐
│                    UNIT ECONOMICS                          │
├─────────────────────────────┬──────────────────────────────┤
│ GPU Cost (A10G spot)        │ ~$0.40/hr per GPU            │
│ Sessions per GPU            │ ~50-100 concurrent           │
│ Cost per user-hour          │ $0.004 - $0.008              │
│ Cost per user-month (avg)   │ $0.20 - $0.80               │
│                             │ (assuming 2-4 hrs/day usage) │
├─────────────────────────────┼──────────────────────────────┤
│ Pricing Tiers               │                              │
│   Free                      │ $0 (60 min/mo)              │
│   Starter                   │ $9.99/mo (300 min)          │
│   Pro                       │ $19.99/mo (unlimited)       │
│   Enterprise                │ Custom ($5-15/seat/mo)      │
├─────────────────────────────┼──────────────────────────────┤
│ Gross Margin (Pro user)     │ ~85-95%                      │
│ Break-even                  │ ~500 paid users              │
└─────────────────────────────┴──────────────────────────────┘
```

---

# Appendix A: Service Worker (Extension Entry Point)

```javascript
// service-worker.js
chrome.action.onClicked.addListener(async (tab) => {
  // Only activate on YouTube/Twitch
  if (!tab.url?.match(/youtube\.com|twitch\.tv/)) {
    return;
  }

  // Get tab capture stream ID
  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tab.id,
  });

  // Create offscreen document (only one allowed)
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });

  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
      justification: "Audio capture and translated audio playback",
    });
  }

  // Get user config from storage
  const config = await chrome.storage.local.get([
    "serverUrl",
    "targetLang",
    "apiKey",
    "sessionId",
  ]);

  // Send stream ID to offscreen document
  chrome.runtime.sendMessage({
    type: "start-capture",
    streamId: streamId,
    config: {
      serverUrl: config.serverUrl || "wss://api.promptdub.com/ws/translate",
      targetLang: config.targetLang || "hi",
      sourceLang: "auto",
      sessionId: crypto.randomUUID(),
      apiKey: config.apiKey,
    },
  });
});

// Relay messages between offscreen doc and content scripts
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "subtitle-update" || message.type === "status-update") {
    // Forward to content script in the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
});
```

# Appendix B: Complete Project Directory Structure

```
promptdub/
├── extension/                          # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── service-worker.js               # Background service worker
│   ├── offscreen.html                  # Offscreen document
│   ├── offscreen.js                    # Audio capture + WebSocket
│   ├── audio-worklet-processor.js      # AudioWorklet chunker
│   ├── content-script.js              # YouTube/Twitch overlay injection
│   ├── overlay.css                    # Subtitle + control styles
│   ├── popup.html                     # Extension popup
│   ├── popup/                         # Popup React app
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── store.ts                   # Zustand state
│   ├── websocket-manager.js           # Auto-reconnecting WS client
│   ├── audio-pipeline.js             # Audio ducking pipeline
│   └── icons/
│
├── services/                          # Backend Microservices
│   ├── gateway/                       # FastAPI WebSocket Gateway
│   │   ├── Dockerfile
│   │   ├── main.py                   # FastAPI app
│   │   ├── gateway.py                # WebSocket handler
│   │   ├── redis_state.py            # Redis state manager
│   │   ├── auth.py                   # JWT authentication
│   │   └── requirements.txt
│   │
│   ├── stt/                          # Speech-to-Text Service
│   │   ├── Dockerfile
│   │   ├── stt_service.py            # Faster-Whisper wrapper
│   │   ├── server.py                 # gRPC/HTTP service
│   │   └── requirements.txt
│   │
│   ├── llm/                          # Translation LLM Service
│   │   ├── Dockerfile
│   │   ├── translation_service.py    # vLLM client
│   │   └── requirements.txt
│   │
│   └── tts/                          # TTS + Voice Cloning Service
│       ├── Dockerfile
│       ├── tts_service.py            # CosyVoice 2 wrapper
│       ├── tts_chatterbox_service.py # Chatterbox Turbo wrapper
│       ├── voice_embedding.py        # Speaker embedding extraction
│       └── requirements.txt
│
├── obs-plugin/                        # OBS Studio Plugin (C++)
│   ├── CMakeLists.txt
│   ├── src/
│   │   ├── plugin-main.cpp
│   │   ├── audio-filter.cpp          # Audio filter implementation
│   │   ├── websocket-client.cpp      # WS client for server
│   │   └── ui-dock.cpp              # OBS dock panel UI
│   └── README.md
│
├── web/                              # Landing Page + Dashboard
│   ├── package.json                  # UIPro + framer-motion
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── styles/                   # UIPro theme config
│   └── public/
│
├── infra/                            # Infrastructure
│   ├── docker-compose.yml            # Local dev stack
│   ├── k8s/                          # Kubernetes manifests
│   │   ├── gateway-deployment.yaml
│   │   ├── stt-deployment.yaml
│   │   ├── llm-deployment.yaml
│   │   ├── tts-deployment.yaml
│   │   └── hpa.yaml                  # Horizontal Pod Autoscaler
│   └── terraform/                    # AWS infrastructure
│
├── migrations/                       # Database migrations
│   └── 001_initial_schema.sql
│
└── docs/
    └── api.md
```

---

*End of PromptDub Specification Document v1.0*
