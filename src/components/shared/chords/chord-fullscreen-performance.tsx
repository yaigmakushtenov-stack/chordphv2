"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

import {
  BrowserSpeechTextListener,
  type BrowserSpeechDiagnostic,
  type BrowserSpeechStatus,
  type BrowserSpeechTranscript,
} from "@/components/shared/browser-speech-text-listener";
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
  number: number;
  title: string;
  lines: ChordSectionLine[];
  chords: string[];
  chordPreview: string;
};

type ChordSectionLine = {
  id: string;
  globalIndex: number;
  sectionId: string;
  raw: string;
  lyricText: string;
  normalizedLyric: string;
};

type VoiceTranscriptChunk = {
  at: number;
  isFinal: boolean;
  text: string;
};

type VoiceTranscriptBatch = {
  isFinal: boolean;
  text: string;
};

type VoiceProcessingResult = {
  lineNumber: number | null;
  matchedText: string | null;
  score: number | null;
  status: "matched" | "no-match";
  transcript: string;
};

type VoiceGuideDebugState = {
  activeBatch: string | null;
  captureChunkCount: number;
  captureStatus: "idle" | "capturing" | "queued";
  lastCaptured: string | null;
  lastHeard: string | null;
  lastRecognizerDetail: string | null;
  lastRecognizerEvent: string | null;
  recognizerEvents: string[];
  recognizerRestartCount: number;
  lastResult: VoiceProcessingResult | null;
  pendingBatch: string | null;
  queueStatus: "idle" | "processing" | "pending";
};

type VoiceGuideToast = {
  detail: string | null;
  title: string;
};

const SECTION_ANCHOR_RATIO = 0.75;
const SECTION_VISIBILITY_CUTOFF_RATIO = 0.25;
const VOICE_GUIDE_HIGHLIGHT_CLASS = "text-cyan-300";
const VOICE_GUIDE_SCROLL_ANCHOR_RATIO = 0.25;
const VOICE_GUIDE_SCROLL_DURATION_MS = 1400;
const VOICE_GUIDE_PAUSE_MS = 850;
const VOICE_GUIDE_FINAL_PROCESS_MS = 150;
const VOICE_GUIDE_MAX_PHRASE_MS = 3500;
const EMPTY_VOICE_GUIDE_DEBUG_STATE: VoiceGuideDebugState = {
  activeBatch: null,
  captureChunkCount: 0,
  captureStatus: "idle",
  lastCaptured: null,
  lastHeard: null,
  lastRecognizerDetail: null,
  lastRecognizerEvent: null,
  recognizerEvents: [],
  recognizerRestartCount: 0,
  lastResult: null,
  pendingBatch: null,
  queueStatus: "idle",
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isHelperPanelOpen, setIsHelperPanelOpen] = useState(true);
  const [isVoiceGuideEnabled, setIsVoiceGuideEnabled] = useState(false);
  const [speechStatus, setSpeechStatus] =
    useState<BrowserSpeechStatus>("idle");
  const [voiceAudioLevel, setVoiceAudioLevel] = useState(0);
  const [matchedLineIndex, setMatchedLineIndex] = useState<number | null>(null);
  const [voiceGuideToast, setVoiceGuideToast] =
    useState<VoiceGuideToast | null>(null);
  const [voiceGuideDebug, setVoiceGuideDebug] =
    useState<VoiceGuideDebugState>(EMPTY_VOICE_GUIDE_DEBUG_STATE);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [visibleSectionIds, setVisibleSectionIds] = useState<string[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const lineRefs = useRef(new Map<number, HTMLParagraphElement>());
  const lyricLinesRef = useRef<ChordSectionLine[]>([]);
  const matchedLineIndexRef = useRef<number | null>(null);
  const visibleSectionIdsRef = useRef<string[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const voiceScrollFrameRef = useRef<number | null>(null);
  const voiceFinalProcessTimeoutRef = useRef<number | null>(null);
  const voiceMaxPhraseTimeoutRef = useRef<number | null>(null);
  const voicePauseTimeoutRef = useRef<number | null>(null);
  const voiceQueueProcessTimeoutRef = useRef<number | null>(null);
  const voiceToastTimeoutRef = useRef<number | null>(null);
  const isVoiceBatchProcessingRef = useRef(false);
  const pendingVoiceBatchRef = useRef<VoiceTranscriptBatch | null>(null);
  const voiceTranscriptBufferRef = useRef<VoiceTranscriptChunk[]>([]);

  const source = useMemo(
    () => transposeChordPro(track.lyricsAndChords, transpose, accidentals),
    [track.lyricsAndChords, transpose, accidentals],
  );
  const sections = useMemo(() => parseChordSections(source), [source]);
  const lyricLines = useMemo(
    () =>
      sections
        .flatMap((section) => section.lines)
        .filter((line) => line.normalizedLyric),
    [sections],
  );

  useEffect(() => {
    lyricLinesRef.current = lyricLines;
  }, [lyricLines]);

  useEffect(() => {
    matchedLineIndexRef.current = matchedLineIndex;
  }, [matchedLineIndex]);

  useEffect(() => {
    visibleSectionIdsRef.current = visibleSectionIds;
  }, [visibleSectionIds]);

  useEffect(
    () => () => {
      if (voiceToastTimeoutRef.current !== null) {
        window.clearTimeout(voiceToastTimeoutRef.current);
      }
      if (voiceFinalProcessTimeoutRef.current !== null) {
        window.clearTimeout(voiceFinalProcessTimeoutRef.current);
      }
      if (voiceMaxPhraseTimeoutRef.current !== null) {
        window.clearTimeout(voiceMaxPhraseTimeoutRef.current);
      }
      if (voicePauseTimeoutRef.current !== null) {
        window.clearTimeout(voicePauseTimeoutRef.current);
      }
      if (voiceQueueProcessTimeoutRef.current !== null) {
        window.clearTimeout(voiceQueueProcessTimeoutRef.current);
      }
      if (voiceScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(voiceScrollFrameRef.current);
      }
    },
    [],
  );

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
    if (scrollSpeed <= 0 || isVoiceGuideEnabled) {
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
  }, [isVoiceGuideEnabled, scrollSpeed, updateVisibleSections]);

  const scrollLineToCenter = useCallback((lineIndex: number) => {
    const scroller = scrollerRef.current;
    const lineElement = lineRefs.current.get(lineIndex);

    if (!scroller || !lineElement) {
      return;
    }

    const targetTop = Math.max(
      0,
      lineElement.offsetTop - scroller.clientHeight * VOICE_GUIDE_SCROLL_ANCHOR_RATIO,
    );

    if (voiceScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(voiceScrollFrameRef.current);
      voiceScrollFrameRef.current = null;
    }

    const activeScroller = scroller;
    const startTop = scroller.scrollTop;
    const distance = targetTop - startTop;
    const startTime = performance.now();

    function step(timestamp: number): void {
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / VOICE_GUIDE_SCROLL_DURATION_MS);
      const easedProgress = 1 - (1 - progress) ** 3;
      activeScroller.scrollTop = startTop + distance * easedProgress;
      updateVisibleSections();

      if (progress < 1) {
        voiceScrollFrameRef.current = window.requestAnimationFrame(step);
      } else {
        voiceScrollFrameRef.current = null;
      }
    }

    voiceScrollFrameRef.current = window.requestAnimationFrame(step);
  }, [updateVisibleSections]);

  const showVoiceGuideToast = useCallback(
    (toast: VoiceGuideToast, timeoutMs = 2500) => {
      if (voiceToastTimeoutRef.current !== null) {
        window.clearTimeout(voiceToastTimeoutRef.current);
        voiceToastTimeoutRef.current = null;
      }

      setVoiceGuideToast(toast);

      if (timeoutMs > 0) {
        voiceToastTimeoutRef.current = window.setTimeout(() => {
          setVoiceGuideToast(null);
          voiceToastTimeoutRef.current = null;
        }, timeoutMs);
      }
    },
    [],
  );

  const handleSpeechStatusChange = useCallback(
    (status: BrowserSpeechStatus) => {
      setSpeechStatus(status);

      if (status === "listening") {
        showVoiceGuideToast(
          {
            title: "Listening",
            detail: "Voice guide is waiting for lyrics.",
          },
          0,
        );
      }

      if (status === "error") {
        showVoiceGuideToast({
          title: "Voice guide error",
          detail: "Speech recognition could not continue. Check the Recognizer row.",
        });
      }

      if (status === "retrying") {
        showVoiceGuideToast(
          {
            title: "Retrying voice guide",
            detail: "Speech recognition did not return text yet.",
          },
          0,
        );
      }

      if (status === "unsupported") {
        setVoiceGuideDebug(EMPTY_VOICE_GUIDE_DEBUG_STATE);
        setIsVoiceGuideEnabled(false);
        window.alert("Voice guide is not supported by this browser.");
      }
    },
    [showVoiceGuideToast],
  );

  const handleSpeechDiagnostic = useCallback(
    (diagnostic: BrowserSpeechDiagnostic) => {
      const eventLabel = diagnostic.detail
        ? `${diagnostic.event}: ${diagnostic.detail}`
        : diagnostic.event;

      setVoiceGuideDebug((debug) => ({
        ...debug,
        lastRecognizerDetail: diagnostic.detail,
        lastRecognizerEvent: diagnostic.event,
        recognizerEvents: [eventLabel, ...debug.recognizerEvents].slice(0, 6),
        recognizerRestartCount: diagnostic.restartCount,
      }));
    },
    [],
  );

  const processVoiceTranscriptBatch = useCallback(
    ({ isFinal, text: batchText }: VoiceTranscriptBatch): VoiceProcessingResult => {
      const match = findBestVoiceLyricMatch({
        currentLineIndex: matchedLineIndexRef.current,
        isFinal,
        lines: lyricLinesRef.current,
        transcript: batchText,
        visibleSectionIds: visibleSectionIdsRef.current,
      });

      if (!match) {
        showVoiceGuideToast({
          title: "Processing phrase",
          detail: `No confident lyric match for "${trimVoiceToastText(batchText)}"`,
        });
        return {
          lineNumber: null,
          matchedText: null,
          score: null,
          status: "no-match",
          transcript: batchText,
        };
      }

      setMatchedLineIndex(match.line.globalIndex);
      scrollLineToCenter(match.line.globalIndex);
      showVoiceGuideToast({
        title: `Matched line ${match.line.globalIndex + 1}`,
        detail: trimVoiceToastText(match.line.lyricText || batchText),
      });
      return {
        lineNumber: match.line.globalIndex + 1,
        matchedText: match.line.lyricText,
        score: match.score,
        status: "matched",
        transcript: batchText,
      };
    },
    [scrollLineToCenter, showVoiceGuideToast],
  );

  const runVoiceTranscriptQueue = useCallback(() => {
    if (isVoiceBatchProcessingRef.current) {
      return;
    }

    isVoiceBatchProcessingRef.current = true;

    function processNextBatch(): void {
      const batch = pendingVoiceBatchRef.current;

      if (!batch) {
        isVoiceBatchProcessingRef.current = false;
        setVoiceGuideDebug((debug) => ({
          ...debug,
          activeBatch: null,
          queueStatus: debug.pendingBatch ? "pending" : "idle",
        }));
        return;
      }

      pendingVoiceBatchRef.current = null;
      setVoiceGuideDebug((debug) => ({
        ...debug,
        activeBatch: batch.text,
        pendingBatch: null,
        queueStatus: "processing",
      }));
      showVoiceGuideToast({
        title: "Processing phrase",
        detail: trimVoiceToastText(batch.text),
      });

      voiceQueueProcessTimeoutRef.current = window.setTimeout(() => {
        voiceQueueProcessTimeoutRef.current = null;
        const result = processVoiceTranscriptBatch(batch);
        setVoiceGuideDebug((debug) => ({
          ...debug,
          activeBatch: null,
          lastResult: result,
          queueStatus: pendingVoiceBatchRef.current ? "pending" : "idle",
        }));
        processNextBatch();
      }, 0);
    }

    processNextBatch();
  }, [processVoiceTranscriptBatch, showVoiceGuideToast]);

  const enqueueVoiceTranscriptBatch = useCallback(
    (batch: VoiceTranscriptBatch) => {
      pendingVoiceBatchRef.current = batch;
      setVoiceGuideDebug((debug) => ({
        ...debug,
        pendingBatch: batch.text,
        queueStatus: isVoiceBatchProcessingRef.current ? "pending" : "idle",
      }));
      runVoiceTranscriptQueue();
    },
    [runVoiceTranscriptQueue],
  );

  const clearVoicePhraseTimers = useCallback(() => {
    if (voiceFinalProcessTimeoutRef.current !== null) {
      window.clearTimeout(voiceFinalProcessTimeoutRef.current);
      voiceFinalProcessTimeoutRef.current = null;
    }

    if (voicePauseTimeoutRef.current !== null) {
      window.clearTimeout(voicePauseTimeoutRef.current);
      voicePauseTimeoutRef.current = null;
    }
  }, []);

  const processBufferedVoicePhrase = useCallback(
    (reason: "final" | "max" | "pause") => {
      const bufferedChunks = voiceTranscriptBufferRef.current;
      const phraseText = getBufferedVoicePhrase(bufferedChunks);

      clearVoicePhraseTimers();
      voiceTranscriptBufferRef.current = [];

      if (voiceMaxPhraseTimeoutRef.current !== null) {
        window.clearTimeout(voiceMaxPhraseTimeoutRef.current);
        voiceMaxPhraseTimeoutRef.current = null;
      }

      if (!phraseText) {
        showVoiceGuideToast(
          {
            title: "Listening",
            detail: "Waiting for the next lyric phrase.",
          },
          0,
        );
        return;
      }

      showVoiceGuideToast({
        title: reason === "pause" ? "Pause detected" : "Queued phrase",
        detail: trimVoiceToastText(phraseText),
      });
      setVoiceGuideDebug((debug) => ({
        ...debug,
        captureChunkCount: 0,
        captureStatus: "queued",
        lastCaptured: phraseText,
      }));
      enqueueVoiceTranscriptBatch({
        isFinal:
          reason === "final" || bufferedChunks.some((chunk) => chunk.isFinal),
        text: phraseText,
      });
    },
    [clearVoicePhraseTimers, enqueueVoiceTranscriptBatch, showVoiceGuideToast],
  );

  const handleSpeechTranscript = useCallback(
    (transcript: BrowserSpeechTranscript) => {
      const text = transcript.text.trim();

      if (!text) {
        return;
      }

      const now = Date.now();
      const nextBufferedChunks = [
        ...voiceTranscriptBufferRef.current,
        {
          at: now,
          isFinal: transcript.isFinal,
          text,
        },
      ];
      voiceTranscriptBufferRef.current = nextBufferedChunks;
      setVoiceGuideDebug((debug) => ({
        ...debug,
        captureChunkCount: nextBufferedChunks.length,
        captureStatus: "capturing",
        lastHeard: text,
      }));
      showVoiceGuideToast({
        title: "Heard",
        detail: trimVoiceToastText(text),
      });

      if (voicePauseTimeoutRef.current !== null) {
        window.clearTimeout(voicePauseTimeoutRef.current);
      }

      voicePauseTimeoutRef.current = window.setTimeout(() => {
        processBufferedVoicePhrase("pause");
      }, VOICE_GUIDE_PAUSE_MS);

      if (voiceMaxPhraseTimeoutRef.current === null) {
        voiceMaxPhraseTimeoutRef.current = window.setTimeout(() => {
          processBufferedVoicePhrase("max");
        }, VOICE_GUIDE_MAX_PHRASE_MS);
      }

      if (transcript.isFinal) {
        if (voiceFinalProcessTimeoutRef.current !== null) {
          window.clearTimeout(voiceFinalProcessTimeoutRef.current);
        }

        voiceFinalProcessTimeoutRef.current = window.setTimeout(() => {
          processBufferedVoicePhrase("final");
        }, VOICE_GUIDE_FINAL_PROCESS_MS);
      }
    },
    [processBufferedVoicePhrase, showVoiceGuideToast],
  );

  useEffect(() => {
    if (!isVoiceGuideEnabled) {
      voiceTranscriptBufferRef.current = [];
      pendingVoiceBatchRef.current = null;
      isVoiceBatchProcessingRef.current = false;
      clearVoicePhraseTimers();
      if (voiceMaxPhraseTimeoutRef.current !== null) {
        window.clearTimeout(voiceMaxPhraseTimeoutRef.current);
        voiceMaxPhraseTimeoutRef.current = null;
      }
      if (voiceQueueProcessTimeoutRef.current !== null) {
        window.clearTimeout(voiceQueueProcessTimeoutRef.current);
        voiceQueueProcessTimeoutRef.current = null;
      }
    }
  }, [clearVoicePhraseTimers, isVoiceGuideEnabled]);

  function handleClose(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    onClose();
  }

  function handleSectionSelect(sectionId: string): void {
    const scroller = scrollerRef.current;
    const sectionElement = sectionRefs.current.get(sectionId);
    const selectedSection = sections.find((section) => section.id === sectionId);

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

    const firstLyricLine = selectedSection?.lines.find(
      (line) => line.normalizedLyric,
    );

    if (firstLyricLine) {
      setMatchedLineIndex(firstLyricLine.globalIndex);
    }
  }

  function handleVoiceGuideToggle(): void {
    setIsVoiceGuideEnabled((enabled) => {
      const nextEnabled = !enabled;

      if (nextEnabled) {
        setScrollSpeed(0);
      } else {
        setSpeechStatus("idle");
        setVoiceGuideToast(null);
        setVoiceGuideDebug(EMPTY_VOICE_GUIDE_DEBUG_STATE);
        voiceTranscriptBufferRef.current = [];
        pendingVoiceBatchRef.current = null;
        isVoiceBatchProcessingRef.current = false;
        clearVoicePhraseTimers();
        if (voiceMaxPhraseTimeoutRef.current !== null) {
          window.clearTimeout(voiceMaxPhraseTimeoutRef.current);
          voiceMaxPhraseTimeoutRef.current = null;
        }
        if (voiceQueueProcessTimeoutRef.current !== null) {
          window.clearTimeout(voiceQueueProcessTimeoutRef.current);
          voiceQueueProcessTimeoutRef.current = null;
        }
      }

      return nextEnabled;
    });
  }

  function handlePlaceholderTool(toolName: string): void {
    window.alert(`${toolName} view is not available yet.`);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isDarkMode ? "dark bg-[#171819] text-white" : "bg-white text-[#111]"
      }`}
    >
      <BrowserSpeechTextListener
        enabled={isVoiceGuideEnabled}
        onAudioLevel={setVoiceAudioLevel}
        onDiagnostic={handleSpeechDiagnostic}
        onStatusChange={handleSpeechStatusChange}
        onTranscript={handleSpeechTranscript}
      />
      <aside
        className={`relative flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-r transition-[width] duration-300 ease-out ${
          isHelperPanelOpen ? "w-[33.333vw] min-w-[320px] px-6 py-5" : "w-5 px-0 py-0"
        } ${
          isDarkMode
            ? "border-[#2c2c31] bg-[#18181b]"
            : "border-[#dfdfe2] bg-[#f7f7f8]"
        }`}
      >
        <button
          type="button"
          aria-label={isHelperPanelOpen ? "Collapse helper panel" : "Expand helper panel"}
          onClick={() => setIsHelperPanelOpen((value) => !value)}
          className={`absolute right-0 top-0 z-20 h-full w-5 cursor-pointer transition focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] ${
            isDarkMode
              ? "bg-[#202124] hover:bg-[#292b2f]"
              : "bg-[#ececef] hover:bg-[#e0e0e4]"
          }`}
        >
          <span
            className={`absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              isDarkMode ? "bg-[#4b4d52]" : "bg-[#c6c6cc]"
            }`}
          />
        </button>
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col transition duration-300 ease-out ${
            isHelperPanelOpen
              ? "translate-x-0 opacity-100"
              : "-translate-x-4 opacity-0 pointer-events-none"
          }`}
          aria-hidden={!isHelperPanelOpen}
        >
        <div
          className={`min-w-0 border-b pb-5 ${
            isDarkMode ? "border-[#303034]" : "border-[#dedee3]"
          }`}
        >
          <div className="min-w-0">
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
                    <span className="flex shrink-0 items-center gap-2">
                      <SectionNumberBadge
                        isDarkMode={isDarkMode}
                        number={section.number}
                      />
                      <span className="text-[13px] font-black uppercase">
                        {section.title}
                      </span>
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
        </div>
      </aside>

      <main
        className={`relative min-h-0 flex-1 ${
          isDarkMode
            ? "bg-[#171819] text-[#6f7175]"
            : "bg-white text-[#111]"
        }`}
      >
        {voiceGuideToast || isVoiceGuideEnabled ? (
          <VoiceGuideDebugPanel
            debug={voiceGuideDebug}
            isDarkMode={isDarkMode}
            speechStatus={speechStatus}
            toast={voiceGuideToast}
            voiceAudioLevel={voiceAudioLevel}
          />
        ) : null}
        <div
          className={`absolute right-5 top-5 z-10 flex items-center gap-1 rounded-full border p-1 shadow-sm backdrop-blur ${
            isDarkMode
              ? "border-[#34363a] bg-[#202124]/95 text-[#f3f0e8]"
              : "border-[#dedee3] bg-white/95 text-[#111]"
          }`}
        >
          <ToolbarButton
            ariaLabel="Open alternate track view"
            isDarkMode={isDarkMode}
            onClick={() => handlePlaceholderTool("Alternate track")}
          >
            <GridIcon />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="Open quick tools"
            isDarkMode={isDarkMode}
            onClick={() => handlePlaceholderTool("Quick tools")}
          >
            <SparkIcon />
          </ToolbarButton>
          <ToolbarButton
            active={isVoiceGuideEnabled}
            ariaLabel={
              isVoiceGuideEnabled
                ? `Turn off voice guide (${speechStatus})`
                : "Turn on voice guide"
            }
            isDarkMode={isDarkMode}
            onClick={handleVoiceGuideToggle}
          >
            <MicrophoneIcon />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel={isDarkMode ? "Use light play mode" : "Use dark play mode"}
            isDarkMode={isDarkMode}
            onClick={() => setIsDarkMode((value) => !value)}
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="Close fullscreen chord performance view"
            isDarkMode={isDarkMode}
            onClick={handleClose}
          >
            <CloseIcon />
          </ToolbarButton>
        </div>
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
                  <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-4">
                    <div className="flex justify-center">
                      <SectionNumberBadge
                        isDarkMode={isDarkMode}
                        number={section.number}
                        size="large"
                      />
                    </div>
                    <h2
                      className={`text-[13px] font-black uppercase tracking-[0.16em] ${
                        isDarkMode ? "text-[#8a8d92]" : "text-[#ed1746]"
                      }`}
                    >
                      {section.title}
                    </h2>
                  </div>
                  <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4">
                    <div
                      className={`mx-auto w-1 rounded-full ${
                        isDarkMode ? "bg-[#34363a]" : "bg-[#d6d6dc]"
                      }`}
                    />
                    <div className="space-y-0 font-mono text-[19px] leading-[1.18]">
                    {section.lines.length ? (
                      section.lines.map((line) => (
                        <ChordPerformanceLine
                          key={line.id}
                          ref={(element) => {
                            if (element) {
                              lineRefs.current.set(line.globalIndex, element);
                            } else {
                              lineRefs.current.delete(line.globalIndex);
                            }
                          }}
                          isActive={matchedLineIndex === line.globalIndex}
                          isPassed={
                            matchedLineIndex !== null &&
                            line.globalIndex < matchedLineIndex
                          }
                          isDarkMode={isDarkMode}
                          line={line.raw}
                          passedHighlightClass={VOICE_GUIDE_HIGHLIGHT_CLASS}
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

function VoiceGuideDebugPanel({
  debug,
  isDarkMode,
  speechStatus,
  toast,
  voiceAudioLevel,
}: {
  debug: VoiceGuideDebugState;
  isDarkMode: boolean;
  speechStatus: BrowserSpeechStatus;
  toast: VoiceGuideToast | null;
  voiceAudioLevel: number;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: 20, y: 80 });
  const isRecognizerError = speechStatus === "error";
  const displayedAudioLevel = isRecognizerError ? 0 : voiceAudioLevel;
  const recognizerDiagnosis = getVoiceRecognizerDiagnosis(debug, speechStatus);
  const resultLabel =
    debug.lastResult?.status === "matched"
      ? `Matched line ${debug.lastResult.lineNumber ?? "-"}`
      : debug.lastResult?.status === "no-match"
        ? "No confident match"
        : "No result yet";
  const resultDetail =
    debug.lastResult?.status === "matched"
      ? debug.lastResult.matchedText
      : debug.lastResult?.transcript;

  function handlePanelPointerDown(event: PointerEvent<HTMLDivElement>): void {
    const panel = panelRef.current;
    const parent = panel?.offsetParent;

    if (!panel || !(parent instanceof HTMLElement)) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - panelRect.left,
      y: event.clientY - panelRect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePanelPointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const panel = panelRef.current;
    const parent = panel?.offsetParent;

    if (!panel || !(parent instanceof HTMLElement)) {
      return;
    }

    const parentRect = parent.getBoundingClientRect();
    const maxX = Math.max(0, parentRect.width - panel.offsetWidth - 20);
    const maxY = Math.max(0, parentRect.height - panel.offsetHeight - 20);
    const nextX = event.clientX - parentRect.left - dragOffsetRef.current.x;
    const nextY = event.clientY - parentRect.top - dragOffsetRef.current.y;

    setPanelPosition({
      x: Math.min(Math.max(20, nextX), maxX),
      y: Math.min(Math.max(20, nextY), maxY),
    });
  }

  function handlePanelPointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={panelRef}
      className={`absolute z-10 max-w-[min(440px,calc(100%-40px))] rounded-lg border text-left shadow-sm backdrop-blur ${
        isDarkMode
          ? "border-[#34363a] bg-[#202124]/95 text-[#f3f0e8]"
          : "border-[#dedee3] bg-white/95 text-[#111]"
      }`}
      style={{
        left: panelPosition.x,
        top: panelPosition.y,
        width: isMinimized ? "min(320px, calc(100% - 40px))" : "min(440px, calc(100% - 40px))",
      }}
    >
      <div
        className="flex cursor-grab touch-none select-none items-center justify-between gap-3 px-4 py-3 active:cursor-grabbing"
        onPointerDown={handlePanelPointerDown}
        onPointerMove={handlePanelPointerMove}
        onPointerCancel={handlePanelPointerUp}
        onPointerUp={handlePanelPointerUp}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`size-2.5 shrink-0 rounded-full ${
              isRecognizerError
                ? "bg-[#ed1746] shadow-[0_0_12px_rgba(237,23,70,0.7)]"
                : displayedAudioLevel > 0.08
                ? "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.85)]"
                : isDarkMode
                  ? "bg-[#4b4d52]"
                  : "bg-[#c6c6cc]"
            }`}
          />
          <p className="truncate text-[11px] font-black uppercase tracking-[0.12em]">
            {toast?.title ?? "Listening"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
              isDarkMode
                ? "bg-[#2b2d30] text-[#d4d4d8]"
                : "bg-[#f0f0f1] text-[#52525b]"
            }`}
          >
            {speechStatus}
          </span>
          <button
            type="button"
            aria-label={isMinimized ? "Expand voice debug panel" : "Minimize voice debug panel"}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setIsMinimized((value) => !value);
            }}
            className={`flex size-7 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
              isDarkMode
                ? "text-[#f3f0e8] hover:bg-[#2b2d30]"
                : "text-[#111] hover:bg-[#f3f3f4]"
            }`}
          >
            {isMinimized ? <ExpandIcon /> : <MinusIcon />}
          </button>
        </div>
      </div>
      {isMinimized ? null : (
        <div className="px-4 pb-3">
      <div
        className={`mt-2 h-1 overflow-hidden rounded-full ${
          isDarkMode ? "bg-[#34363a]" : "bg-[#e4e4e7]"
        }`}
      >
        <div
          className="h-full rounded-full bg-cyan-300 transition-[width] duration-100"
          style={{
            width: `${Math.max(4, Math.round(displayedAudioLevel * 100))}%`,
          }}
        />
      </div>
      {toast?.detail ? (
        <p
          className={`mt-2 truncate text-[12px] font-bold ${
            isDarkMode ? "text-[#a1a1aa]" : "text-[#71717a]"
          }`}
        >
          {toast.detail}
        </p>
      ) : null}
      {recognizerDiagnosis ? (
        <p
          className={`mt-2 rounded-md border px-3 py-2 text-[12px] font-bold leading-5 ${
            isDarkMode
              ? "border-[#7f1d1d] bg-[#2a1518] text-[#fecdd3]"
              : "border-[#fecdd3] bg-[#fff1f2] text-[#9f1239]"
          }`}
        >
          {recognizerDiagnosis}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-4 gap-2">
        <VoiceDebugStat
          isDarkMode={isDarkMode}
          label="Capture"
          value={`${debug.captureStatus} (${debug.captureChunkCount})`}
        />
        <VoiceDebugStat
          isDarkMode={isDarkMode}
          label="Queue"
          value={debug.queueStatus}
        />
        <VoiceDebugStat
          isDarkMode={isDarkMode}
          label="Result"
          value={resultLabel}
        />
        <VoiceDebugStat
          isDarkMode={isDarkMode}
          label="Engine"
          value={`${debug.lastRecognizerEvent ?? "none"} (${debug.recognizerRestartCount})`}
        />
      </div>

      <div className="mt-3 space-y-2">
        <VoiceDebugText
          isDarkMode={isDarkMode}
          label="Recognizer"
          value={
            debug.lastRecognizerEvent
              ? [
                  debug.lastRecognizerEvent,
                  debug.lastRecognizerDetail,
                ].filter(Boolean).join(": ")
              : null
          }
        />
        <VoiceDebugText
          isDarkMode={isDarkMode}
          label="Events"
          value={debug.recognizerEvents.join(" / ")}
        />
        <VoiceDebugText
          isDarkMode={isDarkMode}
          label="Heard"
          value={debug.lastHeard}
        />
        <VoiceDebugText
          isDarkMode={isDarkMode}
          label="Captured"
          value={debug.lastCaptured}
        />
        <VoiceDebugText
          isDarkMode={isDarkMode}
          label="Processing"
          value={debug.activeBatch}
        />
        <VoiceDebugText
          isDarkMode={isDarkMode}
          label="Pending"
          value={debug.pendingBatch}
        />
        <VoiceDebugText
          isDarkMode={isDarkMode}
          label={
            debug.lastResult?.score === null || debug.lastResult?.score === undefined
              ? "Last result"
              : `Last result (${debug.lastResult.score.toFixed(1)})`
          }
          value={resultDetail}
        />
      </div>
        </div>
      )}
    </div>
  );
}

function VoiceDebugStat({
  isDarkMode,
  label,
  value,
}: {
  isDarkMode: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-md border px-2 py-1.5 ${
        isDarkMode
          ? "border-[#34363a] bg-[#18181b]"
          : "border-[#e4e4e7] bg-[#fafafa]"
      }`}
    >
      <p
        className={`text-[9px] font-black uppercase tracking-[0.08em] ${
          isDarkMode ? "text-[#a1a1aa]" : "text-[#71717a]"
        }`}
      >
        {label}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-black">{value}</p>
    </div>
  );
}

function VoiceDebugText({
  isDarkMode,
  label,
  value,
}: {
  isDarkMode: boolean;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-2 text-[11px] leading-4">
      <span
        className={`font-black uppercase tracking-[0.08em] ${
          isDarkMode ? "text-[#a1a1aa]" : "text-[#71717a]"
        }`}
      >
        {label}
      </span>
      <span className="min-w-0 truncate font-mono font-bold">
        {value ? trimVoiceToastText(value) : "-"}
      </span>
    </div>
  );
}

function getVoiceRecognizerDiagnosis(
  debug: VoiceGuideDebugState,
  speechStatus: BrowserSpeechStatus,
): string | null {
  if (speechStatus !== "error") {
    return null;
  }

  if (debug.lastRecognizerEvent !== "error") {
    return "Speech recognition stopped before returning text.";
  }

  if (debug.lastRecognizerDetail === "network") {
    return "The browser speech service is unreachable. Audio input is available, but no transcript can be captured until the Web Speech service connects.";
  }

  if (
    debug.lastRecognizerDetail === "not-allowed" ||
    debug.lastRecognizerDetail === "service-not-allowed"
  ) {
    return "Speech recognition is blocked by browser permission or browser speech-service settings.";
  }

  if (debug.lastRecognizerDetail === "audio-capture") {
    return "The browser could not access a usable microphone for speech recognition.";
  }

  return debug.lastRecognizerDetail
    ? `Speech recognition failed with "${debug.lastRecognizerDetail}".`
    : "Speech recognition stopped before returning text.";
}

const ChordPerformanceLine = forwardRef<HTMLParagraphElement, {
  isActive: boolean;
  isDarkMode: boolean;
  isPassed: boolean;
  line: string;
  passedHighlightClass: string;
}>(function ChordPerformanceLine({
  isActive,
  isDarkMode,
  isPassed,
  line,
  passedHighlightClass,
}, ref) {
  const parts = line.split(/(\[[^\]\r\n]+\])/g).filter(Boolean);
  const lineClassName = isActive
    ? "rounded-md bg-cyan-300/10 text-cyan-300 shadow-[0_0_0_1px_rgba(103,232,249,0.18)]"
    : "whitespace-pre-wrap";
  const highlightedTextClassName = isActive || isPassed ? passedHighlightClass : "";

  return (
    <p ref={ref} className={`whitespace-pre-wrap ${lineClassName}`}>
      {parts.map((part, index) => {
        if (!part.startsWith("[") || !part.endsWith("]")) {
          return (
            <span key={index} className={highlightedTextClassName}>
              {part}
            </span>
          );
        }

        const value = part.slice(1, -1).trim();
        const isChord = Boolean(transposeChord(value, 0, "sharps"));

        return isChord ? (
          <span
            key={index}
            className={`mr-1.5 inline-block font-sans text-[14px] font-black leading-none ${
              isActive || isPassed
                ? passedHighlightClass
                : isDarkMode
                  ? "text-[#f3f0e8]"
                  : "text-[#111]"
            }`}
          >
            {value}
          </span>
        ) : (
          <strong
            key={index}
            className={`mr-1.5 inline-block font-sans text-[14px] font-black ${
              isActive || isPassed
                ? passedHighlightClass
                : isDarkMode
                  ? "text-[#9a9da3]"
                  : "text-[#555]"
            }`}
          >
            {value}
          </strong>
        );
      })}
    </p>
  );
});

function SectionNumberBadge({
  isDarkMode,
  number,
  size = "default",
}: {
  isDarkMode: boolean;
  number: number;
  size?: "default" | "large";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-black tabular-nums ${
        size === "large" ? "size-10 text-[14px]" : "size-6 text-[11px]"
      } ${
        isDarkMode
          ? "bg-[#2b2d30] text-[#f3f0e8]"
          : "bg-[#f0f0f1] text-[#111]"
      }`}
    >
      {number}
    </span>
  );
}

function parseChordSections(source: string): ChordSection[] {
  const sections: ChordSection[] = [];
  let currentSection: ChordSection | null = null;
  let globalLineIndex = 0;

  function startSection(title: string): ChordSection {
    const section = {
      id: createSectionId(title, sections.length),
      number: sections.length + 1,
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

    currentSection.lines.push({
      id: `${currentSection.id}-line-${currentSection.lines.length}`,
      globalIndex: globalLineIndex,
      sectionId: currentSection.id,
      raw: line,
      lyricText: getLineLyricText(line),
      normalizedLyric: normalizeVoiceText(getLineLyricText(line)),
    });
    globalLineIndex += 1;

    const lineChords = getLineChords(line);

    for (const chord of lineChords) {
      if (!currentSection.chords.includes(chord)) {
        currentSection.chords.push(chord);
      }
    }

    currentSection.chordPreview = currentSection.chords.join(" - ");
  }

  return sections.filter(
    (section) =>
      section.lines.some((line) => line.raw.trim()) || section.chords.length,
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

function getLineLyricText(line: string): string {
  return line
    .replace(/\[([^\]\r\n]+)\]/g, (match, value: string) =>
      transposeChord(value.trim(), 0, "sharps") ? " " : match,
    )
    .replace(/\[[^\]\r\n]+\]/g, " ")
    .trim();
}

function findBestVoiceLyricMatch({
  currentLineIndex,
  isFinal,
  lines,
  transcript,
  visibleSectionIds,
}: {
  currentLineIndex: number | null;
  isFinal: boolean;
  lines: ChordSectionLine[];
  transcript: string;
  visibleSectionIds: string[];
}): { line: ChordSectionLine; score: number } | null {
  const transcriptWords = normalizeVoiceText(transcript).split(" ").filter(Boolean);

  if (transcriptWords.length === 0) {
    return null;
  }

  const primarySearchStart =
    currentLineIndex === null ? 0 : Math.min(lines.length - 1, currentLineIndex + 1);
  const fallbackSearchStart = Math.max(0, currentLineIndex ?? 0);
  const searchWindowSize = isFinal ? 24 : 14;
  const usefulTranscriptWords = transcriptWords.filter((word) => word.length > 2);
  const transcriptPhrases = getVoiceWordPhrases(transcriptWords);

  const minimumScore = transcriptWords.length === 1 ? 2.25 : isFinal ? 3.5 : 5;
  const primaryMatch = findBestVoiceLyricMatchInRange({
    minimumScore,
    searchEnd: primarySearchStart + searchWindowSize,
    searchStart: primarySearchStart,
    lines,
    transcriptPhrases,
    usefulTranscriptWords,
    visibleSectionIds,
  });

  if (primaryMatch) {
    return primaryMatch;
  }

  if (currentLineIndex === null) {
    return null;
  }

  return findBestVoiceLyricMatchInRange({
    minimumScore,
    searchEnd: fallbackSearchStart + searchWindowSize,
    searchStart: fallbackSearchStart,
    lines,
    transcriptPhrases,
    usefulTranscriptWords,
    visibleSectionIds,
  });
}

function findBestVoiceLyricMatchInRange({
  lines,
  minimumScore,
  searchEnd,
  searchStart,
  transcriptPhrases,
  usefulTranscriptWords,
  visibleSectionIds,
}: {
  lines: ChordSectionLine[];
  minimumScore: number;
  searchEnd: number;
  searchStart: number;
  transcriptPhrases: string[];
  usefulTranscriptWords: string[];
  visibleSectionIds: string[];
}): { line: ChordSectionLine; score: number } | null {
  let bestMatch: { line: ChordSectionLine; score: number } | null = null;

  for (const line of lines) {
    if (line.globalIndex < searchStart || line.globalIndex > searchEnd) {
      continue;
    }

    const lineWords = line.normalizedLyric.split(" ").filter(Boolean);

    if (!lineWords.length) {
      continue;
    }

    let score = 0;
    const lineText = ` ${line.normalizedLyric} `;

    for (const phrase of transcriptPhrases) {
      if (lineText.includes(` ${phrase} `)) {
        score += phrase.split(" ").length >= 3 ? 8 : 5;
      }
    }

    let matchedUsefulWordCount = 0;

    for (const word of usefulTranscriptWords) {
      if (lineWords.includes(word)) {
        matchedUsefulWordCount += 1;
        score += 1.5;
      }
    }

    if (visibleSectionIds.includes(line.sectionId)) {
      score += 2;
    }

    score -= Math.max(0, line.globalIndex - searchStart) * 0.25;

    if (
      matchedUsefulWordCount === 1 &&
      usefulTranscriptWords.length === 1 &&
      line.globalIndex - searchStart <= 8
    ) {
      score += 1.5;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { line, score };
    }
  }

  return bestMatch && bestMatch.score >= minimumScore ? bestMatch : null;
}

function getVoiceWordPhrases(words: string[]): string[] {
  const phrases: string[] = [];
  const phraseLengths = [4, 3, 2] as const;

  for (const phraseLength of phraseLengths) {
    for (let index = 0; index <= words.length - phraseLength; index += 1) {
      const phrase = words.slice(index, index + phraseLength).join(" ");

      if (!phrases.includes(phrase)) {
        phrases.push(phrase);
      }
    }
  }

  return phrases;
}

function normalizeVoiceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBufferedVoicePhrase(chunks: VoiceTranscriptChunk[]): string {
  const finalChunk = chunks.findLast((chunk) => chunk.isFinal);

  if (finalChunk) {
    return finalChunk.text.trim();
  }

  const phraseParts: string[] = [];

  for (const chunk of chunks) {
    const normalizedChunk = chunk.text.replace(/\s+/g, " ").trim();

    if (!normalizedChunk) {
      continue;
    }

    const previousPart = phraseParts[phraseParts.length - 1];

    if (previousPart && normalizedChunk.startsWith(previousPart)) {
      phraseParts[phraseParts.length - 1] = normalizedChunk;
      continue;
    }

    if (previousPart && previousPart.startsWith(normalizedChunk)) {
      continue;
    }

    phraseParts.push(normalizedChunk);
  }

  return phraseParts.join(" ").trim();
}

function trimVoiceToastText(value: string): string {
  const normalizedValue = value.replace(/\s+/g, " ").trim();
  return normalizedValue.length > 96
    ? `${normalizedValue.slice(0, 93)}...`
    : normalizedValue;
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

function ToolbarButton({
  active = false,
  ariaLabel,
  children,
  isDarkMode,
  onClick,
}: {
  active?: boolean;
  ariaLabel: string;
  children: ReactNode;
  isDarkMode: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={`flex size-10 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
        active
          ? "bg-[#ed1746] text-white hover:bg-[#d90f3b]"
          : isDarkMode
          ? "text-[#f3f0e8] hover:bg-[#2b2d30]"
          : "text-[#111] hover:bg-[#f3f3f4]"
      }`}
    >
      {children}
    </button>
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

function GridIcon() {
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
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SparkIcon() {
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
      <path d="M13 2 9.7 9.7 2 13l7.7 3.3L13 24l3.3-7.7L24 13l-7.7-3.3L13 2Z" />
    </svg>
  );
}

function MicrophoneIcon() {
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
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
      <path d="M8 22h8" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
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
