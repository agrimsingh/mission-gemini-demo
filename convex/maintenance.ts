"use node";

import { createHash } from "node:crypto";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

type MaintenanceTrack = {
  _id: Id<"tracks">;
  title: string;
  artist?: string;
  sourceFingerprint?: string;
  sourceFileName: string;
  bpmCheckedAt?: number;
  originalStorageId: Id<"_storage">;
  excerptStorageId: Id<"_storage">;
  status: "uploaded" | "embedding" | "ready" | "failed";
  createdAt: number;
  updatedAt: number;
};

function hashArrayBufferSha256(arrayBuffer: ArrayBuffer): string {
  return createHash("sha256")
    .update(Buffer.from(arrayBuffer))
    .digest("hex");
}

function getTrackPriority(track: MaintenanceTrack): number {
  switch (track.status) {
    case "ready":
      return 3;
    case "embedding":
      return 2;
    case "uploaded":
      return 1;
    case "failed":
      return 0;
  }
}

function shouldReplaceKeptTrack(
  currentTrack: MaintenanceTrack,
  candidateTrack: MaintenanceTrack,
): boolean {
  const priorityDelta =
    getTrackPriority(candidateTrack) - getTrackPriority(currentTrack);

  if (priorityDelta !== 0) {
    return priorityDelta > 0;
  }

  return candidateTrack.createdAt < currentTrack.createdAt;
}

export const backfillTrackFingerprintsAndDedupe = action({
  args: {},
  returns: v.object({
    fingerprintsBackfilled: v.number(),
    duplicatesRemoved: v.number(),
    keptTracks: v.number(),
  }),
  handler: async (ctx) => {
    const tracks = (await ctx.runQuery(
      internal.tracks.listTracksForFingerprintMaintenance,
      {},
    )) as MaintenanceTrack[];
    const resolvedTracks: Array<MaintenanceTrack & { sourceFingerprint: string }> =
      [];
    let fingerprintsBackfilled = 0;

    for (const track of tracks) {
      let sourceFingerprint = track.sourceFingerprint;

      if (!sourceFingerprint) {
        const originalBlob = await ctx.storage.get(track.originalStorageId);
        if (!originalBlob) {
          throw new Error(`Original storage blob missing for ${track._id}`);
        }

        sourceFingerprint = hashArrayBufferSha256(await originalBlob.arrayBuffer());
        await ctx.runMutation(internal.tracks.setSourceFingerprint, {
          trackId: track._id,
          sourceFingerprint,
        });
        fingerprintsBackfilled += 1;
      }

      resolvedTracks.push({
        ...track,
        sourceFingerprint,
      });
    }

    const keptByFingerprint = new Map<string, MaintenanceTrack>();
    const duplicateTracks = new Map<Id<"tracks">, MaintenanceTrack>();

    for (const track of resolvedTracks) {
      const existingTrack = keptByFingerprint.get(track.sourceFingerprint);

      if (!existingTrack) {
        keptByFingerprint.set(track.sourceFingerprint, track);
        continue;
      }

      if (shouldReplaceKeptTrack(existingTrack, track)) {
        duplicateTracks.set(existingTrack._id, existingTrack);
        keptByFingerprint.set(track.sourceFingerprint, track);
        continue;
      }

      duplicateTracks.set(track._id, track);
    }

    for (const duplicateTrack of duplicateTracks.values()) {
      await Promise.allSettled([
        ctx.storage.delete(duplicateTrack.originalStorageId),
        ctx.storage.delete(duplicateTrack.excerptStorageId),
      ]);
      await ctx.runMutation(internal.tracks.deleteTrackAndJob, {
        trackId: duplicateTrack._id,
      });
    }

    return {
      fingerprintsBackfilled,
      duplicatesRemoved: duplicateTracks.size,
      keptTracks: keptByFingerprint.size,
    };
  },
});

export const backfillTrackDetails = action({
  args: {
    limit: v.optional(v.number()),
    concurrency: v.optional(v.number()),
  },
  returns: v.object({
    totalQueued: v.number(),
    succeeded: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    const trackIds = (await ctx.runQuery(
      internal.tracks.listTrackIdsNeedingDetailHydration,
      {
        limit: args.limit,
      },
    )) as Id<"tracks">[];

    const concurrency = Math.max(
      1,
      Math.min(args.concurrency ?? 2, trackIds.length || 1),
    );
    let succeeded = 0;
    let failed = 0;
    let cursor = 0;

    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (cursor < trackIds.length) {
          const trackId = trackIds[cursor];
          cursor += 1;

          if (!trackId) {
            return;
          }

          try {
            await ctx.runAction(api.descriptions.ensureTrackDetails, {
              trackId,
            });
            succeeded += 1;
          } catch {
            failed += 1;
          }
        }
      }),
    );

    return {
      totalQueued: trackIds.length,
      succeeded,
      failed,
    };
  },
});
