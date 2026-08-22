"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChordCard } from "@/components/shared/chords/chord-card";
import { PianoChordCard } from "@/components/shared/chords/piano-chord-card";
import {
  GUITAR_CHORDS,
  PIANO_CHORDS,
  UKELELE_CHORDS,
  normalizeChordSymbol,
  type ChordDefinition,
  type PianoChordDefinition,
} from "@/data/chords";
import { APP_CONSTANTS } from "@/lib/app-constants";
import {
  splitVariationSuffix,
  transposeChord,
  transposeChordPro,
  type AccidentalPreference,
} from "@/lib/chords/chord-pro";
import type { TrackPreference } from "@/types/track-preference";

export type ChordFullscreenTrack = {
  title: string;
  artistName: string;
  key: string;
  lyricsAndChords: string;
};

type ChordSection = {
  id: string;
  title: string;
  lines: string[];
  chords: string[];
  chordPreview: string;
};

const SECTION_ANCHOR_RATIO = 0.75;
const SECTION_VISIBILITY_CUTOFF_RATIO = 0.25;

export function ChordFullscreenPerformanceLauncher({
  chordInstrument = "guitar",
  onVariationChange,
  track,
  trackPreference = { c: {} },
}: {
  chordInstrument?: TrackChordInstrument;
  onVariationChange?: (
    instrument: TrackChordInstrument,
    chordReference: GuitarChordReference,
    variationIndex: number,
  ) => void;
  track: ChordFullscreenTrack;
  trackPreference?: TrackPreference;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function handleOpen(): void {
    setIsOpen(true);
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open fullscreen chord performance view"
        onClick={handleOpen}
        className="fixed bottom-24 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#ed1746] text-white shadow-[0_16px_40px_rgba(237,23,70,0.35)] transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed1746] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
      >
        <PlayIcon />
      </button>
      {isOpen ? (
        <ChordFullscreenPerformanceView
          chordInstrument={chordInstrument}
          onVariationChange={onVariationChange}
          track={track}
          trackPreference={trackPreference}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ChordFullscreenPerformanceView({
  chordInstrument = "guitar",
  onVariationChange,
  track,
  trackPreference = { c: {} },
  onClose,
}: {
  chordInstrument?: TrackChordInstrument;
  onVariationChange?: (
    instrument: TrackChordInstrument,
    chordReference: GuitarChordReference,
    variationIndex: number,
  ) => void;
  track: ChordFullscreenTrack;
  trackPreference?: TrackPreference;
  onClose: () => void;
}) {
  const [transpose, setTranspose] = useState(0);
  const accidentals: AccidentalPreference = "sharps";
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [visibleSectionIds, setVisibleSectionIds] = useState<string[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const source = useMemo(
    () => transposeChordPro(track.lyricsAndChords, transpose, accidentals),
    [track.lyricsAndChords, transpose, accidentals],
  );
  const sections = useMemo(() => parseChordSections(source), [source]);

  const updateVisibleSections = useCallback(() => {
    const scroller = scrollerRef.current;

    if (!scroller || !sections.length) {
      return;
    }

    const viewportTop = scroller.scrollTop;
    const viewportBottom = viewportTop + scroller.clientHeight;
    const currentSectionCutoff =
      viewportTop + scroller.clientHeight * SECTION_VISIBILITY_CUTOFF_RATIO;
    const nextVisibleSectionIds: string[] = [];

    for (const [index, section] of sections.entries()) {
      const element = sectionRefs.current.get(section.id);
      const nextSection = sections[index + 1];
      const nextElement = nextSection
        ? sectionRefs.current.get(nextSection.id)
        : null;

      if (!element) {
        continue;
      }

      const sectionTop = element.offsetTop;
      const sectionBottom =
        nextElement?.offsetTop ?? element.offsetTop + element.offsetHeight;

      if (sectionBottom >= currentSectionCutoff && sectionTop <= viewportBottom) {
        nextVisibleSectionIds.push(section.id);
      }
    }

    if (!nextVisibleSectionIds.length) {
      nextVisibleSectionIds.push(sections[0].id);
    }

    const cappedVisibleSectionIds = nextVisibleSectionIds.slice(0, 2);

    setVisibleSectionIds((currentIds) =>
      areStringArraysEqual(currentIds, cappedVisibleSectionIds)
        ? currentIds
        : cappedVisibleSectionIds,
    );
  }, [sections]);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    function handleFullscreenChange(): void {
      if (!document.fullscreenElement) {
        onClose();
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target;
      const isFormControl =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement;

      if (isFormControl) {
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setScrollSpeed((speed) => Math.min(12, speed + 1));
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setScrollSpeed((speed) => Math.max(0, speed - 1));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (scrollSpeed <= 0) {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = null;
      lastFrameTimeRef.current = null;
      return;
    }

    function step(timestamp: number): void {
      const scroller = scrollerRef.current;

      if (scroller) {
        const lastFrameTime = lastFrameTimeRef.current ?? timestamp;
        const elapsedSeconds = (timestamp - lastFrameTime) / 1000;
        scroller.scrollTop += elapsedSeconds * scrollSpeed * 36;
        lastFrameTimeRef.current = timestamp;
        updateVisibleSections();
      }

      animationFrameRef.current = window.requestAnimationFrame(step);
    }

    animationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = null;
      lastFrameTimeRef.current = null;
    };
  }, [scrollSpeed, updateVisibleSections]);

  function handleClose(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    onClose();
  }

  function handleSectionSelect(sectionId: string): void {
    const scroller = scrollerRef.current;
    const sectionElement = sectionRefs.current.get(sectionId);

    if (!scroller || !sectionElement) {
      return;
    }

    scroller.scrollTo({
      top: Math.max(
        0,
        sectionElement.offsetTop - scroller.clientHeight * SECTION_ANCHOR_RATIO,
      ),
      behavior: "auto",
    });
    lastFrameTimeRef.current = null;
    setVisibleSectionIds((currentIds) =>
      currentIds.includes(sectionId) ? currentIds : [sectionId],
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 grid grid-cols-[minmax(320px,33.333vw)_minmax(0,1fr)] ${
        isDarkMode ? "dark bg-[#171819] text-white" : "bg-white text-[#111]"
      }`}
    >
      <aside
        className={`flex min-h-0 min-w-0 flex-col overflow-x-hidden border-r px-6 py-5 ${
          isDarkMode
            ? "border-[#2c2c31] bg-[#18181b]"
            : "border-[#dfdfe2] bg-[#f7f7f8]"
        }`}
      >
        <div
          className={`min-w-0 border-b pb-5 ${
            isDarkMode ? "border-[#303034]" : "border-[#dedee3]"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black">{track.title}</h1>
              <p
                className={`mt-1 truncate text-[14px] font-bold ${
                  isDarkMode ? "text-[#b4b4bc]" : "text-[#666]"
                }`}
              >
                {track.artistName}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close fullscreen chord performance view"
              onClick={handleClose}
              className={`flex size-10 shrink-0 items-center justify-center rounded-full border transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
                isDarkMode
                  ? "border-[#38383d] bg-[#222226] text-white"
                  : "border-[#d6d6d9] bg-white text-[#111]"
              }`}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex h-9 items-center overflow-hidden rounded-full border ${
                isDarkMode
                  ? "border-[#3a3a3f] bg-[#202023]"
                  : "border-[#d4d4d8] bg-white"
              }`}
            >
              <span
                className={`border-r px-3 text-[11px] font-black ${
                  isDarkMode ? "border-[#3a3a3f]" : "border-[#d4d4d8]"
                }`}
              >
                Transpose
              </span>
              <button
                type="button"
                disabled={transpose <= -12}
                aria-label="Transpose down one semitone"
                onClick={() => setTranspose((value) => Math.max(-12, value - 1))}
                className={`flex h-full w-9 items-center justify-center text-[16px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] ${
                  isDarkMode ? "hover:bg-[#2a2a2f]" : "hover:bg-[#f0f0f1]"
                }`}
              >
                -
              </button>
              <span className="min-w-8 text-center text-[12px] font-bold tabular-nums">
                {transpose}
              </span>
              <button
                type="button"
                disabled={transpose >= 12}
                aria-label="Transpose up one semitone"
                onClick={() => setTranspose((value) => Math.min(12, value + 1))}
                className={`flex h-full w-9 items-center justify-center text-[16px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] ${
                  isDarkMode ? "hover:bg-[#2a2a2f]" : "hover:bg-[#f0f0f1]"
                }`}
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTranspose(0)}
              className={`h-9 rounded-full border px-3 text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-[#ed1746] ${
                isDarkMode
                  ? "border-[#3a3a3f] bg-[#202023] hover:bg-[#2a2a2f]"
                  : "border-[#d4d4d8] bg-white hover:bg-[#f0f0f1]"
              }`}
            >
              Reset
            </button>
          </div>
        </div>

        <div
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto py-5"
        >
          <div className="grid gap-1">
            {sections.map((section) => {
              const isVisible = visibleSectionIds.length
                ? visibleSectionIds.includes(section.id)
                : section.id === sections[0]?.id;

              return (
                <div
                  key={section.id}
                  aria-current={isVisible ? "true" : undefined}
                  className={
                    isVisible
                      ? `border-t pt-2 text-left first:border-t-0 first:pt-0 ${
                          isDarkMode ? "border-[#303034]" : "border-[#e1e1e4]"
                        }`
                      : `rounded-lg border-t px-3 py-2 text-left transition first:border-t-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
                          isDarkMode
                            ? "border-[#303034] hover:bg-[#202023]"
                            : "border-[#e1e1e4] hover:bg-white"
                        }`
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSectionSelect(section.id)}
                    className="flex min-w-0 max-w-full items-baseline gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
                  >
                    <span className="shrink-0 text-[13px] font-black uppercase">
                      {section.title}
                    </span>
                    {!isVisible && section.chordPreview ? (
                      <span
                        className={`min-w-0 flex-1 truncate text-[11px] font-bold ${
                          isDarkMode ? "text-[#a1a1aa]" : "text-[#71717a]"
                        }`}
                      >
                        {section.chordPreview}
                      </span>
                    ) : null}
                  </button>
                  {isVisible ? (
                    <div className="mt-2">
                      <div
                        className={
                          chordInstrument === "piano"
                            ? "flex min-w-0 flex-wrap gap-2"
                            : "flex min-w-0 flex-wrap gap-1"
                        }
                      >
                        {section.chords.length ? (
                          <SectionChordShapes
                            chordInstrument={chordInstrument}
                            chords={section.chords}
                            onVariationChange={onVariationChange}
                            trackPreference={trackPreference}
                          />
                        ) : (
                          <span
                            className={`text-[12px] font-bold ${
                              isDarkMode ? "text-[#a1a1aa]" : "text-[#71717a]"
                            }`}
                          >
                            No chords in this section
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <main
        className={`relative min-h-0 ${
          isDarkMode
            ? "bg-[#171819] text-[#6f7175]"
            : "bg-white text-[#111]"
        }`}
      >
        <button
          type="button"
          aria-label={isDarkMode ? "Use light play mode" : "Use dark play mode"}
          onClick={() => setIsDarkMode((value) => !value)}
          className={`absolute right-5 top-5 z-10 flex size-11 items-center justify-center rounded-full border shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
            isDarkMode
              ? "border-[#34363a] bg-[#202124] text-[#f3f0e8] hover:bg-[#282a2d]"
              : "border-[#dedee3] bg-white text-[#111] hover:bg-[#f3f3f4]"
          }`}
        >
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </button>
        <div
          ref={scrollerRef}
          onScroll={updateVisibleSections}
          className="h-screen overflow-y-auto px-10 pb-[75vh] pt-[75vh]"
        >
          <div className="mx-auto max-w-[980px]">
            {sections.length ? (
              sections.map((section) => (
                <section
                  key={section.id}
                  ref={(element) => {
                    if (element) {
                      sectionRefs.current.set(section.id, element);
                    } else {
                      sectionRefs.current.delete(section.id);
                    }
                  }}
                  className="scroll-mt-8 pb-1.5 pt-8 first:pt-0"
                >
                  <h2
                    className={`mb-3 flex items-center gap-4 text-[13px] font-black uppercase tracking-[0.16em] ${
                      isDarkMode ? "text-[#8a8d92]" : "text-[#ed1746]"
                    }`}
                  >
                    <span>{section.title}</span>
                    <span
                      className={`h-px flex-1 ${
                        isDarkMode ? "bg-[#2b2d30]" : "bg-[#e4e4e7]"
                      }`}
                    />
                  </h2>
                  <div className="space-y-0 font-mono text-[19px] leading-[1.18]">
                    {section.lines.length ? (
                      section.lines.map((line, index) => (
                        <ChordPerformanceLine
                          key={`${section.id}-${index}`}
                          isDarkMode={isDarkMode}
                          line={line}
                        />
                      ))
                    ) : (
                      <p
                        className={`text-[18px] font-bold ${
                          isDarkMode ? "text-[#6f7175]" : "text-[#71717a]"
                        }`}
                      >
                        No lyrics in this section
                      </p>
                    )}
                  </div>
                </section>
              ))
            ) : (
              <div
                className={`rounded-xl border border-dashed px-5 py-16 text-center ${
                  isDarkMode ? "border-[#34363a]" : "border-[#d9d9d9]"
                }`}
              >
                <h2 className="text-[16px] font-bold">No lyrics or chords yet</h2>
              </div>
            )}
          </div>
        </div>
        <div
          className={`absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-3 shadow-[0_16px_45px_rgba(0,0,0,0.16)] backdrop-blur ${
            isDarkMode
              ? "border-[#34343a] bg-[#1c1c20]/95"
              : "border-[#dedee3] bg-white/95"
          }`}
        >
          <button
            type="button"
            aria-label="Decrease auto-scroll speed"
            onClick={() => setScrollSpeed((speed) => Math.max(0, speed - 1))}
            className={`flex size-10 items-center justify-center rounded-full text-xl font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
              isDarkMode
                ? "bg-[#303036] text-white hover:bg-[#3a3a40]"
                : "bg-[#eeeeef] text-[#111] hover:bg-[#e2e2e4]"
            }`}
          >
            -
          </button>
          <div className="min-w-28 text-center">
            <p
              className={`text-[10px] font-black uppercase tracking-[0.12em] ${
                isDarkMode ? "text-[#a1a1aa]" : "text-[#71717a]"
              }`}
            >
              Auto Scroll
            </p>
            <p className="text-[14px] font-black tabular-nums">
              {scrollSpeed === 0 ? "Off" : `Speed ${scrollSpeed}`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Increase auto-scroll speed"
            onClick={() => setScrollSpeed((speed) => Math.min(12, speed + 1))}
            className="flex size-10 items-center justify-center rounded-full bg-[#ed1746] text-xl font-black text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
          >
            +
          </button>
        </div>
      </main>
    </div>
  );
}

function SectionChordShapes({
  chordInstrument,
  chords,
  onVariationChange,
  trackPreference,
}: {
  chordInstrument: TrackChordInstrument;
  chords: string[];
  onVariationChange?: (
    instrument: TrackChordInstrument,
    chordReference: GuitarChordReference,
    variationIndex: number,
  ) => void;
  trackPreference: TrackPreference;
}) {
  return chords.map((chord) => {
    const chordReference = getGuitarChordReference(chord);

    if (!chordReference) {
      return (
        <span
          key={chord}
          className="rounded-md bg-[#fff0f3] px-2 py-1 text-[12px] font-black text-[#ed1746] dark:bg-[#3a111d] dark:text-[#fb7185]"
        >
          {chord}
        </span>
      );
    }

    if (chordInstrument === "piano") {
      const pianoReference = getPianoChordReference(chordReference);

      return (
        <div
          key={pianoReference.key}
          className="min-w-0 flex-[0_0_fit-content] overflow-hidden [&_article]:min-h-0 [&_article]:w-fit [&_article]:px-0 [&_article]:pt-0 [&_figure]:mt-0 [&_figure_svg]:max-w-[96px]"
        >
          <PianoChordCard
            chord={pianoReference.chord}
            compact
            initialVariationIndex={pianoReference.variationIndex}
            selectedVariationIndex={getSelectedVariationIndex(
              "piano",
              chordReference,
              pianoReference.variationIndex,
              trackPreference,
            )}
            onVariationIndexChange={(variationIndex) =>
              onVariationChange?.("piano", chordReference, variationIndex)
            }
            variationLabel={getPianoChordVariationLabel(pianoReference)}
            viewOnly
            unframed
          />
        </div>
      );
    }

    if (chordInstrument === "ukulele") {
      const ukuleleReference = getUkuleleChordReference(chordReference);

      return (
        <div
          key={ukuleleReference.key}
          className="min-w-0 flex-[0_1_70px] overflow-hidden [&_article]:w-full [&_article]:min-h-0 [&_article]:px-0 [&_article]:pt-0 [&_figure]:mt-0 [&_figure_svg]:max-w-[48px]"
        >
          <ChordCard
            chord={ukuleleReference.chord}
            compact
            instrumentLabel="ukulele"
            initialVariationIndex={ukuleleReference.variationIndex}
            selectedVariationIndex={getSelectedVariationIndex(
              "ukulele",
              chordReference,
              ukuleleReference.variationIndex,
              trackPreference,
            )}
            onVariationIndexChange={(variationIndex) =>
              onVariationChange?.("ukulele", chordReference, variationIndex)
            }
            variationLabel={getUkuleleChordVariationLabel(ukuleleReference)}
            viewOnly
            unframed
          />
        </div>
      );
    }

    return (
      <div
        key={chordReference.key}
        className="min-w-0 flex-[0_1_70px] overflow-hidden [&_article]:w-full [&_article]:min-h-0 [&_article]:px-0 [&_article]:pt-0 [&_figure]:mt-0 [&_figure_svg]:max-w-[48px]"
      >
        <ChordCard
          chord={chordReference.chord}
          compact
          initialVariationIndex={chordReference.variationIndex}
          selectedVariationIndex={getSelectedVariationIndex(
            "guitar",
            chordReference,
            chordReference.variationIndex,
            trackPreference,
          )}
          onVariationIndexChange={(variationIndex) =>
            onVariationChange?.("guitar", chordReference, variationIndex)
          }
          variationLabel={getChordVariationLabel(chordReference)}
          viewOnly
          unframed
        />
      </div>
    );
  });
}

function ChordPerformanceLine({
  isDarkMode,
  line,
}: {
  isDarkMode: boolean;
  line: string;
}) {
  const parts = line.split(/(\[[^\]\r\n]+\])/g).filter(Boolean);

  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (!part.startsWith("[") || !part.endsWith("]")) {
          return <span key={index}>{part}</span>;
        }

        const value = part.slice(1, -1).trim();
        const isChord = Boolean(transposeChord(value, 0, "sharps"));

        return isChord ? (
          <span
            key={index}
            className={`mr-1.5 inline-block font-sans text-[14px] font-black leading-none ${
              isDarkMode ? "text-[#f3f0e8]" : "text-[#111]"
            }`}
          >
            {value}
          </span>
        ) : (
          <strong
            key={index}
            className={`mr-1.5 inline-block font-sans text-[14px] font-black ${
              isDarkMode ? "text-[#9a9da3]" : "text-[#555]"
            }`}
          >
            {value}
          </strong>
        );
      })}
    </p>
  );
}

function parseChordSections(source: string): ChordSection[] {
  const sections: ChordSection[] = [];
  let currentSection: ChordSection | null = null;

  function startSection(title: string): ChordSection {
    const section = {
      id: createSectionId(title, sections.length),
      title,
      lines: [],
      chords: [],
      chordPreview: "",
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

    const lineChords = getLineChords(line);

    for (const chord of lineChords) {
      if (!currentSection.chords.includes(chord)) {
        currentSection.chords.push(chord);
      }
    }

    currentSection.chordPreview = currentSection.chords.join(" - ");
  }

  return sections.filter(
    (section) => section.lines.some((line) => line.trim()) || section.chords.length,
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

function getLineChords(line: string): string[] {
  const chords: string[] = [];

  for (const match of line.matchAll(/\[([^\]\r\n]+)\]/g)) {
    const value = match[1].trim();

    if (transposeChord(value, 0, "sharps")) {
      chords.push(value);
    }
  }

  return chords;
}

function createSectionId(title: string, index: number): string {
  const slug = title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");
  return `${slug || "section"}-${index}`;
}

function areStringArraysEqual(first: string[], second: string[]): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

type GuitarChordReference = {
  key: string;
  chord: ChordDefinition;
  displaySymbol: string;
  hasExplicitVariation: boolean;
  variationIndex: number;
  variationNumber: number | null;
};

type TrackChordInstrument = "guitar" | "ukulele" | "piano";

type PianoChordReference = {
  key: string;
  chord: PianoChordDefinition;
  hasExplicitVariation: boolean;
  variationIndex: number;
  variationNumber: number | null;
};

type UkuleleChordReference = {
  key: string;
  chord: ChordDefinition;
  hasExplicitVariation: boolean;
  variationIndex: number;
  variationNumber: number | null;
};

function getGuitarChordReference(value: string): GuitarChordReference | null {
  const parsedChord = splitVariationSuffix(value);
  const normalizedSymbol = normalizeChordSymbol(parsedChord.symbol);

  if (!normalizedSymbol) {
    return null;
  }

  const chord =
    findGuitarChord(normalizedSymbol) ?? createEmptyGuitarChord(normalizedSymbol);

  if (!chord) {
    return null;
  }

  return {
    key: `${chord.symbol}-${parsedChord.variationNumber ?? 1}`,
    chord,
    displaySymbol: chord.symbol,
    hasExplicitVariation: parsedChord.variationNumber !== null,
    variationIndex: parsedChord.variationNumber
      ? parsedChord.variationNumber - 1
      : 0,
    variationNumber: parsedChord.variationNumber,
  };
}

function findGuitarChord(symbol: string): ChordDefinition | null {
  const candidates = getNormalizedChordCandidates(symbol);

  for (const candidate of candidates) {
    const chord = GUITAR_CHORDS.find((item) => item.symbol === candidate);

    if (chord) {
      return chord;
    }
  }

  return null;
}

function getPianoChordReference(
  guitarReference: GuitarChordReference,
): PianoChordReference {
  const chord =
    findPianoChord(guitarReference.displaySymbol) ??
    createEmptyPianoChord(guitarReference.displaySymbol);

  return {
    key: `${chord.symbol}-${guitarReference.variationNumber ?? 1}`,
    chord,
    hasExplicitVariation: guitarReference.hasExplicitVariation,
    variationIndex: guitarReference.variationIndex,
    variationNumber: guitarReference.variationNumber,
  };
}

function getUkuleleChordReference(
  guitarReference: GuitarChordReference,
): UkuleleChordReference {
  const chord =
    findUkuleleChord(guitarReference.displaySymbol) ??
    createEmptyUkuleleChord(guitarReference.displaySymbol);

  return {
    key: `${chord.symbol}-${guitarReference.variationNumber ?? 1}`,
    chord,
    hasExplicitVariation: guitarReference.hasExplicitVariation,
    variationIndex: guitarReference.variationIndex,
    variationNumber: guitarReference.variationNumber,
  };
}

function getChordVariationLabel(chordReference: GuitarChordReference) {
  return APP_CONSTANTS.featureFlag.showChordVariationLabel &&
    chordReference.hasExplicitVariation
    ? chordReference.variationNumber
    : null;
}

function getPianoChordVariationLabel(chordReference: PianoChordReference) {
  return APP_CONSTANTS.featureFlag.showChordVariationLabel &&
    chordReference.hasExplicitVariation
    ? chordReference.variationNumber
    : null;
}

function getUkuleleChordVariationLabel(chordReference: UkuleleChordReference) {
  return APP_CONSTANTS.featureFlag.showChordVariationLabel &&
    chordReference.hasExplicitVariation
    ? chordReference.variationNumber
    : null;
}

function getSelectedVariationIndex(
  instrument: TrackChordInstrument,
  chordReference: GuitarChordReference,
  fallbackVariationIndex: number,
  trackPreference: TrackPreference,
) {
  return (
    trackPreference.c[chordReference.key]?.[
      getChordPreferenceField(instrument)
    ] ?? fallbackVariationIndex
  );
}

function getChordPreferenceField(instrument: TrackChordInstrument): 0 | 1 | 2 {
  if (instrument === "guitar") {
    return 0;
  }

  return instrument === "piano" ? 1 : 2;
}

function findPianoChord(symbol: string): PianoChordDefinition | null {
  const candidates = getNormalizedChordCandidates(symbol);

  for (const candidate of candidates) {
    const chord = PIANO_CHORDS.find((item) => item.symbol === candidate);

    if (chord) {
      return chord;
    }
  }

  return null;
}

function findUkuleleChord(symbol: string): ChordDefinition | null {
  const candidates = getNormalizedChordCandidates(symbol);

  for (const candidate of candidates) {
    const chord = UKELELE_CHORDS.find((item) => item.symbol === candidate);

    if (chord) {
      return chord;
    }
  }

  return null;
}

function createEmptyGuitarChord(symbol: string): ChordDefinition | null {
  const parsedChord = parseChordSymbol(symbol);

  if (!parsedChord) {
    return null;
  }

  return {
    symbol,
    root: parsedChord.root,
    quality: parsedChord.quality,
    bass: parsedChord.bass,
    variations: [
      {
        id: `${symbol.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-empty`,
        frets: [0, 0, 0, 0, 0, 0],
      },
    ],
  };
}

function getNormalizedChordCandidates(symbol: string): string[] {
  return [
    normalizeChordSymbol(symbol),
    normalizeChordSymbol(transposeChord(symbol, 0, "sharps") ?? ""),
    normalizeChordSymbol(transposeChord(symbol, 0, "flats") ?? ""),
  ].filter((value, index, values): value is string =>
    Boolean(value && values.indexOf(value) === index),
  );
}

function createEmptyPianoChord(symbol: string): PianoChordDefinition {
  const parsedChord = parseChordSymbol(symbol);

  return {
    symbol,
    root: parsedChord?.root ?? symbol,
    quality: parsedChord?.quality ?? "",
    variations: [
      {
        id: `${symbol.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-empty`,
        symbol,
        label: "No chord data",
        notes: [],
      },
    ],
  };
}

function createEmptyUkuleleChord(symbol: string): ChordDefinition {
  const parsedChord = parseChordSymbol(symbol);

  return {
    symbol,
    root: parsedChord?.root ?? symbol,
    quality: parsedChord?.quality ?? "",
    ...(parsedChord?.bass ? { bass: parsedChord.bass } : {}),
    variations: [
      {
        id: `${symbol.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-empty`,
        frets: [0, 0, 0, 0],
      },
    ],
  };
}

function parseChordSymbol(symbol: string): {
  root: string;
  quality: string;
  bass?: string;
} | null {
  const match = /^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/.exec(symbol);

  if (!match) {
    return null;
  }

  return {
    root: match[1],
    quality: match[2],
    ...(match[3] ? { bass: match[3] } : {}),
  };
}

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="ml-1 size-7"
      fill="currentColor"
    >
      <path d="M8 5.75v12.5c0 .78.86 1.25 1.51.82l9.38-6.25a.98.98 0 0 0 0-1.64L9.51 4.93A.98.98 0 0 0 8 5.75Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M20.99 12.45A8.99 8.99 0 0 1 11.55 3a7 7 0 1 0 9.44 9.45Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}
