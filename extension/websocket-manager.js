class ReconnectingWebSocket {
  constructor(url, sessionId, options = {}) {
    this.url = url;
    this.sessionId = sessionId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.maxReconnectAttempts = 10;
    this.lastChunkIndex = 0;
    this.shouldReconnect = true;

    this.onAudioChunk = null;
    this.onSubtitle = null;
    this.onStatus = null;
    this.onReady = null;
    this.onDisconnect = null;
    this.onReconnect = null;
    this.isReconnecting = false;
  }

  connect() {
    try {
      console.log("[PromptDub] Connecting to:", this.url);
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = "arraybuffer";

      // Connection timeout - if server doesn't respond in 10s, report error
      this._connectTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.error("[PromptDub] Connection timeout - server not responding");
          this.ws.close();
          this.onStatus?.({
            type: "error",
            message: "Server not responding. Check the URL and ensure the server is running.",
          });
        }
      }, 10000);
    } catch (err) {
      console.error("[PromptDub] WebSocket creation failed:", err);
      this.onStatus?.({
        type: "error",
        message: "Invalid server URL: " + this.url,
      });
      return;
    }

    this.ws.onopen = () => {
      clearTimeout(this._connectTimeout);
      this.reconnectAttempts = 0;
      console.log("[PromptDub] WebSocket connected");
      if (this.isReconnecting) {
        this.isReconnecting = false;
        this.onReconnect?.();
      } else {
        this.onReady?.();
      }
    };

    this.ws.onclose = (event) => {
      clearTimeout(this._connectTimeout);
      console.log(`[PromptDub] WebSocket closed: code=${event.code} reason="${event.reason}" wasClean=${event.wasClean}`);
      if (!event.wasClean && this.shouldReconnect) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.onStatus?.({
            type: "error",
            message: `Server disconnected after ${this.maxReconnectAttempts} attempts (code: ${event.code})`,
          });
        }
      }
    };

    this.ws.onerror = (event) => {
      console.error("[PromptDub] WebSocket error:", event);
      this.onStatus?.({
        type: "error",
        message: "Connection failed - check server URL and status",
      });
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
    const baseDelay = 1000;
    const delay = Math.min(
      baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;
    this.isReconnecting = true;

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
    clearTimeout(this._connectTimeout);
    try {
      if (this.ws) {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "session_end" }));
          this.ws.close(1000, "Session ended by user");
        }
        // For CONNECTING/CLOSING/CLOSED - just null the ref, don't call .close()
        // Calling .close() on a CONNECTING socket causes the error we're seeing
        this.ws = null;
      }
    } catch (e) {
      console.warn("[PromptDub] WS close error:", e);
    }
  }

}
