"use client";

import { cn } from "@/lib/cn";
import { formatBpm, formatSeconds } from "@/lib/format";
import {
  Search,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Map,
} from "lucide-react";
import type { SearchMatch } from "./demo-workspace";
import { AudioPreviewButton } from "./audio-preview-button";

const EXAMPLE_PROMPTS = [
  "warm-up with rolling low-end and patient energy before peak time",
  "metallic hats, filtered stabs, and tension that feels late-night not euphoric",
  "vocal-led crossover moment that still keeps pressure on the floor",
  "after-hours hypnotic, spacious, and less obvious than the main-room stuff",
];

export function SearchView({
  prompt,
  onPromptChange,
  onSearch,
  onTryExample,
  onShowOnMap,
  isPending,
  searchError,
  lastSubmittedPrompt,
  promptResults,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSearch: () => void;
  onTryExample: (value: string) => void;
  onShowOnMap: () => void;
  isPending: boolean;
  searchError: string | null;
  lastSubmittedPrompt: string | null;
  promptResults: SearchMatch[];
}) {
  const hasPromptResults = promptResults.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-text-primary text-balance">
          Vibe Search
        </h1>
        <p className="mt-1 text-sm text-text-secondary text-pretty">
          Describe a vibe and pull back the closest matching tracks.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-surface-2 p-2">
            <Sparkles className="size-4 text-text-secondary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-600 text-text-primary">
              Experimental text-to-audio retrieval
            </p>
            <p className="text-sm leading-6 text-text-secondary">
              Your words get embedded with Gemini as a retrieval query, then
              matched directly against the stored audio embeddings for each
              excerpt. This is not keyword search, tag search, or description
              search. It is pure word-to-audio vector retrieval.
            </p>
          </div>
        </div>
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

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((examplePrompt) => (
            <button
              key={examplePrompt}
              type="button"
              disabled={isPending}
              onClick={() => onTryExample(examplePrompt)}
              className={cn(
                "rounded-full border border-border bg-surface-1 px-3 py-1.5 text-left text-xs text-text-secondary transition-colors duration-100",
                "hover:bg-surface-2 active:scale-[0.97] active:transition-transform active:duration-75",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              {examplePrompt}
            </button>
          ))}
        </div>

        {searchError && (
          <div className="flex items-start gap-2 rounded-lg bg-danger-muted px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {searchError}
          </div>
        )}
      </div>

      {isPending && (
        <SearchingState prompt={lastSubmittedPrompt ?? prompt} />
      )}

      {!isPending && hasPromptResults && (
        <ResultSection
          icon={<Sparkles className="size-4 text-text-secondary" />}
          title={
            lastSubmittedPrompt
              ? `Prompt Matches for "${lastSubmittedPrompt}"`
              : "Prompt Matches"
          }
          results={promptResults}
          onShowOnMap={onShowOnMap}
        />
      )}

      {!isPending && !hasPromptResults && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-20 text-center">
          <Search className="size-7 text-text-tertiary/40" />
          <p className="text-sm text-text-tertiary">
            Describe a vibe to find matching tracks.
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
  onShowOnMap,
}: {
  icon: React.ReactNode;
  title: string;
  results: SearchMatch[];
  onShowOnMap: () => void;
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

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
        <p className="text-sm text-text-secondary">
          Higher score means a closer embedding match between your prompt and the
          analyzed audio excerpts.
        </p>
        <button
          type="button"
          onClick={onShowOnMap}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent-muted px-3 py-1.5 text-xs font-500 text-accent transition-colors duration-100 hover:bg-accent-strong active:scale-[0.97] active:transition-transform active:duration-75"
        >
          <Map className="size-3.5" />
          <span>Show on Map</span>
        </button>
      </div>

      <div className="space-y-1.5">
        {results.map((result, index) => (
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
                  {result.bpm !== undefined ? ` · ${formatBpm(result.bpm)}` : ""}
                </p>
                {result.description ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    {result.description}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-600 tabular-nums text-text-primary">
                  {result.score.toFixed(4)}
                </p>
                <p className="text-xs text-text-tertiary">#{index + 1}</p>
                <div className="mt-2 flex justify-end">
                  <AudioPreviewButton src={result.excerptAudioUrl} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchingState({ prompt }: { prompt: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3">
        <div className="mt-0.5 rounded-lg bg-surface-2 p-2">
          <Search className="size-4 animate-pulse text-text-secondary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-600 text-text-primary">
            Searching audio embedding space
          </p>
          <p className="text-sm text-text-secondary">
            Embedding{" "}
            <span className="font-500 text-text-primary">
              "{prompt.trim() || "your prompt"}"
            </span>{" "}
            and matching it against ready track excerpts.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-surface-1 px-4 py-3"
          >
            <div className="animate-pulse space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/5 rounded bg-surface-3" />
                  <div className="h-3 w-1/3 rounded bg-surface-3" />
                  <div className="h-3 w-4/5 rounded bg-surface-3" />
                </div>
                <div className="w-16 space-y-2">
                  <div className="ml-auto h-4 w-12 rounded bg-surface-3" />
                  <div className="ml-auto h-3 w-6 rounded bg-surface-3" />
                </div>
              </div>
              <div className="h-7 w-20 rounded bg-surface-3" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <ArrowRight className="size-3.5" />
        Not doing keyword matching. This is prompt embedding {"->"} audio
        embedding
        retrieval.
      </div>
    </div>
  );
}
