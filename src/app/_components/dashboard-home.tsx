"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";

import { usePracticeResume } from "@/lib/client/practice-resume-store";
import type {
  DashboardActivityItem,
  DashboardActivitySource,
  DashboardNextEvent,
  PracticeResumeItem,
} from "@/types/dashboard";
import type { DashboardPublicTrackData } from "@/types/track";

const NEWEST_SONGS_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

type DashboardHomeProps = {
  activityItems: DashboardActivityItem[];
  nextEvent: DashboardNextEvent | null;
  publicTracks: DashboardPublicTrackData[];
};

type IconName =
  | "annotation"
  | "band"
  | "calendar"
  | "chords"
  | "event"
  | "library"
  | "music"
  | "play"
  | "setlist";

export function DashboardHome({
  activityItems,
  nextEvent,
  publicTracks,
}: DashboardHomeProps) {
  const resumeItem = usePracticeResume();
  const newestSongs = useMemo(
    () => getNewestSongs(publicTracks).slice(0, 3),
    [publicTracks],
  );

  return (
    <div className="grid gap-8 pb-24 lg:pb-0">
      <ContinuePracticeCard resumeItem={resumeItem} />

      <div className="grid min-w-0 gap-5 lg:grid-cols-3 lg:items-stretch">
        <NewestSongs newestSongs={newestSongs} />
        <NextEventCard event={nextEvent} />
        <ActivityFeed items={activityItems.slice(0, 4)} />
      </div>

      <PublicSongs tracks={publicTracks.slice(0, 4)} />
      <QuickToolsDock />
    </div>
  );
}

function ContinuePracticeCard({
  resumeItem,
}: {
  resumeItem: PracticeResumeItem | null;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#ed1746_0%,#b8143a_55%,#71152c_100%)] text-white shadow-[0_18px_45px_rgba(237,23,70,0.2)]">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">
            {resumeItem ? "Continue practicing" : "Start a practice session"}
          </p>
          <h2 className="mt-2 truncate text-[28px] font-black tracking-[-0.04em] sm:text-[36px]">
            {resumeItem?.title ?? "What do you want to play?"}
          </h2>
          <p className="mt-1 truncate text-[14px] font-semibold text-white/80">
            {resumeItem?.subtitle ??
              "Choose a song or setlist and get straight into practice."}
          </p>
          {resumeItem ? (
            <div className="mt-5 flex flex-wrap gap-2 text-[12px] font-bold">
              {resumeItem.key ? (
                <span className="rounded-full bg-black/20 px-3 py-1.5">
                  Key {resumeItem.key}
                </span>
              ) : null}
              {resumeItem.tempo ? (
                <span className="rounded-full bg-black/20 px-3 py-1.5">
                  {resumeItem.tempo} BPM
                </span>
              ) : null}
              <span className="rounded-full bg-black/20 px-3 py-1.5">
                {formatRelativeTime(resumeItem.lastOpenedAt)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-[330px] lg:justify-end">
          {resumeItem ? (
            <Link
              href={resumeItem.href}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-[14px] font-black text-[#b8143a] shadow-[0_10px_25px_rgba(0,0,0,0.16)] transition hover:bg-[#fff0f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <DashboardIcon name="play" className="size-4" />
              Resume practice
            </Link>
          ) : (
            <>
              <Link
                href="/annotations"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-[14px] font-black text-[#b8143a] shadow-[0_10px_25px_rgba(0,0,0,0.16)] transition hover:bg-[#fff0f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Pick a song
              </Link>
              <Link
                href="/setlists"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 text-[14px] font-black text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Open setlists
              </Link>
            </>
          )}
          <Link
            href="/track/new/annotate"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 text-[14px] font-black text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Create annotation
          </Link>
        </div>
      </div>
    </section>
  );
}

function ActivityFeed({ items }: { items: DashboardActivityItem[] }) {
  return (
    <section
      aria-labelledby="activity-heading"
      className="h-full rounded-2xl border border-[#e4e4e4] bg-[#fafafa] p-5 dark:border-[#303034] dark:bg-[#18181b]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ed1746]">
            Your bands at a glance
          </p>
          <h2
            id="activity-heading"
            className="mt-1 text-[20px] font-black tracking-[-0.03em]"
          >
            What&apos;s new
          </h2>
        </div>
        <span className="rounded-full bg-[#ffe2e7] px-2.5 py-1 text-[11px] font-bold text-[#c90f39] dark:bg-[#3a1720] dark:text-[#fb7185]">
          30 days
        </span>
      </div>

      {items.length ? (
        <div className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-2 lg:mx-0 lg:grid lg:overflow-visible lg:px-0 lg:pb-0">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group flex min-w-[260px] snap-start items-start gap-3 rounded-xl border border-[#e4e4e4] bg-white p-3 transition hover:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] lg:min-w-0 dark:border-[#303034] dark:bg-[#242428] dark:hover:border-[#ed1746]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffe2e7] text-[#ed1746] dark:bg-[#3a1720] dark:text-[#fb7185]">
                <DashboardIcon name={item.source} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#ed1746]">
                  {formatActivitySource(item.source)}
                </span>
                <span className="mt-1 block text-[13px] font-bold leading-5 text-[#222] group-hover:text-black dark:text-[#f4f4f5] dark:group-hover:text-white">
                  {item.title}
                </span>
                <span className="mt-1 block text-[11px] text-[#777] dark:text-[#a1a1aa]">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="mt-2 text-[#999] transition group-hover:translate-x-0.5 group-hover:text-[#ed1746]"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[#dedede] bg-[#fafafa] p-4 dark:border-[#343438] dark:bg-[#18181b]">
          <p className="text-[13px] font-bold">No recent activity</p>
          <p className="mt-1 text-[12px] leading-5 text-[#6f6f6f] dark:text-[#a1a1aa]">
            Band, event, and setlist updates from the last 30 days appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function NextEventCard({ event }: { event: DashboardNextEvent | null }) {
  if (!event) {
    return (
      <section className="h-full rounded-2xl border border-[#e4e4e4] bg-[#fafafa] p-5 dark:border-[#303034] dark:bg-[#18181b]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#ffe2e7] text-[#ed1746] dark:bg-[#3a1720] dark:text-[#fb7185]">
            <DashboardIcon name="calendar" className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ed1746]">
              Up next
            </p>
            <h2 className="mt-0.5 text-[17px] font-black">No upcoming event</h2>
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-5 text-[#6f6f6f] dark:text-[#a1a1aa]">
          Schedule a rehearsal, service, or gig to surface it here.
        </p>
        <Link
          href="/events/new"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#111] px-5 text-[12px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
        >
          Create event
        </Link>
      </section>
    );
  }

  const firstPlaylist = event.playlists[0] ?? null;

  return (
    <section className="h-full overflow-hidden rounded-2xl border border-[#e4e4e4] bg-[#fafafa] dark:border-[#303034] dark:bg-[#18181b]">
      <div className="border-b border-[#e8e8e8] p-5 dark:border-[#303034]">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffe2e7] text-[#ed1746] dark:bg-[#3a1720] dark:text-[#fb7185]">
            <DashboardIcon name="calendar" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ed1746]">
              Next event
            </p>
            <h2 className="mt-0.5 truncate text-[18px] font-black">
              {event.title}
            </h2>
            <p className="mt-1 text-[12px] text-[#666] dark:text-[#b4b4bc]">
              {formatEventDate(event.startDate)} · {event.place}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#777] dark:text-[#a1a1aa]">
          Setlist order
        </p>
        {event.playlists.length ? (
          <ol className="mt-3 grid gap-2">
            {event.playlists.map((playlist, index) => (
              <li
                key={playlist.id}
                className="flex min-w-0 items-center gap-3 rounded-lg bg-white px-3 py-2.5 dark:bg-[#242428]"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f1f1f1] text-[11px] font-black text-[#555] dark:bg-[#34343a] dark:text-[#d4d4d8]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold">
                    {playlist.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#777] dark:text-[#a1a1aa]">
                    {playlist.bandName ? `${playlist.bandName} · ` : ""}
                    {playlist.trackCount}{" "}
                    {playlist.trackCount === 1 ? "song" : "songs"}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-[12px] text-[#777] dark:text-[#a1a1aa]">
            No setlists have been added yet.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {firstPlaylist ? (
            <Link
              href={`/events/${event.id}/playlists/${firstPlaylist.id}/stage`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#ed1746] px-4 text-[12px] font-black text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
            >
              <DashboardIcon name="play" className="size-3.5" />
              Run setlist
            </Link>
          ) : null}
          <Link
            href={`/events/${event.id}`}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#dedede] bg-white px-4 text-[12px] font-bold text-[#333] transition hover:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#242428] dark:text-[#f4f4f5]"
          >
            View event
          </Link>
        </div>
      </div>
    </section>
  );
}

function NewestSongs({
  newestSongs,
}: {
  newestSongs: DashboardPublicTrackData[];
}) {
  return (
    <section className="h-full rounded-2xl border border-[#e4e4e4] bg-[#fafafa] p-5 dark:border-[#303034] dark:bg-[#18181b]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[22px] font-black tracking-[-0.03em]">
          Newest songs
        </h2>
        <span className="rounded-full bg-[#ffe2e7] px-3 py-1 text-[12px] font-bold text-[#ed1746] dark:bg-[#3a1720] dark:text-[#fb7185]">
          48 hours
        </span>
      </div>
      {newestSongs.length ? (
        <div className="mt-4 grid gap-3">
          {newestSongs.map((song) => (
            <article
              key={song.id}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-[#e8e8e8] bg-white p-3.5 transition hover:border-[#ed1746]/50 dark:border-[#303034] dark:bg-[#242428] dark:hover:border-[#ed1746]/60"
            >
              <Link
                href={`/track/${song.id}`}
                className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#ffe2e7] text-[#ed1746] transition group-hover:bg-[#ed1746] group-hover:text-white dark:bg-[#3a1720] dark:text-[#fb7185]"
                >
                  <DashboardIcon name="music" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-bold">
                    {song.title}
                  </h3>
                  <p className="mt-1 truncate text-[13px] text-[#666] dark:text-[#b4b4bc]">
                    {song.artistName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-[#666] dark:text-[#b4b4bc]">
                    <span className="rounded-full bg-white px-2.5 py-1 dark:bg-[#28282c]">
                      Key {song.key}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 dark:bg-[#28282c]">
                      {formatRelativeTime(song.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>
              {song.youtubeLink || song.spotifyLink ? (
                <div
                  className="flex shrink-0 items-center gap-1.5"
                  aria-label="Listen to this song"
                >
                  {song.youtubeLink ? (
                    <ExternalSongLink
                      href={song.youtubeLink}
                      provider="youtube"
                      songTitle={song.title}
                    />
                  ) : null}
                  {song.spotifyLink ? (
                    <ExternalSongLink
                      href={song.spotifyLink}
                      provider="spotify"
                      songTitle={song.title}
                    />
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[#dedede] bg-white p-5 dark:border-[#343438] dark:bg-[#242428]">
          <p className="text-[14px] font-bold">No newest songs yet</p>
          <p className="mt-1 text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
            Approved public songs created in the last two days appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function ExternalSongLink({
  href,
  provider,
  songTitle,
}: {
  href: string;
  provider: "spotify" | "youtube";
  songTitle: string;
}) {
  const label = provider === "youtube" ? "YouTube" : "Spotify";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Listen to ${songTitle} on ${label}`}
      title={`Open ${label}`}
      className={`flex size-9 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
        provider === "youtube"
          ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-950/45 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/45 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
      }`}
    >
      {provider === "youtube" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="size-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="6" width="18" height="12" rx="4" />
          <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="size-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M7.5 10c3.5-1 7.1-.7 10 .8M8 13c3-.7 6.3-.4 8.8.8M8.8 16c2.3-.5 4.8-.2 6.8.7" />
        </svg>
      )}
    </a>
  );
}

function PublicSongs({ tracks }: { tracks: DashboardPublicTrackData[] }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[22px] font-black tracking-[-0.03em]">
          Approved public songs
        </h2>
        <Link
          href="/browse"
          className="rounded-full px-3 py-1 text-[13px] font-bold text-[#666] transition hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#b4b4bc] dark:hover:text-white"
        >
          Show all
        </Link>
      </div>
      {tracks.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {tracks.map((track) => (
            <article
              key={track.id}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-3 transition hover:border-[#ed1746]/50 hover:bg-white dark:border-[#303034] dark:bg-[#18181b] dark:hover:border-[#ed1746]/60 dark:hover:bg-[#202024]"
            >
              <Link
                href={`/track/${track.id}#song-chart`}
                aria-label={`Open ${track.title} chord chart`}
                className="group flex size-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ed1746_0%,#5b1b2c_100%)] text-white shadow-[0_8px_20px_rgba(0,0,0,0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
              >
                <DashboardIcon
                  name="music"
                  className="size-5 transition group-hover:scale-110"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/track/${track.id}`}
                  className="block truncate text-[14px] font-bold hover:text-[#ed1746] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
                >
                  {track.title}
                </Link>
                <p className="mt-0.5 truncate text-[12px] text-[#6f6f6f] dark:text-[#a1a1aa]">
                  {track.artistName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href={`/track/${track.id}#song-chart`}
                  className="hidden rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#555] transition hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] sm:inline-flex dark:bg-[#28282c] dark:text-[#c4c4cc] dark:hover:text-[#fb7185]"
                >
                  {formatAnnotationType(track.annotationType)}
                </Link>
                <Link
                  href={`/track/${track.id}#song-chart`}
                  className="inline-flex rounded-full bg-[#ffe2e7] px-2.5 py-1 text-[10px] font-semibold text-[#c90f39] transition hover:bg-[#ffcbd5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#3a1720] dark:text-[#fb7185] dark:hover:bg-[#4b1d28]"
                >
                  Key {track.key}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-5 dark:border-[#303034] dark:bg-[#18181b]">
          <p className="text-[14px] font-bold">No approved public songs yet</p>
          <p className="mt-1 text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
            Songs will appear here after they are published and approved.
          </p>
        </div>
      )}
    </section>
  );
}

function QuickToolsDock() {
  const tools: Array<{ href: string; icon: IconName; label: string }> = [
    { href: "/annotations", icon: "library", label: "Songs" },
    { href: "/setlists", icon: "setlist", label: "Setlists" },
    { href: "/chord-chart", icon: "chords", label: "Chords" },
    { href: "/track/new/annotate", icon: "annotation", label: "Annotate" },
  ];

  return (
    <nav
      aria-label="Quick tools"
      className="fixed bottom-3 left-1/2 z-30 grid w-[calc(100%_-_1.5rem)] max-w-[460px] -translate-x-1/2 grid-cols-4 gap-1 rounded-2xl border border-[#dedede] bg-white/95 p-2 shadow-[0_16px_50px_rgba(0,0,0,0.2)] backdrop-blur lg:static lg:w-full lg:max-w-none lg:translate-x-0 lg:rounded-xl lg:bg-[#fafafa] lg:shadow-none dark:border-[#343438] dark:bg-[#18181b]/95 lg:dark:bg-[#18181b]"
    >
      {tools.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          className="flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-[10px] font-bold text-[#5f5f5f] transition hover:bg-[#f2f2f2] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:text-[#c4c4cc] dark:hover:bg-[#28282c] dark:hover:text-[#fb7185]"
        >
          <DashboardIcon name={tool.icon} className="size-5" />
          <span className="truncate">{tool.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function DashboardIcon({
  className,
  name,
}: {
  className: string;
  name: IconName;
}) {
  const paths: Record<IconName, ReactNode> = {
    annotation: (
      <>
        <path d="M5 19h14" />
        <path d="m7 15 8.5-8.5 2 2L9 17H7v-2Z" />
        <path d="M14 6l2 2" />
      </>
    ),
    band: (
      <>
        <circle cx="8" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c.4-4 2-6 5-6s4.6 2 5 6M14 15c3.5-.8 6 .8 7 4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
        <path d="M8 14h3M13 14h3M8 17h3" />
      </>
    ),
    chords: (
      <>
        <path d="M5 4v16M10 4v16M15 4v16M20 4v16" />
        <path d="M5 8h15M5 13h15M5 18h15" />
        <circle cx="10" cy="8" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    event: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    library: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M9 4v16M12 8h4M12 12h4" />
      </>
    ),
    music: (
      <>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7V5Z" />,
    setlist: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="m4 6 .8.8L6.5 5M4 12l.8.8L6.5 11M4 18l.8.8L6.5 17" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function getNewestSongs(items: DashboardPublicTrackData[]) {
  const cutoff = Date.now() - NEWEST_SONGS_WINDOW_MS;

  return items
    .filter((item) => new Date(item.createdAt).getTime() >= cutoff)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
}

function formatRelativeTime(timestamp: string) {
  const ageMs = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const minutes = Math.floor(ageMs / (60 * 1000));

  if (minutes < 2) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (hours < 48) {
    return "Yesterday";
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function formatEventDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(timestamp));
}

function formatActivitySource(source: DashboardActivitySource) {
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function formatAnnotationType(type: DashboardPublicTrackData["annotationType"]) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
