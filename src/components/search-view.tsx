"use client";

import { cn } from "@/lib/cn";
import { formatSeconds } from "@/lib/format";
import { describeSimilarity } from "@/lib/similarity";
import { Search, Sparkles, GitBranch, AlertCircle } from "lucide-react";
import type { SearchMatch } from "./demo-workspace";

export function SearchView({
  prompt,
  onPromptChange,
  onSearch,
  isPending,
  searchError,
  promptResults,
  similarResults,
  selectedTrackTitle,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSearch: () => void;
  isPending: boolean;
  searchError: string | null;
  promptResults: SearchMatch[];
  similarResults: SearchMatch[];
  selectedTrackTitle: string | null;
}) {
  const hasPromptResults = promptResults.length > 0;
  const hasNeighborResults = similarResults.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-text-primary text-balance">
          Search
        </h1>
        <p className="mt-1 text-sm text-text-secondary text-pretty">
          Describe a vibe and find matching tracks, or explore neighbors from the
          library.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-surface-1 py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
              placeholder="warm-up deep house before peak time..."
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && prompt.trim().length > 0 && !isPending)
                  onSearch();
              }}
            />
          </div>
          <button
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-600 text-surface-0 transition-colors duration-100",
              "hover:bg-accent/80 active:scale-[0.97] active:transition-transform active:duration-75",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
            disabled={isPending || prompt.trim().length === 0}
            onClick={onSearch}
          >
            <Sparkles className="size-4" />
            Search
          </button>
        </div>

        {searchError && (
          <div className="flex items-start gap-2 rounded-lg bg-danger-muted px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {searchError}
          </div>
        )}
      </div>

      {hasPromptResults && (
        <ResultSection
          icon={<Sparkles className="size-4 text-text-secondary" />}
          title="Prompt Matches"
          results={promptResults}
        />
      )}

      {hasNeighborResults && (
        <ResultSection
          icon={<GitBranch className="size-4 text-text-secondary" />}
          title={`Neighbors of "${selectedTrackTitle}"`}
          results={similarResults}
        />
      )}

      {!hasPromptResults && !hasNeighborResults && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-20 text-center">
          <Search className="size-7 text-text-tertiary/40" />
          <p className="text-sm text-text-tertiary">
            Run a vibe prompt or select a track from the library to find
            neighbors.
          </p>
        </div>
      )}
    </div>
  );
}

function ResultSection({
  icon,
  title,
  results,
}: {
  icon: React.ReactNode;
  title: string;
  results: SearchMatch[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-sm font-600 text-text-primary">
          {title}
        </h2>
        <span className="ml-auto rounded-md bg-surface-2 px-2 py-0.5 text-xs tabular-nums text-text-tertiary">
          {results.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {results.map((result) => (
          <div
            key={result._id}
            className="rounded-lg border border-border bg-surface-1 px-4 py-3 transition-colors duration-100 hover:bg-surface-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-500 text-text-primary text-pretty">
                  {result.title}
                </p>
                <p className="mt-0.5 text-sm text-text-tertiary">
                  {result.artist || "Unknown"} ·{" "}
                  {formatSeconds(result.durationSec)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-600 tabular-nums text-text-primary">
                  {result.score.toFixed(4)}
                </p>
                <p className="text-xs text-text-tertiary">
                  {describeSimilarity(result.score)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
