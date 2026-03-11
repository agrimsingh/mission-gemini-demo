"use client";

import { useAction, useQuery } from "convex/react";
import { useMemo, useState, useTransition } from "react";
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

function ConnectedWorkspace() {
  const tracks = useQuery(api.tracks.listTracks, {}) as
    | TrackSummary[]
    | undefined;
  const mapTracks = useQuery(api.tracks.listReadyTracksForMap, {}) as
    | MapTrack[]
    | undefined;

  const searchByPrompt = useAction(api.search.searchByPrompt);
  const getSimilarTracks = useAction(api.search.getSimilarTracks);

  const [activeView, setActiveView] = useState<View>("library");
  const [prompt, setPrompt] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState<Id<"tracks"> | null>(
    null,
  );
  const [selectedTrackTitle, setSelectedTrackTitle] = useState<string | null>(
    null,
  );
  const [promptResults, setPromptResults] = useState<SearchMatch[]>([]);
  const [similarResults, setSimilarResults] = useState<SearchMatch[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const readyCount = useMemo(
    () => tracks?.filter((t) => t.status === "ready").length ?? 0,
    [tracks],
  );

  const promptMatchIds = useMemo(
    () => promptResults.map((r) => r._id),
    [promptResults],
  );

  function loadNeighbors(trackId: Id<"tracks">, trackTitle: string) {
    startTransition(async () => {
      setSearchError(null);
      try {
        const results = (await getSimilarTracks({
          trackId,
          limit: 6,
        })) as SearchMatch[];

        setSelectedTrackId(trackId);
        setSelectedTrackTitle(trackTitle);
        setSimilarResults(results);
        setActiveView("search");
      } catch (error) {
        setSearchError(
          error instanceof Error
            ? error.message
            : "Could not load similar tracks.",
        );
      }
    });
  }

  function handleSearch() {
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
  }

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
          onFindNeighbors={loadNeighbors}
        />
      )}
      {activeView === "map" && (
        <MapView
          tracks={mapTracks ?? EMPTY_MAP_TRACKS}
          selectedTrackId={selectedTrackId}
          highlightedTrackIds={promptMatchIds}
          onSelectTrack={(track) => loadNeighbors(track._id, track.title)}
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
          similarResults={similarResults}
          selectedTrackTitle={selectedTrackTitle}
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
