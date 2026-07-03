const SUPPORTED_SITES = /youtube\.com|twitch\.tv/;

let activeTabId = null;
let isCapturing = false;
let keepAliveInterval = null;

function startKeepAlive() {
  keepAliveInterval = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);
}

function stopKeepAlive() {
  clearInterval(keepAliveInterval);
  keepAliveInterval = null;
}

async function startCapture(tab) {
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
      },
    });

    activeTabId = tab.id;
    isCapturing = true;
    startKeepAlive();

    await chrome.action.setBadgeText({ text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
  } catch (err) {
    console.error("Failed to start capture:", err);
    await chrome.action.setBadgeText({ text: "ERR" });
    await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
  }
}

async function stopCapture() {
  chrome.runtime.sendMessage({
    type: "stop-capture",
    target: "offscreen",
  });

  activeTabId = null;
  isCapturing = false;
  stopKeepAlive();

  await chrome.storage.local.set({ isCapturing: false });
  await chrome.action.setBadgeText({ text: "" });
}

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });

  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
    justification: "Audio capture from tab and translated audio playback",
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "offscreen") return;

  if (message.type === "toggle-capture") {
    (async () => {
      if (isCapturing) {
        await stopCapture();
      } else {
        const tab = await chrome.tabs.get(message.tabId);
        if (tab?.url?.match(SUPPORTED_SITES)) {
          await startCapture(tab);
        }
      }
    })();
    return true;
  }

  if (
    message.type === "subtitle-update" ||
    message.type === "status-update"
  ) {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, message);
    }
  }

  if (message.type === "capture-error") {
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
        console.error("Failed to get new stream ID:", err);
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
