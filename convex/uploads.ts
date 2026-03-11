import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createTrack = mutation({
  args: {
    title: v.string(),
    artist: v.optional(v.string()),
    sourceFileName: v.string(),
    originalMimeType: v.string(),
    originalStorageId: v.id("_storage"),
    excerptStorageId: v.id("_storage"),
    durationSec: v.float64(),
    excerptStartSec: v.float64(),
    excerptDurationSec: v.float64(),
  },
  returns: v.id("tracks"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const trackId = await ctx.db.insert("tracks", {
      title: args.title,
      artist: args.artist,
      sourceFileName: args.sourceFileName,
      originalMimeType: args.originalMimeType,
      originalStorageId: args.originalStorageId,
      excerptStorageId: args.excerptStorageId,
      durationSec: args.durationSec,
      excerptStartSec: args.excerptStartSec,
      excerptDurationSec: args.excerptDurationSec,
      status: "uploaded",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("embeddingJobs", {
      trackId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.embeddings.embedTrackExcerpt, {
      trackId,
    });

    return trackId;
  },
});
