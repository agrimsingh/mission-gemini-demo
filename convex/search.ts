"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { embedTextQuery } from "./lib/gemini";

type SearchableTrack = {
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

type SearchableTrackWithEmbedding = SearchableTrack & {
  embedding?: number[];
};

const matchValidator = v.object({
  _id: v.id("tracks"),
  title: v.string(),
  artist: v.optional(v.string()),
  sourceFileName: v.string(),
  durationSec: v.float64(),
  excerptStartSec: v.float64(),
  excerptDurationSec: v.float64(),
  status: v.union(
    v.literal("uploaded"),
    v.literal("embedding"),
    v.literal("ready"),
    v.literal("failed"),
  ),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  score: v.float64(),
});

function clampLimit(limit: number | undefined): number {
  if (!limit) {
    return 8;
  }

  return Math.max(1, Math.min(limit, 24));
}

export const searchByPrompt = action({
  args: {
    prompt: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(matchValidator),
  handler: async (ctx, args) => {
    const vector = await embedTextQuery(args.prompt);
    const matches = await ctx.vectorSearch("tracks", "by_embedding", {
      vector,
      limit: clampLimit(args.limit),
      filter: (q) => q.eq("status", "ready"),
    });

    const orderedTrackIds = matches.map((match) => match._id);
    const tracks = (await ctx.runQuery(internal.tracks.getTracksByIds, {
      trackIds: orderedTrackIds,
    })) as SearchableTrack[];
    const trackMap = new Map(tracks.map((track: SearchableTrack) => [track._id, track]));
    const results: Array<SearchableTrack & { score: number }> = [];

    for (const match of matches) {
      const track = trackMap.get(match._id);
      if (!track) {
        continue;
      }

      results.push({
        ...track,
        score: match._score,
      });
    }

    return results;
  },
});

export const getSimilarTracks = action({
  args: {
    trackId: v.id("tracks"),
    limit: v.optional(v.number()),
  },
  returns: v.array(matchValidator),
  handler: async (ctx, args) => {
    const track = (await ctx.runQuery(internal.tracks.getTrackForEmbedding, {
      trackId: args.trackId,
    })) as SearchableTrackWithEmbedding | null;

    if (!track) {
      throw new Error("Track not found.");
    }

    if (!track.embedding) {
      throw new Error("Track embedding is not ready yet.");
    }

    const matches = await ctx.vectorSearch("tracks", "by_embedding", {
      vector: track.embedding,
      limit: clampLimit((args.limit ?? 8) + 1),
      filter: (q) => q.eq("status", "ready"),
    });

    const filteredMatches = matches.filter((match) => match._id !== args.trackId);
    const orderedTrackIds = filteredMatches.map((match) => match._id);
    const tracks = (await ctx.runQuery(internal.tracks.getTracksByIds, {
      trackIds: orderedTrackIds,
    })) as SearchableTrack[];
    const trackMap = new Map(tracks.map((item: SearchableTrack) => [item._id, item]));
    const results: Array<SearchableTrack & { score: number }> = [];

    for (const match of filteredMatches) {
      const matchedTrack = trackMap.get(match._id);
      if (!matchedTrack) {
        continue;
      }

      results.push({
        ...matchedTrack,
        score: match._score,
      });
    }

    return results;
  },
});
