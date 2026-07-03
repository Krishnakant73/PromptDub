# PromptDub Mobile App — Research & Strategy

## Executive Summary

Building a mobile version of PromptDub is technically feasible but faces significant platform restrictions around audio capture from other apps. The recommended approach is a **hybrid strategy**: an in-app browser (WebView) for direct stream playback with internal audio capture, combined with a React Native shell for native performance.

---

## 1. Core Technical Challenge: Mobile Audio Capture

### The Problem
Unlike Chrome extensions that can capture tab audio via `chrome.tabCapture`, mobile operating systems strictly isolate app audio. You **cannot** directly capture audio from the YouTube or Twitch mobile app.

### Platform-Specific Restrictions

#### iOS
- **No system audio capture API** for third-party apps
- `AVAudioSession` only controls your own app's audio
- Screen Recording via `ReplayKit` can capture system audio, BUT:
  - Requires explicit user permission each time
  - Shows a persistent red status bar indicator
  - Apple App Store **rejects** apps that record other apps' audio for processing
  - Only works via Broadcast Upload Extension (background process)
- **Accessibility APIs** cannot capture audio streams
- **Verdict: Direct capture from YouTube iOS app is not possible**

#### Android
- `MediaProjection` API (Android 5.0+) can capture system audio
  - Requires user confirmation dialog each time
  - Shows a persistent notification/icon while recording
  - Android 14+ added stricter restrictions on background MediaProjection
  - Must declare `foregroundServiceType="mediaProjection"` in manifest
- `AudioPlaybackCapture` API (Android 10+) can capture other apps' audio
  - Apps can opt-out via `setAllowedCapturePolicy(ALLOW_CAPTURE_BY_NONE)`
  - YouTube app **opts out** of audio capture on many devices
- **Verdict: Technically possible on Android but unreliable due to app opt-outs**

---

## 2. Recommended Approach: In-App WebView Browser

### Why WebView?
When the user watches streams **inside our app's WebView**, we control the entire audio pipeline. No platform restrictions apply because the audio originates within our own app context.

### Architecture

```
┌────────────────────────────────────────────────────┐
│                 PromptDub Mobile App                │
│                                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │           WebView (YouTube/Twitch)             │ │
│  │                                                │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │         Video Player (web)               │  │ │
│  │  │                                          │  │ │
│  │  │   JavaScript Bridge captures audio       │  │ │
│  │  │   via Web Audio API (AudioContext)       │  │ │
│  │  │                                          │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  └────────────────────┬───────────────────────────┘ │
│                       │ Audio data via JS Bridge     │
│  ┌────────────────────▼───────────────────────────┐ │
│  │         Native Audio Pipeline                   │ │
│  │                                                 │ │
│  │  WebSocket Client → Backend → Translated Audio  │ │
│  │                                                 │ │
│  │  Audio Mixing:                                  │ │
│  │    iOS:     AVAudioEngine + AVAudioMixerNode    │ │
│  │    Android: AudioTrack + AudioManager           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │         Dual Subtitle Overlay (Native)          │ │
│  │  Original:    "Hello everyone!"                 │ │
│  │  Translated:  "सबको नमस्ते!"                     │ │
│  └─────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### How Audio Capture Works in WebView

Inject JavaScript into the WebView that hooks into the page's audio:

```javascript
// Injected into WebView via evaluateJavaScript
(function() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const OriginalAudioContext = AudioContext;
  
  // Intercept AudioContext creation
  window.AudioContext = function(...args) {
    const ctx = new OriginalAudioContext(...args);
    
    // Hook into destination to capture output
    const originalCreateMediaElementSource = ctx.createMediaElementSource.bind(ctx);
    ctx.createMediaElementSource = function(element) {
      const source = originalCreateMediaElementSource(element);
      
      // Create a splitter to tap the audio
      const splitter = ctx.createChannelSplitter(2);
      const analyser = ctx.createAnalyser();
      const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);
      
      scriptProcessor.onaudioprocess = function(e) {
        const inputData = e.inputBuffer.getChannelData(0);
        // Send to native via bridge
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'audio_chunk',
          data: Array.from(inputData.slice(0, 1024))
        }));
      };
      
      source.connect(splitter);
      splitter.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(ctx.destination);
      
      return source;
    };
    
    return ctx;
  };
})();
```

### Alternative: Capture via `<video>` element directly

```javascript
// Find the video element and capture its audio stream
const video = document.querySelector('video');
if (video) {
  const stream = video.captureStream();
  const audioTrack = stream.getAudioTracks()[0];
  
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
  
  // Process and send to native
  await ctx.audioWorklet.addModule('chunker.js');
  const chunker = new AudioWorkletNode(ctx, 'audio-chunker');
  source.connect(chunker);
  
  chunker.port.onmessage = (e) => {
    window.ReactNativeWebView?.postMessage(JSON.stringify({
      type: 'audio_chunk',
      data: e.data
    }));
  };
}
```

---

## 3. Framework Recommendation: React Native

### Why React Native over Flutter?

| Factor | React Native | Flutter |
|--------|-------------|---------|
| WebView quality | Excellent (react-native-webview) | Good (webview_flutter) |
| JS Bridge | Native, bidirectional | Platform channels needed |
| Audio APIs | Expo AV, react-native-audio-api | Just audio_players |
| Code sharing with Chrome Extension | JS/TS — can share logic! | Dart — zero code sharing |
| Community | Massive | Large |
| Real-time WebSocket | Built-in + many libraries | dart:io websocket |

**Key advantage:** React Native lets us share WebSocket, audio processing, and state management code between the Chrome Extension and the mobile app. Same TypeScript, same logic.

### Recommended Stack

```
React Native 0.76+ (New Architecture)
├── react-native-webview          # In-app browser for streams
├── @react-native-community/audio-api  # Web Audio API for native
├── react-native-track-player     # Background audio playback
├── zustand                       # State management (same as extension)
├── framer-motion (react-native)  # Animations
└── expo-av                       # Audio session management
```

---

## 4. Audio Ducking on Mobile

### iOS (AVAudioSession)

```swift
// Configure audio session for mixing and ducking
let session = AVAudioSession.sharedInstance()
try session.setCategory(
    .playback,
    mode: .default,
    options: [.mixWithOthers, .duckOthers]
)
try session.setActive(true)

// When translated audio starts:
// iOS automatically ducks other audio by ~20dB
// When it stops, other audio restores

// For custom ducking level, use AVAudioEngine:
let engine = AVAudioEngine()
let mixer = engine.mainMixerNode

// WebView audio comes through at reduced volume
// Translated audio plays at full volume through our engine
```

### Android (AudioManager + AudioFocus)

```kotlin
val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager

// Request audio focus with ducking
val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
    .setAudioAttributes(AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build())
    .setOnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Lower WebView volume
                webView.evaluateJavascript(
                    "document.querySelector('video').volume = 0.2", null
                )
            }
            AudioManager.AUDIOFOCUS_GAIN -> {
                webView.evaluateJavascript(
                    "document.querySelector('video').volume = 1.0", null
                )
            }
        }
    }
    .build()

audioManager.requestAudioFocus(focusRequest)
```

---

## 5. Alternative Approaches Considered

### A. Floating Overlay (Picture-in-Picture style)
- Android: `TYPE_APPLICATION_OVERLAY` window + MediaProjection
- iOS: Not possible (no overlay permission for third-party apps)
- **Verdict:** Android-only, fragile, bad UX

### B. System-Level Audio Capture (Accessibility Service)
- Android: Accessibility services can detect audio events but not capture raw audio
- iOS: Not possible
- **Verdict:** Not viable for audio capture

### C. Progressive Web App (PWA)
- Cannot capture audio from other tabs/apps
- Limited background processing
- No native audio mixing
- **Verdict:** Too limited for core use case

### D. Microphone Capture (Ambient Audio)
- Use device microphone to capture speaker output
- Terrible quality, background noise, echo
- **Verdict:** Last resort, only for demos

### E. Companion Device (Smart Speaker/Dongle)
- Dedicated hardware captures HDMI/audio output
- Sends to phone app for translation
- **Verdict:** Interesting for future, too complex for v1

---

## 6. App Store Compliance

### Google Play
- WebView-based YouTube playback: **Allowed** (YouTube ToS allow embedding)
- Audio processing: **Allowed** (within your own app context)
- Background audio: **Allowed** with proper foreground service
- Must comply with YouTube API Terms of Service for embedded player

### Apple App Store
- WebView-based YouTube playback: **Allowed** with caveats
  - Must use WKWebView (not UIWebView)
  - Cannot hide that it's a web view or pretend to be YouTube
- Audio processing: **Allowed** within app context
- Background audio: **Allowed** with `audio` background mode
- Review risk: Apple may question the audio processing purpose
  - Mitigation: Frame as "accessibility tool" for language translation

---

## 7. Mobile-Specific Features

### Offline Mode
- Cache translated subtitles for replay
- Download voice profiles for offline TTS (smaller model)

### Notification Controls
- Media notification with play/pause/language switch
- Quick settings tile (Android)

### Widget
- Android: Home screen widget showing active translation
- iOS: Live Activity for ongoing translation sessions

### Deep Linking
- `promptdub://translate?url=youtube.com/watch?v=xxx&lang=hi`
- Share from YouTube app → opens in PromptDub

---

## 8. Mobile Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|-------------|
| Phase 1 | Weeks 23-26 | React Native app scaffold, WebView player, JS audio bridge |
| Phase 2 | Weeks 27-30 | Native WebSocket, audio ducking, subtitle overlay |
| Phase 3 | Weeks 31-34 | iOS/Android store submission, background audio |
| Phase 4 | Weeks 35-38 | Offline mode, widgets, deep linking |

---

## 9. Conclusion

The **in-app WebView approach** is the only reliable cross-platform strategy for mobile. By playing streams inside our app, we bypass all OS-level audio capture restrictions and control the entire pipeline. React Native is the ideal framework because it shares code with our Chrome Extension (same TypeScript/JS ecosystem) and has excellent WebView + audio API support.

The mobile app won't replace the Chrome Extension — they serve different use cases:
- **Chrome Extension:** Desktop viewers who watch in their browser (primary use case)
- **Mobile App:** Mobile viewers who want translation on the go (secondary, high-growth market)
