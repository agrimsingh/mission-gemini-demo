"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatBpm, formatSeconds } from "@/lib/format";
import { projectEmbeddingsToPlane, type ProjectedPoint } from "@/lib/pca";
import type { Id } from "../../convex/_generated/dataModel";
import type { MapTrack, TrackSummary } from "./track-table";
import { AudioPreviewButton } from "./audio-preview-button";

const NEIGHBOR_COUNT = 5;
const PADDING = 8;
const RANGE = 84;

function toSvg(x: number, y: number) {
  return { cx: PADDING + x * RANGE, cy: PADDING + (1 - y) * RANGE };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

type Neighbor = {
  track: ProjectedPoint<MapTrack>;
  score: number;
};

function findNeighbors(
  anchor: ProjectedPoint<MapTrack>,
  all: ProjectedPoint<MapTrack>[],
  k: number,
): Neighbor[] {
  if (k <= 0) {
    return [];
  }

  const topNeighbors: Neighbor[] = [];

  for (const track of all) {
    if (track._id === anchor._id) {
      continue;
    }

    const candidate = {
      track,
      score: cosineSimilarity(anchor.embedding, track.embedding),
    };

    let insertAt = topNeighbors.length;
    while (insertAt > 0 && topNeighbors[insertAt - 1]!.score < candidate.score) {
      insertAt -= 1;
    }

    if (insertAt >= k) {
      continue;
    }

    topNeighbors.splice(insertAt, 0, candidate);
    if (topNeighbors.length > k) {
      topNeighbors.pop();
    }
  }

  return topNeighbors;
}

export function MapView({
  tracks,
  trackSummaries,
  selectedTrackId,
  highlightedTrackIds,
  hydratingTrackIds,
  onSelectTrack,
}: {
  tracks: MapTrack[];
  trackSummaries: TrackSummary[];
  selectedTrackId: Id<"tracks"> | null;
  highlightedTrackIds: Id<"tracks">[];
  hydratingTrackIds: ReadonlySet<Id<"tracks">>;
  onSelectTrack: (track: MapTrack) => void;
}) {
  const [hoveredTrackId, setHoveredTrackId] = useState<Id<"tracks"> | null>(
    null,
  );

  const projectedTracks = useMemo(() => {
    return projectEmbeddingsToPlane(tracks);
  }, [tracks]);
  const projectedTrackById = useMemo(
    () => new Map(projectedTracks.map((track) => [track._id, track])),
    [projectedTracks],
  );

  const highlightedSet = useMemo(
    () => new Set(highlightedTrackIds),
    [highlightedTrackIds],
  );
  const trackSummaryById = useMemo(
    () => new Map(trackSummaries.map((track) => [track._id, track])),
    [trackSummaries],
  );

  const selectedTrack = selectedTrackId
    ? projectedTrackById.get(selectedTrackId) ?? null
    : null;
  const hoveredTrack = hoveredTrackId
    ? projectedTrackById.get(hoveredTrackId) ?? null
    : null;
  const previewTrack = selectedTrack ?? hoveredTrack ?? null;
  const previewTrackSummary = previewTrack
    ? trackSummaryById.get(previewTrack._id)
    : undefined;
  const isPreviewHydrating = previewTrack
    ? hydratingTrackIds.has(previewTrack._id)
    : false;

  const selectedNeighborLines = useMemo(() => {
    if (!selectedTrack || projectedTracks.length < 2) {
      return [];
    }

    return findNeighbors(selectedTrack, projectedTracks, NEIGHBOR_COUNT);
  }, [projectedTracks, selectedTrack]);

  const neighborIds = useMemo(
    () => new Set(selectedNeighborLines.map((n) => n.track._id)),
    [selectedNeighborLines],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 tracking-tight text-text-primary text-balance">
            Embedding Map
          </h1>
          <p className="mt-1 text-sm text-text-secondary text-pretty">
            PCA projection of audio vectors. Click a point to inspect it and see
            the nearest tracks without leaving the map.
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
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
            <svg
              aria-label="Embedding map"
              className="block h-[420px] w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              role="img"
            >
              <text
                x={PADDING + RANGE - 1}
                y={PADDING + RANGE - 1}
                textAnchor="end"
                className="fill-text-tertiary"
                style={{ fontSize: "2.2px", opacity: 0.5 }}
              >
                closer = more similar
              </text>

              {selectedTrack &&
                selectedNeighborLines.map((neighbor) => {
                  const from = toSvg(selectedTrack.x, selectedTrack.y);
                  const to = toSvg(neighbor.track.x, neighbor.track.y);
                  const opacity = Math.max(0.08, Math.min(0.6, (neighbor.score - 0.5) * 2));
                  const midX = (from.cx + to.cx) / 2;
                  const midY = (from.cy + to.cy) / 2;
                  return (
                    <g key={neighbor.track._id}>
                      <line
                        x1={from.cx}
                        y1={from.cy}
                        x2={to.cx}
                        y2={to.cy}
                        stroke="rgba(255,255,255,1)"
                        strokeOpacity={opacity}
                        strokeWidth={0.35}
                        strokeDasharray="0.6 0.4"
                      />
                      <text
                        x={midX}
                        y={midY - 0.8}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.55)"
                        style={{ fontSize: "2px" }}
                      >
                        {neighbor.score.toFixed(2)}
                      </text>
                    </g>
                  );
                })}

              {projectedTracks.map((track) => {
                const { cx, cy } = toSvg(track.x, track.y);
                const isSelected = track._id === selectedTrackId;
                const isHighlighted = highlightedSet.has(track._id);
                const isHovered = track._id === hoveredTrackId;
                const isSelectableNeighbor =
                  selectedTrack !== null && neighborIds.has(track._id);

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
                            : isHovered || isSelectableNeighbor
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
                              : isSelectableNeighbor
                                ? "#525252"
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

          {previewTrack ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-500 text-text-primary">
                    {previewTrack.title}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    {previewTrack.artist || "Unknown"} ·{" "}
                    {formatSeconds(previewTrack.durationSec)}
                    {previewTrackSummary?.bpm !== undefined
                      ? ` · ${formatBpm(previewTrackSummary.bpm)}`
                      : isPreviewHydrating &&
                          previewTrackSummary?.bpmCheckedAt === undefined
                        ? " · reading tempo..."
                      : ""}
                  </p>
                  {previewTrackSummary?.description ? (
                    <p className="mt-1 text-xs text-text-secondary">
                      {previewTrackSummary.description}
                    </p>
                  ) : isPreviewHydrating ? (
                    <p className="mt-1 text-xs text-text-tertiary">
                      Listening to the excerpt and generating a crate note...
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <AudioPreviewButton src={previewTrackSummary?.excerptAudioUrl} />
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
                        ? "prompt match"
                        : "hover"}
                  </span>
                </div>
              </div>

              {selectedNeighborLines.length > 0 ? (
                <div className="rounded-xl border border-border bg-surface-1 p-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-600 text-text-primary">
                      Nearest in Embedding Space
                    </h2>
                    <span className="ml-auto rounded-md bg-surface-2 px-2 py-0.5 text-xs tabular-nums text-text-tertiary">
                      {selectedNeighborLines.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Highest cosine-similarity matches to "{previewTrack.title}" in
                    the full embedding space.
                  </p>

                  <div className="mt-3 space-y-1.5">
                    {selectedNeighborLines.map((neighbor, index) => {
                      const neighborSummary = trackSummaryById.get(
                        neighbor.track._id,
                      );
                      const bpmLabel = formatBpm(neighborSummary?.bpm);
                      const isNeighborHydrating = hydratingTrackIds.has(
                        neighbor.track._id,
                      );

                      return (
                        <div
                          key={neighbor.track._id}
                          className="rounded-lg border border-border bg-surface-2 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-500 text-text-primary text-pretty">
                                {neighbor.track.title}
                              </p>
                              <p className="mt-0.5 text-sm text-text-tertiary">
                                {neighbor.track.artist || "Unknown"} ·{" "}
                                {formatSeconds(neighbor.track.durationSec)}
                                {bpmLabel
                                  ? ` · ${bpmLabel}`
                                  : isNeighborHydrating &&
                                      neighborSummary?.bpmCheckedAt === undefined
                                    ? " · reading tempo..."
                                    : ""}
                              </p>
                              {neighborSummary?.description ? (
                                <p className="mt-1 text-xs text-text-secondary">
                                  {neighborSummary.description}
                                </p>
                              ) : isNeighborHydrating ? (
                                <p className="mt-1 text-xs text-text-tertiary">
                                  Generating crate note...
                                </p>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-600 tabular-nums text-text-primary">
                                {neighbor.score.toFixed(4)}
                              </p>
                              <p className="text-xs text-text-tertiary">
                                #{index + 1}
                              </p>
                              <div className="mt-2 flex items-center justify-end gap-2">
                                <AudioPreviewButton
                                  src={neighborSummary?.excerptAudioUrl}
                                />
                                <button
                                  type="button"
                                  onClick={() => onSelectTrack(neighbor.track)}
                                  className="inline-flex items-center rounded-lg bg-accent-muted px-3 py-1.5 text-xs font-500 text-accent transition-colors duration-100 hover:bg-accent-strong active:scale-[0.97] active:transition-transform active:duration-75"
                                >
                                  Focus
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface-2 px-4 py-6 text-sm text-text-tertiary">
              Click a point to lock a track, inspect its crate note, and see the
              nearest neighbors right here on the map.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
