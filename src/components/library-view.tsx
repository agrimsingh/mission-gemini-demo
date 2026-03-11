"use client";

import { UploadPanel } from "./upload-panel";
import { TrackTable, type TrackSummary } from "./track-table";
import type { Id } from "../../convex/_generated/dataModel";

export function LibraryView({
  tracks,
  isPending,
  onFindNeighbors,
}: {
  tracks: TrackSummary[] | undefined;
  isPending: boolean;
  onFindNeighbors: (trackId: Id<"tracks">, title: string) => void;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-text-primary text-balance">
          Library
        </h1>
        <p className="mt-1 text-sm text-text-secondary text-pretty">
          Ingest audio, extract excerpts, queue for embedding.
        </p>
      </div>

      <UploadPanel />

      <div>
        <h2 className="mb-4 font-display text-lg font-600 text-text-primary">
          Tracks
        </h2>
        <TrackTable
          tracks={tracks}
          isPending={isPending}
          onFindNeighbors={onFindNeighbors}
        />
      </div>
    </div>
  );
}
