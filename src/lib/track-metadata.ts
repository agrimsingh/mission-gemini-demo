import { trimFileExtension } from "./format";

export type ParsedTrackMetadata = {
  title: string;
  artist?: string;
};

export function parseTrackMetadata(fileName: string): ParsedTrackMetadata {
  const baseName = trimFileExtension(fileName).trim();
  const separatorIndex = baseName.indexOf(" - ");

  if (separatorIndex === -1) {
    return {
      title: baseName,
    };
  }

  const artist = baseName.slice(0, separatorIndex).trim();
  const title = baseName.slice(separatorIndex + 3).trim();

  return {
    title: title || baseName,
    artist: artist || undefined,
  };
}
