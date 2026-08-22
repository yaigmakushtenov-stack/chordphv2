"use client";

import { useRef, useState } from "react";

import * as MusicActions from "@/actions/music-actions";
import { MiniAudioPlayer } from "@/app/track/_components/audio/mini-audio-player";
import { showToast } from "@/components/shared/toast";
import { upsertMusicLibraryFile } from "@/lib/client/music-library-store";
import type { MusicFileListItemData } from "@/types/music";

const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/flac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
]);
const ACCEPTED_AUDIO_TYPES = Array.from(SUPPORTED_AUDIO_TYPES).join(",");
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

type AudioUploadProps = {
  description?: string;
  embedded?: boolean;
  heading?: string;
  multiple?: boolean;
  onUploadComplete?: (file: MusicFileListItemData) => void;
};

type UploadStatus = "queued" | "preparing" | "uploading" | "complete" | "error" | "duplicate";

type UploadItem = {
  id: string;
  file: File;
  fileName: string;
  status: UploadStatus;
  message: string;
  draft?: PreparedUploadDraft;
  duplicateFile?: MusicFileListItemData;
};

type DuplicateUploadStrategy = "overwrite" | "create";
type PreparedUploadDraft = {
  originalFileName: string;
  contentType: string;
  sourceSizeBytes: number;
  sourceSha256: string;
  storedSizeBytes: number;
  storedSha256: string;
  title: string;
  durationSeconds: number | null;
};

export function AudioUpload({
  description = "MP3, M4A, Ogg, FLAC, and WAV files up to 50 MB.",
  embedded = false,
  heading = "Upload audio",
  multiple = true,
  onUploadComplete,
}: AudioUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    const audioFiles = Array.from(files);

    if (!audioFiles.length || isUploading) {
      return;
    }

    setIsUploading(true);

    try {
      for (const file of audioFiles) {
        const id = crypto.randomUUID();
        setItems((current) => [
          { id, file, fileName: file.name, status: "queued", message: "Queued" },
          ...current,
        ]);
        await uploadFile(id, file);
      }
    } finally {
      setIsUploading(false);
      inputRef.current?.form?.reset();
    }
  }

  async function uploadFile(id: string, file: File) {
    const contentType = normalizeAudioContentType(file);

    if (!contentType) {
      updateItem(id, "error", "Unsupported audio type.");
      return;
    }

    if (file.size < 1 || file.size > MAX_AUDIO_BYTES) {
      updateItem(id, "error", "File must be 50 MB or smaller.");
      return;
    }

    try {
      updateItem(id, "preparing", "Preparing");
      const [sourceSha256, durationSeconds] = await Promise.all([
        hashFile(file),
        readAudioDuration(file),
      ]);
      const draft: PreparedUploadDraft = {
        originalFileName: file.name,
        contentType,
        sourceSizeBytes: file.size,
        sourceSha256,
        storedSizeBytes: file.size,
        storedSha256: sourceSha256,
        title: createTitleFromFileName(file.name),
        durationSeconds,
      };

      await uploadPreparedFile(id, file, draft);
    } catch (error: unknown) {
      updateItem(id, "error", getUploadErrorMessage(error));
    }
  }

  async function uploadPreparedFile(
    id: string,
    file: File,
    draft: PreparedUploadDraft & { duplicateStrategy?: DuplicateUploadStrategy },
  ) {
    try {
      updateItem(id, "preparing", "Preparing");
      const prepareResult = await MusicActions.prepareUpload(draft);

      if (!prepareResult.ok) {
        updateItem(id, "error", prepareResult.error.message);
        return;
      }

      if (prepareResult.data.outcome === "duplicate") {
        updateItem(id, "duplicate", "Duplicate detected", {
          draft,
          duplicateFile: prepareResult.data.file,
        });
        return;
      }

      updateItem(id, "uploading", "Uploading");
      const uploadResponse = await fetch(
        createMusicUploadUrl(prepareResult.data.file.id),
        {
          method: "PUT",
          headers: {
            "Content-Type": draft.contentType,
          },
          body: file,
        },
      );

      if (!uploadResponse.ok) {
        updateItem(id, "error", "Upload failed.");
        return;
      }

      const completeResult = await MusicActions.completeUpload({
        fileId: prepareResult.data.file.id,
      });

      if (!completeResult.ok) {
        updateItem(id, "error", completeResult.error.message);
        return;
      }

      upsertMusicLibraryFile(completeResult.data);
      showToast({
        title: "Upload complete",
        description: completeResult.data.title,
        tone: "success",
      });
      updateItem(id, "complete", "Uploaded");
      onUploadComplete?.(completeResult.data);
    } catch (error: unknown) {
      updateItem(id, "error", getUploadErrorMessage(error));
    }
  }

  function continueDuplicateUpload(
    item: UploadItem,
    strategy: DuplicateUploadStrategy,
  ) {
    if (!item.draft) {
      updateItem(item.id, "error", "Upload details are missing.");
      return;
    }

    void uploadPreparedFile(item.id, item.file, {
      ...item.draft,
      duplicateStrategy: strategy,
    });
  }

  function updateItem(
    id: string,
    status: UploadStatus,
    message: string,
    data: Pick<UploadItem, "draft" | "duplicateFile"> = {},
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...data, status, message } : item,
      ),
    );
  }

  return (
    <section
      className={
        embedded
          ? ""
          : "rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]"
      }
    >
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void uploadFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition ${
          isDragging
            ? "border-[#ed1746] bg-[#fff4f5] dark:bg-[#241016]"
            : "border-[#d9d9d9] bg-[#fafafa] dark:border-[#3b3b40] dark:bg-[#1d1d20]"
        }`}
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-[#ffe2e7] text-[#ed1746] dark:bg-[#3a1720]">
          <span aria-hidden="true" className="text-[22px] leading-none">
            +
          </span>
        </div>
        <h2 className="mt-4 text-[16px] font-semibold tracking-[-0.015em]">
          {heading}
        </h2>
        <p className="mt-1 max-w-[460px] text-[13px] leading-5 text-[#717171] dark:text-[#a1a1aa]">
          {description}
        </p>
        <form className="mt-5">
          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            accept={ACCEPTED_AUDIO_TYPES}
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) {
                void uploadFiles(event.target.files);
              }
            }}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(237,23,70,0.16)] transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Uploading" : "Choose files"}
          </button>
        </form>
      </div>

      {items.length ? (
        <div className="mt-4 grid gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#ececec] bg-[#fafafa] px-3 py-2 dark:border-[#36363b] dark:bg-[#1d1d20]"
            >
              <p className="min-w-0 truncate text-[13px] font-medium">
                {item.fileName}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClassName(
                  item.status,
                )}`}
              >
                {item.message}
              </span>
              {item.status === "duplicate" && item.duplicateFile ? (
                <div className="col-span-2 mt-2 grid gap-2">
                  <MiniAudioPlayer
                    src={item.duplicateFile.playbackUrl}
                    title={item.duplicateFile.title}
                    artist={item.duplicateFile.artist}
                    durationSeconds={item.duplicateFile.durationSeconds}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => continueDuplicateUpload(item, "overwrite")}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#111] px-4 text-[12px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
                    >
                      Overwrite
                    </button>
                    <button
                      type="button"
                      onClick={() => continueDuplicateUpload(item, "create")}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#ed1746] px-4 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
                    >
                      Create new
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function normalizeAudioContentType(file: File) {
  if (SUPPORTED_AUDIO_TYPES.has(file.type)) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "flac":
      return "audio/flac";
    case "m4a":
    case "mp4":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
    case "oga":
      return "audio/ogg";
    case "wav":
      return "audio/wav";
    default:
      return null;
  }
}

async function hashFile(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      audio.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
    };
    const finish = (duration: number | null) => {
      cleanup();
      resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(null), 5000);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      finish(
        Number.isFinite(audio.duration) && audio.duration >= 0
          ? audio.duration
          : null,
      );
    };
    audio.onerror = () => {
      window.clearTimeout(timeout);
      finish(null);
    };
    audio.src = objectUrl;
  });
}

function createTitleFromFileName(fileName: string) {
  const name = fileName.trim().split(/[\\/]/).pop() ?? fileName;
  const title = name.replace(/\.[^.]+$/, "").trim();

  return title || fileName;
}

function createMusicUploadUrl(fileId: string) {
  return `/music/files/${encodeURIComponent(fileId)}/upload`;
}

function getUploadErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Upload failed.";
}

function getStatusClassName(status: UploadStatus) {
  switch (status) {
    case "complete":
    case "duplicate":
      return "bg-[#d6fae9] text-[#087a53]";
    case "error":
      return "bg-[#ffe6eb] text-[#dc1740]";
    default:
      return "bg-white text-[#666] dark:bg-[#28282c] dark:text-[#b4b4bc]";
  }
}
