class AudioChunker extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = options.processorOptions || {};
    const chunkDurationMs = opts.chunkDurationMs || 1000;
    const overlapMs = opts.overlapMs || 200;
    const sampleRate = opts.sampleRate || 16000;

    this.chunkSize = Math.floor((chunkDurationMs / 1000) * sampleRate);
    this.overlapSize = Math.floor((overlapMs / 1000) * sampleRate);
    this.stepSize = this.chunkSize - this.overlapSize;

    this.buffer = new Float32Array(this.chunkSize * 2);
    this.writeIndex = 0;
    this.chunkIndex = 0;
    this.samplesSinceLastChunk = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.writeIndex % (this.chunkSize * 2)] = channelData[i];
      this.writeIndex++;
      this.samplesSinceLastChunk++;

      if (
        this.samplesSinceLastChunk >= this.stepSize &&
        this.writeIndex >= this.chunkSize
      ) {
        const chunk = new Float32Array(this.chunkSize);
        const startIdx = this.writeIndex - this.chunkSize;

        for (let j = 0; j < this.chunkSize; j++) {
          chunk[j] = this.buffer[(startIdx + j) % (this.chunkSize * 2)];
        }

        const pcm16 = new Int16Array(this.chunkSize);
        for (let j = 0; j < this.chunkSize; j++) {
          const s = Math.max(-1, Math.min(1, chunk[j]));
          pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        this.port.postMessage(
          {
            type: "audio-chunk",
            pcmData: pcm16.buffer,
            chunkIndex: this.chunkIndex++,
          },
          [pcm16.buffer]
        );

        this.samplesSinceLastChunk = 0;
      }
    }

    return true;
  }
}

registerProcessor("audio-chunker", AudioChunker);
