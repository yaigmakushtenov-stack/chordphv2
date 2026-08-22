"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useMusicLibraryFiles } from "@/lib/client/music-library-store";
import {
  toggleMusicTrack,
  useMusicPlayback,
} from "@/lib/client/music-playback-store";
import type { MusicFileListItemData } from "@/types/music";

const NEWEST_SONGS_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

const TRENDING_SONGS = [
  {
    title: "Riptide",
    artist: "Vance Joy",
    type: "Ukulele",
  },
  {
    title: "Let It Be",
    artist: "The Beatles",
    type: "Chords",
  },
  {
    title: "Blackbird",
    artist: "The Beatles",
    type: "Tabs",
  },
  {
    title: "Wonderwall",
    artist: "Oasis",
    type: "Chords",
  },
  {
    title: "Tatsulok",
    artist: "Bamboo",
    type: "Chords",
  },
  {
    title: "Huling El Bimbo",
    artist: "Eraserheads",
    type: "Chords",
  },
] as const;

const QUICK_ACTIONS = [
  {
    title: "Create playlist",
    description: "Organize songs for practice sets.",
  },
  {
    title: "Browse chords",
    description: "Find tabs, lyrics, and chord diagrams.",
    href: "/chord-chart",
  },
] as const;

function MusicIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

export function DashboardHome({
  initialNewestSongs,
}: {
  initialNewestSongs: MusicFileListItemData[];
}) {
  const musicFiles = useMusicLibraryFiles(initialNewestSongs);
  const playback = useMusicPlayback();
  const newestSongs = useMemo(
    () => getNewestSongs(musicFiles).slice(0, 6),
    [musicFiles],
  );

  return (
    <div className="grid gap-8">
      <section className="overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#ed1746_0%,#b8143a_55%,#71152c_100%)] p-5 text-white shadow-[0_18px_45px_rgba(237,23,70,0.2)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[720px]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">
              Start your music workspace
            </p>
            <h2 className="mt-2 text-[28px] font-black tracking-[-0.04em] sm:text-[36px]">
              Create a track annotation
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-white/85">
              Add song and artist details, musical information, reference links,
              optional audio, lyrics, and chords in one guided flow.
            </p>
          </div>
          <Link
            href="/track/new/annotate"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-white px-7 text-[14px] font-black text-[#b8143a] shadow-[0_10px_25px_rgba(0,0,0,0.16)] transition hover:bg-[#fff0f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Create annotation
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[22px] font-black tracking-[-0.03em]">
            Newest songs
          </h2>
          <span className="rounded-full bg-[#ffe2e7] px-3 py-1 text-[12px] font-bold text-[#ed1746] dark:bg-[#3a1720]">
            48 hours
          </span>
        </div>
        {newestSongs.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {newestSongs.map((song) => (
              <article
                key={song.id}
                className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4 dark:border-[#303034] dark:bg-[#18181b]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    aria-label={
                      playback.track?.id === song.id &&
                      playback.status === "playing"
                        ? `Pause ${song.title}`
                        : `Play ${song.title}`
                    }
                    onClick={() => toggleMusicTrack(song)}
                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-[14px] font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
                      playback.track?.id === song.id &&
                      playback.status === "playing"
                        ? "bg-[#ed1746] text-white hover:bg-[#d90f3b]"
                        : "bg-[#111] text-white hover:bg-[#2c2c2c] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
                    }`}
                  >
                    <span aria-hidden="true">
                      {playback.track?.id === song.id &&
                      playback.status === "playing"
                        ? "Ⅱ"
                        : "▶"}
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-bold">
                      {song.title}
                    </h3>
                    <p className="mt-1 truncate text-[13px] text-[#666] dark:text-[#b4b4bc]">
                      {formatSongSubtitle(song)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[#666] dark:text-[#b4b4bc]">
                      <span className="rounded-full bg-white px-2.5 py-1 dark:bg-[#28282c]">
                        {formatDuration(song.durationSeconds)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 dark:bg-[#28282c]">
                        {formatRelativeUploadTime(song)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-5 dark:border-[#303034] dark:bg-[#18181b]">
            <p className="text-[14px] font-bold">No newest songs yet</p>
            <p className="mt-1 text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
              Uploads from the last two days appear here.
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[22px] font-black tracking-[-0.03em]">
            Trending songs
          </h2>
          <button
            type="button"
            className="rounded-full px-3 py-1 text-[13px] font-bold text-[#666] transition hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#b4b4bc] dark:hover:text-white"
          >
            Show all
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {TRENDING_SONGS.map((song, index) => (
            <article
              key={`${song.title}-${song.artist}`}
              className="group rounded-xl bg-[#f7f7f7] p-3 transition hover:bg-[#efefef] dark:bg-[#18181b] dark:hover:bg-[#232326]"
            >
              <div className="flex aspect-square items-center justify-center rounded-lg bg-[linear-gradient(135deg,#ed1746_0%,#2d2d31_100%)] text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
                <span className="text-[34px] font-black tracking-[-0.06em]">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-3 truncate text-[14px] font-bold">
                {song.title}
              </h3>
              <p className="mt-1 truncate text-[13px] text-[#6f6f6f] dark:text-[#a1a1aa]">
                {song.artist}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#555] dark:bg-[#28282c] dark:text-[#c4c4cc]">
                {song.type}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[22px] font-black tracking-[-0.03em]">
          More ways to use ChordPH
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {QUICK_ACTIONS.map((action) =>
            "href" in action ? (
              <Link
                key={action.title}
                href={action.href}
                className="rounded-xl border border-[#e4e4e4] bg-[#fafafa] p-5 transition hover:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#303034] dark:bg-[#18181b]"
              >
                <QuickActionContent action={action} />
              </Link>
            ) : (
              <article
                key={action.title}
                className="rounded-xl border border-[#e4e4e4] bg-[#fafafa] p-5 dark:border-[#303034] dark:bg-[#18181b]"
              >
                <QuickActionContent action={action} />
              </article>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function QuickActionContent({ action }: { action: (typeof QUICK_ACTIONS)[number] }) {
  return (
    <>
      <div className="flex size-11 items-center justify-center rounded-xl bg-[#ffe2e7] text-[#ed1746] dark:bg-[#3a1720]">
        <MusicIcon />
      </div>
      <h3 className="mt-4 text-[15px] font-bold">{action.title}</h3>
      <p className="mt-2 text-[13px] leading-5 text-[#6f6f6f] dark:text-[#a1a1aa]">
        {action.description}
      </p>
    </>
  );
}

function getNewestSongs(
  items: MusicFileListItemData[],
) {
  const cutoff = Date.now() - NEWEST_SONGS_WINDOW_MS;

  return items.filter((item) => getMusicFileTime(item) >= cutoff);
}

function getMusicFileTime(item: MusicFileListItemData) {
  return new Date(item.uploadedAt ?? item.createdAt).getTime();
}

function formatSongSubtitle(song: MusicFileListItemData) {
  const parts = [song.artist, song.album].filter(Boolean);

  return parts.length ? parts.join(" · ") : song.originalFileName;
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

function formatRelativeUploadTime(song: MusicFileListItemData) {
  const ageMs = Math.max(0, Date.now() - getMusicFileTime(song));
  const hours = Math.max(1, Math.floor(ageMs / (60 * 60 * 1000)));

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return "Yesterday";
}
