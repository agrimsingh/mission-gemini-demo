"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { describeAudioBlob } from "./lib/gemini";
import { parseBuffer } from "music-metadata";

type DetailHydrationResult = {
  bpm?: number;
  description?: string;
  descriptionError?: string;
};

type DetailTrack = {
  bpm?: number;
  bpmCheckedAt?: number;
  description?: string;
  descriptionError?: string;
  originalStorageId: Id<"_storage">;
  originalMimeType: string;
  excerptStorageId: Id<"_storage">;
};

async function extractBpmFromBlob(
  blob: Blob,
  mimeType: string,
): Promise<number | undefined> {
  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const metadata = await parseBuffer(buffer, {
      mimeType,
      size: buffer.length,
    });
    const bpm = metadata.common.bpm;
    return typeof bpm === "number" && Number.isFinite(bpm) && bpm > 0
      ? bpm
      : undefined;
  } catch {
    return undefined;
  }
}

export const describeTrackExcerpt = internalAction({
  args: {
    trackId: v.id("tracks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
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

      const description = await describeAudioBlob(excerptBlob);
      await ctx.runMutation(internal.tracks.markDescriptionReady, {
        trackId: args.trackId,
        description,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown description failure.";

      await ctx.runMutation(internal.tracks.markDescriptionFailed, {
        trackId: args.trackId,
        error: message,
      });
    }

    return null;
  },
});

export const ensureTrackDetails = action({
  args: {
    trackId: v.id("tracks"),
  },
  returns: v.object({
    bpm: v.optional(v.float64()),
    description: v.optional(v.string()),
    descriptionError: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<DetailHydrationResult> => {
    const track = (await ctx.runQuery(internal.tracks.getTrackForEmbedding, {
      trackId: args.trackId,
    })) as DetailTrack | null;

    if (!track) {
      throw new Error("Track not found.");
    }

    let bpm = track.bpm;
    let description = track.description;
    let descriptionError = track.descriptionError;

    if (track.bpmCheckedAt === undefined) {
      if (bpm !== undefined) {
        await ctx.runMutation(internal.tracks.setTrackBpm, {
          trackId: args.trackId,
          bpm,
        });
      } else {
        const originalBlob = await ctx.storage.get(track.originalStorageId);
        if (originalBlob) {
          const extractedBpm = await extractBpmFromBlob(
            originalBlob,
            track.originalMimeType,
          );

          if (extractedBpm !== undefined) {
            bpm = extractedBpm;
            await ctx.runMutation(internal.tracks.setTrackBpm, {
              trackId: args.trackId,
              bpm: extractedBpm,
            });
          } else {
            await ctx.runMutation(internal.tracks.markTrackBpmChecked, {
              trackId: args.trackId,
            });
          }
        } else {
          await ctx.runMutation(internal.tracks.markTrackBpmChecked, {
            trackId: args.trackId,
          });
        }
      }
    }

    if (!description) {
      try {
        const excerptBlob = await ctx.storage.get(track.excerptStorageId);
        if (!excerptBlob) {
          throw new Error("Excerpt audio blob not found in storage.");
        }

        description = await describeAudioBlob(excerptBlob);
        descriptionError = undefined;
        await ctx.runMutation(internal.tracks.markDescriptionReady, {
          trackId: args.trackId,
          description,
        });
      } catch (error) {
        descriptionError =
          error instanceof Error
            ? error.message
            : "Unknown description failure.";
        await ctx.runMutation(internal.tracks.markDescriptionFailed, {
          trackId: args.trackId,
          error: descriptionError,
        });
      }
    }

    return {
      bpm,
      description,
      descriptionError,
    };
  },
});
