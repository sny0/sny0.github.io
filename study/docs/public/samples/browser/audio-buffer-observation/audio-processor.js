const FrameCount = 48000;
const ChunkFrames = 4800;
const ChunkCount = FrameCount / ChunkFrames;
const DelayedChunkIndex = 4;
const DelayFrames = 3600;
const CapacityFrames = 2 * ChunkFrames;

class AudioBufferObservation extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { pcm, leadFrames } = options.processorOptions ?? {};
    if (sampleRate !== 48000 || !(pcm instanceof Float32Array) || pcm.length !== FrameCount) {
      throw new RangeError("48 kHz・1秒・モノラルのPCMが必要です。");
    }
    if (leadFrames !== 0 && leadFrames !== ChunkFrames) {
      throw new RangeError("先読みは0または4800フレームを指定してください。");
    }

    this.pcm = pcm;
    this.leadFrames = leadFrames;
    this.arrivalFrames = new Int32Array(ChunkCount);
    for (let chunk = 0; chunk < ChunkCount; chunk++) {
      const delay = chunk === DelayedChunkIndex ? DelayFrames : 0;
      this.arrivalFrames[chunk] = Math.max(0, chunk * ChunkFrames - leadFrames + delay);
    }

    this.ring = new Float32Array(CapacityFrames);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.queuedFrames = 0;
    this.nextChunk = 0;
    this.renderedFrames = 0;
    this.missingFrames = 0;
    this.overflowFrames = 0;
    this.firstMissingFrame = null;
    this.lastMissingFrameExclusive = null;
    this.firstQuantumFrames = 0;
    this.lastQuantumFrames = 0;
    this.maxQuantumFrames = 0;
  }

  appendArrivedChunks(frame) {
    // Simulated supply on the render clock. At frame 0, two chunks can arrive together.
    while (this.arrivalFrames[this.nextChunk] === frame) {
      const sourceStart = this.nextChunk * ChunkFrames;
      const accepted = Math.min(ChunkFrames, CapacityFrames - this.queuedFrames);
      for (let index = 0; index < accepted; index++) {
        this.ring[this.writeIndex] = this.pcm[sourceStart + index];
        this.writeIndex = (this.writeIndex + 1) % CapacityFrames;
      }
      this.queuedFrames += accepted;
      this.overflowFrames += ChunkFrames - accepted;
      this.nextChunk++;
    }
  }

  process(_inputs, outputs) {
    if (this.renderedFrames === FrameCount) return false;
    const output = outputs[0]?.[0];
    if (!output || output.length === 0) return true;

    const firstFrame = this.renderedFrames;
    const activeFrames = Math.min(output.length, FrameCount - firstFrame);
    if (firstFrame === 0) this.firstQuantumFrames = output.length;
    this.lastQuantumFrames = output.length;
    this.maxQuantumFrames = Math.max(this.maxQuantumFrames, output.length);

    for (let index = 0; index < activeFrames; index++) {
      const frame = firstFrame + index;
      this.appendArrivedChunks(frame);
      if (this.queuedFrames > 0) {
        output[index] = this.ring[this.readIndex];
        this.readIndex = (this.readIndex + 1) % CapacityFrames;
        this.queuedFrames--;
      } else {
        output[index] = 0;
        this.missingFrames++;
        if (this.firstMissingFrame === null) this.firstMissingFrame = frame;
        this.lastMissingFrameExclusive = frame + 1;
      }
    }

    output.fill(0, activeFrames);
    this.renderedFrames += activeFrames;
    if (this.renderedFrames === FrameCount) {
      this.port.postMessage({
        type: "stats",
        leadFrames: this.leadFrames,
        renderedFrames: this.renderedFrames,
        deliveredFrames: this.renderedFrames - this.missingFrames,
        missingFrames: this.missingFrames,
        queuedFrames: this.queuedFrames,
        overflowFrames: this.overflowFrames,
        firstMissingFrame: this.firstMissingFrame,
        lastMissingFrameExclusive: this.lastMissingFrameExclusive,
        firstQuantumFrames: this.firstQuantumFrames,
        lastQuantumFrames: this.lastQuantumFrames,
        maxQuantumFrames: this.maxQuantumFrames
      });
    }
    return true;
  }
}

registerProcessor("audio-buffer-observation", AudioBufferObservation);
