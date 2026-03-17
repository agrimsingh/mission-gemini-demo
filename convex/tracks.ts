import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
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
  bpm: v.optional(v.float64()),
  bpmCheckedAt: v.optional(v.number()),
  excerptMimeType: v.string(),
  excerptAudioUrl: v.optional(v.string()),
  durationSec: v.float64(),
  excerptStartSec: v.float64(),
  excerptDurationSec: v.float64(),
  status: trackStatusValidator,
  error: v.optional(v.string()),
  description: v.optional(v.string()),
  descriptionError: v.optional(v.string()),
  embeddingStartedAt: v.optional(v.number()),
  embeddingCompletedAt: v.optional(v.number()),
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
  sourceFingerprint: v.optional(v.string()),
  sourceFileName: v.string(),
  bpm: v.optional(v.float64()),
  bpmCheckedAt: v.optional(v.number()),
  originalMimeType: v.string(),
  excerptMimeType: v.string(),
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
  description: v.optional(v.string()),
  descriptionError: v.optional(v.string()),
  embeddingStartedAt: v.optional(v.number()),
  embeddingCompletedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const maintenanceTrackValidator = v.object({
  _id: v.id("tracks"),
  title: v.string(),
  artist: v.optional(v.string()),
  sourceFingerprint: v.optional(v.string()),
  sourceFileName: v.string(),
  bpmCheckedAt: v.optional(v.number()),
  originalStorageId: v.id("_storage"),
  excerptStorageId: v.id("_storage"),
  status: trackStatusValidator,
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

    return await Promise.all(
      tracks.map(async (track) => ({
        _id: track._id,
        title: track.title,
        artist: track.artist,
        sourceFileName: track.sourceFileName,
        bpm: track.bpm,
        bpmCheckedAt: track.bpmCheckedAt,
        excerptMimeType: track.excerptMimeType,
        excerptAudioUrl:
          (await ctx.storage.getUrl(track.excerptStorageId)) ?? undefined,
        durationSec: track.durationSec,
        excerptStartSec: track.excerptStartSec,
        excerptDurationSec: track.excerptDurationSec,
        status: track.status,
        error: track.error,
        description: track.description,
        descriptionError: track.descriptionError,
        embeddingStartedAt: track.embeddingStartedAt,
        embeddingCompletedAt: track.embeddingCompletedAt,
        createdAt: track.createdAt,
        updatedAt: track.updatedAt,
      })),
    );
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

export const findTrackBySourceFingerprint = query({
  args: {
    sourceFingerprint: v.string(),
  },
  returns: v.union(trackSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    const track = await ctx.db
      .query("tracks")
      .withIndex("by_sourceFingerprint", (q) =>
        q.eq("sourceFingerprint", args.sourceFingerprint),
      )
      .unique();

    if (!track) {
      return null;
    }

    return {
      _id: track._id,
      title: track.title,
      artist: track.artist,
      sourceFileName: track.sourceFileName,
      bpm: track.bpm,
      bpmCheckedAt: track.bpmCheckedAt,
      excerptMimeType: track.excerptMimeType,
      excerptAudioUrl:
        (await ctx.storage.getUrl(track.excerptStorageId)) ?? undefined,
      durationSec: track.durationSec,
      excerptStartSec: track.excerptStartSec,
      excerptDurationSec: track.excerptDurationSec,
      status: track.status,
      error: track.error,
      description: track.description,
      descriptionError: track.descriptionError,
      embeddingStartedAt: track.embeddingStartedAt,
      embeddingCompletedAt: track.embeddingCompletedAt,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    };
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

    const summaries = await Promise.all(
      tracks.map(async (track) => {
        if (!track) {
          return null;
        }

        return {
          _id: track._id,
          title: track.title,
          artist: track.artist,
          sourceFileName: track.sourceFileName,
          bpm: track.bpm,
          bpmCheckedAt: track.bpmCheckedAt,
          excerptMimeType: track.excerptMimeType,
          excerptAudioUrl:
            (await ctx.storage.getUrl(track.excerptStorageId)) ?? undefined,
          durationSec: track.durationSec,
          excerptStartSec: track.excerptStartSec,
          excerptDurationSec: track.excerptDurationSec,
          status: track.status,
          error: track.error,
          description: track.description,
          descriptionError: track.descriptionError,
          embeddingStartedAt: track.embeddingStartedAt,
          embeddingCompletedAt: track.embeddingCompletedAt,
          createdAt: track.createdAt,
          updatedAt: track.updatedAt,
        };
      }),
    );

    return summaries.flatMap((track) => {
      if (!track) {
        return [];
      }

      return [track];
    });
  },
});

export const listTracksForFingerprintMaintenance = internalQuery({
  args: {},
  returns: v.array(maintenanceTrackValidator),
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_createdAt")
      .order("asc")
      .collect();

    return tracks.map((track) => ({
      _id: track._id,
      title: track.title,
      artist: track.artist,
      sourceFingerprint: track.sourceFingerprint,
      sourceFileName: track.sourceFileName,
      bpmCheckedAt: track.bpmCheckedAt,
      originalStorageId: track.originalStorageId,
      excerptStorageId: track.excerptStorageId,
      status: track.status,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    }));
  },
});

export const setSourceFingerprint = internalMutation({
  args: {
    trackId: v.id("tracks"),
    sourceFingerprint: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      return null;
    }

    await ctx.db.patch(args.trackId, {
      sourceFingerprint: args.sourceFingerprint,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const markDescriptionReady = internalMutation({
  args: {
    trackId: v.id("tracks"),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      return null;
    }

    await ctx.db.patch(args.trackId, {
      description: args.description,
      descriptionError: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const markDescriptionFailed = internalMutation({
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
      descriptionError: args.error,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteTrackAndJob = internalMutation({
  args: {
    trackId: v.id("tracks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      return null;
    }

    const job = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_trackId", (q) => q.eq("trackId", args.trackId))
      .unique();

    if (job) {
      await ctx.db.delete(job._id);
    }

    await ctx.db.delete(args.trackId);
    return null;
  },
});

export const setTrackBpm = internalMutation({
  args: {
    trackId: v.id("tracks"),
    bpm: v.float64(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      return null;
    }

    await ctx.db.patch(args.trackId, {
      bpm: args.bpm,
      bpmCheckedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const markTrackBpmChecked = internalMutation({
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
      bpmCheckedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const listTrackIdsNeedingDetailHydration = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.id("tracks")),
  handler: async (ctx, args) => {
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_status", (q) => q.eq("status", "ready"))
      .collect();

    const pendingTracks = tracks.filter(
      (track) =>
        track.bpmCheckedAt === undefined ||
        (!track.description && !track.descriptionError),
    );

    return pendingTracks
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, args.limit ?? pendingTracks.length)
      .map((track) => track._id);
  },
});

export const deleteTrack = mutation({
  args: {
    trackId: v.id("tracks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      return null;
    }

    const job = await ctx.db
      .query("embeddingJobs")
      .withIndex("by_trackId", (q) => q.eq("trackId", args.trackId))
      .unique();

    if (job) {
      await ctx.db.delete(job._id);
    }

    await Promise.allSettled([
      ctx.storage.delete(track.originalStorageId),
      ctx.storage.delete(track.excerptStorageId),
    ]);
    await ctx.db.delete(args.trackId);

    return null;
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
      embeddingStartedAt: Date.now(),
      embeddingCompletedAt: undefined,
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
      embeddingCompletedAt: Date.now(),
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
      embeddingCompletedAt: Date.now(),
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
