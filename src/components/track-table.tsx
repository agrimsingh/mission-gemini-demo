"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatBpm, formatSeconds } from "@/lib/format";
import { ArrowRight } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import { AudioPreviewButton } from "./audio-preview-button";

export type TrackSummary = {
  _id: Id<"tracks">;
  title: string;
  artist?: string;
  sourceFileName: string;
  bpm?: number;
  bpmCheckedAt?: number;
  excerptMimeType: string;
  excerptAudioUrl?: string;
  durationSec: number;
  excerptStartSec: number;
  excerptDurationSec: number;
  status: "uploaded" | "embedding" | "ready" | "failed";
  error?: string;
  description?: string;
  descriptionError?: string;
  embeddingStartedAt?: number;
  embeddingCompletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type MapTrack = {
  _id: Id<"tracks">;
  title: string;
  artist?: string;
  sourceFileName: string;
  durationSec: number;
  excerptStartSec: number;
  excerptDurationSec: number;
  embedding: number[];
  createdAt: number;
  updatedAt: number;
};

const STATUS_STYLES: Record<string, string> = {
  uploaded:
    "bg-warning-muted text-warning",
  embedding:
    "bg-warning-muted text-warning",
  ready:
    "bg-success-muted text-success",
  failed:
    "bg-danger-muted text-danger",
};

const TABLE_COLUMN_COUNT = 5;
const TRACK_ROW_HEIGHT = 80;
const ROW_OVERSCAN = 6;

export function TrackTable({
  tracks,
  isPending,
  selectedTrackId,
  onSelectTrack,
  onExploreOnMap,
}: {
  tracks: TrackSummary[] | undefined;
  isPending: boolean;
  selectedTrackId: Id<"tracks"> | null;
  onSelectTrack: (trackId: Id<"tracks">) => void;
  onExploreOnMap: (trackId: Id<"tracks">) => void;
}) {
  const safeTracks = tracks ?? [];

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) {
      return;
    }

    const updateViewportHeight = () => {
      setViewportHeight(node.clientHeight);
    };

    updateViewportHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateViewportHeight();
    });
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    },
    [],
  );

  const {
    visibleTracks,
    startIndex,
    topSpacerHeight,
    bottomSpacerHeight,
  } = useMemo(() => {
    const effectiveViewportHeight = viewportHeight || TRACK_ROW_HEIGHT * 8;
    const visibleCount =
      Math.ceil(effectiveViewportHeight / TRACK_ROW_HEIGHT) + ROW_OVERSCAN * 2;
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / TRACK_ROW_HEIGHT) - ROW_OVERSCAN,
    );
    const endIndex = Math.min(safeTracks.length, startIndex + visibleCount);

    return {
      visibleTracks: safeTracks.slice(startIndex, endIndex),
      startIndex,
      topSpacerHeight: startIndex * TRACK_ROW_HEIGHT,
      bottomSpacerHeight: Math.max(
        0,
        (safeTracks.length - endIndex) * TRACK_ROW_HEIGHT,
      ),
    };
  }, [safeTracks, scrollTop, viewportHeight]);

  if (!tracks) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-border py-16 text-text-tertiary">
        Loading track library…
      </div>
    );
  }

  if (safeTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16">
        <p className="text-text-tertiary">No tracks yet</p>
        <p className="text-sm text-text-tertiary">
          Upload some songs above to get started.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="max-h-[68vh] overflow-auto rounded-2xl border border-border"
    >
      <table className="w-full min-w-[940px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "44%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "27%" }} />
        </colgroup>
        <thead>
          <tr className="sticky top-0 z-10 border-b border-border bg-surface-1">
            <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-text-tertiary">
              Track
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-text-tertiary sm:table-cell">
              Duration
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-text-tertiary md:table-cell">
              Analyzed
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-text-tertiary lg:table-cell">
              BPM
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {topSpacerHeight > 0 ? (
            <tr aria-hidden="true">
              <td
                colSpan={TABLE_COLUMN_COUNT}
                className="p-0"
                style={{ height: topSpacerHeight }}
              />
            </tr>
          ) : null}

          {visibleTracks.map((track, visibleIndex) => {
            const bpmLabel = formatBpm(track.bpm);
            const isSelected = selectedTrackId === track._id;
            const rowIndex = startIndex + visibleIndex;
            const isLastTrack = rowIndex === safeTracks.length - 1;

            return (
              <tr
                key={track._id}
                className={cn(
                  "group h-20 cursor-pointer border-b border-border transition-colors duration-100 hover:bg-surface-3",
                  isLastTrack && "border-b-0",
                  isSelected && "bg-surface-3",
                )}
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: `${TRACK_ROW_HEIGHT}px`,
                }}
                onClick={() => onSelectTrack(track._id)}
              >
                <td className="px-4 py-3">
                  <p className="truncate font-500 text-text-primary">
                    {track.title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-text-tertiary">
                    {track.artist || track.sourceFileName}
                    {bpmLabel ? ` · ${bpmLabel}` : ""}
                  </p>
                  {track.error && (
                    <p className="mt-1 truncate text-xs text-danger">
                      {track.error}
                    </p>
                  )}
                </td>
                <td className="hidden px-4 py-3 tabular-nums text-sm text-text-secondary sm:table-cell">
                  {formatSeconds(track.durationSec)}
                </td>
                <td className="hidden px-4 py-3 tabular-nums text-sm text-text-secondary md:table-cell">
                  {formatSeconds(track.excerptStartSec)}-
                  {formatSeconds(
                    track.excerptStartSec + track.excerptDurationSec,
                  )}
                </td>
                <td className="hidden px-4 py-3 tabular-nums text-sm text-text-secondary lg:table-cell">
                  {bpmLabel ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    {track.status !== "ready" && (
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-500 capitalize",
                          STATUS_STYLES[track.status],
                        )}
                      >
                        {track.status}
                      </span>
                    )}
                    <div onClick={(event) => event.stopPropagation()}>
                      <AudioPreviewButton
                        src={track.excerptAudioUrl}
                        size="compact"
                      />
                    </div>
                    <button
                      disabled={track.status !== "ready" || isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        onExploreOnMap(track._id);
                      }}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-500 transition-colors duration-100",
                        "active:scale-[0.97] active:transition-transform active:duration-75",
                        track.status === "ready"
                          ? "bg-accent-muted text-accent hover:bg-accent-strong"
                          : "cursor-not-allowed text-text-tertiary opacity-40",
                      )}
                      aria-label={`Explore ${track.title} on map`}
                    >
                      <span className="hidden sm:inline">Explore</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {bottomSpacerHeight > 0 ? (
            <tr aria-hidden="true">
              <td
                colSpan={TABLE_COLUMN_COUNT}
                className="p-0"
                style={{ height: bottomSpacerHeight }}
              />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
