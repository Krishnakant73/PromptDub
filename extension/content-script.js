const PLAYER_SELECTORS = {
  youtube: "#movie_player",
  twitch: '[data-a-target="video-player"]',
};

const LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ar", label: "Arabic" },
  { code: "tr", label: "Turkish" },
  { code: "it", label: "Italian" },
  { code: "bn", label: "Bengali" },
  { code: "mr", label: "Marathi" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "ta", label: "Tamil" },
  { code: "ml", label: "Malayalam" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "as", label: "Assamese" },
  { code: "ne", label: "Nepali" },
];

const MODES = [
  { code: "auto", label: "Auto", desc: "Auto-select based on language" },
  { code: "fast", label: "Fast", desc: "Lowest latency" },
  { code: "balanced", label: "Balanced", desc: "Good quality and speed" },
  { code: "quality", label: "Quality", desc: "Best quality" },
];

const OVERLAY_ID = "promptdub-overlay";
const SETTINGS_KEY = "pdOverlaySettings";
const POSITION_KEY = "pdOverlayPosition";

const DEFAULT_SETTINGS = {
  sourceLang: "auto",
  targetLang: "hi",
  serverUrl: "ws://localhost:8000/ws/translate",
  mode: "dub",
  qualityMode: "auto",
  voiceCloning: true,
  showOriginal: true,
  showTranslated: true,
  subtitleSize: 18,
  subtitlePosition: "bottom",
  subtitleOpacity: 100,
  originalVolume: 80,
  dubVolume: 100,
  duckingLevel: 20,
  autoHide: true,
  showDetectedLang: true,
  panelTab: "translation",
};

let subtitleHideTimer = null;
let isActive = false;
let panelOpen = false;
let settings = { ...DEFAULT_SETTINGS };
let isDragging = false;
let connectionState = "disconnected";
let toastTimer = null;
let stepTimer = null;

const VOICE_BUILD_STEPS = [
  { key: "connect", label: "Connecting to server" },
  { key: "voice", label: "Building voice model" },
  { key: "pipeline", label: "Preparing audio pipeline" },
  { key: "ready", label: "Ready" },
];

function safeGet(id) {
  try { return document.getElementById(id); } catch { return null; }
}

function detectPlatform() {
  try {
    if (window.location.hostname.includes("youtube.com")) return "youtube";
    if (window.location.hostname.includes("twitch.tv")) return "twitch";
  } catch (e) {}
  return "unknown";
}

function getPlayerContainer() {
  const platform = detectPlatform();
  if (platform === "unknown") return null;
  try {
    if (platform === "twitch") {
      const byAttr = document.querySelector(PLAYER_SELECTORS.twitch);
      if (byAttr) return byAttr;
      const video = document.querySelector("video");
      return video?.closest("[class*=player]") || video?.parentElement;
    }
    const player = document.querySelector(PLAYER_SELECTORS.youtube);
    if (player) return player;
    const video = document.querySelector("video");
    if (video) return video.closest("#movie_player") || video.parentElement;
  } catch (e) {}
  return null;
}

function buildLangOptions(selected) {
  return LANGUAGES.map(
    (l) => `<option value="${l.code}"${l.code === selected ? " selected" : ""}>${l.label}</option>`
  ).join("");
}

function buildModeOptions(selected) {
  return MODES.map(
    (m) => `<option value="${m.code}"${m.code === selected ? " selected" : ""}>${m.label} - ${m.desc}</option>`
  ).join("");
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { settings = { ...DEFAULT_SETTINGS }; }
}

function saveSettingsToStorage() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

function loadPosition() {
  try { const r = localStorage.getItem(POSITION_KEY); if (r) return JSON.parse(r); } catch {}
  return null;
}

function savePosition(x, y) {
  try { localStorage.setItem(POSITION_KEY, JSON.stringify({ x, y })); } catch {}
}

function showToast(message, type) {
  let toast = safeGet("pd-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "pd-toast";
    toast.className = "pd-toast";
    const overlay = safeGet(OVERLAY_ID);
    if (overlay) overlay.appendChild(toast);
  }
  toast.className = "pd-toast pd-toast-" + (type || "info");
  toast.textContent = message;
  toast.classList.add("pd-toast-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("pd-toast-show"), 3000);
}

function updateConnectionState(state, message) {
  connectionState = state;
  const bar = safeGet("pd-connection-bar");
  if (!bar) return;
  const dot = bar.querySelector(".pd-conn-dot");
  const text = bar.querySelector(".pd-conn-text");
  bar.className = "pd-connection-bar pd-conn-" + state;
  if (dot) dot.className = "pd-conn-dot pd-conn-dot-" + state;
  if (text) text.textContent = message || state;
  if (state === "connected") showToast("Connected", "success");
  else if (state === "error") showToast(message || "Connection failed", "error");
  else if (state === "reconnecting") showToast(message || "Reconnecting...", "warning");
  else if (state === "disconnected") showToast("Disconnected", "info");
}

function injectOverlay() {
  if (document.getElementById(OVERLAY_ID)) { syncOverlayState(); return; }
  const player = getPlayerContainer();
  if (!player) {
    // Retry after a delay if player not found
    setTimeout(injectOverlay, 1000);
    return;
  }
  loadSettings();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <div id="pd-subtitle-container">
      <div id="pd-original-subtitle" class="pd-subtitle pd-original"></div>
      <div id="pd-translated-subtitle" class="pd-subtitle pd-translated"></div>
    </div>

    <div id="pd-pill" draggable="false" title="Click to start/stop">
      <div class="pd-pill-inner">
        <div id="pd-status-dot" class="pd-dot pd-dot-off"></div>
        <span id="pd-status-text">PromptDub</span>
        <span id="pd-latency" class="pd-latency"></span>
        <button id="pd-settings-btn" class="pd-settings-btn" title="Settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>

    <div id="pd-panel" class="pd-hidden">
      <div class="pd-panel-header">
        <div class="pd-panel-title">
          <div id="pd-panel-dot" class="pd-dot pd-dot-off"></div>
          <span>PromptDub</span>
          <span class="pd-beta-badge">BETA</span>
        </div>
        <button id="pd-panel-close" class="pd-panel-close-btn">&times;</button>
      </div>

      <div id="pd-connection-bar" class="pd-connection-bar pd-conn-disconnected">
        <div class="pd-conn-dot pd-conn-dot-disconnected"></div>
        <span class="pd-conn-text">Not connected</span>
      </div>

      <div class="pd-panel-tabs">
        <button class="pd-tab pd-tab-active" data-tab="translation">Translate</button>
        <button class="pd-tab" data-tab="volume">Volume</button>
        <button class="pd-tab" data-tab="display">Display</button>
        <button class="pd-tab" data-tab="help">Help</button>
      </div>

      <div id="pd-step-progress" class="pd-step-progress pd-hidden">
        <div class="pd-step-bar">
          <div id="pd-step-fill" class="pd-step-fill"></div>
        </div>
        <div id="pd-step-label" class="pd-step-label">Connecting...</div>
      </div>

      <div class="pd-panel-body">
        <div id="pd-tab-translation" class="pd-tab-content pd-tab-active">
          <div class="pd-field">
            <label class="pd-label">Mode</label>
            <div class="pd-mode-select">
              <button class="pd-mode-btn pd-mode-active" data-mode="dub">
                <span class="pd-mode-icon">🎙</span>
                <span class="pd-mode-name">Dub</span>
                <span class="pd-mode-desc">Voice + Subtitles</span>
              </button>
              <button class="pd-mode-btn" data-mode="translate">
                <span class="pd-mode-icon">📝</span>
                <span class="pd-mode-name">Text Only</span>
                <span class="pd-mode-desc">Subtitles only</span>
              </button>
            </div>
          </div>
          <div class="pd-field">
            <label class="pd-label">Voice Cloning</label>
            <div class="pd-toggle-row">
              <label class="pd-switch">
                <input id="pd-voice-cloning" type="checkbox" checked />
                <span class="pd-switch-slider"></span>
              </label>
              <div class="pd-toggle-info">
                <span id="pd-voice-cloning-label" class="pd-toggle-label">ON — Clone speaker's voice</span>
                <span class="pd-toggle-hint">OFF = faster start, uses default TTS voice</span>
              </div>
            </div>
          </div>
          <div class="pd-field">
            <label class="pd-label">Quality Mode</label>
            <select id="pd-quality-mode" class="pd-select"></select>
            <span class="pd-hint">Fast = low latency, Quality = best sound</span>
          </div>
          <div class="pd-field">
            <label class="pd-label">Stream speaks</label>
            <select id="pd-source-lang" class="pd-select"></select>
          </div>
          <div class="pd-field">
            <label class="pd-label">Translate to</label>
            <select id="pd-target-lang" class="pd-select"></select>
          </div>
          <div class="pd-field">
            <label class="pd-label">Server</label>
            <input id="pd-server-url" class="pd-input" type="text"
              placeholder="ws://localhost:8000/ws/translate" />
            <div class="pd-hint">Use ws:// for local, wss:// for HTTPS servers</div>
          </div>
          <div id="pd-status-bar" class="pd-status-bar">
            <div id="pd-panel-status-dot" class="pd-dot pd-dot-off"></div>
            <div class="pd-status-info">
              <div id="pd-panel-status-title" class="pd-status-title">Ready</div>
              <div id="pd-panel-status-detail" class="pd-status-detail">Open YouTube or Twitch to begin</div>
            </div>
          </div>
          <button id="pd-action-btn" class="pd-btn">Start Translating</button>
        </div>

        <div id="pd-tab-volume" class="pd-tab-content">
          <div class="pd-field">
            <label class="pd-label">Original Audio <span id="pd-orig-vol-val" class="pd-val">80%</span></label>
            <input id="pd-original-volume" class="pd-slider" type="range" min="0" max="100" value="80" />
            <span class="pd-hint">Volume of the original stream audio</span>
          </div>
          <div class="pd-field">
            <label class="pd-label">Dub Audio <span id="pd-dub-vol-val" class="pd-val">100%</span></label>
            <input id="pd-dub-volume" class="pd-slider" type="range" min="0" max="100" value="100" />
            <span class="pd-hint">Volume of the translated voice output</span>
          </div>
          <div class="pd-field">
            <label class="pd-label">Auto-Ducking <span id="pd-duck-val" class="pd-val">20%</span></label>
            <input id="pd-ducking-level" class="pd-slider" type="range" min="0" max="100" value="20" />
            <span class="pd-hint">How much to lower original when dub plays</span>
          </div>
          <div class="pd-volume-presets">
            <button class="pd-preset-btn" data-orig="80" data-dub="100" data-duck="20">Balanced</button>
            <button class="pd-preset-btn" data-orig="30" data-dub="100" data-duck="40">Dub Focus</button>
            <button class="pd-preset-btn" data-orig="100" data-dub="40" data-duck="10">Original Focus</button>
            <button class="pd-preset-btn" data-orig="0" data-dub="100" data-duck="0">Dub Only</button>
          </div>
        </div>

        <div id="pd-tab-display" class="pd-tab-content">
          <div class="pd-field">
            <label class="pd-label">Subtitle Size <span id="pd-size-val" class="pd-val">18px</span></label>
            <input id="pd-subtitle-size" class="pd-slider" type="range" min="10" max="40" value="18" />
          </div>
          <div class="pd-field">
            <label class="pd-label">Opacity <span id="pd-opacity-val" class="pd-val">100%</span></label>
            <input id="pd-subtitle-opacity" class="pd-slider" type="range" min="10" max="100" value="100" />
          </div>
          <div class="pd-field">
            <label class="pd-label">Position</label>
            <div class="pd-toggle-group">
              <button class="pd-toggle-btn" data-pos="top">Top</button>
              <button class="pd-toggle-btn pd-toggle-active" data-pos="bottom">Bottom</button>
              <button class="pd-toggle-btn" data-pos="center">Center</button>
            </div>
          </div>
          <div class="pd-field">
            <label class="pd-label">Show on screen</label>
            <div class="pd-check-row">
              <label class="pd-check-label">
                <input id="pd-show-original" type="checkbox" checked /> Original text
              </label>
              <label class="pd-check-label">
                <input id="pd-show-translated" type="checkbox" checked /> Translated text
              </label>
            </div>
          </div>
          <div class="pd-field">
            <label class="pd-label">Detected language</label>
            <label class="pd-check-label">
              <input id="pd-show-detected" type="checkbox" checked /> Show detected language tag
            </label>
          </div>
          <div class="pd-field">
            <label class="pd-label">Behavior</label>
            <label class="pd-check-label">
              <input id="pd-auto-hide" type="checkbox" checked /> Auto-hide subtitles after 6s
            </label>
          </div>
        </div>

        <div id="pd-tab-help" class="pd-tab-content">
          <div class="pd-help-section">
            <div class="pd-help-title">Quick Start</div>
            <div class="pd-help-step"><span class="pd-help-num">1</span> Open a YouTube or Twitch video</div>
            <div class="pd-help-step"><span class="pd-help-num">2</span> Click the green dot to start</div>
            <div class="pd-help-step"><span class="pd-help-num">3</span> Click the gear icon for settings</div>
            <div class="pd-help-step"><span class="pd-help-num">4</span> Choose target language and mode</div>
          </div>

          <div class="pd-help-section">
            <div class="pd-help-title">Modes</div>
            <div class="pd-help-item"><b>Dub Mode:</b> Translates audio AND shows subtitles. You hear the translated voice.</div>
            <div class="pd-help-item"><b>Text Only:</b> Shows subtitles only, no voice dubbing. Original audio stays untouched.</div>
          </div>

          <div class="pd-help-section">
            <div class="pd-help-title">Connection Status</div>
            <div class="pd-help-item"><span class="pd-status-badge pd-sb-green">Green</span> Connected &amp; translating</div>
            <div class="pd-help-item"><span class="pd-status-badge pd-sb-red">Red</span> Disconnected or off</div>
            <div class="pd-help-item"><span class="pd-status-badge pd-sb-amber">Amber</span> Connecting / Reconnecting</div>
          </div>

          <div class="pd-help-section">
            <div class="pd-help-title">Keyboard Shortcuts</div>
            <div class="pd-shortcuts-grid">
              <div class="pd-shortcut-item">
                <div class="pd-keys"><kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>D</kbd></div>
                <span>Toggle overlay</span>
              </div>
              <div class="pd-shortcut-item">
                <div class="pd-keys"><kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>S</kbd></div>
                <span>Start / Stop</span>
              </div>
              <div class="pd-shortcut-item">
                <div class="pd-keys"><kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>M</kbd></div>
                <span>Mute dub</span>
              </div>
              <div class="pd-shortcut-item">
                <div class="pd-keys"><kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>V</kbd></div>
                <span>Toggle voice cloning</span>
              </div>
              <div class="pd-shortcut-item">
                <div class="pd-keys"><kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>&uarr;</kbd></div>
                <span>Dub volume up</span>
              </div>
              <div class="pd-shortcut-item">
                <div class="pd-keys"><kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>&darr;</kbd></div>
                <span>Dub volume down</span>
              </div>
            </div>
          </div>

          <div class="pd-help-section">
            <div class="pd-help-title">Tips</div>
            <div class="pd-help-item">Drag the pill to reposition it anywhere on the player</div>
            <div class="pd-help-item">Use presets in Volume tab for quick audio balancing</div>
            <div class="pd-help-item">Auto-detect works for most languages - leave source as "Auto-detect"</div>
            <div class="pd-help-item">Lower Dub volume if original audio is too quiet</div>
          </div>

          <div class="pd-field">
            <button id="pd-reset-btn" class="pd-btn pd-btn-outline">Reset All Settings</button>
          </div>
        </div>
      </div>
    </div>
  `;

  player.style.position = "relative";
  player.appendChild(overlay);
  restorePillPosition();
  loadInitialState();
  bindEvents();
  applyDisplaySettings();
  syncModeUI();
}

function loadInitialState() {
  try {
    chrome.storage.local.get(["sourceLang", "targetLang", "serverUrl", "isCapturing", "mode", "voiceCloning", "qualityMode"], (data) => {
      if (chrome.runtime.lastError) return;
      const srcEl = safeGet("pd-source-lang");
      const tgtEl = safeGet("pd-target-lang");
      const srvEl = safeGet("pd-server-url");
      const modeEl = safeGet("pd-quality-mode");
      if (srcEl) { srcEl.innerHTML = buildLangOptions(data.sourceLang || settings.sourceLang); srcEl.value = data.sourceLang || settings.sourceLang; }
      if (tgtEl) { tgtEl.innerHTML = buildLangOptions(data.targetLang || settings.targetLang); tgtEl.value = data.targetLang || settings.targetLang; }
      if (srvEl) srvEl.value = data.serverUrl || settings.serverUrl;
      if (modeEl) { modeEl.innerHTML = buildModeOptions(data.qualityMode || settings.qualityMode); modeEl.value = data.qualityMode || settings.qualityMode; }
      if (data.mode) settings.mode = data.mode;
      if (data.voiceCloning !== undefined) settings.voiceCloning = data.voiceCloning;
      if (data.qualityMode) settings.qualityMode = data.qualityMode;
      isActive = !!data.isCapturing;
      syncOverlayState();
      syncVolumeUI();
      syncDisplayUI();
      syncModeUI();
      syncVoiceCloningUI();
    });
  } catch (e) {}
}

function syncOverlayState() {
  const dot = safeGet("pd-status-dot");
  const text = safeGet("pd-status-text");
  const pill = safeGet("pd-pill");
  const panelDot = safeGet("pd-panel-dot");
  const panelStatusDot = safeGet("pd-panel-status-dot");
  const panelTitle = safeGet("pd-panel-status-title");
  const panelDetail = safeGet("pd-panel-status-detail");
  const btn = safeGet("pd-action-btn");
  if (isActive) {
    if (dot) dot.className = "pd-dot pd-dot-active";
    if (text) text.textContent = "PromptDub ON";
    if (pill) pill.title = "Click to stop";
    if (panelDot) panelDot.className = "pd-dot pd-dot-active";
    if (panelStatusDot) panelStatusDot.className = "pd-dot pd-dot-active";
    if (panelTitle) panelTitle.textContent = "Translating";
    if (panelDetail) panelDetail.textContent = settings.mode === "dub" ? "Dub mode active" : "Text-only mode active";
    if (btn) { btn.textContent = "Stop Translating"; btn.classList.add("pd-btn-stop"); }
  } else {
    if (dot) dot.className = "pd-dot pd-dot-off";
    if (text) text.textContent = "PromptDub";
    if (pill) pill.title = "Click to start";
    if (panelDot) panelDot.className = "pd-dot pd-dot-off";
    if (panelStatusDot) panelStatusDot.className = "pd-dot pd-dot-off";
    if (panelTitle) panelTitle.textContent = "Ready";
    if (panelDetail) panelDetail.textContent = "Click pill to start translating";
    if (btn) { btn.textContent = "Start Translating"; btn.classList.remove("pd-btn-stop"); }
  }
}

function syncModeUI() {
  document.querySelectorAll(".pd-mode-btn").forEach((btn) => {
    btn.classList.toggle("pd-mode-active", btn.dataset.mode === settings.mode);
  });
}

function syncVoiceCloningUI() {
  const toggle = safeGet("pd-voice-cloning");
  const label = safeGet("pd-voice-cloning-label");
  if (toggle) toggle.checked = settings.voiceCloning;
  if (label) label.textContent = settings.voiceCloning ? "ON — Clone speaker's voice" : "OFF — Default TTS voice";
}

function syncVolumeUI() {
  const origSlider = safeGet("pd-original-volume");
  const dubSlider = safeGet("pd-dub-volume");
  const duckSlider = safeGet("pd-ducking-level");
  const origVal = safeGet("pd-orig-vol-val");
  const dubVal = safeGet("pd-dub-vol-val");
  const duckVal = safeGet("pd-duck-val");
  if (origSlider) origSlider.value = settings.originalVolume;
  if (dubSlider) dubSlider.value = settings.dubVolume;
  if (duckSlider) duckSlider.value = settings.duckingLevel;
  if (origVal) origVal.textContent = settings.originalVolume + "%";
  if (dubVal) dubVal.textContent = settings.dubVolume + "%";
  if (duckVal) duckVal.textContent = settings.duckingLevel + "%";
}

function syncDisplayUI() {
  const sizeSlider = safeGet("pd-subtitle-size");
  const opacitySlider = safeGet("pd-subtitle-opacity");
  const sizeVal = safeGet("pd-size-val");
  const opacityVal = safeGet("pd-opacity-val");
  const showOrig = safeGet("pd-show-original");
  const showTrans = safeGet("pd-show-translated");
  const showDetected = safeGet("pd-show-detected");
  const autoHide = safeGet("pd-auto-hide");
  if (sizeSlider) sizeSlider.value = settings.subtitleSize;
  if (opacitySlider) opacitySlider.value = settings.subtitleOpacity;
  if (sizeVal) sizeVal.textContent = settings.subtitleSize + "px";
  if (opacityVal) opacityVal.textContent = settings.subtitleOpacity + "%";
  if (showOrig) showOrig.checked = settings.showOriginal;
  if (showTrans) showTrans.checked = settings.showTranslated;
  if (showDetected) showDetected.checked = settings.showDetectedLang;
  if (autoHide) autoHide.checked = settings.autoHide;
  document.querySelectorAll(".pd-toggle-btn[data-pos]").forEach((btn) => {
    btn.classList.toggle("pd-toggle-active", btn.dataset.pos === settings.subtitlePosition);
  });
  applyDisplaySettings();
}

function applyDisplaySettings() {
  const container = safeGet("pd-subtitle-container");
  const origEl = safeGet("pd-original-subtitle");
  const transEl = safeGet("pd-translated-subtitle");
  if (container) { container.className = ""; container.classList.add("pd-pos-" + settings.subtitlePosition); }
  const opacity = settings.subtitleOpacity / 100;
  if (origEl) { origEl.style.fontSize = settings.subtitleSize + "px"; origEl.style.opacity = settings.showOriginal ? opacity : 0; origEl.style.display = settings.showOriginal ? "" : "none"; }
  if (transEl) { transEl.style.fontSize = (settings.subtitleSize + 2) + "px"; transEl.style.opacity = settings.showTranslated ? opacity : 0; transEl.style.display = settings.showTranslated ? "" : "none"; }
}

function bindEvents() {
  safeGet("pd-pill")?.addEventListener("click", (e) => {
    if (isDragging) return;
    if (e.target.closest("#pd-settings-btn")) return;
    e.stopPropagation();
    handleAction();
  });

  safeGet("pd-settings-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePanel();
  });

  safeGet("pd-panel-close")?.addEventListener("click", (e) => { e.stopPropagation(); closePanel(); });

  safeGet("pd-source-lang")?.addEventListener("change", (e) => { settings.sourceLang = e.target.value; saveSettingsToStorage(); syncSettingsToStorage(); });
  safeGet("pd-target-lang")?.addEventListener("change", (e) => { settings.targetLang = e.target.value; saveSettingsToStorage(); syncSettingsToStorage(); });
  safeGet("pd-server-url")?.addEventListener("change", (e) => { settings.serverUrl = e.target.value; saveSettingsToStorage(); syncSettingsToStorage(); });
  safeGet("pd-action-btn")?.addEventListener("click", (e) => { e.stopPropagation(); handleAction(); });

  document.querySelectorAll(".pd-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => { e.stopPropagation(); switchTab(tab.dataset.tab); });
  });

  document.querySelectorAll(".pd-mode-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      settings.mode = btn.dataset.mode;
      saveSettingsToStorage();
      syncModeUI();
      syncOverlayState();
      try { chrome.storage.local.set({ mode: settings.mode }); } catch {}
    });
  });

  safeGet("pd-voice-cloning")?.addEventListener("change", (e) => {
    settings.voiceCloning = e.target.checked;
    const label = safeGet("pd-voice-cloning-label");
    if (label) label.textContent = e.target.checked ? "ON — Clone speaker's voice" : "OFF — Default TTS voice";
    saveSettingsToStorage();
    syncSettingsToStorage();
  });

  safeGet("pd-quality-mode")?.addEventListener("change", (e) => {
    settings.qualityMode = e.target.value;
    saveSettingsToStorage();
    syncSettingsToStorage();
  });

  safeGet("pd-original-volume")?.addEventListener("input", (e) => { settings.originalVolume = parseInt(e.target.value); safeGet("pd-orig-vol-val").textContent = settings.originalVolume + "%"; saveSettingsToStorage(); sendVolumeUpdate(); });
  safeGet("pd-dub-volume")?.addEventListener("input", (e) => { settings.dubVolume = parseInt(e.target.value); safeGet("pd-dub-vol-val").textContent = settings.dubVolume + "%"; saveSettingsToStorage(); sendVolumeUpdate(); });
  safeGet("pd-ducking-level")?.addEventListener("input", (e) => { settings.duckingLevel = parseInt(e.target.value); safeGet("pd-duck-val").textContent = settings.duckingLevel + "%"; saveSettingsToStorage(); sendVolumeUpdate(); });

  document.querySelectorAll(".pd-preset-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      settings.originalVolume = parseInt(btn.dataset.orig);
      settings.dubVolume = parseInt(btn.dataset.dub);
      settings.duckingLevel = parseInt(btn.dataset.duck);
      saveSettingsToStorage(); syncVolumeUI(); sendVolumeUpdate();
    });
  });

  safeGet("pd-subtitle-size")?.addEventListener("input", (e) => { settings.subtitleSize = parseInt(e.target.value); safeGet("pd-size-val").textContent = settings.subtitleSize + "px"; saveSettingsToStorage(); applyDisplaySettings(); });
  safeGet("pd-subtitle-opacity")?.addEventListener("input", (e) => { settings.subtitleOpacity = parseInt(e.target.value); safeGet("pd-opacity-val").textContent = settings.subtitleOpacity + "%"; saveSettingsToStorage(); applyDisplaySettings(); });

  document.querySelectorAll(".pd-toggle-btn[data-pos]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); settings.subtitlePosition = btn.dataset.pos; saveSettingsToStorage(); syncDisplayUI(); });
  });

  safeGet("pd-show-original")?.addEventListener("change", (e) => { settings.showOriginal = e.target.checked; saveSettingsToStorage(); applyDisplaySettings(); });
  safeGet("pd-show-translated")?.addEventListener("change", (e) => { settings.showTranslated = e.target.checked; saveSettingsToStorage(); applyDisplaySettings(); });
  safeGet("pd-show-detected")?.addEventListener("change", (e) => { settings.showDetectedLang = e.target.checked; saveSettingsToStorage(); });
  safeGet("pd-auto-hide")?.addEventListener("change", (e) => { settings.autoHide = e.target.checked; saveSettingsToStorage(); });

  safeGet("pd-reset-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    settings = { ...DEFAULT_SETTINGS };
    saveSettingsToStorage(); syncSettingsToStorage(); syncVolumeUI(); syncDisplayUI(); syncModeUI(); syncVoiceCloningUI();
  });

  document.addEventListener("click", (e) => {
    const panel = safeGet("pd-panel");
    if (panel && !panelOpen) return;
    if (panel && !panel.contains(e.target) && !e.target.closest("#pd-pill")) closePanel();
  });

  initDrag();
  initKeyboardShortcuts();
}

function switchTab(tabName) {
  settings.panelTab = tabName;
  document.querySelectorAll(".pd-tab").forEach((t) => t.classList.toggle("pd-tab-active", t.dataset.tab === tabName));
  document.querySelectorAll(".pd-tab-content").forEach((c) => c.classList.toggle("pd-tab-active", c.id === "pd-tab-" + tabName));
}

function togglePanel() {
  const panel = safeGet("pd-panel");
  if (!panel) return;
  panelOpen = !panelOpen;
  if (panelOpen) { panel.classList.remove("pd-hidden"); loadSettingsIntoPanel(); }
  else panel.classList.add("pd-hidden");
}

function closePanel() {
  const panel = safeGet("pd-panel");
  if (panel) panel.classList.add("pd-hidden");
  panelOpen = false;
}

function loadSettingsIntoPanel() {
  const srcEl = safeGet("pd-source-lang");
  const tgtEl = safeGet("pd-target-lang");
  const srvEl = safeGet("pd-server-url");
  if (srcEl) srcEl.value = settings.sourceLang;
  if (tgtEl) tgtEl.value = settings.targetLang;
  if (srvEl) srvEl.value = settings.serverUrl;
  switchTab(settings.panelTab);
  syncModeUI();
  syncVoiceCloningUI();
}

function syncSettingsToStorage() {
  try { chrome.storage.local.set({ sourceLang: settings.sourceLang, targetLang: settings.targetLang, serverUrl: settings.serverUrl, mode: settings.mode, voiceCloning: settings.voiceCloning, qualityMode: settings.qualityMode }); } catch {}
}

function sendVolumeUpdate() {
  try {
    chrome.storage.local.set({ originalVolume: settings.originalVolume / 100, dubVolume: settings.dubVolume / 100, duckingLevel: settings.duckingLevel / 100 });
    chrome.runtime.sendMessage({ type: "volume-update", originalVolume: settings.originalVolume / 100, dubVolume: settings.dubVolume / 100, duckingLevel: settings.duckingLevel / 100 });
  } catch {}
}

function initDrag() {
  const pill = safeGet("pd-pill");
  if (!pill) return;
  let startX, startY, origLeft, origTop;
  pill.addEventListener("mousedown", (e) => {
    if (e.target.closest("#pd-panel")) return;
    isDragging = false;
    startX = e.clientX; startY = e.clientY;
    const rect = pill.getBoundingClientRect();
    const parentRect = pill.parentElement.getBoundingClientRect();
    origLeft = rect.left - parentRect.left;
    origTop = rect.top - parentRect.top;
    pill.style.position = "absolute";
    pill.style.left = origLeft + "px";
    pill.style.top = origTop + "px";
    pill.style.right = "auto";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    e.preventDefault();
  });
  function onMove(e) {
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
    if (isDragging) { pill.style.left = (origLeft + dx) + "px"; pill.style.top = (origTop + dy) + "px"; }
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    if (isDragging) {
      const rect = pill.getBoundingClientRect();
      const parentRect = pill.parentElement.getBoundingClientRect();
      savePosition(rect.left - parentRect.left, rect.top - parentRect.top);
      setTimeout(() => { isDragging = false; }, 50);
    }
  }
}

function restorePillPosition() {
  const pos = loadPosition();
  if (!pos) return;
  const pill = safeGet("pd-pill");
  if (!pill) return;
  pill.style.position = "absolute";
  pill.style.left = pos.x + "px";
  pill.style.top = pos.y + "px";
  pill.style.right = "auto";
}

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (!e.ctrlKey || !e.shiftKey) return;
    try {
      switch (e.key.toLowerCase()) {
        case "d": e.preventDefault(); toggleOverlayVisibility(); break;
        case "s": e.preventDefault(); handleAction(); break;
        case "m": e.preventDefault(); toggleMuteDub(); break;
        case "v": e.preventDefault(); toggleVoiceCloning(); break;
        case "arrowup": e.preventDefault(); adjustDubVolume(10); break;
        case "arrowdown": e.preventDefault(); adjustDubVolume(-10); break;
      }
    } catch {}
  });
}

function toggleOverlayVisibility() {
  const overlay = safeGet(OVERLAY_ID);
  if (!overlay) return;
  overlay.style.display = overlay.style.display === "none" ? "" : "none";
}

function toggleMuteDub() {
  if (settings.dubVolume > 0) { settings._prevDubVolume = settings.dubVolume; settings.dubVolume = 0; }
  else settings.dubVolume = settings._prevDubVolume || 100;
  saveSettingsToStorage(); syncVolumeUI(); sendVolumeUpdate();
  showToast(settings.dubVolume === 0 ? "Dub muted" : "Dub unmuted", "info");
}

function toggleVoiceCloning() {
  settings.voiceCloning = !settings.voiceCloning;
  saveSettingsToStorage(); syncVoiceCloningUI();
  try { chrome.storage.local.set({ voiceCloning: settings.voiceCloning }); } catch {}
  showToast(settings.voiceCloning ? "Voice cloning ON" : "Voice cloning OFF", "info");
}

function adjustDubVolume(delta) {
  settings.dubVolume = Math.max(0, Math.min(100, settings.dubVolume + delta));
  saveSettingsToStorage(); syncVolumeUI(); sendVolumeUpdate();
}

async function handleAction() {
  try {
    if (isActive) {
      try {
        chrome.runtime.sendMessage({ type: "toggle-capture", action: "stop", platform: detectPlatform() });
      } catch (msgErr) {
        console.warn("[PromptDub] sendMessage failed:", msgErr);
      }
      isActive = false;
      syncOverlayState();
      showToast("Stopping...", "info");
      return;
    }

    const platform = detectPlatform();
    if (platform === "unknown") {
      showToast("Open YouTube or Twitch first", "error");
      return;
    }

    syncSettingsToStorage();

    try {
      chrome.runtime.sendMessage({
        type: "toggle-capture",
        action: "start",
        platform: platform,
        mode: settings.mode,
        voiceCloning: settings.voiceCloning,
      });
    } catch (msgErr) {
      console.error("[PromptDub] sendMessage failed:", msgErr);
      showToast("Extension error - try reloading", "error");
      return;
    }

    showPanelStatus("Starting...", "Connecting to server...", "building");
    const dot = safeGet("pd-status-dot");
    const text = safeGet("pd-status-text");
    if (dot) dot.className = "pd-dot pd-dot-building";
    if (text) text.textContent = "Connecting...";
  } catch (e) {
    console.error("[PromptDub] handleAction error:", e);
    showToast("Error: " + (e.message || "Unknown"), "error");
  }
}

function showPanelStatus(title, detail, state) {
  const dot = safeGet("pd-panel-status-dot");
  const titleEl = safeGet("pd-panel-status-title");
  const detailEl = safeGet("pd-panel-status-detail");
  if (dot) dot.className = `pd-dot pd-dot-${state || "idle"}`;
  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
}

function showStepProgress(stepIndex, message) {
  const container = safeGet("pd-step-progress");
  const fill = safeGet("pd-step-fill");
  const label = safeGet("pd-step-label");
  if (!container || !fill || !label) return;

  clearTimeout(stepTimer);
  container.classList.remove("pd-hidden");

  const pct = ((stepIndex + 1) / VOICE_BUILD_STEPS.length) * 100;
  fill.style.width = pct + "%";
  label.textContent = message || VOICE_BUILD_STEPS[stepIndex]?.label || "Processing...";

  stepTimer = setTimeout(() => {
    container.classList.add("pd-hidden");
  }, 4000);
}

function hideStepProgress() {
  clearTimeout(stepTimer);
  const container = safeGet("pd-step-progress");
  if (container) container.classList.add("pd-hidden");
}

function updateSubtitles(original, translated) {
  const origEl = safeGet("pd-original-subtitle");
  const transEl = safeGet("pd-translated-subtitle");
  if (!origEl || !transEl) { injectOverlay(); return; }
  if (original && settings.showOriginal) { origEl.textContent = original; origEl.style.display = "block"; }
  if (translated && settings.showTranslated) {
    transEl.textContent = translated; transEl.style.display = "block";
    transEl.classList.remove("pd-fade-in"); void transEl.offsetWidth; transEl.classList.add("pd-fade-in");
  }
  if (settings.autoHide) {
    clearTimeout(subtitleHideTimer);
    subtitleHideTimer = setTimeout(() => { if (origEl) origEl.style.display = "none"; if (transEl) transEl.style.display = "none"; }, 6000);
  }
}

function updateStatus(msg) {
  const dot = safeGet("pd-status-dot");
  const text = safeGet("pd-status-text");
  const latency = safeGet("pd-latency");
  const panelDot = safeGet("pd-panel-dot");
  const panelStatusDot = safeGet("pd-panel-status-dot");
  const panelTitle = safeGet("pd-panel-status-title");
  const panelDetail = safeGet("pd-panel-status-detail");
  if (!dot || !text) { injectOverlay(); return; }
  dot.className = "pd-dot";
  if (panelDot) panelDot.className = "pd-dot";
  try {
    switch (msg.status) {
      case "voice_building": {
        const pct = Math.round((msg.progress || 0) * 100);
        dot.classList.add("pd-dot-building"); if (panelDot) panelDot.classList.add("pd-dot-building");
        text.textContent = `Voice ${pct}%`;
        if (panelStatusDot) panelStatusDot.className = "pd-dot pd-dot-building";
        if (panelTitle) panelTitle.textContent = `Building voice ${pct}%`;
        if (panelDetail) panelDetail.textContent = msg.message || "Please wait...";
        updateConnectionState("connecting", `Building voice ${pct}%...`);
        const stepIdx = msg.step != null ? msg.step : Math.min(Math.floor(pct / 25), VOICE_BUILD_STEPS.length - 1);
        showStepProgress(stepIdx, msg.message || VOICE_BUILD_STEPS[stepIdx]?.label);
        break;
      }
      case "voice_ready":
        dot.classList.add("pd-dot-active"); if (panelDot) panelDot.classList.add("pd-dot-active");
        isActive = true; syncOverlayState();
        hideStepProgress();
        if (msg.voiceCloning === false) {
          updateConnectionState("connected", "Connected (default voice)");
        } else {
          updateConnectionState("connected", "Connected successfully");
        }
        break;
      case "session_ready":
        dot.classList.add("pd-dot-building"); if (panelDot) panelDot.classList.add("pd-dot-building");
        text.textContent = "Starting...";
        if (panelStatusDot) panelStatusDot.className = "pd-dot pd-dot-building";
        if (panelTitle) panelTitle.textContent = "Session starting...";
        updateConnectionState("connecting", "Connecting to server...");
        break;
      case "latency":
        dot.classList.add("pd-dot-active"); if (panelDot) panelDot.classList.add("pd-dot-active");
        if (latency && msg.latencyMs) latency.textContent = `${msg.latencyMs}ms`;
        break;
      case "reconnecting":
        dot.classList.add("pd-dot-warning"); if (panelDot) panelDot.classList.add("pd-dot-warning");
        text.textContent = "Reconnecting...";
        if (panelStatusDot) panelStatusDot.className = "pd-dot pd-dot-warning";
        if (panelTitle) panelTitle.textContent = "Reconnecting...";
        updateConnectionState("reconnecting", `Reconnecting (attempt ${msg.attempt || ""})...`);
        break;
      case "error":
        dot.classList.add("pd-dot-error"); if (panelDot) panelDot.classList.add("pd-dot-error");
        text.textContent = "Error";
        isActive = false;
        syncOverlayState();
        if (panelStatusDot) panelStatusDot.className = "pd-dot pd-dot-error";
        if (panelTitle) panelTitle.textContent = "Error";
        if (panelDetail) panelDetail.textContent = msg.message || "Connection failed";
        updateConnectionState("error", msg.message || "Connection failed");
        break;
      default:
        dot.classList.add("pd-dot-idle"); if (panelDot) panelDot.classList.add("pd-dot-idle");
    }
  } catch (err) {
    console.warn("[PromptDub] updateStatus error:", err);
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  try {
    if (msg.type === "subtitle-update") {
      updateSubtitles(msg.original, msg.translated);
    } else if (msg.type === "status-update") {
      updateStatus(msg);
    } else if (msg.type === "capture-toggled") {
      isActive = msg.isActive;
      syncOverlayState();
      if (!isActive) {
        updateConnectionState("disconnected", "Stopped");
        showToast("Translation stopped", "info");
      }
    } else if (msg.type === "capture-error") {
      isActive = false;
      syncOverlayState();
      showPanelStatus("Error", msg.error || "Capture failed", "error");
      showToast("Error: " + (msg.error || "Capture failed"), "error");
      updateConnectionState("error", msg.error || "Capture failed");
    } else if (msg.type === "session-started") {
      isActive = true;
      syncOverlayState();
      updateConnectionState("connecting", "Connecting to server...");
      showToast("Starting translation...", "info");
    }
  } catch (err) {
    console.warn("[PromptDub] Message handler error:", err);
  }
});

chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area === "local" && changes.isCapturing) {
    const newState = !!changes.isCapturing.newValue;
    if (newState !== isActive) {
      isActive = newState;
      syncOverlayState();
    }
  }
});

document.addEventListener("yt-navigate-finish", () => setTimeout(injectOverlay, 500));

const observer = new MutationObserver(() => { if (!document.getElementById(OVERLAY_ID)) injectOverlay(); });
observer.observe(document.body, { childList: true, subtree: true });

if (document.readyState === "complete") injectOverlay();
else window.addEventListener("load", injectOverlay);
