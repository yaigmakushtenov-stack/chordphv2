"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import {
  completeMusicUploadAction,
  prepareMusicUploadAction,
  type MusicFileListItemData,
} from "@/app/music/actions";
import { showToast } from "@/components/shared/toast";
import {
  emitMusicFileUploaded,
  useUploadedMusicFiles,
} from "@/lib/client/music-upload-events";

const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/flac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
]);
const ACCEPTED_AUDIO_TYPES = Array.from(SUPPORTED_AUDIO_TYPES).join(",");
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

type LeftLibraryPanelProps = {
  isAuthenticated: boolean;
  initialItems: MusicFileListItemData[];
};

type PanelMode = "library" | "upload";
type UploadStatus = "idle" | "ready" | "preparing" | "uploading" | "complete" | "error";

function LibraryIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 5v14M10 5v14M15 7l4 12" />
    </svg>
  );
}

function PlaylistIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l10-2v13" />
      <path d="M16 6h5" />
      <path d="M18.5 3.5v5" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function LeftLibraryPanel({
  isAuthenticated,
  initialItems,
}: LeftLibraryPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<PanelMode>("library");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("Choose an audio file to upload.");
  const [progress, setProgress] = useState(0);

  const isBusy = status === "preparing" || status === "uploading";

  function openUploadPanel() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    setMode("upload");
    setIsMenuOpen(false);
  }

  function resetUploadPanel() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setTitle("");
    setArtist("");
    setStatus("idle");
    setMessage("Choose an audio file to upload.");
    setProgress(0);
    setMode("library");
    inputRef.current?.form?.reset();
  }

  function handleFileChange(file: File | null) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setTitle(file ? createTitleFromFileName(file.name) : "");
    setArtist("");
    setProgress(0);

    if (!file) {
      setStatus("idle");
      setMessage("Choose an audio file to upload.");
      return;
    }

    const contentType = normalizeAudioContentType(file);

    if (!contentType) {
      setStatus("error");
      setMessage("Unsupported audio type.");
      return;
    }

    if (file.size < 1 || file.size > MAX_AUDIO_BYTES) {
      setStatus("error");
      setMessage("File must be 50 MB or smaller.");
      return;
    }

    setStatus("ready");
    setMessage("");
  }

  async function submitUpload() {
    if (!selectedFile || (status !== "ready" && status !== "error") || isBusy) {
      return;
    }

    const contentType = normalizeAudioContentType(selectedFile);

    if (!contentType) {
      setStatus("error");
      setMessage("Unsupported audio type.");
      return;
    }

    try {
      setStatus("preparing");
      setMessage("Preparing upload.");
      setProgress(6);
      const [sourceSha256, durationSeconds] = await Promise.all([
        hashFile(selectedFile),
        readAudioDuration(selectedFile),
      ]);
      setProgress(22);

      const prepareResult = await prepareMusicUploadAction({
        originalFileName: selectedFile.name,
        contentType,
        sourceSizeBytes: selectedFile.size,
        sourceSha256,
        storedSizeBytes: selectedFile.size,
        storedSha256: sourceSha256,
        title: title.trim() || createTitleFromFileName(selectedFile.name),
        artist: artist.trim() || undefined,
        durationSeconds,
      });

      if (!prepareResult.ok) {
        setStatus("error");
        setMessage(createFriendlyUploadError());
        return;
      }

      if (prepareResult.data.outcome === "duplicate") {
        showToast({
          title: "Already in your library",
          description: prepareResult.data.file.title ?? selectedFile.name,
          tone: "info",
        });
        resetUploadPanel();
        return;
      }

      setStatus("uploading");
      setMessage("Uploading to storage.");
      await uploadFileToStorage({
        file: selectedFile,
        url: createMusicUploadUrl(prepareResult.data.file.id),
        contentType,
        onProgress: (uploadProgress) => {
          setProgress(25 + Math.round(uploadProgress * 0.65));
        },
      });

      setProgress(94);
      setMessage("Finalizing upload.");
      const completeResult = await completeMusicUploadAction({
        fileId: prepareResult.data.file.id,
      });

      if (!completeResult.ok) {
        setStatus("error");
        setMessage(createFriendlyUploadError());
        return;
      }

      emitMusicFileUploaded(completeResult.data);
      showToast({
        title: "Upload complete",
        description: completeResult.data.title,
        tone: "success",
      });
      resetUploadPanel();
    } catch {
      setStatus("error");
      setMessage(createFriendlyUploadError());
    }
  }

  return (
    <aside className="min-h-[220px] rounded-xl bg-white p-4 dark:bg-[#121214] lg:min-h-0">
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px] font-bold">
          <LibraryIcon />
          Your Library
        </div>
        {mode === "upload" ? (
          <button
            type="button"
            aria-label="Close upload panel"
            onClick={resetUploadPanel}
            disabled={isBusy}
            className="flex size-9 items-center justify-center rounded-full bg-[#f3f3f3] text-[22px] leading-none text-[#555] transition hover:bg-[#e8e8e8] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#242427] dark:text-[#c4c4cc] dark:hover:bg-[#303034] dark:hover:text-white"
          >
            ×
          </button>
        ) : (
          <button
            type="button"
            aria-label="Add library item"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
            className="flex size-9 items-center justify-center rounded-full bg-[#f3f3f3] text-[22px] leading-none text-[#555] transition hover:bg-[#e8e8e8] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#242427] dark:text-[#c4c4cc] dark:hover:bg-[#303034] dark:hover:text-white"
          >
            +
          </button>
        )}
        {isMenuOpen && mode === "library" ? (
          <div className="absolute right-0 top-12 z-30 w-[min(320px,calc(100vw-2rem))] rounded-xl bg-white p-3 text-[#111] shadow-[0_18px_40px_rgba(0,0,0,0.18)] ring-1 ring-[#e5e5e5] dark:bg-[#242427] dark:text-[#f5f5f5] dark:ring-[#35353a]">
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#303034]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[#555] dark:bg-[#3a3a3e] dark:text-[#e4e4e7]">
                <PlaylistIcon />
              </span>
              <span>
                <span className="block text-[14px] font-bold">Playlist</span>
                <span className="mt-0.5 block text-[12px] text-[#666] dark:text-[#b4b4bc]">
                  Create a playlist for songs or uploads.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={openUploadPanel}
              className="mt-1 flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#303034]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#ffe2e7] text-[#ed1746] dark:bg-[#3a1720]">
                <UploadIcon />
              </span>
              <span>
                <span className="block text-[14px] font-bold">
                  Upload music file
                </span>
                <span className="mt-0.5 block text-[12px] text-[#666] dark:text-[#b4b4bc]">
                  Add MP3, M4A, Ogg, FLAC, or WAV.
                </span>
              </span>
            </button>
          </div>
        ) : null}
      </div>

      {mode === "upload" ? (
        <UploadPanel
          file={selectedFile}
          previewUrl={previewUrl}
          inputRef={inputRef}
          status={status}
          message={message}
          progress={progress}
          title={title}
          artist={artist}
          isBusy={isBusy}
          onFileChange={handleFileChange}
          onTitleChange={setTitle}
          onArtistChange={setArtist}
          onRemoveFile={() => handleFileChange(null)}
          onSubmit={() => void submitUpload()}
        />
      ) : (
        <LibrarySummary
          initialItems={initialItems}
          isAuthenticated={isAuthenticated}
          onUpload={openUploadPanel}
        />
      )}
    </aside>
  );
}

type UploadPanelProps = {
  file: File | null;
  previewUrl: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  status: UploadStatus;
  message: string;
  progress: number;
  title: string;
  artist: string;
  isBusy: boolean;
  onFileChange: (file: File | null) => void;
  onTitleChange: (title: string) => void;
  onArtistChange: (artist: string) => void;
  onRemoveFile: () => void;
  onSubmit: () => void;
};

function UploadPanel({
  file,
  previewUrl,
  inputRef,
  status,
  message,
  progress,
  title,
  artist,
  isBusy,
  onFileChange,
  onTitleChange,
  onArtistChange,
  onRemoveFile,
  onSubmit,
}: UploadPanelProps) {
  const isUploadProgressVisible =
    status === "preparing" || status === "uploading" || status === "complete";

  return (
    <form className="mt-6 grid gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AUDIO_TYPES}
        className="sr-only"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      {!file ? (
        <div className="rounded-xl bg-[#f4f4f4] p-4 dark:bg-[#1f1f1f]">
          <h2 className="text-[16px] font-bold">Upload music file</h2>
          <p className="mt-2 text-[13px] leading-5 text-[#5f5f5f] dark:text-[#b4b4bc]">
            Choose one audio file, then upload it directly to storage.
          </p>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#111] px-4 text-[13px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
          >
            Choose file
          </button>
        </div>
      ) : null}

      {file && previewUrl ? (
        <div className="rounded-xl bg-[#fafafa] p-4 dark:bg-[#1d1d20]">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#ffe2e7] text-[#ed1746] dark:bg-[#3a1720]">
              <UploadIcon />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14px] font-bold">
                {title || createTitleFromFileName(file.name)}
              </h3>
              <p className="mt-1 truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                {artist || "Unknown artist"} · {formatBytes(file.size)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Remove selected file"
              disabled={isBusy}
              onClick={onRemoveFile}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[18px] leading-none text-[#555] transition hover:bg-[#f0f0f0] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#28282c] dark:text-[#c4c4cc] dark:hover:bg-[#343438] dark:hover:text-white"
            >
              ×
            </button>
          </div>
          <audio
            controls
            preload="metadata"
            src={previewUrl}
            className="mt-4 h-10 w-full"
          >
            <a href={previewUrl}>Preview audio</a>
          </audio>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-[12px] font-bold text-[#555] dark:text-[#c4c4cc]">
                Name
              </span>
              <input
                value={title}
                disabled={isBusy}
                onChange={(event) => onTitleChange(event.target.value)}
                className="h-10 min-w-0 rounded-lg border border-[#dedede] bg-white px-3 text-[13px] font-medium text-[#111] outline-none transition focus:border-[#ed1746] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3a3a3e] dark:bg-[#19191b] dark:text-white"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12px] font-bold text-[#555] dark:text-[#c4c4cc]">
                Artist
              </span>
              <input
                value={artist}
                disabled={isBusy}
                onChange={(event) => onArtistChange(event.target.value)}
                placeholder="Optional"
                className="h-10 min-w-0 rounded-lg border border-[#dedede] bg-white px-3 text-[13px] font-medium text-[#111] outline-none transition placeholder:text-[#888] focus:border-[#ed1746] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3a3a3e] dark:bg-[#19191b] dark:text-white dark:placeholder:text-[#777]"
              />
            </label>
          </div>
          {isUploadProgressVisible ? (
            <div className="mt-5">
              <div className="flex items-center justify-between text-[12px] font-bold">
                <span>{message}</span>
                <span>{Math.min(100, Math.max(0, progress))}%</span>
              </div>
              <div
                aria-label={`Upload progress ${progress}%`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.max(0, progress))}
                className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5e5e5] dark:bg-[#303034]"
              >
                <div
                  className="h-full rounded-full bg-[#ed1746] transition-[width]"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {status === "error" ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-[#ffe6eb] px-4 py-3 text-[13px] leading-5 text-[#be123c]"
        >
          {message}
        </p>
      ) : null}

      {file ? (
        <div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={status !== "ready" && status !== "error"}
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#ed1746] px-4 text-[13px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "error" ? "Retry upload" : "Upload"}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function LibrarySummary({
  initialItems,
  isAuthenticated,
  onUpload,
}: {
  initialItems: MusicFileListItemData[];
  isAuthenticated: boolean;
  onUpload: () => void;
}) {
  const uploadedFiles = useUploadedMusicFiles();
  const items = useMemo(
    () => mergeMusicFiles(uploadedFiles, initialItems).slice(0, 6),
    [initialItems, uploadedFiles],
  );

  return (
    <div className="mt-6 grid gap-3">
      <section className="rounded-xl bg-[#f4f4f4] p-4 dark:bg-[#1f1f1f]">
        <h2 className="text-[14px] font-bold">Create your first playlist</h2>
        <p className="mt-2 text-[13px] leading-5 text-[#5f5f5f] dark:text-[#b4b4bc]">
          Save uploaded tracks and organize songs for rehearsal.
        </p>
        {isAuthenticated ? (
          <button
            type="button"
            className="mt-4 inline-flex h-9 items-center rounded-full bg-[#111] px-4 text-[12px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
          >
            Create playlist
          </button>
        ) : (
          <Link
            href="/login"
            className="mt-4 inline-flex h-9 items-center rounded-full bg-[#111] px-4 text-[12px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
          >
            Log in
          </Link>
        )}
      </section>
      {items.length ? (
        <UploadedFilesPlaylist items={items} onUpload={onUpload} />
      ) : (
        <section className="rounded-xl bg-[#f4f4f4] p-4 dark:bg-[#1f1f1f]">
          <h2 className="text-[14px] font-bold">Upload audio files</h2>
          <p className="mt-2 text-[13px] leading-5 text-[#5f5f5f] dark:text-[#b4b4bc]">
            Files you own appear in the dashboard playlist.
          </p>
          <button
            type="button"
            onClick={onUpload}
            className="mt-4 inline-flex h-9 items-center rounded-full bg-[#ed1746] px-4 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
          >
            Upload file
          </button>
        </section>
      )}
    </div>
  );
}

function UploadedFilesPlaylist({
  items,
  onUpload,
}: {
  items: MusicFileListItemData[];
  onUpload: () => void;
}) {
  return (
    <section className="rounded-xl bg-[#f4f4f4] p-4 dark:bg-[#1f1f1f]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold">Uploaded files</h2>
          <p className="mt-1 text-[12px] text-[#666] dark:text-[#b4b4bc]">
            {items.length} {items.length === 1 ? "track" : "tracks"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Upload another file"
          onClick={onUpload}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ed1746] text-[20px] leading-none text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
        >
          +
        </button>
      </div>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href="/music"
            className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                {formatLibrarySubtitle(item)}
              </span>
            </span>
            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#666] dark:bg-[#28282c] dark:text-[#c4c4cc] dark:group-hover:bg-[#343438]">
              {formatDuration(item.durationSeconds)}
            </span>
          </Link>
        ))}
      </div>
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

function mergeMusicFiles(
  primaryItems: MusicFileListItemData[],
  secondaryItems: MusicFileListItemData[],
) {
  const merged = new Map<string, MusicFileListItemData>();

  for (const item of [...primaryItems, ...secondaryItems]) {
    merged.set(item.id, item);
  }

  return Array.from(merged.values()).sort(compareNewestMusicFiles);
}

function compareNewestMusicFiles(
  left: MusicFileListItemData,
  right: MusicFileListItemData,
) {
  return getMusicFileTime(right) - getMusicFileTime(left);
}

function getMusicFileTime(item: MusicFileListItemData) {
  return new Date(item.uploadedAt ?? item.createdAt).getTime();
}

function formatLibrarySubtitle(item: MusicFileListItemData) {
  const parts = [item.artist, formatBytes(item.storedSizeBytes ?? item.sourceSizeBytes)]
    .filter(Boolean);

  return parts.length ? parts.join(" · ") : item.originalFileName;
}

function formatDuration(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return "--:--";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createFriendlyUploadError() {
  return `Oops, something went wrong while uploading your file. Please try again.`;
}

function uploadFileToStorage({
  file,
  url,
  contentType,
  onProgress,
}: {
  file: File;
  url: string;
  contentType: string;
  onProgress: (progress: number) => void;
}) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", url);
    request.setRequestHeader("Content-Type", contentType);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(new Error("Upload failed."));
      }
    };
    request.onerror = () => reject(new Error("Upload failed."));
    request.send(file);
  });
}

function createMusicUploadUrl(fileId: string) {
  return `/music/files/${encodeURIComponent(fileId)}/upload`;
}
