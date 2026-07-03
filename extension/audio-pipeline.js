class AudioDuckingPipeline {
  constructor() {
    this.audioCtx = null;
    this.originalGain = null;
    this.translatedGain = null;
    this.chunkerNode = null;
    this.playbackQueue = [];
    this.isPlaying = false;
    this.duckTimeout = null;
    this.DUCK_LEVEL = 0.2;
    this.DUCK_IN_MS = 0.15;
    this.DUCK_OUT_MS = 0.5;
    this.DUCK_HOLD_MS = 800;
    this.originalVolume = 0.8;
    this.dubVolume = 1.0;
    this.translateOnly = false;
  }

  async initialize(tabMediaStream, options = {}) {
    try {
      this.translateOnly = options.translateOnly || false;
      this.speedBoost = options.speedBoost || false;
      this.audioCtx = new AudioContext({ sampleRate: 16000 });
      await this.audioCtx.resume();

      const source = this.audioCtx.createMediaStreamSource(tabMediaStream);

      this.originalGain = new GainNode(this.audioCtx, { gain: this.originalVolume });
      source.connect(this.originalGain);
      this.originalGain.connect(this.audioCtx.destination);

      this.translatedGain = new GainNode(this.audioCtx, { gain: this.dubVolume });
      this.translatedGain.connect(this.audioCtx.destination);

      await this.audioCtx.audioWorklet.addModule("audio-worklet-processor.js");
      const chunkDurationMs = this.speedBoost ? 800 : 1000;
      const overlapMs = this.speedBoost ? 150 : 200;
      this.chunkerNode = new AudioWorkletNode(this.audioCtx, "audio-chunker", {
        processorOptions: { chunkDurationMs, overlapMs, sampleRate: 16000 },
      });
      source.connect(this.chunkerNode);

      return this.chunkerNode;
    } catch (err) {
      console.error("[PromptDub] AudioPipeline init failed:", err);
      throw err;
    }
  }

  setOriginalVolume(vol) {
    this.originalVolume = Math.max(0, Math.min(1, vol));
    if (this.originalGain && this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        this.originalGain.gain.cancelScheduledValues(now);
        this.originalGain.gain.setValueAtTime(this.originalGain.gain.value, now);
        this.originalGain.gain.linearRampToValueAtTime(this.originalVolume, now + 0.05);
      } catch { this.originalGain.gain.value = this.originalVolume; }
    }
  }

  setDubVolume(vol) {
    this.dubVolume = Math.max(0, Math.min(1, vol));
    if (this.translatedGain && this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        this.translatedGain.gain.cancelScheduledValues(now);
        this.translatedGain.gain.setValueAtTime(this.translatedGain.gain.value, now);
        this.translatedGain.gain.linearRampToValueAtTime(this.dubVolume, now + 0.05);
      } catch { this.translatedGain.gain.value = this.dubVolume; }
    }
  }

  setDuckingLevel(level) { this.DUCK_LEVEL = Math.max(0, Math.min(1, level)); }

  duckOriginal() {
    if (!this.audioCtx || !this.originalGain || this.translateOnly) return;
    clearTimeout(this.duckTimeout);
    try {
      const now = this.audioCtx.currentTime;
      this.originalGain.gain.cancelScheduledValues(now);
      this.originalGain.gain.setValueAtTime(this.originalGain.gain.value, now);
      this.originalGain.gain.linearRampToValueAtTime(this.DUCK_LEVEL, now + this.DUCK_IN_MS);
    } catch { this.originalGain.gain.value = this.DUCK_LEVEL; }
  }

  restoreOriginal() {
    if (!this.audioCtx || !this.originalGain || this.translateOnly) return;
    clearTimeout(this.duckTimeout);
    this.duckTimeout = setTimeout(() => {
      try {
        const now = this.audioCtx.currentTime;
        this.originalGain.gain.cancelScheduledValues(now);
        this.originalGain.gain.setValueAtTime(this.originalGain.gain.value, now);
        this.originalGain.gain.linearRampToValueAtTime(this.originalVolume, now + this.DUCK_OUT_MS);
      } catch { this.originalGain.gain.value = this.originalVolume; }
    }, this.DUCK_HOLD_MS);
  }

  async playTranslatedAudio(pcmArrayBuffer) {
    if (this.translateOnly) return;
    this.playbackQueue.push(pcmArrayBuffer);
    if (!this.isPlaying) { this.isPlaying = true; this.duckOriginal(); await this.processQueue(); }
  }

  async processQueue() {
    while (this.playbackQueue.length > 0) {
      const pcmData = this.playbackQueue.shift();
      try {
        const int16Array = new Int16Array(pcmData);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0;
        const audioBuffer = this.audioCtx.createBuffer(1, float32Array.length, 16000);
        audioBuffer.getChannelData(0).set(float32Array);
        const bufferSource = this.audioCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(this.translatedGain);
        await new Promise((resolve, reject) => { bufferSource.onended = resolve; bufferSource.onerror = reject; bufferSource.start(); });
      } catch (err) { console.warn("[PromptDub] Audio playback error:", err); }
    }
    this.isPlaying = false;
    this.restoreOriginal();
  }

  destroy() {
    clearTimeout(this.duckTimeout);
    this.playbackQueue = [];
    try { if (this.audioCtx && this.audioCtx.state !== "closed") this.audioCtx.close(); } catch {}
    this.audioCtx = null;
    this.originalGain = null;
    this.translatedGain = null;
    this.chunkerNode = null;
  }
}
