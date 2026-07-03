class ReconnectingWebSocket {
  constructor(url, sessionId, options = {}) {
    this.url = url;
    this.sessionId = sessionId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = options.speedBoost ? 15000 : 30000;
    this.maxReconnectAttempts = 10;
    this.lastChunkIndex = 0;
    this.shouldReconnect = true;
    this.speedBoost = options.speedBoost || false;
    this.tier = options.tier || "personal";

    this.onAudioChunk = null;
    this.onSubtitle = null;
    this.onStatus = null;
    this.onReady = null;
    this.onDisconnect = null;
    this.onUserInfo = null;
    this.onSessionStats = null;
  }

  connect() {
    try {
      if (this.speedBoost && this.reconnectAttempts === 0) {
        this._preconnect();
      }
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = "arraybuffer";
      if (this.speedBoost) {
        this.ws.bufferAmount = 0;
      }
    } catch (err) {
      console.error("[PromptDub] WebSocket creation failed:", err);
      this.onStatus?.({
        type: "error",
        message: "Invalid server URL",
      });
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.onReady?.();
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean && this.shouldReconnect) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.onStatus?.({
            type: "error",
            message: "Max reconnect attempts reached",
          });
        }
      }
    };

    this.ws.onerror = (event) => {
      console.warn("[PromptDub] WebSocket error:", event);
      try {
        this.ws.close();
      } catch (e) {}
    };

    this.ws.onmessage = (event) => {
      try {
        if (typeof event.data === "string") {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } else {
          this.onAudioChunk?.(event.data);
        }
      } catch (err) {
        console.warn("[PromptDub] Message parse error:", err);
      }
    };
  }

  scheduleReconnect() {
    const baseDelay = this.speedBoost ? 500 : 1000;
    const delay = Math.min(
      baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;

    this.onStatus?.({
      type: "reconnecting",
      attempt: this.reconnectAttempts,
      delay,
    });

    this.onDisconnect?.();

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  handleMessage(msg) {
    try {
      switch (msg.type) {
        case "subtitle":
          this.lastChunkIndex = msg.chunk_index;
          this.onSubtitle?.(msg);
          break;

        case "utterance_end":
          this.lastChunkIndex = msg.chunk_index;
          break;

        case "session_ready":
          this.onStatus?.({ type: "session_ready", message: msg.message });
          break;

        case "voice_building":
          this.onStatus?.({
            type: "voice_building",
            progress: msg.progress,
            step: msg.step,
            seconds_remaining: msg.seconds_remaining,
          });
          break;

        case "voice_ready":
          this.onStatus?.({
            type: "voice_ready",
            quality_score: msg.quality_score,
            voice_cloning: msg.voice_cloning,
            message: msg.message,
          });
          break;

        case "error":
          this.onStatus?.({ type: "error", message: msg.message });
          break;

        case "latency_report":
          this.onStatus?.({
            type: "latency",
            latency_ms: msg.latency_ms,
          });
          break;

        case "user_info":
          this.onUserInfo?.(msg);
          break;

        case "session_stats":
          this.onSessionStats?.(msg);
          break;

        default:
          console.warn("[PromptDub] Unknown WS message type:", msg.type);
      }
    } catch (err) {
      console.warn("[PromptDub] handleMessage error:", err);
    }
  }

  sendAudioChunk(pcmData, chunkIndex) {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const header = new Uint32Array([chunkIndex]);
        const payload = new Uint8Array(
          header.byteLength + pcmData.byteLength
        );
        payload.set(new Uint8Array(header.buffer), 0);
        payload.set(new Uint8Array(pcmData), header.byteLength);
        this.ws.send(payload.buffer);
      }
    } catch (err) {
      console.warn("[PromptDub] sendAudioChunk error:", err);
    }
  }

  close() {
    this.shouldReconnect = false;
    try {
      if (this.ws) {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "session_end", tier: this.tier || "personal" }));
        }
        this.ws.close(1000, "Session ended by user");
      }
    } catch (e) {
      console.warn("[PromptDub] WS close error:", e);
    }
  }

  _preconnect() {
    try {
      const pingWs = new WebSocket(this.url);
      pingWs.onopen = () => { try { pingWs.close(); } catch {} };
      pingWs.onerror = () => {};
      setTimeout(() => { try { pingWs.close(); } catch {} }, 2000);
    } catch {}
  }
}
