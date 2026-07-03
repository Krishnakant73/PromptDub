const SUPPORTED_SITES = /youtube\.com|twitch\.tv/;

let activeTabId = null;
let isCapturing = false;
let keepAliveInterval = null;

function startKeepAlive() {
  try {
    keepAliveInterval = setInterval(
      () => chrome.runtime.getPlatformInfo(() => {}),
      20000
    );
  } catch (e) {
    console.warn("[PromptDub] startKeepAlive error:", e);
  }
}

function stopKeepAlive() {
  try {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  } catch (e) {}
}

async function startCapture(tab, platform) {
  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });

    await ensureOffscreenDocument();

    const config = await chrome.storage.local.get([
      "serverUrl",
      "targetLang",
      "sourceLang",
      "apiKey",
      "mode",
      "voiceCloning",
      "tier",
      "speedBoost",
    ]);

    const volumeConfig = await chrome.storage.local.get([
      "originalVolume",
      "dubVolume",
      "duckingLevel",
    ]);

    const sessionId = crypto.randomUUID();

    chrome.runtime.sendMessage({
      type: "start-capture",
      target: "offscreen",
      streamId,
      config: {
        serverUrl: config.serverUrl || "wss://api.promptdub.com/ws/translate",
        targetLang: config.targetLang || "hi",
        sourceLang: config.sourceLang || "auto",
        sessionId,
        apiKey: config.apiKey,
        platform: platform || "unknown",
        mode: config.mode || "dub",
        voiceCloning: config.voiceCloning !== false,
        tier: config.tier || "personal",
        speedBoost: config.speedBoost !== false,
        originalVolume: volumeConfig.originalVolume != null ? volumeConfig.originalVolume : 0.8,
        dubVolume: volumeConfig.dubVolume != null ? volumeConfig.dubVolume : 1.0,
        duckingLevel: volumeConfig.duckingLevel != null ? volumeConfig.duckingLevel : 0.2,
      },
    });

    activeTabId = tab.id;
    isCapturing = true;
    startKeepAlive();

    await chrome.action.setBadgeText({ text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });

    chrome.tabs.sendMessage(tab.id, {
      type: "capture-toggled",
      isActive: true,
    });
  } catch (err) {
    console.error("[PromptDub] Failed to start capture:", err);
    try {
      await chrome.action.setBadgeText({ text: "ERR" });
      await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    } catch (badgeErr) {}

    try {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "status-update",
          status: "error",
          message: err.message || "Failed to start capture",
        });
      }
    } catch (sendErr) {}
  }
}

async function stopCapture() {
  try {
    chrome.runtime.sendMessage({
      type: "stop-capture",
      target: "offscreen",
    });
  } catch (e) {}

  const tabId = activeTabId;
  activeTabId = null;
  isCapturing = false;
  stopKeepAlive();

  try {
    await chrome.storage.local.set({ isCapturing: false });
    await chrome.action.setBadgeText({ text: "" });
  } catch (e) {}

  if (tabId) {
    try {
      chrome.tabs.sendMessage(tabId, {
        type: "capture-toggled",
        isActive: false,
      });
    } catch {}
  }
}

async function ensureOffscreenDocument() {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });

    if (existingContexts.length > 0) return;

    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
      justification: "Audio capture from tab and translated audio playback",
    });
  } catch (err) {
    console.error("[PromptDub] Failed to create offscreen document:", err);
    throw err;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "offscreen") return;

  if (message.type === "toggle-capture") {
    (async () => {
      try {
        if (isCapturing) {
          await stopCapture();
        } else {
          const tab = await chrome.tabs.get(message.tabId);
          if (tab?.url?.match(SUPPORTED_SITES)) {
            await startCapture(tab, message.platform);
          }
        }
      } catch (err) {
        console.error("[PromptDub] toggle-capture error:", err);
      }
    })();
    return true;
  }

  if (message.type === "volume-update") {
    try {
      chrome.runtime.sendMessage({
        type: "volume-update",
        target: "offscreen",
        originalVolume: message.originalVolume,
        dubVolume: message.dubVolume,
        duckingLevel: message.duckingLevel,
      });
    } catch (e) {
      console.warn("[PromptDub] volume-update relay error:", e);
    }
    return;
  }

  if (
    message.type === "subtitle-update" ||
    message.type === "status-update" ||
    message.type === "user-info" ||
    message.type === "session-stats"
  ) {
    if (activeTabId) {
      try {
        chrome.tabs.sendMessage(activeTabId, message);
      } catch (e) {
        console.warn("[PromptDub] Forward message to tab error:", e);
      }
    }
  }

  if (message.type === "capture-error") {
    console.error("[PromptDub] Capture error from offscreen:", message.error);
    stopCapture();
  }

  if (message.type === "request-new-stream" && activeTabId) {
    (async () => {
      try {
        const streamId = await chrome.tabCapture.getMediaStreamId({
          targetTabId: activeTabId,
        });
        chrome.runtime.sendMessage({
          type: "new-stream-id",
          target: "offscreen",
          streamId,
        });
      } catch (err) {
        console.error("[PromptDub] Failed to get new stream ID:", err);
        stopCapture();
      }
    })();
    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    stopCapture();
  }
});
