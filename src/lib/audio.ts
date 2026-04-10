const SAMPLE_RATE = 24000;
const BUFFER_SIZE = 2400; // ~100ms chunks at 24kHz

export function createMicrophoneStream(
  onAudioChunk: (base64: string) => void
): Promise<{ stop: () => void }> {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      const source = audioContext.createMediaStreamSource(stream);

      // Use AudioWorklet if available, fall back to ScriptProcessor
      await audioContext.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
  }
  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;

    // Accumulate samples
    const newBuffer = new Float32Array(this.buffer.length + input.length);
    newBuffer.set(this.buffer);
    newBuffer.set(input, this.buffer.length);
    this.buffer = newBuffer;

    // Send chunks of BUFFER_SIZE
    while (this.buffer.length >= ${BUFFER_SIZE}) {
      const chunk = this.buffer.slice(0, ${BUFFER_SIZE});
      this.buffer = this.buffer.slice(${BUFFER_SIZE});
      this.port.postMessage(chunk);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`,
            ],
            { type: "application/javascript" }
          )
        )
      );

      const workletNode = new AudioWorkletNode(audioContext, "pcm-processor");

      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const float32 = event.data;
        // Convert Float32 [-1,1] to Int16
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode
        const bytes = new Uint8Array(int16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        onAudioChunk(btoa(binary));
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      resolve({
        stop: () => {
          workletNode.disconnect();
          source.disconnect();
          stream.getTracks().forEach((t) => t.stop());
          audioContext.close();
        },
      });
    } catch (err) {
      reject(err);
    }
  });
}

export class AudioPlayer {
  private audioContext: AudioContext;
  private queue: Float32Array[] = [];
  private currentSource: AudioBufferSourceNode | null = null;
  private nextStartTime = 0;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  }

  enqueue(base64Audio: string) {
    // Decode base64 to PCM16, then to Float32
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x8000;
    }
    this.queue.push(float32);
    this.playNext();
  }

  private playNext() {
    if (this.queue.length === 0) return;

    const now = this.audioContext.currentTime;
    if (this.nextStartTime < now) {
      this.nextStartTime = now;
    }

    while (this.queue.length > 0) {
      const samples = this.queue.shift()!;
      const buffer = this.audioContext.createBuffer(
        1,
        samples.length,
        SAMPLE_RATE
      );
      buffer.getChannelData(0).set(samples);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;
      this.currentSource = source;
    }
  }

  interrupt() {
    this.queue.length = 0;
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // already stopped
      }
      this.currentSource = null;
    }
    this.nextStartTime = 0;
  }

  close() {
    this.interrupt();
    this.audioContext.close();
  }
}
