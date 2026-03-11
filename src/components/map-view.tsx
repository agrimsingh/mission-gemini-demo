"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatSeconds } from "@/lib/format";
import { projectEmbeddingsToPlane } from "@/lib/pca";
import type { Id } from "../../convex/_generated/dataModel";
import type { MapTrack } from "./track-table";

export function MapView({
  tracks,
  selectedTrackId,
  highlightedTrackIds,
  onSelectTrack,
}: {
  tracks: MapTrack[];
  selectedTrackId: Id<"tracks"> | null;
  highlightedTrackIds: Id<"tracks">[];
  onSelectTrack: (track: MapTrack) => void;
}) {
  const [hoveredTrackId, setHoveredTrackId] = useState<Id<"tracks"> | null>(
    null,
  );

  const projectedTracks = useMemo(() => {
    return projectEmbeddingsToPlane(tracks);
  }, [tracks]);

  const highlightedSet = useMemo(
    () => new Set(highlightedTrackIds),
    [highlightedTrackIds],
  );

  const selectedTrack = projectedTracks.find(
    (t) => t._id === selectedTrackId,
  );
  const hoveredTrack = projectedTracks.find((t) => t._id === hoveredTrackId);
  const previewTrack =
    hoveredTrack ?? selectedTrack ?? projectedTracks[0] ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 tracking-tight text-text-primary text-balance">
            Embedding Map
          </h1>
          <p className="mt-1 text-sm text-text-secondary text-pretty">
            PCA projection of audio vectors. Click a point to explore neighbors.
          </p>
        </div>
        <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs tabular-nums text-text-tertiary">
          {tracks.length} tracks
        </span>
      </div>

      {projectedTracks.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-24 text-sm text-text-tertiary">
          Tracks appear here once embeddings finish.
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
            <svg
              aria-label="Embedding map"
              className="block h-[420px] w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              role="img"
            >
              {projectedTracks.map((track) => {
                const cx = 8 + track.x * 84;
                const cy = 8 + (1 - track.y) * 84;
                const isSelected = track._id === selectedTrackId;
                const isHighlighted = highlightedSet.has(track._id);
                const isHovered = track._id === hoveredTrackId;

                return (
                  <g key={track._id}>
                    {(isSelected || isHighlighted) && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 4.5 : 3}
                        fill={
                          isSelected
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(255,255,255,0.04)"
                        }
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={
                        isSelected
                          ? 2.2
                          : isHighlighted
                            ? 1.8
                            : isHovered
                              ? 1.6
                              : 1.1
                      }
                      fill={
                        isSelected
                          ? "#e5e5e5"
                          : isHighlighted
                            ? "#a3a3a3"
                            : isHovered
                              ? "#737373"
                              : "rgba(255,255,255,0.25)"
                      }
                      className="cursor-pointer transition-[fill,r] duration-150 ease-out"
                      onClick={() => onSelectTrack(track)}
                      onMouseEnter={() => setHoveredTrackId(track._id)}
                      onMouseLeave={() =>
                        setHoveredTrackId((cur) =>
                          cur === track._id ? null : cur,
                        )
                      }
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {previewTrack && (
            <div className="absolute bottom-3 right-3 flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-2/95 px-3.5 py-2.5 backdrop-blur-sm">
              <div className="min-w-0">
                <p className="truncate text-sm font-500 text-text-primary">
                  {previewTrack.title}
                </p>
                <p className="truncate text-xs text-text-tertiary">
                  {previewTrack.artist || "Unknown"} ·{" "}
                  {formatSeconds(previewTrack.durationSec)}
                </p>
              </div>
              <span
                className={cn(
                  "ml-2 shrink-0 rounded-md px-2 py-0.5 text-xs font-500",
                  selectedTrackId === previewTrack._id
                    ? "bg-accent-muted text-text-primary"
                    : highlightedSet.has(previewTrack._id)
                      ? "bg-surface-3 text-text-secondary"
                      : "bg-surface-3 text-text-tertiary",
                )}
              >
                {selectedTrackId === previewTrack._id
                  ? "selected"
                  : highlightedSet.has(previewTrack._id)
                    ? "match"
                    : "hover"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
