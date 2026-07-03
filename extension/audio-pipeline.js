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
  }

  async initialize(tabMediaStream) {
    this.audioCtx = new AudioContext({ sampleRate: 16000 });
    await this.audioCtx.resume();

    const source = this.audioCtx.createMediaStreamSource(tabMediaStream);

    this.originalGain = new GainNode(this.audioCtx, { gain: 1.0 });
    source.connect(this.originalGain);
    this.originalGain.connect(this.audioCtx.destination);

    this.translatedGain = new GainNode(this.audioCtx, { gain: 1.0 });
    this.translatedGain.connect(this.audioCtx.destination);

    await this.audioCtx.audioWorklet.addModule("audio-worklet-processor.js");
    this.chunkerNode = new AudioWorkletNode(
      this.audioCtx,
      "audio-chunker",
      {
        processorOptions: {
          chunkDurationMs: 1000,
          overlapMs: 200,
          sampleRate: 16000,
        },
      }
    );
    source.connect(this.chunkerNode);

    return this.chunkerNode;
  }

  duckOriginal() {
    if (!this.audioCtx || !this.originalGain) return;

    clearTimeout(this.duckTimeout);
    const now = this.audioCtx.currentTime;

    this.originalGain.gain.cancelScheduledValues(now);
    this.originalGain.gain.setValueAtTime(
      this.originalGain.gain.value,
      now
    );
    this.originalGain.gain.linearRampToValueAtTime(
      this.DUCK_LEVEL,
      now + this.DUCK_IN_MS
    );
  }

  restoreOriginal() {
    if (!this.audioCtx || !this.originalGain) return;

    clearTimeout(this.duckTimeout);
    this.duckTimeout = setTimeout(() => {
      const now = this.audioCtx.currentTime;
      this.originalGain.gain.cancelScheduledValues(now);
      this.originalGain.gain.setValueAtTime(
        this.originalGain.gain.value,
        now
      );
      this.originalGain.gain.linearRampToValueAtTime(
        1.0,
        now + this.DUCK_OUT_MS
      );
    }, this.DUCK_HOLD_MS);
  }

  async playTranslatedAudio(pcmArrayBuffer) {
    this.playbackQueue.push(pcmArrayBuffer);

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.duckOriginal();
      await this.processQueue();
    }
  }

  async processQueue() {
    while (this.playbackQueue.length > 0) {
      const pcmData = this.playbackQueue.shift();

      const int16Array = new Int16Array(pcmData);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioCtx.createBuffer(
        1,
        float32Array.length,
        16000
      );
      audioBuffer.getChannelData(0).set(float32Array);

      const bufferSource = this.audioCtx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(this.translatedGain);

      await new Promise((resolve) => {
        bufferSource.onended = resolve;
        bufferSource.start();
      });
    }

    this.isPlaying = false;
    this.restoreOriginal();
  }

  setDuckLevel(level) {
    this.DUCK_LEVEL = Math.max(0, Math.min(1, level));
  }

  destroy() {
    clearTimeout(this.duckTimeout);
    this.playbackQueue = [];
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close();
    }
    this.audioCtx = null;
    this.originalGain = null;
    this.translatedGain = null;
    this.chunkerNode = null;
  }
}
