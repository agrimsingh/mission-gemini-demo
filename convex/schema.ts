import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const trackStatus = v.union(
  v.literal("uploaded"),
  v.literal("embedding"),
  v.literal("ready"),
  v.literal("failed"),
);

const embeddingJobStatus = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

export default defineSchema({
  tracks: defineTable({
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
    status: trackStatus,
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["status"],
    }),
  embeddingJobs: defineTable({
    trackId: v.id("tracks"),
    status: embeddingJobStatus,
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trackId", ["trackId"])
    .index("by_status", ["status"]),
});
