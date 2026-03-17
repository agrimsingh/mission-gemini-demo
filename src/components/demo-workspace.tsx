"use client";

import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Providers } from "./providers";
import { AppShell } from "./app-shell";
import { LibraryView } from "./library-view";
import { MapView } from "./map-view";
import { SearchView } from "./search-view";
import type { View } from "./sidebar";
import type { TrackSummary, MapTrack } from "./track-table";

export type SearchMatch = TrackSummary & { score: number };

const EMPTY_MAP_TRACKS: MapTrack[] = [];
const EMPTY_HYDRATING_TRACK_IDS: ReadonlySet<Id<"tracks">> = new Set();

function ConnectedWorkspace() {
  const tracks = useQuery(api.tracks.listTracks, {}) as
    | TrackSummary[]
    | undefined;
  const mapTracks = useQuery(api.tracks.listReadyTracksForMap, {}) as
    | MapTrack[]
    | undefined;

  const ensureTrackDetails = useAction(api.descriptions.ensureTrackDetails);
  const searchByPrompt = useAction(api.search.searchByPrompt);

  const [activeView, setActiveView] = useState<View>("library");
  const [prompt, setPrompt] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState<Id<"tracks"> | null>(
    null,
  );
  const [promptResults, setPromptResults] = useState<SearchMatch[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hydratingTrackIds, setHydratingTrackIds] = useState<
    ReadonlySet<Id<"tracks">>
  >(() => EMPTY_HYDRATING_TRACK_IDS);
  const [isPending, startTransition] = useTransition();
  const hydratingTrackIdsRef = useRef<Set<Id<"tracks">>>(new Set());

  const readyCount = tracks?.filter((track) => track.status === "ready").length ?? 0;
  const promptMatchIds = promptResults.map((result) => result._id);

  useEffect(() => {
    if (!tracks || tracks.length === 0) {
      return;
    }

    const nextBatch = tracks
      .filter(
        (track) =>
          track.status === "ready" &&
          (track.bpmCheckedAt === undefined ||
            (!track.description && !track.descriptionError)) &&
          !hydratingTrackIdsRef.current.has(track._id),
      )
      .slice(0, 2);

    if (nextBatch.length === 0) {
      return;
    }

    const nextIds = nextBatch.map((track) => track._id);
    nextIds.forEach((trackId) => hydratingTrackIdsRef.current.add(trackId));
    setHydratingTrackIds((current) => {
      const next = new Set(current);
      nextIds.forEach((trackId) => next.add(trackId));
      return next;
    });

    void Promise.allSettled(
      nextBatch.map(async (track) => {
        await ensureTrackDetails({ trackId: track._id }).catch(() => undefined);
      }),
    ).finally(() => {
      nextIds.forEach((trackId) => hydratingTrackIdsRef.current.delete(trackId));
      setHydratingTrackIds((current) => {
        if (current.size === 0) {
          return current;
        }

        const next = new Set(current);
        nextIds.forEach((trackId) => next.delete(trackId));
        return next.size === 0 ? EMPTY_HYDRATING_TRACK_IDS : next;
      });
    });
  }, [ensureTrackDetails, tracks]);

  const openTrackOnMap = useCallback((trackId: Id<"tracks">) => {
    setSelectedTrackId(trackId);
    setActiveView("map");
  }, []);

  const selectTrackOnMap = useCallback((track: MapTrack) => {
    setSelectedTrackId(track._id);
  }, []);

  const handleSearch = useCallback(() => {
    startTransition(async () => {
      setSearchError(null);
      try {
        const results = (await searchByPrompt({
          prompt: prompt.trim(),
          limit: 6,
        })) as SearchMatch[];

        setPromptResults(results);
        if (results[0]) setSelectedTrackId(results[0]._id);
      } catch (error) {
        setSearchError(
          error instanceof Error ? error.message : "Prompt search failed.",
        );
      }
    });
  }, [prompt, searchByPrompt]);

  return (
    <AppShell
      activeView={activeView}
      onViewChange={setActiveView}
      readyCount={readyCount}
    >
      {activeView === "library" && (
        <LibraryView
          tracks={tracks}
          isPending={isPending}
          hydratingTrackIds={hydratingTrackIds}
          onExploreOnMap={openTrackOnMap}
        />
      )}
      {activeView === "map" && (
        <MapView
          tracks={mapTracks ?? EMPTY_MAP_TRACKS}
          trackSummaries={tracks ?? []}
          selectedTrackId={selectedTrackId}
          highlightedTrackIds={promptMatchIds}
          hydratingTrackIds={hydratingTrackIds}
          onSelectTrack={selectTrackOnMap}
        />
      )}
      {activeView === "search" && (
        <SearchView
          prompt={prompt}
          onPromptChange={setPrompt}
          onSearch={handleSearch}
          isPending={isPending}
          searchError={searchError}
          promptResults={promptResults}
        />
      )}
    </AppShell>
  );
}

function SetupPanel() {
  return (
    <div className="flex h-dvh items-center justify-center bg-surface-0 px-6">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-accent-muted">
          <span className="text-2xl">🎵</span>
        </div>
        <div>
          <h1 className="font-display text-3xl font-700 tracking-tight text-text-primary text-balance">
            Almost there
          </h1>
          <p className="mt-3 text-text-secondary text-pretty">
            Add <code className="rounded bg-surface-3 px-1.5 py-0.5 text-sm text-accent">NEXT_PUBLIC_CONVEX_URL</code> and{" "}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 text-sm text-accent">GEMINI_API_KEY</code> to{" "}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 text-sm text-accent">.env.local</code>, then
            run <code className="rounded bg-surface-3 px-1.5 py-0.5 text-sm text-accent">npx convex dev</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DemoWorkspace() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) return <SetupPanel />;

  return (
    <Providers>
      <ConnectedWorkspace />
    </Providers>
  );
}
