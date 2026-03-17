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
    sourceFingerprint: v.string(),
    sourceFileName: v.string(),
    bpm: v.optional(v.float64()),
    originalMimeType: v.string(),
    excerptMimeType: v.string(),
    originalStorageId: v.id("_storage"),
    excerptStorageId: v.id("_storage"),
    durationSec: v.float64(),
    excerptStartSec: v.float64(),
    excerptDurationSec: v.float64(),
  },
  returns: v.object({
    trackId: v.id("tracks"),
    deduped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existingTrack = await ctx.db
      .query("tracks")
      .withIndex("by_sourceFingerprint", (q) =>
        q.eq("sourceFingerprint", args.sourceFingerprint),
      )
      .unique();

    if (existingTrack) {
      await Promise.allSettled([
        ctx.storage.delete(args.originalStorageId),
        ctx.storage.delete(args.excerptStorageId),
      ]);

      return {
        trackId: existingTrack._id,
        deduped: true,
      };
    }

    const now = Date.now();
    const trackId = await ctx.db.insert("tracks", {
      title: args.title,
      artist: args.artist,
      sourceFingerprint: args.sourceFingerprint,
      sourceFileName: args.sourceFileName,
      bpm: args.bpm,
      bpmCheckedAt: now,
      originalMimeType: args.originalMimeType,
      excerptMimeType: args.excerptMimeType,
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
    await ctx.scheduler.runAfter(0, internal.descriptions.describeTrackExcerpt, {
      trackId,
    });

    return {
      trackId,
      deduped: false,
    };
  },
});
