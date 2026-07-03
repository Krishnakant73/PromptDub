class ReconnectingWebSocket {
  constructor(url, sessionId) {
    this.url = url;
    this.sessionId = sessionId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.lastChunkIndex = 0;
    this.shouldReconnect = true;

    this.onAudioChunk = null;
    this.onSubtitle = null;
    this.onStatus = null;
    this.onReady = null;
    this.onDisconnect = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.onReady?.();
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean && this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws.close();
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } else {
        this.onAudioChunk?.(event.data);
      }
    };
  }

  scheduleReconnect() {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;

    this.onStatus?.({
      type: "reconnecting",
      attempt: this.reconnectAttempts,
      delay,
    });

    this.onDisconnect?.();

    setTimeout(() => this.connect(), delay);
  }

  handleMessage(msg) {
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
          seconds_remaining: msg.seconds_remaining,
        });
        break;

      case "voice_ready":
        this.onStatus?.({
          type: "voice_ready",
          quality_score: msg.quality_score,
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
    }
  }

  sendAudioChunk(pcmData, chunkIndex) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const header = new Uint32Array([chunkIndex]);
      const payload = new Uint8Array(
        header.byteLength + pcmData.byteLength
      );
      payload.set(new Uint8Array(header.buffer), 0);
      payload.set(new Uint8Array(pcmData), header.byteLength);
      this.ws.send(payload.buffer);
    }
  }

  close() {
    this.shouldReconnect = false;
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "session_end" }));
      }
      this.ws.close(1000, "Session ended by user");
    }
  }
}
