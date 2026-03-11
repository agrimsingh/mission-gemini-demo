"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { embedAudioBlob } from "./lib/gemini";

export const embedTrackExcerpt = internalAction({
  args: {
    trackId: v.id("tracks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.tracks.markEmbeddingRunning, {
      trackId: args.trackId,
    });

    try {
      const track = await ctx.runQuery(internal.tracks.getTrackForEmbedding, {
        trackId: args.trackId,
      });

      if (!track) {
        throw new Error("Track not found.");
      }

      const excerptBlob = await ctx.storage.get(track.excerptStorageId);
      if (!excerptBlob) {
        throw new Error("Excerpt audio blob not found in storage.");
      }

      const embedding = await embedAudioBlob(excerptBlob);

      await ctx.runMutation(internal.tracks.markEmbeddingReady, {
        trackId: args.trackId,
        embedding,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown embedding failure.";

      await ctx.runMutation(internal.tracks.markEmbeddingFailed, {
        trackId: args.trackId,
        error: message,
      });
    }

    return null;
  },
});
