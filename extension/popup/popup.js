document.addEventListener("DOMContentLoaded", async () => {
  const sourceLang = document.getElementById("source-lang");
  const targetLang = document.getElementById("target-lang");
  const serverUrl = document.getElementById("server-url");
  const actionBtn = document.getElementById("action-btn");
  const statusDot = document.getElementById("popup-status-dot");
  const statusTitle = document.getElementById("popup-status-title");
  const statusDetail = document.getElementById("popup-status-detail");

  const saved = await chrome.storage.local.get([
    "sourceLang",
    "targetLang",
    "serverUrl",
    "isCapturing",
    "mode",
    "voiceCloning",
  ]);

  if (saved.sourceLang) sourceLang.value = saved.sourceLang;
  if (saved.targetLang) targetLang.value = saved.targetLang;
  if (saved.serverUrl) serverUrl.value = saved.serverUrl;

  if (saved.isCapturing) {
    setActiveState();
  }

  sourceLang.addEventListener("change", save);
  targetLang.addEventListener("change", save);
  serverUrl.addEventListener("change", save);

  actionBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url?.match(/youtube\.com|twitch\.tv/)) {
      statusTitle.textContent = "Wrong page";
      statusDetail.textContent = "Open a YouTube or Twitch stream first";
      statusDot.className = "status-dot";
      return;
    }

    const isCapturing = (await chrome.storage.local.get("isCapturing"))
      .isCapturing;

    let platform = "unknown";
    if (tab.url.includes("youtube.com")) platform = "youtube";
    else if (tab.url.includes("twitch.tv")) platform = "twitch";

    if (isCapturing) {
      chrome.runtime.sendMessage({
        type: "toggle-capture",
        action: "stop",
        platform,
      });
      setReadyState();
    } else {
      await save();
      const config = await chrome.storage.local.get(["mode", "voiceCloning"]);
      chrome.runtime.sendMessage({
        type: "toggle-capture",
        action: "start",
        platform,
        mode: config.mode || "dub",
        voiceCloning: config.voiceCloning !== false,
      });
      setActiveState();
    }

    window.close();
  });

  function setActiveState() {
    actionBtn.textContent = "Stop";
    actionBtn.classList.add("stop");
    statusDot.className = "status-dot active";
    statusTitle.textContent = "Translating";
    statusDetail.textContent = "Voice cloning active";
  }

  function setReadyState() {
    actionBtn.textContent = "Start Translating";
    actionBtn.classList.remove("stop");
    statusDot.className = "status-dot";
    statusTitle.textContent = "Ready";
    statusDetail.textContent = "Open a YouTube or Twitch stream to start";
  }

  async function save() {
    await chrome.storage.local.set({
      sourceLang: sourceLang.value,
      targetLang: targetLang.value,
      serverUrl: serverUrl.value,
    });
  }
});
