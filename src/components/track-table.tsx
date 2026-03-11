"use client";

import { cn } from "@/lib/cn";
import { formatSeconds } from "@/lib/format";
import { ArrowRight } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

export type TrackSummary = {
  _id: Id<"tracks">;
  title: string;
  artist?: string;
  sourceFileName: string;
  durationSec: number;
  excerptStartSec: number;
  excerptDurationSec: number;
  status: "uploaded" | "embedding" | "ready" | "failed";
  error?: string;
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

export function TrackTable({
  tracks,
  isPending,
  onFindNeighbors,
}: {
  tracks: TrackSummary[] | undefined;
  isPending: boolean;
  onFindNeighbors: (trackId: Id<"tracks">, title: string) => void;
}) {
  if (!tracks) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-border py-16 text-text-tertiary">
        Loading track library…
      </div>
    );
  }

  if (tracks.length === 0) {
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
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-text-tertiary">
              Track
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-text-tertiary sm:table-cell">
              Duration
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-text-tertiary md:table-cell">
              Analyzed
            </th>
            <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-text-tertiary">
              Status
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => (
            <tr
              key={track._id}
              className="group border-b border-border last:border-b-0 transition-colors duration-100 hover:bg-surface-3"
            >
              <td className="px-4 py-3">
                <p className="font-500 text-text-primary text-pretty">
                  {track.title}
                </p>
                <p className="mt-0.5 text-sm text-text-tertiary">
                  {track.artist || track.sourceFileName}
                </p>
                {track.error && (
                  <p className="mt-1 text-xs text-danger">{track.error}</p>
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
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-500 capitalize",
                    STATUS_STYLES[track.status],
                  )}
                >
                  {track.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  disabled={track.status !== "ready" || isPending}
                  onClick={() => onFindNeighbors(track._id, track.title)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-500 transition-colors duration-100",
                    "active:scale-[0.97] active:transition-transform active:duration-75",
                    track.status === "ready"
                      ? "bg-accent-muted text-accent hover:bg-accent-strong"
                      : "cursor-not-allowed text-text-tertiary opacity-40",
                  )}
                  aria-label={`Find neighbors for ${track.title}`}
                >
                  <span className="hidden sm:inline">Neighbors</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
