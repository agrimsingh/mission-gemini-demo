"use client";

import { useSyncExternalStore } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/cn";

type Snapshot = {
  activeSrc: string | null;
  isPlaying: boolean;
};

let activeAudio: HTMLAudioElement | null = null;
let activeSrc: string | null = null;
let cachedSnapshot: Snapshot = {
  activeSrc: null,
  isPlaying: false,
};
const listeners = new Set<() => void>();

function computeSnapshot(): Snapshot {
  const nextActiveSrc = activeSrc;
  const nextIsPlaying = activeAudio !== null && !activeAudio.paused;

  if (
    cachedSnapshot.activeSrc === nextActiveSrc &&
    cachedSnapshot.isPlaying === nextIsPlaying
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = {
    activeSrc: nextActiveSrc,
    isPlaying: nextIsPlaying,
  };
  return cachedSnapshot;
}

function emit() {
  computeSnapshot();
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Snapshot {
  return computeSnapshot();
}

function clearActiveAudio() {
  if (!activeAudio) {
    return;
  }

  activeAudio.onplay = null;
  activeAudio.onpause = null;
  activeAudio.onended = null;
  activeAudio.onerror = null;
  activeAudio.pause();
  activeAudio = null;
  activeSrc = null;
}

async function togglePreview(src: string) {
  if (activeAudio && activeSrc === src) {
    if (activeAudio.paused) {
      await activeAudio.play();
    } else {
      activeAudio.pause();
    }
    emit();
    return;
  }

  clearActiveAudio();

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.onplay = emit;
  audio.onpause = emit;
  audio.onended = () => {
    clearActiveAudio();
    emit();
  };
  audio.onerror = () => {
    clearActiveAudio();
    emit();
  };

  activeAudio = audio;
  activeSrc = src;
  emit();

  try {
    await audio.play();
  } catch (error) {
    clearActiveAudio();
    emit();
    throw error;
  }
}

export function AudioPreviewButton({
  src,
  className,
  size = "default",
}: {
  src?: string;
  className?: string;
  size?: "default" | "compact";
}) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const isCurrent = !!src && snapshot.activeSrc === src;
  const isPlaying = isCurrent && snapshot.isPlaying;

  return (
    <button
      type="button"
      disabled={!src}
      onClick={() => {
        if (!src) {
          return;
        }

        void togglePreview(src);
      }}
      className={cn(
        "inline-flex items-center rounded-lg font-500 transition-colors duration-100",
        "active:scale-[0.97] active:transition-transform active:duration-75",
        size === "compact"
          ? "gap-1 px-2 py-1 text-[11px]"
          : "gap-1.5 px-3 py-1.5 text-xs",
        src
          ? "bg-surface-3 text-text-primary hover:bg-surface-2"
          : "cursor-not-allowed text-text-tertiary opacity-40",
        className,
      )}
      aria-label={isPlaying ? "Pause audio preview" : "Play audio preview"}
    >
      {isPlaying ? (
        <Pause className={size === "compact" ? "size-3" : "size-3.5"} />
      ) : (
        <Play className={size === "compact" ? "size-3" : "size-3.5"} />
      )}
      <span>{isPlaying ? "Pause" : "Preview"}</span>
    </button>
  );
}
