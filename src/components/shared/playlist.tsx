"use client";

export type PlaylistSort = "latest" | "alphabetical";

export type PlaylistItem = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  originalFileName: string;
  contentType: string;
  sourceSizeBytes: number;
  storedSizeBytes: number | null;
  durationSeconds: number | null;
  playbackUrl: string;
  createdAt: string;
  uploadedAt: string | null;
};

type PlaylistProps = {
  items: PlaylistItem[];
  sort: PlaylistSort;
  onSortChange: (sort: PlaylistSort) => void;
  isLoading?: boolean;
  emptyMessage?: string;
};

const SORT_OPTIONS: { value: PlaylistSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "alphabetical", label: "A-Z" },
];

export function Playlist({
  items,
  sort,
  onSortChange,
  isLoading = false,
  emptyMessage = "No audio files yet.",
}: PlaylistProps) {
  return (
    <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
      <div className="flex flex-col gap-3 border-b border-[#ececec] pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#303034]">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.015em]">
            Playlist
          </h2>
          <p className="mt-1 text-[13px] text-[#717171] dark:text-[#a1a1aa]">
            {items.length} {items.length === 1 ? "file" : "files"}
          </p>
        </div>
        <div className="flex w-full rounded-full border border-[#dedede] bg-[#f7f7f7] p-1 sm:w-auto dark:border-[#38383c] dark:bg-[#242427]">
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onSortChange(option.value)}
                className={`h-8 flex-1 rounded-full px-4 text-[12px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] sm:flex-none ${
                  active
                    ? "bg-[#111] text-white dark:bg-white dark:text-[#111]"
                    : "text-[#666] hover:text-black dark:text-[#b4b4bc] dark:hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 py-4">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-[104px] animate-pulse rounded-xl bg-[#f2f2f2] dark:bg-[#242427]"
            />
          ))}
        </div>
      ) : items.length ? (
        <div className="grid gap-3 pt-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[#ececec] bg-[#fafafa] p-3 dark:border-[#36363b] dark:bg-[#1d1d20]"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-semibold text-[#111] dark:text-[#f5f5f5]">
                    {item.title}
                  </h3>
                  <p className="mt-1 truncate text-[12px] text-[#717171] dark:text-[#a1a1aa]">
                    {formatSubtitle(item)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#666] dark:text-[#b4b4bc]">
                  <span className="rounded-full bg-white px-2.5 py-1 dark:bg-[#28282c]">
                    {formatDuration(item.durationSeconds)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 dark:bg-[#28282c]">
                    {formatBytes(item.storedSizeBytes ?? item.sourceSizeBytes)}
                  </span>
                </div>
              </div>
              <audio
                controls
                preload="none"
                src={item.playbackUrl}
                className="mt-3 h-10 w-full"
              >
                <a href={item.playbackUrl}>Play audio</a>
              </audio>
            </article>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-[14px] font-semibold">{emptyMessage}</p>
          <p className="mt-1 text-[13px] text-[#777] dark:text-[#a1a1aa]">
            Uploaded audio will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function formatSubtitle(item: PlaylistItem) {
  const parts = [item.artist, item.album].filter(Boolean);

  return parts.length ? parts.join(" - ") : item.originalFileName;
}

function formatDuration(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return "Duration unknown";
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
