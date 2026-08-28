"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import * as SetListActions from "@/actions/setlist-actions";
import { BackLink } from "@/components/shared/back-link";
import { showToast } from "@/components/shared/toast";
import type { TrackBrowseItemData } from "@/types/track";

type SetListContext = {
  id: string;
  title: string;
};

type TrackBrowserProps = {
  initialQuery: string;
  isAuthenticated: boolean;
  setList?: SetListContext;
  tracks: TrackBrowseItemData[];
};

type TrackFilter = "all" | "owned" | "public";

export function TrackBrowser({
  initialQuery,
  isAuthenticated,
  setList,
  tracks,
}: TrackBrowserProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<TrackFilter>("all");
  const [addedTrackIds, setAddedTrackIds] = useState(
    () =>
      new Set(
        tracks
          .filter((track) => track.isInSetList)
          .map((track) => track.id),
      ),
  );
  const [pendingTrackId, setPendingTrackId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleTracks = tracks.filter((track) => {
    if (activeFilter === "owned") {
      return track.isOwnerTrack;
    }

    if (activeFilter === "public") {
      return !track.isOwnerTrack;
    }

    return true;
  });
  const clearSearchHref = setList
    ? `/setlists/${setList.id}/tracks`
    : "/browse";

  function handleAdd(trackId: string): void {
    if (!setList) {
      return;
    }

    setPendingTrackId(trackId);
    startTransition(async () => {
      const result = await SetListActions.addTrack(setList.id, trackId);

      if (!result.ok) {
        showToast({
          title: "Track not added",
          description: result.error.message,
          tone: "error",
        });
        setPendingTrackId(null);
        return;
      }

      setAddedTrackIds((current) => new Set(current).add(trackId));
      setPendingTrackId(null);
      showToast({ title: "Track added to setlist", tone: "success" });
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-[#ececec] px-4 pb-3 pt-4 sm:px-6 dark:border-[#29292c]">
        {setList ? (
          <div className="mb-4">
            <BackLink href={`/setlists/${setList.id}`}>{setList.title}</BackLink>
          </div>
        ) : null}
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-[17px] font-black leading-tight">
              {setList ? "Add tracks" : "Browse tracks"}
            </h1>
            <p className="truncate text-[12px] text-[#717171] dark:text-[#a1a1aa]">
              {setList
                ? setList.title
                : "Search chord sheets from the ChordPH community"}
            </p>
          </div>
        </div>

        <form method="get" action={setList ? undefined : "/browse"} className="mt-4 flex min-w-0 gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search tracks</span>
            <SearchIcon />
            <input
              type="search"
              name="q"
              maxLength={100}
              defaultValue={initialQuery}
              placeholder="Search by track title or artist"
              className="h-12 w-full rounded-full border border-transparent bg-[#f1f1f1] pl-12 pr-4 text-[14px] font-medium outline-none transition focus:border-[#b8b8b8] focus:bg-white focus:ring-3 focus:ring-[#ed1746]/10 dark:bg-[#242427] dark:focus:border-[#55555b] dark:focus:bg-[#1d1d20]"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[#111] px-5 text-[12px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
          >
            Search
          </button>
        </form>

        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-0.5"
          aria-label="Track filters"
        >
          <FilterButton
            active={activeFilter === "all"}
            label="All"
            onClick={() => setActiveFilter("all")}
          />
          {isAuthenticated ? (
            <FilterButton
              active={activeFilter === "owned"}
              label="Your tracks"
              onClick={() => setActiveFilter("owned")}
            />
          ) : null}
          <FilterButton
            active={activeFilter === "public"}
            label="Public tracks"
            onClick={() => setActiveFilter("public")}
          />
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3 px-2 pb-2">
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-bold">
              {initialQuery
                ? `Tracks matching “${initialQuery}”`
                : "Available tracks"}
            </h2>
            <p className="mt-0.5 text-[11px] text-[#717171] dark:text-[#a1a1aa]">
              {visibleTracks.length}{" "}
              {visibleTracks.length === 1 ? "track" : "tracks"}
            </p>
          </div>
          {initialQuery ? (
            <Link
              href={clearSearchHref}
              className="shrink-0 text-[11px] font-bold text-[#717171] transition hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#a1a1aa]"
            >
              Clear search
            </Link>
          ) : null}
        </div>

        {visibleTracks.length ? (
          <div>
            {visibleTracks.map((track) => {
              const isAdded = addedTrackIds.has(track.id);
              const isCurrentPending = pendingTrackId === track.id;

              return (
                <article
                  key={track.id}
                  className="group flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[#f4f4f4] dark:hover:bg-[#1e1e21]"
                >
                  <TrackIcon />
                  <Link
                    href={`/track/${track.id}`}
                    className="min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
                  >
                    <span className="block truncate text-[14px] font-bold transition group-hover:text-[#ed1746]">
                      {track.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                      {track.artistName} · Key {track.key} ·{" "}
                      {track.isOwnerTrack ? "Your track" : "Public"}
                    </span>
                  </Link>
                  {setList ? (
                    <button
                      type="button"
                      disabled={isPending || isAdded}
                      onClick={() => handleAdd(track.id)}
                      aria-label={
                        isAdded
                          ? `${track.title} is already in this setlist`
                          : `Add ${track.title} to setlist`
                      }
                      title={isAdded ? "Already added" : "Add to setlist"}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#b8b8b8] text-[#555] transition hover:scale-105 hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#e9e9e9] disabled:text-[#777] dark:border-[#626269] dark:text-[#d4d4d8] dark:disabled:bg-[#29292d] dark:disabled:text-[#a1a1aa]"
                    >
                      <AddStatusIcon pending={isCurrentPending} added={isAdded} />
                    </button>
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center text-[#777] transition group-hover:translate-x-0.5 group-hover:text-[#ed1746] dark:text-[#a1a1aa]">
                      <ChevronIcon />
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <h2 className="text-[16px] font-bold">No tracks found</h2>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
              Try another search or track filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? "h-8 shrink-0 rounded-full bg-[#111] px-4 text-[11px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111]"
          : "h-8 shrink-0 rounded-full bg-[#ededed] px-4 text-[11px] font-bold text-[#444] transition hover:bg-[#dedede] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#29292d] dark:text-[#e4e4e7] dark:hover:bg-[#35353a]"
      }
    >
      {label}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#717171] dark:text-[#a1a1aa]"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function TrackIcon() {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e9e9e9] text-[#777] dark:bg-[#29292d] dark:text-[#b4b4bc]">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-5"
      >
        <path d="M17 4a1 1 0 0 0-1.2-.98l-7 1.4A1 1 0 0 0 8 5.4v8.28A3.4 3.4 0 0 0 6.5 13.3C4.57 13.3 3 14.58 3 16.15S4.57 19 6.5 19 10 17.73 10 16.15V9l5-1v4.68a3.4 3.4 0 0 0-1.5-.38c-1.93 0-3.5 1.28-3.5 2.85S11.57 18 13.5 18s3.5-1.27 3.5-2.85V4Z" />
      </svg>
    </span>
  );
}

function AddStatusIcon({ pending, added }: { pending: boolean; added: boolean }) {
  if (pending) {
    return (
      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    );
  }

  if (added) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="size-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
