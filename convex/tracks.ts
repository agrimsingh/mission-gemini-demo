import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

const trackStatusValidator = v.union(
  v.literal("uploaded"),
  v.literal("embedding"),
  v.literal("ready"),
  v.literal("failed"),
);

const trackSummaryValidator = v.object({
  _id: v.id("tracks"),
  title: v.string(),
  artist: v.optional(v.string()),
  sourceFileName: v.string(),
  durationSec: v.float64(),
  excerptStartSec: v.float64(),
  excerptDurationSec: v.float64(),
  status: trackStatusValidator,
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const trackMapValidator = v.object({
  _id: v.id("tracks"),
  title: v.string(),
  artist: v.optional(v.string()),
  sourceFileName: v.string(),
  durationSec: v.float64(),
  excerptStartSec: v.float64(),
  excerptDurationSec: v.float64(),
  embedding: v.array(v.float64()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const storedTrackValidator = v.object({
  _id: v.id("tracks"),
  _creationTime: v.number(),
  title: v.string(),
  artist: v.optional(v.string()),
  sourceFileName: v.string(),
  originalMimeType: v.string(),
  originalStorageId: v.id("_storage"),
  excerptStorageId: v.id("_storage"),
  durationSec: v.float64(),
  excerptStartSec: v.float64(),
  excerptDurationSec: v.float64(),
  embedding: v.optional(v.array(v.float64())),
  projection: v.optional(
    v.object({
      x: v.float64(),
      y: v.float64(),
    }),
  ),
  status: trackStatusValidator,
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listTracks = query({
  args: {},
  returns: v.array(trackSummaryValidator),
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    return tracks.map((track) => ({
      _id: track._id,
      title: track.title,
      artist: track.artist,
      sourceFileName: track.sourceFileName,
      durationSec: track.durationSec,
      excerptStartSec: track.excerptStartSec,
      excerptDurationSec: track.excerptDurationSec,
      status: track.status,
      error: track.error,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    }));
  },
});

export const listReadyTracksForMap = query({
  args: {},
  returns: v.array(trackMapValidator),
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_status", (q) => q.eq("status", "ready"))
      .collect();

    return tracks.flatMap((track) => {
      if (!track.embedding) {
        return [];
      }

      return [
        {
          _id: track._id,
          title: track.title,
          artist: track.artist,
          sourceFileName: track.sourceFileName,
          durationSec: track.durationSec,
          excerptStartSec: track.excerptStartSec,
          excerptDurationSec: track.excerptDurationSec,
          embedding: track.embedding,
          createdAt: track.createdAt,
          updatedAt: track.updatedAt,
        },
      ];
    });
  },
});

export const getTrackForEmbedding = internalQuery({
  args: {
    trackId: v.id("tracks"),
  },
  returns: v.union(storedTrackValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.trackId);
  },
});

export const getTracksByIds = internalQuery({
  args: {
    trackIds: v.array(v.id("tracks")),
  },
  returns: v.array(trackSummaryValidator),
  handler: async (ctx, args) => {
    const tracks = await Promise.all(
      args.trackIds.map(async (trackId) => {
        return await ctx.db.get(trackId);
      }),
    );

    return tracks.flatMap((track) => {
      if (!track) {
        return [];
      }

      return [
        {
          _id: track._id,
          title: track.title,
          artist: track.artist,
          sourceFileName: track.sourceFileName,
          durationSec: track.durationSec,
          excerptStartSec: track.excerptStartSec,
          excerptDurationSec: track.excerptDurationSec,
          status: track.status,
          error: track.error,
          createdAt: track.createdAt,
          updatedAt: track.updatedAt,
        },
      ];
    });
  },
});

export const markEmbeddingRunning = internalMutation({
  args: {
    trackId: v.id("tracks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      return null;
    }

    await ctx.db.patch(args.trackId, {
      status: "embedding",
      error: undefined,
      updatedAt: Date.now(),
    });

    const job = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_trackId", (q) => q.eq("trackId", args.trackId))
      .unique();

    if (job) {
      await ctx.db.patch(job._id, {
        status: "running",
        error: undefined,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

export const markEmbeddingReady = internalMutation({
  args: {
    trackId: v.id("tracks"),
    embedding: v.array(v.float64()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      return null;
    }

    await ctx.db.patch(args.trackId, {
      embedding: args.embedding,
      status: "ready",
      error: undefined,
      updatedAt: Date.now(),
    });

    const job = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_trackId", (q) => q.eq("trackId", args.trackId))
      .unique();

    if (job) {
      await ctx.db.patch(job._id, {
        status: "completed",
        error: undefined,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

export const markEmbeddingFailed = internalMutation({
  args: {
    trackId: v.id("tracks"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      return null;
    }

    await ctx.db.patch(args.trackId, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });

    const job = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_trackId", (q) => q.eq("trackId", args.trackId))
      .unique();

    if (job) {
      await ctx.db.patch(job._id, {
        status: "failed",
        error: args.error,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
