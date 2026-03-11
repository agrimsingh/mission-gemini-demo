export function formatSeconds(totalSeconds: number): string {
  const roundedSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function trimFileExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}
