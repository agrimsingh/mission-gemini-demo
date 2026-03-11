"use client";

import { useMutation } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useMemo, useRef, useState, useTransition } from "react";
import { createRepresentativeExcerpt } from "@/lib/audio";
import { parseTrackMetadata } from "@/lib/track-metadata";
import { cn } from "@/lib/cn";
import { Upload, FolderOpen, AlertCircle } from "lucide-react";

type BatchStatus =
  | "queued"
  | "excerpting"
  | "uploadingOriginal"
  | "uploadingExcerpt"
  | "creatingTrack"
  | "queuedForEmbedding"
  | "failed";

type BatchItem = {
  id: string;
  fileName: string;
  title: string;
  artist?: string;
  status: BatchStatus;
  error?: string;
};

type UploadResponse = {
  storageId: Id<"_storage">;
};

const CONCURRENCY_OPTIONS = [1, 2, 3, 4];

const DIRECTORY_INPUT_ATTRIBUTES = {
  webkitdirectory: "",
  directory: "",
} as {
  webkitdirectory?: string;
  directory?: string;
};

const AUDIO_FILE_NAME_PATTERN =
  /\.(mp3|wav|aiff|aif|flac|m4a|aac|ogg|opus)$/i;

async function uploadBlobToConvex(
  uploadUrl: string,
  blob: Blob,
): Promise<Id<"_storage">> {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": blob.type || "application/octet-stream" },
    body: blob,
  });

  if (!response.ok) throw new Error("Convex storage upload failed.");

  const payload = (await response.json()) as UploadResponse;
  return payload.storageId;
}

function isAudioFile(file: File): boolean {
  return (
    file.type.startsWith("audio/") || AUDIO_FILE_NAME_PATTERN.test(file.name)
  );
}

function getStatusLabel(status: BatchStatus): string {
  switch (status) {
    case "queued":
      return "queued";
    case "excerpting":
      return "excerpting";
    case "uploadingOriginal":
      return "uploading";
    case "uploadingExcerpt":
      return "uploading";
    case "creatingTrack":
      return "creating";
    case "queuedForEmbedding":
      return "done";
    case "failed":
      return "failed";
  }
}

const STATUS_PILL_STYLES: Record<string, string> = {
  queuedForEmbedding: "bg-success-muted text-success",
  failed: "bg-danger-muted text-danger",
};

export function UploadPanel() {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const createTrack = useMutation(api.uploads.createTrack);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parallelism, setParallelism] = useState(3);

  const batchSummary = useMemo(() => {
    return batchItems.reduce(
      (summary, item) => {
        if (item.status === "queuedForEmbedding") summary.queued += 1;
        else if (item.status === "failed") summary.failed += 1;
        else summary.processing += 1;
        return summary;
      },
      { queued: 0, failed: 0, processing: 0 },
    );
  }, [batchItems]);

  function updateBatchItem(itemId: string, updates: Partial<BatchItem>) {
    setBatchItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    );
  }

  function startBatchImport(rawFiles: File[], sourceLabel: string) {
    const files = rawFiles.filter(isAudioFile);
    const ignoredCount = rawFiles.length - files.length;

    if (files.length === 0) {
      setErrorMessage("No supported audio files found.");
      return;
    }

    const nextBatchItems = files.map((file, index) => {
      const metadata = parseTrackMetadata(file.name);
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        fileName: file.name,
        title: metadata.title,
        artist: metadata.artist,
        status: "queued" as const,
      };
    });

    setBatchItems(nextBatchItems);
    setErrorMessage(
      ignoredCount > 0 ? `Ignored ${ignoredCount} non-audio file(s).` : null,
    );

    startTransition(async () => {
      let nextIndex = 0;
      let activeCount = 0;
      let completedCount = 0;
      let queuedCount = 0;
      let failedCount = 0;

      async function processFile(file: File, index: number) {
        const batchItem = nextBatchItems[index];
        if (!batchItem) return;

        activeCount += 1;
        setStatusMessage(
          `Processing ${completedCount + 1}/${files.length} from ${sourceLabel}`,
        );

        try {
          updateBatchItem(batchItem.id, {
            status: "excerpting",
            error: undefined,
          });
          const excerpt = await createRepresentativeExcerpt(file);

          updateBatchItem(batchItem.id, { status: "uploadingOriginal" });
          const [originalUploadUrl, excerptUploadUrl] = await Promise.all([
            generateUploadUrl({}),
            generateUploadUrl({}),
          ]);

          const [originalStorageId, excerptStorageId] = await Promise.all([
            uploadBlobToConvex(originalUploadUrl, file),
            uploadBlobToConvex(excerptUploadUrl, excerpt.blob),
          ]);

          updateBatchItem(batchItem.id, { status: "creatingTrack" });
          await createTrack({
            title: batchItem.title,
            artist: batchItem.artist,
            sourceFileName: batchItem.fileName,
            originalMimeType: file.type || "application/octet-stream",
            originalStorageId,
            excerptStorageId,
            durationSec: excerpt.durationSec,
            excerptStartSec: excerpt.excerptStartSec,
            excerptDurationSec: excerpt.excerptDurationSec,
          });

          queuedCount += 1;
          updateBatchItem(batchItem.id, { status: "queuedForEmbedding" });
        } catch (error) {
          failedCount += 1;
          updateBatchItem(batchItem.id, {
            status: "failed",
            error:
              error instanceof Error
                ? error.message
                : "Upload failed unexpectedly.",
          });
        } finally {
          activeCount -= 1;
          completedCount += 1;
          setStatusMessage(
            `${completedCount}/${files.length} done, ${activeCount} active`,
          );
        }
      }

      async function worker() {
        while (nextIndex < files.length) {
          const currentIndex = nextIndex;
          nextIndex += 1;
          const file = files[currentIndex];
          if (!file) return;
          await processFile(file, currentIndex);
        }
      }

      await Promise.all(
        Array.from(
          { length: Math.min(parallelism, files.length) },
          async () => await worker(),
        ),
      );

      setStatusMessage(
        `${queuedCount}/${files.length} queued for embedding.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`,
      );
    });
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-6 transition-colors duration-150 ease-out",
          isDragging
            ? "border-accent bg-accent-muted"
            : "border-border hover:border-border-strong",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (isUploading) return;
          startBatchImport(Array.from(event.dataTransfer.files), "drop");
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-surface-3">
            <Upload className="size-5 text-text-secondary" />
          </div>
          <div>
            <p className="font-500 text-text-primary">Drop audio files here</p>
            <p className="mt-1 text-sm text-text-tertiary">
              mp3, wav — other formats converted during excerpt
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-center gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">Workers</span>
            <select
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary"
              disabled={isUploading}
              onChange={(e) => setParallelism(Number(e.target.value))}
              value={parallelism}
            >
              {CONCURRENCY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <button
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-600 text-surface-0 transition-colors duration-100",
              "hover:bg-accent/90 active:scale-[0.97] active:transition-transform active:duration-75",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload className="size-3.5" />
            Files
          </button>
          <button
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-border bg-surface-3 px-4 py-2 text-sm font-500 text-text-primary transition-colors duration-100",
              "hover:bg-surface-2 active:scale-[0.97] active:transition-transform active:duration-75",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            disabled={isUploading}
            onClick={() => folderInputRef.current?.click()}
            type="button"
          >
            <FolderOpen className="size-3.5" />
            Folder
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="audio/*"
        multiple
        disabled={isUploading}
        onChange={(event) => {
          const input = event.currentTarget;
          const files = input.files ? Array.from(input.files) : [];
          if (files.length > 0) startBatchImport(files, "file picker");
          input.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        hidden
        type="file"
        accept="audio/*"
        multiple
        disabled={isUploading}
        onChange={(event) => {
          const input = event.currentTarget;
          const files = input.files ? Array.from(input.files) : [];
          if (files.length > 0) startBatchImport(files, "folder picker");
          input.value = "";
        }}
        {...DIRECTORY_INPUT_ATTRIBUTES}
      />

      {statusMessage && (
        <div className="rounded-xl bg-accent-muted px-4 py-3 text-sm text-accent">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl bg-danger-muted px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {batchItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-600 text-text-primary">
                Batch Queue
              </h3>
              <p className="text-xs tabular-nums text-text-tertiary">
                {batchSummary.queued} done · {batchSummary.processing}{" "}
                processing · {batchSummary.failed} failed
              </p>
            </div>
            <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs tabular-nums text-text-secondary">
              {batchItems.length} files
            </span>
          </div>

          <div className="max-h-60 space-y-2 overflow-y-auto">
            {batchItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-500 text-text-primary">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    {item.artist || "Unknown"} · {item.fileName}
                  </p>
                  {item.error && (
                    <p className="mt-1 text-xs text-danger">{item.error}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-500 capitalize",
                    STATUS_PILL_STYLES[item.status] ??
                      "bg-warning-muted text-warning",
                  )}
                >
                  {getStatusLabel(item.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
