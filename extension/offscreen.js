let pipeline = null;
let wsManager = null;
let currentConfig = null;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== "offscreen") return;

  if (message.type === "start-capture") {
    await handleStartCapture(message.streamId, message.config);
  }

  if (message.type === "stop-capture") {
    handleStopCapture();
  }

  if (message.type === "new-stream-id") {
    await handleReconnect(message.streamId);
  }
});

async function handleStartCapture(streamId, config) {
  try {
    currentConfig = config;

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    pipeline = new AudioDuckingPipeline();
    const chunkerNode = await pipeline.initialize(mediaStream);

    wsManager = new ReconnectingWebSocket(config.serverUrl, config.sessionId);

    wsManager.onSubtitle = (msg) => {
      chrome.runtime.sendMessage({
        type: "subtitle-update",
        original: msg.original,
        translated: msg.translated,
        sourceLang: msg.source_lang,
        targetLang: msg.target_lang,
        emotion: msg.emotion,
      });
    };

    wsManager.onAudioChunk = (arrayBuffer) => {
      pipeline.playTranslatedAudio(arrayBuffer);
    };

    wsManager.onStatus = (msg) => {
      chrome.runtime.sendMessage({
        type: "status-update",
        status: msg.type,
        progress: msg.progress,
        qualityScore: msg.quality_score,
        message: msg.message,
        latencyMs: msg.latency_ms,
      });
    };

    wsManager.onDisconnect = () => {
      chrome.runtime.sendMessage({ type: "request-new-stream" });
    };

    chunkerNode.port.onmessage = (event) => {
      if (event.data.type === "audio-chunk") {
        wsManager.sendAudioChunk(event.data.pcmData, event.data.chunkIndex);
      }
    };

    wsManager.connect();

    wsManager.onReady = () => {
      wsManager.ws.send(
        JSON.stringify({
          type: "session_start",
          session_id: config.sessionId,
          source_lang: config.sourceLang,
          target_lang: config.targetLang,
          sample_rate: 16000,
          channels: 1,
          platform: detectPlatform(),
        })
      );
    };
  } catch (err) {
    console.error("Capture failed:", err);
    chrome.runtime.sendMessage({
      type: "capture-error",
      error: err.message,
    });
  }
}

async function handleReconnect(newStreamId) {
  if (!currentConfig) return;

  if (pipeline) {
    pipeline.destroy();
    pipeline = null;
  }

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: newStreamId,
        },
      },
      video: false,
    });

    pipeline = new AudioDuckingPipeline();
    const chunkerNode = await pipeline.initialize(mediaStream);

    chunkerNode.port.onmessage = (event) => {
      if (event.data.type === "audio-chunk") {
        wsManager.sendAudioChunk(event.data.pcmData, event.data.chunkIndex);
      }
    };

    if (wsManager) {
      wsManager.ws.send(
        JSON.stringify({
          type: "session_resume",
          session_id: currentConfig.sessionId,
        })
      );
    }
  } catch (err) {
    console.error("Reconnect failed:", err);
    chrome.runtime.sendMessage({
      type: "capture-error",
      error: err.message,
    });
  }
}

function handleStopCapture() {
  if (wsManager) {
    wsManager.close();
    wsManager = null;
  }
  if (pipeline) {
    pipeline.destroy();
    pipeline = null;
  }
  currentConfig = null;
}

function detectPlatform() {
  try {
    if (document.referrer.includes("youtube.com")) return "youtube";
    if (document.referrer.includes("twitch.tv")) return "twitch";
  } catch {}
  return "unknown";
}
