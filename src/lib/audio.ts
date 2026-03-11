export const EXCERPT_DURATION_SEC = 80;

export type ExcerptResult = {
  blob: Blob;
  durationSec: number;
  excerptDurationSec: number;
  excerptStartSec: number;
};

function clampExcerptStart(durationSec: number, excerptDurationSec: number): number {
  if (durationSec <= excerptDurationSec) {
    return 0;
  }

  const preferredStart = Math.floor(durationSec * 0.35);
  return Math.max(0, Math.min(durationSec - excerptDurationSec, preferredStart));
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const frameCount = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
      const channelData = audioBuffer.getChannelData(channelIndex);
      const sample = Math.max(-1, Math.min(1, channelData[frameIndex] ?? 0));
      const pcm =
        sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);

      view.setInt16(offset, pcm, true);
      offset += bytesPerSample;
    }
  }

  return buffer;
}

function createExcerptAudioBuffer(
  audioContext: AudioContext,
  source: AudioBuffer,
  excerptStartSec: number,
  excerptDurationSec: number,
) {
  const startFrame = Math.floor(excerptStartSec * source.sampleRate);
  const frameCount = Math.max(
    1,
    Math.floor(excerptDurationSec * source.sampleRate),
  );
  const excerptBuffer = audioContext.createBuffer(
    source.numberOfChannels,
    frameCount,
    source.sampleRate,
  );

  for (let channelIndex = 0; channelIndex < source.numberOfChannels; channelIndex += 1) {
    const sourceData = source.getChannelData(channelIndex);
    const excerptData = excerptBuffer.getChannelData(channelIndex);
    const segment = sourceData.subarray(startFrame, startFrame + frameCount);

    excerptData.set(segment);
  }

  return excerptBuffer;
}

export async function createRepresentativeExcerpt(
  file: File,
): Promise<ExcerptResult> {
  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const durationSec = decoded.duration;
    const excerptDurationSec = Math.min(EXCERPT_DURATION_SEC, durationSec);
    const excerptStartSec = clampExcerptStart(durationSec, excerptDurationSec);
    const excerptBuffer = createExcerptAudioBuffer(
      audioContext,
      decoded,
      excerptStartSec,
      excerptDurationSec,
    );
    const wavBuffer = encodeWav(excerptBuffer);

    return {
      blob: new Blob([wavBuffer], { type: "audio/wav" }),
      durationSec,
      excerptDurationSec,
      excerptStartSec,
    };
  } finally {
    await audioContext.close();
  }
}
