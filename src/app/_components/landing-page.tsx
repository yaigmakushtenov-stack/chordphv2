"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LogoutButton } from "@/components/shared/logout-button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { authClient } from "@/lib/auth-client";

const ACCENT = "#ed1746";
const GENRES = ["All", "Indie", "Classic Rock", "Folk", "Rock"] as const;

const SONGS = [
  { title: "Riptide", artist: "Vance Joy", genre: "Indie", type: "Ukulele", key: "Am", difficulty: "Beginner", views: "4,120" },
  { title: "Let It Be", artist: "The Beatles", genre: "Classic Rock", type: "Chords", key: "C", difficulty: "Beginner", views: "2,890" },
  { title: "Blackbird", artist: "The Beatles", genre: "Folk", type: "Tabs", key: "G", difficulty: "Advanced", views: "1,530", featured: true },
  { title: "Wonderwall", artist: "Oasis", genre: "Rock", type: "Chords", key: "G", difficulty: "Beginner", views: "1,240" },
  { title: "Knockin' on Heaven's Door", artist: "Bob Dylan", genre: "Folk", type: "Chords", key: "G", difficulty: "Beginner", views: "980" },
  { title: "Horse with No Name", artist: "America", genre: "Folk", type: "Chords", key: "Em", difficulty: "Beginner", views: "760" },
] as const;

type IconProps = { className?: string };

function MusicIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function GuitarIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m14.5 9.5 5-5M17 4l3 3M13 11l-2.1-2.1a2.7 2.7 0 0 0-3.8 0l-.5.5a2.7 2.7 0 0 0-.6 2.9l.3.7-1.5 1.5a3.6 3.6 0 1 0 5.1 5.1l1.5-1.5.7.3a2.7 2.7 0 0 0 2.9-.6l.5-.5a2.7 2.7 0 0 0 0-3.8L13 11Z" /><circle cx="8.5" cy="16" r="1.4" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5a3.5 3.5 0 0 1 3.5 3V5.5Z" /><path d="M7 7h2M15 7h2" />
    </svg>
  );
}

function Brand() {
  return (
    <Link href="/" aria-label="ChordPH home" className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
      <span className="flex size-9 items-center justify-center rounded-xl bg-[#111] text-white dark:bg-white dark:text-[#111]"><MusicIcon className="size-5" /></span>
      <span className="leading-none">
        <span className="block text-[18px] font-bold tracking-[-0.04em]">Chord<span style={{ color: ACCENT }}>PH</span></span>
        <span className="mt-1 block text-[8px] font-medium tracking-[0.28em] text-[#777] dark:text-[#a1a1aa]">GUITAR TABS</span>
      </span>
    </Link>
  );
}

const FEATURES = [
  { title: "Chord diagrams", description: "Visual finger positions for every chord in the song.", icon: <GuitarIcon /> },
  { title: "Lyrics + tabs", description: "Scroll-synced lyrics with chords right above the words.", icon: <BookIcon /> },
  { title: "Add your own", description: "Contribute OPM favorites and share with the community.", icon: <MusicIcon /> },
];

function difficultyClass(difficulty: string) {
  return difficulty === "Advanced" ? "bg-[#ffe6eb] text-[#dc1740]" : "bg-[#d6fae9] text-[#087a53]";
}

export function LandingPage() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<(typeof GENRES)[number]>("All");
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const filteredSongs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return SONGS.filter((song) =>
      (genre === "All" || song.genre === genre) &&
      (!normalizedQuery || song.title.toLowerCase().includes(normalizedQuery) || song.artist.toLowerCase().includes(normalizedQuery)),
    );
  }, [genre, query]);

  return (
    <div className="min-h-dvh bg-white text-[#111] transition-colors dark:bg-[#0d0d0e] dark:text-[#f5f5f5]">
      <header className="sticky top-0 z-20 border-b border-[#ededed] bg-white/95 backdrop-blur dark:border-[#29292c] dark:bg-[#0d0d0e]/95">
        <div className="mx-auto flex h-[58px] w-full max-w-[1110px] items-center justify-between px-5">
          <Brand />
          <nav aria-label="Primary navigation" className="flex items-center gap-3">
            <Link href="#browse" className="flex h-9 items-center gap-2 rounded-full bg-[#111] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7] dark:focus-visible:outline-white"><HomeIcon />Browse</Link>
            <Link href="/login" className="hidden h-9 items-center gap-2 rounded-full px-3 text-[13px] font-medium text-[#696969] transition hover:bg-[#f5f5f5] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:flex dark:text-[#b4b4bc] dark:hover:bg-[#242427] dark:hover:text-white dark:focus-visible:outline-white"><span aria-hidden="true" className="text-xl font-light leading-none">+</span>Add Tab</Link>
            {session ? (
              <LogoutButton />
            ) : isSessionPending ? (
              <span aria-hidden="true" className="size-9 animate-pulse rounded-full bg-[#f2f2f2] dark:bg-[#242427]" />
            ) : (
              <Link href="/login" className="flex h-9 items-center rounded-full px-3 text-[13px] font-medium text-[#696969] transition hover:bg-[#f5f5f5] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:text-[#b4b4bc] dark:hover:bg-[#242427] dark:hover:text-white dark:focus-visible:outline-white">Log in</Link>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-[#efefef] bg-[linear-gradient(180deg,#fff4f5_0%,#fff_72%)] dark:border-[#29292c] dark:bg-[linear-gradient(180deg,#241016_0%,#0d0d0e_72%)]">
          <div className="mx-auto w-full max-w-[1110px] px-5 pb-16 pt-20 sm:pt-24 lg:pt-28">
            <div className="max-w-[680px]">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-[#ed1746]"><GuitarIcon className="size-4" />CHORDPH · MADE IN THE PHILIPPINES</div>
              <h1 className="mt-6 text-[50px] font-black leading-[0.98] tracking-[-0.055em] sm:text-[66px] lg:text-[72px]">Strum the songs<span className="mt-1 block text-[#ed1746]">you love.</span></h1>
              <p className="mt-5 max-w-[615px] text-[17px] leading-7 text-[#6c6c6c] dark:text-[#b4b4bc]">Explore chords, tabs, and lyrics for OPM and global hits. View interactive chord diagrams, transpose on the fly, and add your own tabs to the community.</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-full bg-[#ed1746] px-6 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(237,23,70,0.16)] transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">Get started free</Link>
                <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-full border border-[#dedede] bg-white px-6 text-[13px] font-semibold transition hover:border-[#bdbdbd] hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:border-[#3a3a3e] dark:bg-[#19191b] dark:hover:border-[#55555b] dark:hover:bg-[#242427] dark:focus-visible:outline-white">Log in</Link>
                <Link href="#browse" className="inline-flex h-11 items-center gap-2 px-2 text-[13px] font-medium text-[#666] transition hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:text-[#a1a1aa] dark:hover:text-white dark:focus-visible:outline-white"><span aria-hidden="true" className="text-lg">✣</span>or just start browsing</Link>
              </div>
              <label className="mt-10 flex h-14 w-full items-center gap-3 rounded-full border border-[#dedede] bg-white px-5 text-[#7a7a7a] shadow-[0_2px_5px_rgba(0,0,0,0.035)] transition focus-within:border-[#aaa] focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:border-[#3a3a3e] dark:bg-[#19191b] dark:text-[#a1a1aa] dark:focus-within:border-[#626269] dark:focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.06)]">
                <span className="sr-only">Search songs or artists</span><SearchIcon />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs or artists..." className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[#171717] outline-none placeholder:text-[#a5a5b5] dark:text-[#f5f5f5] dark:placeholder:text-[#707079]" />
              </label>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-[#e5e5e5] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d5d5d5] hover:shadow-[0_10px_30px_rgba(0,0,0,0.045)] dark:border-[#303034] dark:bg-[#171719] dark:hover:border-[#48484d] dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#ffe2e7] text-[#ed1746]">{feature.icon}</div>
                  <h2 className="mt-4 text-[15px] font-semibold">{feature.title}</h2>
                  <p className="mt-1.5 text-[13px] leading-5 text-[#757575] dark:text-[#a1a1aa]">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="browse" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-[1110px] px-5 py-14 sm:py-16">
            <div className="flex flex-wrap gap-2" aria-label="Filter songs by genre">
              {GENRES.map((item) => {
                const active = genre === item;
                return <button key={item} type="button" aria-pressed={active} onClick={() => setGenre(item)} className={`h-9 cursor-pointer rounded-full border px-4 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white ${active ? "border-[#111] bg-[#111] text-white dark:border-white dark:bg-white dark:text-[#111]" : "border-[#dedede] bg-white text-[#666] hover:border-[#aaa] hover:text-black dark:border-[#38383c] dark:bg-[#171719] dark:text-[#b4b4bc] dark:hover:border-[#5a5a61] dark:hover:text-white"}`}>{item}</button>;
              })}
            </div>
            <h2 className="sr-only">Browse songs</h2>
            {filteredSongs.length ? (
              <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSongs.map((song) => (
                  <article key={`${song.title}-${song.artist}`} className={`rounded-2xl border bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#c9c9c9] hover:shadow-[0_10px_28px_rgba(0,0,0,0.055)] dark:bg-[#171719] dark:hover:border-[#525258] dark:hover:shadow-[0_10px_28px_rgba(0,0,0,0.3)] ${"featured" in song && song.featured ? "border-[#c8c8c8] shadow-[0_3px_7px_rgba(0,0,0,0.09)] dark:border-[#66666d]" : "border-[#e4e4e4] dark:border-[#303034]"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${"featured" in song && song.featured ? "bg-[#111] text-white dark:bg-white dark:text-[#111]" : "bg-[#f4f4f4] text-[#555] dark:bg-[#242427] dark:text-[#c4c4cc]"}`}><MusicIcon className="size-5" /></div>
                      <div className="min-w-0 pt-0.5"><h3 className="truncate text-[15px] font-semibold tracking-[-0.015em]">{song.title}</h3><p className="mt-0.5 truncate text-[13px] text-[#6f6f6f] dark:text-[#a1a1aa]">{song.artist}</p></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#f7f7f7] px-2.5 py-1 text-[10px] text-[#4d4d4d] dark:bg-[#252528] dark:text-[#c4c4cc]">{song.type}</span>
                      <span className="rounded-full border border-[#ececec] px-2.5 py-1 text-[10px] text-[#555] dark:border-[#3b3b40] dark:text-[#c4c4cc]">{song.key}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] ${difficultyClass(song.difficulty)}`}>{song.difficulty}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#ececec] pt-3 text-[11px] text-[#717171] dark:border-[#303034] dark:text-[#a1a1aa]"><span>{song.genre}</span><span className="flex items-center gap-1.5"><EyeIcon />{song.views}</span></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-[#d9d9d9] px-6 py-14 text-center dark:border-[#3b3b40]"><p className="text-sm font-semibold">No songs found</p><p className="mt-1 text-sm text-[#777] dark:text-[#a1a1aa]">Try another song, artist, or genre.</p></div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
