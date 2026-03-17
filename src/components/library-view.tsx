"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/cn";
import { formatBpm, formatSeconds } from "@/lib/format";
import { UploadPanel } from "./upload-panel";
import { TrackTable, type TrackSummary } from "./track-table";
import type { Id } from "../../convex/_generated/dataModel";
import { AudioPreviewButton } from "./audio-preview-button";

export function LibraryView({
  tracks,
  isPending,
  hydratingTrackIds,
  onExploreOnMap,
}: {
  tracks: TrackSummary[] | undefined;
  isPending: boolean;
  hydratingTrackIds: ReadonlySet<Id<"tracks">>;
  onExploreOnMap: (trackId: Id<"tracks">) => void;
}) {
  const deleteTrack = useMutation(api.tracks.deleteTrack);
  const [selectedTrackId, setSelectedTrackId] = useState<Id<"tracks"> | null>(
    null,
  );
  const [deletingTrackId, setDeletingTrackId] = useState<Id<"tracks"> | null>(
    null,
  );

  const selectedTrack = selectedTrackId
    ? tracks?.find((track) => track._id === selectedTrackId) ?? null
    : null;
  const resolvedSelectedTrackId = selectedTrack?._id ?? null;
  const isHydratingSelectedTrack =
    selectedTrack !== null && hydratingTrackIds.has(selectedTrack._id);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-text-primary text-balance">
          Library
        </h1>
        <p className="mt-1 text-sm text-text-secondary text-pretty">
          Ingest audio, transcode standardized MP3 excerpts, queue for embedding.
        </p>
      </div>

      <UploadPanel tracks={tracks} />

      <div className="sticky top-4 z-10 rounded-2xl border border-border bg-surface-1 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
        {selectedTrack ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-text-tertiary">
                  Track Details
                </p>
                <h3 className="mt-1 font-display text-xl font-600 text-text-primary">
                  {selectedTrack.title}
                </h3>
                <p className="mt-1 text-sm text-text-tertiary">
                  {selectedTrack.artist || selectedTrack.sourceFileName}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AudioPreviewButton src={selectedTrack.excerptAudioUrl} />
                <button
                  type="button"
                  disabled={selectedTrack.status !== "ready" || isPending}
                  onClick={() => onExploreOnMap(selectedTrack._id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg bg-accent-muted px-3 py-1.5 text-xs font-500 text-accent transition-colors duration-100",
                    "hover:bg-accent-strong active:scale-[0.97] active:transition-transform active:duration-75",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  Explore on Map
                </button>
                <button
                  type="button"
                  disabled={deletingTrackId === selectedTrack._id}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Delete "${selectedTrack.title}" from the library?`,
                      )
                    ) {
                      return;
                    }

                    setDeletingTrackId(selectedTrack._id);
                    void deleteTrack({ trackId: selectedTrack._id })
                      .then(() => {
                        setSelectedTrackId(null);
                      })
                      .finally(() => {
                        setDeletingTrackId((current) =>
                          current === selectedTrack._id ? null : current,
                        );
                      });
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-500 text-danger transition-colors duration-100",
                    "hover:bg-danger-muted active:scale-[0.97] active:transition-transform active:duration-75",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <DetailStat
                label="BPM"
                value={
                  isHydratingSelectedTrack &&
                  selectedTrack.bpmCheckedAt === undefined
                    ? "Reading metadata..."
                    : formatBpm(selectedTrack.bpm) ?? "Not tagged"
                }
              />
              <DetailStat
                label="Duration"
                value={formatSeconds(selectedTrack.durationSec)}
              />
              <DetailStat
                label="Analyzed"
                value={`${formatSeconds(selectedTrack.excerptStartSec)}-${formatSeconds(
                  selectedTrack.excerptStartSec + selectedTrack.excerptDurationSec,
                )}`}
              />
              <DetailStat label="Status" value={selectedTrack.status} />
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-text-tertiary">
                Crate Note
              </p>
              <p className="text-sm leading-6 text-text-secondary">
                {selectedTrack.description
                  ? selectedTrack.description
                  : isHydratingSelectedTrack
                    ? "Listening to the excerpt and generating a crate note..."
                    : selectedTrack.descriptionError
                      ? "Crate note unavailable for this track."
                      : "Crate note pending."}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-text-tertiary">
                Source File
              </p>
              <p className="text-sm text-text-secondary">
                {selectedTrack.sourceFileName}
              </p>
            </div>

          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wider text-text-tertiary">
              Track Details
            </p>
            <p className="text-sm text-text-secondary">
              Click any row in the library to inspect BPM, crate note, preview,
              and source details without losing your place in the list.
            </p>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-600 text-text-primary">
          Tracks
        </h2>
        <TrackTable
          tracks={tracks}
          isPending={isPending}
          selectedTrackId={resolvedSelectedTrackId}
          onSelectTrack={setSelectedTrackId}
          onExploreOnMap={onExploreOnMap}
        />
      </div>
    </div>
  );
}

function DetailStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3.5 py-3">
      <p className="text-xs uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <p className="mt-1 text-sm font-500 text-text-primary">{value}</p>
    </div>
  );
}
