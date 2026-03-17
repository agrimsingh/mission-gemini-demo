import { mutation } from "./_generated/server";
import { v } from "convex/values";

const LEGACY_EXCERPT_MIME_TYPE = "audio/wav";

export const backfillTrackExcerptMimeTypes = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    remaining: v.number(),
  }),
  handler: async (ctx, args) => {
    const batchSize = Math.max(1, args.batchSize ?? 100);
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    const missingMimeTypeTracks = tracks.filter(
      (track) => track.excerptMimeType === undefined,
    );
    const tracksToUpdate = missingMimeTypeTracks.slice(0, batchSize);

    for (const track of tracksToUpdate) {
      await ctx.db.patch(track._id, {
        excerptMimeType: LEGACY_EXCERPT_MIME_TYPE,
      });
    }

    return {
      processed: tracksToUpdate.length,
      updated: tracksToUpdate.length,
      remaining: Math.max(0, missingMimeTypeTracks.length - tracksToUpdate.length),
    };
  },
});
