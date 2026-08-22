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
};

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

      if (sectionBottom >= viewportTop && sectionTop <= viewportBottom) {
        nextVisibleSectionIds.push(section.id);
      }
    }

    if (!nextVisibleSectionIds.length) {
      nextVisibleSectionIds.push(sections[0].id);
    }

    setVisibleSectionIds((currentIds) =>
      areStringArraysEqual(currentIds, nextVisibleSectionIds)
        ? currentIds
        : nextVisibleSectionIds,
    );
  }, [sections]);

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
      top: Math.max(0, sectionElement.offsetTop - scroller.clientHeight / 3),
      behavior: "auto",
    });
    lastFrameTimeRef.current = null;
    setVisibleSectionIds((currentIds) =>
      currentIds.includes(sectionId) ? currentIds : [sectionId],
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[minmax(320px,33.333vw)_minmax(0,1fr)] bg-white text-[#111] dark:bg-[#111113] dark:text-white">
      <aside className="flex min-h-0 flex-col border-r border-[#dfdfe2] bg-[#f7f7f8] px-6 py-5 dark:border-[#2c2c31] dark:bg-[#18181b]">
        <div className="min-w-0 border-b border-[#dedee3] pb-5 dark:border-[#303034]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black">{track.title}</h1>
              <p className="mt-1 truncate text-[14px] font-bold text-[#666] dark:text-[#b4b4bc]">
                {track.artistName}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close fullscreen chord performance view"
              onClick={handleClose}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#d6d6d9] bg-white text-[#111] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#38383d] dark:bg-[#222226] dark:text-white"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-[#d4d4d8] bg-white dark:border-[#3a3a3f] dark:bg-[#202023]">
              <span className="border-r border-[#d4d4d8] px-3 text-[11px] font-black dark:border-[#3a3a3f]">
                Transpose
              </span>
              <button
                type="button"
                disabled={transpose <= -12}
                aria-label="Transpose down one semitone"
                onClick={() => setTranspose((value) => Math.max(-12, value - 1))}
                className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#f0f0f1] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#2a2a2f]"
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
                className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#f0f0f1] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#2a2a2f]"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTranspose(0)}
              className="h-9 rounded-full border border-[#d4d4d8] bg-white px-3 text-[11px] font-bold transition hover:bg-[#f0f0f1] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#202023] dark:hover:bg-[#2a2a2f]"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-5">
          <div className="grid gap-2">
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
                      ? "rounded-lg border border-[#ed1746] bg-white p-3 text-left shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#202023]"
                      : "rounded-lg border border-transparent p-3 text-left transition hover:border-[#d7d7db] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:border-[#36363c] dark:hover:bg-[#202023]"
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSectionSelect(section.id)}
                    className="block w-full rounded-md text-left text-[13px] font-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
                  >
                    {section.title}
                  </button>
                  {isVisible ? (
                    <div className="mt-3">
                      <div
                        className={
                          chordInstrument === "piano"
                            ? "grid grid-cols-2 gap-2"
                            : "grid grid-cols-4 gap-2"
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
                          <span className="text-[12px] font-bold text-[#71717a] dark:text-[#a1a1aa]">
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

      <main className="relative min-h-0 bg-white dark:bg-[#111113]">
        <div
          ref={scrollerRef}
          onScroll={updateVisibleSections}
          className="h-screen overflow-y-auto px-10 pb-[33vh] pt-[33vh]"
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
                  className="scroll-mt-8 py-5 first:pt-0"
                >
                  <h2 className="mb-5 text-[15px] font-black uppercase tracking-[0.16em] text-[#ed1746]">
                    {section.title}
                  </h2>
                  <div className="space-y-2 font-mono text-[24px] leading-[1.8]">
                    {section.lines.length ? (
                      section.lines.map((line, index) => (
                        <ChordPerformanceLine
                          key={`${section.id}-${index}`}
                          line={line}
                        />
                      ))
                    ) : (
                      <p className="text-[18px] font-bold text-[#71717a] dark:text-[#a1a1aa]">
                        No lyrics in this section
                      </p>
                    )}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[#d9d9d9] px-5 py-16 text-center dark:border-[#3a3a3f]">
                <h2 className="text-[16px] font-bold">No lyrics or chords yet</h2>
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#dedee3] bg-white/95 px-4 py-3 shadow-[0_16px_45px_rgba(0,0,0,0.16)] backdrop-blur dark:border-[#34343a] dark:bg-[#1c1c20]/95">
          <button
            type="button"
            aria-label="Decrease auto-scroll speed"
            onClick={() => setScrollSpeed((speed) => Math.max(0, speed - 1))}
            className="flex size-10 items-center justify-center rounded-full bg-[#eeeeef] text-xl font-black text-[#111] transition hover:bg-[#e2e2e4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#303036] dark:text-white dark:hover:bg-[#3a3a40]"
          >
            -
          </button>
          <div className="min-w-28 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#71717a] dark:text-[#a1a1aa]">
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
          className="[&_article]:w-full [&_article]:min-h-[136px] [&_article]:px-1 [&_article]:pt-1 [&_figure_svg]:max-w-[108px]"
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
          className="[&_article]:w-full [&_article]:min-h-[116px] [&_article]:px-0.5 [&_article]:pt-1 [&_figure_svg]:max-w-[54px]"
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
        className="[&_article]:w-full [&_article]:min-h-[116px] [&_article]:px-0.5 [&_article]:pt-1 [&_figure_svg]:max-w-[54px]"
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

function ChordPerformanceLine({ line }: { line: string }) {
  const parts = line.split(/(\[[^\]\r\n]+\])/g).filter(Boolean);

  return (
    <p className="min-h-11 whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (!part.startsWith("[") || !part.endsWith("]")) {
          return <span key={index}>{part}</span>;
        }

        const value = part.slice(1, -1).trim();
        const isChord = Boolean(transposeChord(value, 0, "sharps"));

        return isChord ? (
          <span
            key={index}
            className="mr-2 inline-block rounded-md bg-[#fff0f3] px-2 py-1 font-sans text-[18px] font-black leading-none text-[#ed1746] dark:bg-[#3a111d] dark:text-[#fb7185]"
          >
            {value}
          </span>
        ) : (
          <strong
            key={index}
            className="mr-2 inline-block font-sans text-[18px] font-black text-[#555] dark:text-[#c4c4cc]"
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

    for (const chord of getLineChords(line)) {
      if (!currentSection.chords.includes(chord)) {
        currentSection.chords.push(chord);
      }
    }
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
