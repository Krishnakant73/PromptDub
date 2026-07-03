const PLAYER_SELECTORS = {
  youtube: "#movie_player",
  twitch: '[data-a-target="video-player"]',
};

const OVERLAY_ID = "promptdub-overlay";
const SUBTITLE_CONTAINER_ID = "pd-subtitle-container";
const ORIGINAL_SUBTITLE_ID = "pd-original-subtitle";
const TRANSLATED_SUBTITLE_ID = "pd-translated-subtitle";
const CONTROL_PILL_ID = "pd-control-pill";
const STATUS_DOT_ID = "pd-status-dot";
const STATUS_TEXT_ID = "pd-status-text";
const LATENCY_ID = "pd-latency";

let subtitleHideTimer = null;

function detectPlatform() {
  if (window.location.hostname.includes("youtube.com")) return "youtube";
  if (window.location.hostname.includes("twitch.tv")) return "twitch";
  return null;
}

function getPlayerContainer() {
  const platform = detectPlatform();
  if (!platform) return null;

  if (platform === "twitch") {
    const byAttr = document.querySelector(PLAYER_SELECTORS.twitch);
    if (byAttr) return byAttr;
    const video = document.querySelector("video");
    return video?.closest("[class*=player]") || video?.parentElement;
  }

  return document.querySelector(PLAYER_SELECTORS.youtube);
}

function injectOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;

  const player = getPlayerContainer();
  if (!player) return;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;

  overlay.innerHTML = `
    <div id="${SUBTITLE_CONTAINER_ID}">
      <div id="${ORIGINAL_SUBTITLE_ID}" class="pd-subtitle pd-original"></div>
      <div id="${TRANSLATED_SUBTITLE_ID}" class="pd-subtitle pd-translated"></div>
    </div>
    <div id="${CONTROL_PILL_ID}">
      <div class="pd-pill-inner">
        <div id="${STATUS_DOT_ID}" class="pd-dot pd-dot-idle"></div>
        <span id="${STATUS_TEXT_ID}">PromptDub</span>
        <span id="${LATENCY_ID}" class="pd-latency"></span>
      </div>
    </div>
  `;

  player.style.position = "relative";
  player.appendChild(overlay);
}

function updateSubtitles(original, translated) {
  const origEl = document.getElementById(ORIGINAL_SUBTITLE_ID);
  const transEl = document.getElementById(TRANSLATED_SUBTITLE_ID);

  if (!origEl || !transEl) {
    injectOverlay();
    return;
  }

  if (original) {
    origEl.textContent = original;
    origEl.style.display = "block";
  }

  if (translated) {
    transEl.textContent = translated;
    transEl.style.display = "block";
    transEl.classList.remove("pd-fade-in");
    void transEl.offsetWidth;
    transEl.classList.add("pd-fade-in");
  }

  clearTimeout(subtitleHideTimer);
  subtitleHideTimer = setTimeout(() => {
    if (origEl) origEl.style.display = "none";
    if (transEl) transEl.style.display = "none";
  }, 6000);
}

function updateStatus(msg) {
  const dot = document.getElementById(STATUS_DOT_ID);
  const text = document.getElementById(STATUS_TEXT_ID);
  const latency = document.getElementById(LATENCY_ID);

  if (!dot || !text) {
    injectOverlay();
    return;
  }

  dot.className = "pd-dot";

  switch (msg.status) {
    case "voice_building":
      dot.classList.add("pd-dot-building");
      text.textContent = `Voice ${Math.round((msg.progress || 0) * 100)}%`;
      break;

    case "voice_ready":
      dot.classList.add("pd-dot-active");
      text.textContent = "PromptDub";
      break;

    case "session_ready":
      dot.classList.add("pd-dot-building");
      text.textContent = "Starting...";
      break;

    case "latency":
      dot.classList.add("pd-dot-active");
      if (latency && msg.latencyMs) {
        latency.textContent = `${msg.latencyMs}ms`;
      }
      break;

    case "reconnecting":
      dot.classList.add("pd-dot-warning");
      text.textContent = "Reconnecting...";
      break;

    case "error":
      dot.classList.add("pd-dot-error");
      text.textContent = "Error";
      break;

    default:
      dot.classList.add("pd-dot-idle");
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "subtitle-update") {
    updateSubtitles(msg.original, msg.translated);
  }
  if (msg.type === "status-update") {
    updateStatus(msg);
  }
});

// YouTube SPA navigation
document.addEventListener("yt-navigate-finish", () => {
  setTimeout(injectOverlay, 500);
});

// Re-inject on DOM changes
const observer = new MutationObserver(() => {
  if (!document.getElementById(OVERLAY_ID)) {
    injectOverlay();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial injection
if (document.readyState === "complete") {
  injectOverlay();
} else {
  window.addEventListener("load", injectOverlay);
}
