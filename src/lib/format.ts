export function formatSeconds(totalSeconds: number): string {
  const roundedSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDurationMs(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  if (durationMs < 10_000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  return `${Math.round(durationMs / 1000)}s`;
}

export function trimFileExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

export function formatBpm(bpm: number | undefined): string | null {
  if (bpm === undefined || !Number.isFinite(bpm) || bpm <= 0) {
    return null;
  }

  return `${Math.round(bpm)} BPM`;
}
