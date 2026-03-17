import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export const EXCERPT_DURATION_SEC = 80;

const FFMPEG_CORE_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
const OUTPUT_MIME_TYPE = "audio/mpeg";
const OUTPUT_EXTENSION = "mp3";
const OUTPUT_SAMPLE_RATE = "16000";
const OUTPUT_BITRATE = "96k";

export type ExcerptResult = {
  blob: Blob;
  bpm?: number;
  durationSec: number;
  excerptDurationSec: number;
  excerptStartSec: number;
  mimeType: string;
};

type ProgressCallback = (progressRatio: number) => void;

let coreAssetUrlsPromise:
  | Promise<{
      coreURL: string;
      wasmURL: string;
    }>
  | null = null;

function clampExcerptStart(durationSec: number, excerptDurationSec: number): number {
  if (durationSec <= excerptDurationSec) {
    return 0;
  }

  const preferredStart = Math.floor(durationSec * 0.35);
  return Math.max(0, Math.min(durationSec - excerptDurationSec, preferredStart));
}

function getFileExtension(fileName: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return match?.[1]?.toLowerCase() || "bin";
}

function createTempName(prefix: string, extension: string): string {
  return `${prefix}-${crypto.randomUUID()}.${extension}`;
}

function readFileAsText(fileData: string | Uint8Array<ArrayBufferLike>): string {
  return typeof fileData === "string"
    ? fileData
    : new TextDecoder().decode(fileData);
}

function readFileAsArrayBuffer(
  fileData: string | Uint8Array<ArrayBufferLike>,
): ArrayBuffer {
  const bytes =
    typeof fileData === "string"
      ? new TextEncoder().encode(fileData)
      : new Uint8Array(fileData);

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function getCoreAssetUrls() {
  if (!coreAssetUrlsPromise) {
    coreAssetUrlsPromise = (async () => {
      return {
        coreURL: await toBlobURL(
          `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      };
    })();
  }

  return await coreAssetUrlsPromise;
}

async function safeDeleteFile(ffmpeg: FFmpeg, fileName: string) {
  try {
    await ffmpeg.deleteFile(fileName);
  } catch {
    // Ignore cleanup failures in the virtual fs.
  }
}

async function probeDuration(ffmpeg: FFmpeg, inputName: string): Promise<number> {
  const durationOutputName = createTempName("duration", "txt");

  try {
    await ffmpeg.ffprobe([
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputName,
      "-o",
      durationOutputName,
    ]);

    const durationText = await ffmpeg.readFile(durationOutputName, "utf8");
    const durationSec = Number.parseFloat(readFileAsText(durationText).trim());

    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      throw new Error("Could not determine track duration.");
    }

    return durationSec;
  } finally {
    await safeDeleteFile(ffmpeg, durationOutputName);
  }
}

async function probeTbpm(
  ffmpeg: FFmpeg,
  inputName: string,
): Promise<number | undefined> {
  const bpmOutputName = createTempName("tbpm", "txt");

  try {
    await ffmpeg.ffprobe([
      "-v",
      "error",
      "-show_entries",
      "format_tags=TBPM",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputName,
      "-o",
      bpmOutputName,
    ]);

    const bpmText = await ffmpeg.readFile(bpmOutputName, "utf8");
    const parsed = Number.parseFloat(readFileAsText(bpmText).trim());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  } finally {
    await safeDeleteFile(ffmpeg, bpmOutputName);
  }
}

export class AudioExcerptProcessor {
  private readonly ffmpeg = new FFmpeg();
  private loadPromise: Promise<void> | null = null;
  private progressCallback: ProgressCallback | null = null;

  constructor() {
    this.ffmpeg.on("progress", ({ progress }) => {
      this.progressCallback?.(progress);
    });
  }

  async load() {
    if (this.ffmpeg.loaded) {
      return;
    }

    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const coreAssets = await getCoreAssetUrls();
        await this.ffmpeg.load(coreAssets);
      })();
    }

    await this.loadPromise;
  }

  async createRepresentativeExcerpt(
    file: File,
    onProgress?: ProgressCallback,
  ): Promise<ExcerptResult> {
    await this.load();

    const inputName = createTempName("input", getFileExtension(file.name));
    const outputName = createTempName("excerpt", OUTPUT_EXTENSION);

    try {
      await this.ffmpeg.writeFile(inputName, await fetchFile(file));

      const durationSec = await probeDuration(this.ffmpeg, inputName);
      const bpm = await probeTbpm(this.ffmpeg, inputName);
      const excerptDurationSec = Math.min(EXCERPT_DURATION_SEC, durationSec);
      const excerptStartSec = clampExcerptStart(durationSec, excerptDurationSec);

      this.progressCallback = onProgress ?? null;

      const exitCode = await this.ffmpeg.exec([
        "-ss",
        excerptStartSec.toFixed(3),
        "-t",
        excerptDurationSec.toFixed(3),
        "-i",
        inputName,
        "-vn",
        "-map_metadata",
        "-1",
        "-ac",
        "1",
        "-ar",
        OUTPUT_SAMPLE_RATE,
        "-codec:a",
        "libmp3lame",
        "-b:a",
        OUTPUT_BITRATE,
        outputName,
      ]);

      if (exitCode !== 0) {
        throw new Error(`ffmpeg transcoding failed with exit code ${exitCode}.`);
      }

      const outputData = await this.ffmpeg.readFile(outputName);

      return {
        blob: new Blob([readFileAsArrayBuffer(outputData)], {
          type: OUTPUT_MIME_TYPE,
        }),
        bpm,
        durationSec,
        excerptDurationSec,
        excerptStartSec,
        mimeType: OUTPUT_MIME_TYPE,
      };
    } finally {
      this.progressCallback = null;
      await safeDeleteFile(this.ffmpeg, inputName);
      await safeDeleteFile(this.ffmpeg, outputName);
    }
  }

  terminate() {
    this.progressCallback = null;
    this.ffmpeg.terminate();
    this.loadPromise = null;
  }
}
