"use client";

import Link from "next/link";
import { Roboto_Mono } from "next/font/google";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { transposeChord, transposeChordPro } from "@/lib/chords/chord-pro";
import type { AccidentalPreference } from "@/lib/chords/chord-pro";
import type { StagePlaylistData, StageTrackData } from "@/types/stage";

const stageFont = Roboto_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-stage",
});

type StageTheme = "dark" | "light";
type StageDisplayMode = "default" | "vocals";

type StageAppearance = {
  activeSectionBorderClassName: string;
  chordClassName: string;
  idleSectionBorderClassName: string;
  labelClassName: string;
  lyricClassName: string;
  sectionSurfaceClassName: string;
};

type StageSection = {
  id: string;
  trackId: string;
  trackTitle: string;
  title: string;
  number: number;
  lines: string[];
};

type StageTrackDocument = StageTrackData & {
  displayKey: string;
  sections: StageSection[];
};

type StageAnchor = {
  id: string;
  trackId: string;
  trackTitle: string;
  sectionTitle: string;
};

export function StageView({ playlist }: { playlist: StagePlaylistData }) {
  const [theme, setTheme] = useState<StageTheme>("dark");
  const [transpose, setTranspose] = useState(0);
  const [accidentals, setAccidentals] =
    useState<AccidentalPreference>("sharps");
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const tracks = useMemo(
    () =>
      playlist.tracks.map<StageTrackDocument>((track) => {
        const source = transposeChordPro(
          track.lyricsAndChords,
          transpose,
          accidentals,
        );
        const displayKey =
          transposeChord(track.key, transpose, accidentals) ?? track.key;

        return {
          ...track,
          displayKey,
          sections: parseStageSections({
            source,
            trackId: track.setListTrackId,
            trackTitle: track.title,
          }),
        };
      }),
    [accidentals, playlist.tracks, transpose],
  );
  const anchors = useMemo(
    () =>
      tracks.flatMap<StageAnchor>((track) =>
        track.sections.map((section) => ({
          id: section.id,
          trackId: section.trackId,
          trackTitle: section.trackTitle,
          sectionTitle: section.title,
        })),
      ),
    [tracks],
  );
  const effectiveActiveSectionId = activeSectionId ?? anchors[0]?.id ?? null;
  const activeAnchor =
    anchors.find((anchor) => anchor.id === effectiveActiveSectionId) ?? null;
  const isDark = theme === "dark";
  const stageDisplayMode: StageDisplayMode = "default";
  const appearance = getStageAppearance(stageDisplayMode, isDark);

  const updateActiveSection = useCallback(() => {
    const scroller = scrollerRef.current;

    if (!scroller || anchors.length === 0) {
      return;
    }

    const anchorLine = scroller.scrollTop + scroller.clientHeight * 0.32;
    let nextActiveId = anchors[0].id;

    for (const anchor of anchors) {
      const element = sectionRefs.current.get(anchor.id);

      if (!element) {
        continue;
      }

      if (element.offsetTop <= anchorLine) {
        nextActiveId = anchor.id;
      } else {
        break;
      }
    }

    setActiveSectionId((current) =>
      current === nextActiveId ? current : nextActiveId,
    );
  }, [anchors]);

  useEffect(() => {
    updateActiveSection();
  }, [tracks, updateActiveSection]);

  useEffect(() => {
    if (scrollSpeed <= 0) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      lastFrameTimeRef.current = null;
      return;
    }

    const tick = (time: number) => {
      const scroller = scrollerRef.current;
      const previousTime = lastFrameTimeRef.current ?? time;
      const elapsedSeconds = Math.min((time - previousTime) / 1000, 0.08);
      lastFrameTimeRef.current = time;

      if (scroller) {
        scroller.scrollTop += elapsedSeconds * scrollSpeed * 34;
        updateActiveSection();
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = null;
      lastFrameTimeRef.current = null;
    };
  }, [scrollSpeed, updateActiveSection]);

  function jumpToSection(sectionId: string): void {
    const scroller = scrollerRef.current;
    const section = sectionRefs.current.get(sectionId);

    if (!scroller || !section) {
      return;
    }

    setActiveSectionId(sectionId);
    scroller.scrollTo({
      behavior: "smooth",
      top: Math.max(0, section.offsetTop - scroller.clientHeight * 0.18),
    });
  }

  function jumpByOffset(offset: -1 | 1): void {
    if (!activeAnchor) {
      return;
    }

    const currentIndex = anchors.findIndex(
      (anchor) => anchor.id === activeAnchor.id,
    );
    const targetIndex = currentIndex + offset;

    if (targetIndex < 0 || targetIndex >= anchors.length) {
      return;
    }

    jumpToSection(anchors[targetIndex].id);
  }

  async function enterFullscreen(): Promise<void> {
    await document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <main
      className={`${stageFont.variable} grid h-dvh min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden font-[family:var(--font-stage)] ${
        isDark ? "bg-[#08090b] text-[#f5f3ed]" : "bg-[#f8f7f3] text-[#151515]"
      }`}
    >
      <header
        className={`flex min-w-0 items-center gap-3 border-b px-3 py-2 sm:px-4 ${
          isDark
            ? "border-[#23252a] bg-[#111216]"
            : "border-[#dedbd2] bg-[#fffdf8]"
        }`}
      >
        <Link
          href={`/events/${playlist.eventId}`}
          className={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
            isDark
              ? "border-[#343740] hover:border-[#ed1746]"
              : "border-[#d8d3c8] hover:border-[#ed1746]"
          }`}
        >
          Back
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-[#ed1746]">
            {playlist.eventTitle}
          </p>
          <h1 className="truncate text-[15px] font-black sm:text-[18px]">
            {playlist.setListTitle}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setIsNavigatorOpen((current) => !current)}
          className={stageButtonClass(isDark)}
        >
          Sections
        </button>
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={stageButtonClass(isDark)}
        >
          {isDark ? "Light" : "Dark"}
        </button>
        <button
          type="button"
          onClick={() => void enterFullscreen()}
          className="hidden h-10 shrink-0 items-center rounded-full bg-[#ed1746] px-4 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] sm:inline-flex"
        >
          Fullscreen
        </button>
      </header>

      <div className="grid min-h-0 min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          ref={scrollerRef}
          onScroll={updateActiveSection}
          className="min-h-0 overflow-y-auto scroll-smooth px-4 pb-[42vh] pt-6 sm:px-8 lg:px-12"
        >
          <div className="mx-auto grid max-w-[980px] gap-12">
            {tracks.length ? (
              tracks.map((track) => (
                <article
                  key={track.setListTrackId}
                  className="grid gap-7"
                  data-stage-track-id={track.setListTrackId}
                >
                  <StageTrackHeader
                    track={track}
                  />
                  {track.isAvailable && track.sections.length ? (
                    <div className="grid gap-8">
                      {track.sections.map((section) => (
                        <section
                          key={section.id}
                          ref={(element) => {
                            if (element) {
                              sectionRefs.current.set(section.id, element);
                            } else {
                              sectionRefs.current.delete(section.id);
                            }
                          }}
                          className={`scroll-mt-20 border-l-4 pl-3 ${
                            effectiveActiveSectionId === section.id
                              ? appearance.activeSectionBorderClassName
                              : appearance.idleSectionBorderClassName
                          }`}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <span
                              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${
                                effectiveActiveSectionId === section.id
                                  ? "bg-[#ed1746] text-white"
                                  : isDark
                                    ? "bg-[#23252a] text-[#d7d2c7]"
                                    : "bg-[#ebe7dd] text-[#333]"
                              }`}
                            >
                              {section.number}
                            </span>
                            <h2 className="text-[18px] font-black sm:text-[22px]">
                              {section.title}
                            </h2>
                          </div>
                          <div
                            className={`rounded-lg px-3 py-4 font-[family:var(--font-stage)] text-[20px] leading-[1.45] sm:text-[24px] sm:leading-[1.5] md:text-[28px] md:leading-[1.52] ${
                              appearance.sectionSurfaceClassName
                            }`}
                          >
                            {section.lines.map((line, lineIndex) => (
                              <StageChordLine
                                key={`${section.id}-${lineIndex}`}
                                appearance={appearance}
                                line={line}
                              />
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`rounded-lg border border-dashed px-5 py-12 text-center ${
                        isDark
                          ? "border-[#343740] text-[#a9a59d]"
                          : "border-[#d8d3c8] text-[#666]"
                      }`}
                    >
                      <h2 className="text-[16px] font-bold">
                        No stage chart available
                      </h2>
                      <p className="mt-2 text-[13px]">
                        This track needs lyrics and chords before it can be
                        played here.
                      </p>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div
                className={`rounded-lg border border-dashed px-5 py-16 text-center ${
                  isDark
                    ? "border-[#343740] text-[#a9a59d]"
                    : "border-[#d8d3c8] text-[#666]"
                }`}
              >
                <h2 className="text-[18px] font-bold">No tracks yet</h2>
                <p className="mt-2 text-[13px]">
                  Add tracks to this playlist before opening Stage.
                </p>
              </div>
            )}
          </div>
        </div>

        <StageNavigator
          activeSectionId={effectiveActiveSectionId}
          isDark={isDark}
          isOpen={isNavigatorOpen}
          onJump={jumpToSection}
          playlist={playlist}
          tracks={tracks}
        />
      </div>

      <footer
        className={`grid gap-2 border-t px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4 ${
          isDark
            ? "border-[#23252a] bg-[#111216]"
            : "border-[#dedbd2] bg-[#fffdf8]"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold text-[#ed1746]">
            {activeAnchor?.trackTitle ?? playlist.setListTitle}
          </p>
          <p
            className={`truncate text-[15px] font-black ${
              isDark ? "text-[#f5f3ed]" : "text-[#151515]"
            }`}
          >
            {activeAnchor?.sectionTitle ?? "Ready"}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5 sm:justify-end sm:pb-0">
          <button
            type="button"
            onClick={() => jumpByOffset(-1)}
            disabled={!activeAnchor || anchors[0]?.id === activeAnchor.id}
            className={stageButtonClass(isDark)}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setScrollSpeed((speed) => Math.max(0, speed - 1))}
            className={stageButtonClass(isDark)}
          >
            -
          </button>
          <div
            className={`flex h-10 min-w-24 items-center justify-center rounded-full px-3 text-center text-[12px] font-black ${
              isDark ? "bg-[#23252a]" : "bg-[#ebe7dd]"
            }`}
          >
            {scrollSpeed === 0 ? "Scroll off" : `Speed ${scrollSpeed}`}
          </div>
          <button
            type="button"
            onClick={() => setScrollSpeed((speed) => Math.min(12, speed + 1))}
            className="inline-flex h-10 shrink-0 items-center rounded-full bg-[#ed1746] px-4 text-[16px] font-black text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => jumpByOffset(1)}
            disabled={
              !activeAnchor || anchors[anchors.length - 1]?.id === activeAnchor.id
            }
            className={stageButtonClass(isDark)}
          >
            Next
          </button>
          <div
            className={`inline-flex h-10 items-center overflow-hidden rounded-full border ${
              isDark
                ? "border-[#343740] bg-[#17191f]"
                : "border-[#d8d3c8] bg-white"
            }`}
          >
            <button
              type="button"
              disabled={transpose <= -12}
              onClick={() => setTranspose((value) => Math.max(-12, value - 1))}
              className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#ed1746] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Transpose down one semitone"
            >
              -
            </button>
            <span className="min-w-8 text-center text-[12px] font-black tabular-nums">
              {transpose}
            </span>
            <button
              type="button"
              disabled={transpose >= 12}
              onClick={() => setTranspose((value) => Math.min(12, value + 1))}
              className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#ed1746] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Transpose up one semitone"
            >
              +
            </button>
          </div>
          <select
            aria-label="Accidental preference"
            value={accidentals}
            onChange={(event) =>
              setAccidentals(event.target.value as AccidentalPreference)
            }
            className={`h-10 rounded-full border px-3 text-[12px] font-bold outline-none focus:border-[#ed1746] ${
              isDark
                ? "border-[#343740] bg-[#17191f] text-[#f5f3ed]"
                : "border-[#d8d3c8] bg-white text-[#151515]"
            }`}
          >
            <option value="sharps">Sharps</option>
            <option value="flats">Flats</option>
          </select>
        </div>
      </footer>
    </main>
  );
}

function StageTrackHeader({
  track,
}: {
  track: StageTrackDocument;
}) {
  return (
    <header className="flex min-w-0 items-center justify-start gap-4 px-1 py-2">
      {track.displayKey ? (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#ed1746] text-[18px] font-black text-white shadow-[0_10px_24px_rgba(237,23,70,0.24)]">
          {track.displayKey}
        </span>
      ) : null}
      <h2 className="min-w-0 truncate text-[28px] font-black leading-tight sm:text-[36px]">
        {track.title}
      </h2>
    </header>
  );
}

function StageNavigator({
  activeSectionId,
  isDark,
  isOpen,
  onJump,
  playlist,
  tracks,
}: {
  activeSectionId: string | null;
  isDark: boolean;
  isOpen: boolean;
  onJump: (sectionId: string) => void;
  playlist: StagePlaylistData;
  tracks: StageTrackDocument[];
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-30 grid w-[min(86vw,340px)] grid-rows-[auto_minmax(0,1fr)] border-l shadow-2xl lg:static lg:z-auto lg:w-auto lg:shadow-none ${
        isDark
          ? "border-[#23252a] bg-[#111216]"
          : "border-[#dedbd2] bg-[#fffdf8]"
      }`}
    >
      <div
        className={`border-b px-4 py-4 ${
          isDark ? "border-[#23252a]" : "border-[#dedbd2]"
        }`}
      >
        <p className="text-[12px] font-bold text-[#ed1746]">
          {playlist.band?.name ?? "No band linked"}
        </p>
        <h2 className="mt-1 text-[16px] font-black">Sections</h2>
      </div>
      <nav className="min-h-0 overflow-y-auto px-3 py-3" aria-label="Stage sections">
        <div className="grid gap-4">
          {tracks.map((track, trackIndex) => (
            <div key={track.setListTrackId}>
              <p
                className={`mb-1 truncate px-2 text-[12px] font-black ${
                  isDark ? "text-[#f5f3ed]" : "text-[#151515]"
                }`}
              >
                {trackIndex + 1}. {track.title}
              </p>
              <div className="grid gap-1">
                {track.sections.length ? (
                  track.sections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onJump(section.id)}
                      className={`min-w-0 rounded-lg px-3 py-2 text-left text-[13px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
                        activeSectionId === section.id
                          ? "bg-[#ed1746] text-white"
                          : isDark
                            ? "text-[#c9c3b8] hover:bg-[#202229]"
                            : "text-[#555] hover:bg-[#f0ede5]"
                      }`}
                    >
                      <span className="block truncate">{section.title}</span>
                    </button>
                  ))
                ) : (
                  <p
                    className={`px-3 py-2 text-[12px] ${
                      isDark ? "text-[#807c75]" : "text-[#777]"
                    }`}
                  >
                    No sections
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}

function StageChordLine({
  appearance,
  line,
}: {
  appearance: StageAppearance;
  line: string;
}) {
  const parts = getStageLineParts(line);

  if (parts.length === 0) {
    return <p className="min-h-[1.45em]">&nbsp;</p>;
  }

  return (
    <p className={`whitespace-pre-wrap ${appearance.lyricClassName}`}>
      {parts.map((part, index) => {
        if (part.kind === "space") {
          return <FragmentText key={index}>{part.value}</FragmentText>;
        }

        if (part.kind === "word") {
          return <FragmentText key={index}>{part.value}</FragmentText>;
        }

        return (
          <strong
            key={index}
            className={`mr-1.5 inline-block font-[family:var(--font-stage)] text-[1em] font-black leading-none ${
              part.kind === "chord"
                ? appearance.chordClassName
                : appearance.labelClassName
            }`}
          >
            {part.value}
          </strong>
        );
      })}
    </p>
  );
}

function FragmentText({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

type StageLinePart =
  | { kind: "chord" | "label" | "space" | "word"; value: string };

function getStageLineParts(line: string): StageLinePart[] {
  const lineParts = line.split(/(\[[^\]\r\n]+\])/g).filter(Boolean);
  const renderedParts: StageLinePart[] = [];

  for (const linePart of lineParts) {
    if (linePart.startsWith("[") && linePart.endsWith("]")) {
      const value = linePart.slice(1, -1).trim();
      renderedParts.push({
        kind: transposeChord(value, 0, "sharps") ? "chord" : "label",
        value,
      });
      continue;
    }

    for (const token of linePart.split(/(\s+)/)) {
      renderedParts.push({
        kind: token.trim() ? "word" : "space",
        value: token,
      });
    }
  }

  return renderedParts;
}

function parseStageSections({
  source,
  trackId,
  trackTitle,
}: {
  source: string;
  trackId: string;
  trackTitle: string;
}): StageSection[] {
  const sections: StageSection[] = [];
  let currentSection: StageSection | null = null;

  function startSection(title: string): StageSection {
    const section = {
      id: `${trackId}-${createSectionSlug(title)}-${sections.length}`,
      trackId,
      trackTitle,
      title,
      number: sections.length + 1,
      lines: [],
    };
    sections.push(section);
    return section;
  }

  for (const line of source.split("\n")) {
    const sectionTitle = getSectionTitle(line);

    if (sectionTitle) {
      currentSection = startSection(sectionTitle);
      continue;
    }

    if (!currentSection) {
      currentSection = startSection("Song");
    }

    currentSection.lines.push(line);
  }

  return sections.filter((section) =>
    section.lines.some((line) => line.trim().length > 0),
  );
}

function getSectionTitle(line: string): string | null {
  const match = /^\s*\[([^\]\r\n]+)\]\s*$/.exec(line);

  if (!match) {
    return null;
  }

  const value = match[1].trim();
  return transposeChord(value, 0, "sharps") ? null : value;
}

function createSectionSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "") || "section"
  );
}

function getStageAppearance(
  mode: StageDisplayMode,
  isDark: boolean,
): StageAppearance {
  const base = {
    activeSectionBorderClassName: "border-[#ed1746]",
    idleSectionBorderClassName: isDark
      ? "border-[#343740]"
      : "border-[#d8d3c8]",
    labelClassName: isDark ? "text-[#b8b2a7]" : "text-[#57534e]",
    lyricClassName: isDark ? "text-[#f5f3ed]" : "text-[#151515]",
    sectionSurfaceClassName: isDark ? "bg-[#111216]" : "bg-[#fffdf8]",
  };

  if (mode === "vocals") {
    return {
      ...base,
      chordClassName: isDark ? "text-[#71717a]" : "text-[#a1a1aa]",
    };
  }

  return {
    ...base,
    chordClassName: isDark ? "text-[#d4d4d8]" : "text-[#3f3f46]",
  };
}

function stageButtonClass(isDark: boolean): string {
  return `inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-40 ${
    isDark
      ? "border-[#343740] bg-[#17191f] text-[#f5f3ed] hover:border-[#ed1746]"
      : "border-[#d8d3c8] bg-white text-[#151515] hover:border-[#ed1746]"
  }`;
}
