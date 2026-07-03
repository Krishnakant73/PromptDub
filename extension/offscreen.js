let pipeline = null;
let wsManager = null;
let currentConfig = null;
let pendingResume = false;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== "offscreen") return;
  try {
    if (message.type === "start-capture") await handleStartCapture(message.streamId, message.config);
    if (message.type === "stop-capture") handleStopCapture();
    if (message.type === "new-stream-id") await handleReconnect(message.streamId);
    if (message.type === "volume-update") handleVolumeUpdate(message);
  } catch (err) {
    console.error("[PromptDub] Offscreen message error:", err);
  }
});

function handleVolumeUpdate(msg) {
  if (!pipeline) return;
  if (msg.originalVolume !== undefined) pipeline.setOriginalVolume(msg.originalVolume);
  if (msg.dubVolume !== undefined) pipeline.setDubVolume(msg.dubVolume);
  if (msg.duckingLevel !== undefined) pipeline.setDuckingLevel(msg.duckingLevel);
}

async function handleStartCapture(streamId, config) {
  try {
    currentConfig = config;
    pendingResume = false;
    const isTranslateOnly = config.mode === "translate";

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
      video: false,
    });

    pipeline = new AudioDuckingPipeline();
    const chunkerNode = await pipeline.initialize(mediaStream, { translateOnly: isTranslateOnly });

    if (config.originalVolume !== undefined) pipeline.setOriginalVolume(config.originalVolume);
    if (config.dubVolume !== undefined) pipeline.setDubVolume(config.dubVolume);
    if (config.duckingLevel !== undefined) pipeline.setDuckingLevel(config.duckingLevel);

    wsManager = new ReconnectingWebSocket(config.serverUrl, config.sessionId);

    wsManager.onSubtitle = (msg) => {
      try {
        chrome.runtime.sendMessage({
          type: "subtitle-update",
          original: msg.original,
          translated: msg.translated,
          sourceLang: msg.source_lang,
          targetLang: msg.target_lang,
          emotion: msg.emotion,
        });
      } catch {}
    };

    wsManager.onAudioChunk = (arrayBuffer) => {
      if (!isTranslateOnly && pipeline) {
        try { pipeline.playTranslatedAudio(arrayBuffer); } catch (err) {
          console.warn("[PromptDub] Audio chunk play error:", err);
        }
      }
    };

    wsManager.onStatus = (msg) => {
      try {
        chrome.runtime.sendMessage({
          type: "status-update",
          status: msg.type,
          progress: msg.progress,
          step: msg.step,
          attempt: msg.attempt,
          qualityScore: msg.quality_score,
          voiceCloning: msg.voice_cloning,
          message: msg.message,
          latencyMs: msg.latency_ms,
        });
      } catch {}
    };

    wsManager.onDisconnect = () => {
      try { chrome.runtime.sendMessage({ type: "request-new-stream" }); } catch {}
    };

    wsManager.onReconnect = () => {
      if (pendingResume && wsManager && currentConfig) {
        pendingResume = false;
        try {
          wsManager.ws.send(JSON.stringify({
            type: "session_resume",
            session_id: currentConfig.sessionId,
          }));
        } catch (err) {
          console.warn("[PromptDub] session_resume send error:", err);
        }
      }
    };

    chunkerNode.port.onmessage = (event) => {
      if (event.data.type === "audio-chunk" && wsManager) {
        wsManager.sendAudioChunk(event.data.pcmData, event.data.chunkIndex);
      }
    };

    wsManager.onReady = () => {
      wsManager.ws.send(JSON.stringify({
        type: "session_start",
        session_id: config.sessionId,
        source_lang: config.sourceLang,
        target_lang: config.targetLang,
        sample_rate: 16000,
        channels: 1,
        platform: config.platform || "unknown",
        mode: config.qualityMode || "auto",
        voice_cloning: config.voiceCloning !== false,
      }));
    };

    wsManager.connect();
  } catch (err) {
    console.error("[PromptDub] Capture failed:", err);
    try { chrome.runtime.sendMessage({ type: "capture-error", error: err.message || "Unknown error" }); } catch {}
  }
}

async function handleReconnect(newStreamId) {
  if (!currentConfig) return;

  if (pipeline) { pipeline.destroy(); pipeline = null; }

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: newStreamId } },
      video: false,
    });

    const isTranslateOnly = currentConfig.mode === "translate";
    pipeline = new AudioDuckingPipeline();
    const chunkerNode = await pipeline.initialize(mediaStream, { translateOnly: isTranslateOnly });

    if (currentConfig.originalVolume !== undefined) pipeline.setOriginalVolume(currentConfig.originalVolume);
    if (currentConfig.dubVolume !== undefined) pipeline.setDubVolume(currentConfig.dubVolume);
    if (currentConfig.duckingLevel !== undefined) pipeline.setDuckingLevel(currentConfig.duckingLevel);

    chunkerNode.port.onmessage = (event) => {
      if (event.data.type === "audio-chunk" && wsManager) {
        wsManager.sendAudioChunk(event.data.pcmData, event.data.chunkIndex);
      }
    };

    if (wsManager && wsManager.ws?.readyState === WebSocket.OPEN) {
      wsManager.ws.send(JSON.stringify({
        type: "session_resume",
        session_id: currentConfig.sessionId,
      }));
    } else {
      pendingResume = true;
    }
  } catch (err) {
    console.error("[PromptDub] Reconnect failed:", err);
    try { chrome.runtime.sendMessage({ type: "capture-error", error: err.message || "Reconnect failed" }); } catch {}
  }
}

function handleStopCapture() {
  pendingResume = false;
  try { if (wsManager) { wsManager.close(); wsManager = null; } } catch {}
  try { if (pipeline) { pipeline.destroy(); pipeline = null; } } catch {}
  currentConfig = null;
}
