"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ChartPlaybackToolbar, ChartTransposeControls, ChartViewSelect } from "@/components/shared/chart-playback-toolbar";
import { MoonIcon, SunIcon } from "@/components/shared/theme-toggle";
import { ChordCard } from "@/components/shared/chords/chord-card";
import { PianoChordCard } from "@/components/shared/chords/piano-chord-card";
import { SongChart } from "@/components/shared/chords/song-chart";
import {
  AUTO_SCROLL_PIXELS_PER_SECOND,
  AUTO_SCROLL_SPEED_STEP,
  MAX_AUTO_SCROLL_SPEED,
} from "@/components/shared/auto-scroll-speed-controls";
import {
  GUITAR_CHORDS,
  PIANO_CHORDS,
  UKELELE_CHORDS,
  normalizeChordSymbol,
  type ChordDefinition,
  type PianoChordDefinition,
} from "@/data/chords";
import { transposeChord, transposeChordPro } from "@/lib/chords/chord-pro";
import type { AccidentalPreference } from "@/lib/chords/chord-pro";
import { splitVariationSuffix } from "@/lib/chords/chord-pro";
import { useStageSync } from "@/lib/client/stage-sync";
import { publishStageRuntimeState } from "@/lib/client/stage-runtime-store";
import type {
  StageDisplayMode,
  StagePlaylistData,
  StageRuntimePosition,
  StageRuntimeState,
  StageSyncLockState,
  StageSyncMode,
  StageSyncSnapshot,
  StageTheme,
  StageTrackTransposes,
  StageTrackData,
} from "@/types/stage";

const MANUAL_SCROLL_PAUSE_MS = 700;
const PROGRAMMATIC_SCROLL_IGNORE_MS = 80;
const MAX_SYNC_LATENCY_COMPENSATION_MS = 1200;
const MIN_STAGE_ZOOM = 0.25;
const MAX_STAGE_ZOOM = 1.75;
const STAGE_ZOOM_STEP = 0.125;

type StageAppearance = {
  chordClassName: string;
  chordSurfaceClassName: string;
};

type StageLine = {
  id: string;
  index: number;
  text: string;
};

type StageSection = {
  id: string;
  trackId: string;
  setListTrackId: string;
  trackTitle: string;
  title: string;
  number: number;
  lines: StageLine[];
};

type StageTrackDocument = StageTrackData & {
  activeTranspose: number;
  displayKey: string;
  sections: StageSection[];
};

type StageAnchor = {
  id: string;
  trackId: string;
  setListTrackId: string;
  trackTitle: string;
  sectionTitle: string;
};

type StageLineMetric = StageLine & {
  top: number;
};

type StageSectionMetric = StageSection & {
  height: number;
  lines: StageLineMetric[];
  top: number;
};

type StageInstrumentId = "instruments" | "vocals";
type StageChordInstrument = "guitar" | "piano" | "ukulele";
type SelectedStageChord = {
  reference: GuitarChordReference;
  value: string;
};


export function StageView({ playlist, offline = false, local = false, onExit }: { playlist: StagePlaylistData; offline?: boolean; local?: boolean; onExit?: () => void }) {
  const isLocal = offline || local;
  const [theme, setTheme] = useState<StageTheme>("dark");
  const [stageInstrument, setStageInstrument] =
    useState<StageInstrumentId>("instruments");
  const [trackTransposes, setTrackTransposes] = useState<StageTrackTransposes>(
    () =>
      Object.fromEntries(
        playlist.tracks.map((track) => [
          track.setListTrackId,
          track.transposeSemitones,
        ]),
      ),
  );
  const [accidentals, setAccidentals] =
    useState<AccidentalPreference>("sharps");
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [chartZoom, setChartZoom] = useState(1);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [selectedChord, setSelectedChord] = useState<SelectedStageChord | null>(
    null,
  );
  const [syncMode, setSyncMode] = useState<StageSyncMode>(isLocal ? "unsynced" : "synced");
  const [lockState, setLockState] = useState<StageSyncLockState>("free");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const lineRefs = useRef(new Map<string, HTMLElement>());
  const layoutMetricsRef = useRef<StageSectionMetric[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastPublishedStateKeyRef = useRef("");
  const lastRenderedSectionIdRef = useRef<string | null>(null);
  const remoteScrollFrameRef = useRef<number | null>(null);
  const scrollEndTimerRef = useRef<number | null>(null);
  const lastSpeedDownAtRef = useRef(0);
  const lastPlayingSpeedRef = useRef(3);
  const manualScrollPauseUntilRef = useRef(0);
  const programmaticScrollIgnoreUntilRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const isApplyingRemoteScrollRef = useRef(false);
  const stageStateRef = useRef<StageRuntimeState | null>(null);

  const tracks = useMemo(
    () =>
      playlist.tracks.map<StageTrackDocument>((track) => {
        const trackTranspose = trackTransposes[track.setListTrackId] ?? 0;
        const source = transposeChordPro(
          track.lyricsAndChords,
          trackTranspose,
          accidentals,
        );
        const displayKey =
          transposeChord(track.key, trackTranspose, accidentals) ?? track.key;

        return {
          ...track,
          activeTranspose: trackTranspose,
          displayKey,
          sections: parseStageSections({
            source,
            setListTrackId: track.setListTrackId,
            trackId: track.id,
            trackTitle: track.title,
          }),
        };
      }),
    [accidentals, playlist.tracks, trackTransposes],
  );
  const anchors = useMemo(
    () =>
      tracks.flatMap<StageAnchor>((track) =>
        track.sections.map((section) => ({
          id: section.id,
          trackId: section.trackId,
          setListTrackId: section.setListTrackId,
          trackTitle: section.trackTitle,
          sectionTitle: section.title,
        })),
      ),
    [tracks],
  );
  const isDark = theme === "dark";
  const stageDisplayMode: StageDisplayMode = stageInstrument === "vocals" ? "vocals" : "default";
  const appearance = getStageAppearance(stageDisplayMode, isDark);
  const [stageState, setStageState] = useState<StageRuntimeState>(() =>
    createStageRuntimeState({
      accidentals,
      displayMode: stageDisplayMode,
      playlist,
      position: null,
      scrollSpeed,
      theme,
      transpose: 0,
    }),
  );
  const effectiveActiveSectionId =
    stageState.position?.sectionId ?? anchors[0]?.id ?? null;
  const activeAnchor =
    anchors.find((anchor) => anchor.id === effectiveActiveSectionId) ?? null;
  const activeSetListTrackId = activeAnchor?.setListTrackId ?? null;
  const activeTrackTranspose = activeSetListTrackId
    ? (trackTransposes[activeSetListTrackId] ?? 0)
    : 0;
  const activeTrackKey =
    tracks.find((track) => track.setListTrackId === activeSetListTrackId)
      ?.displayKey ?? "";

  useEffect(() => {
    stageStateRef.current = stageState;
  }, [stageState]);

  useEffect(() => {
    if (scrollSpeed > 0) {
      lastPlayingSpeedRef.current = scrollSpeed;
    }
  }, [scrollSpeed]);

  const publishStageState = useCallback(
    (
      position: StageRuntimePosition | null,
      nextScrollSpeed = scrollSpeed,
      options: { render: boolean } = { render: true },
    ) => {
      const activeTrackId = position?.setListTrackId ?? activeSetListTrackId;
      const nextState = createStageRuntimeState({
        accidentals,
        displayMode: stageDisplayMode,
        playlist,
        position,
        scrollSpeed: nextScrollSpeed,
        theme,
        transpose: activeTrackId ? (trackTransposes[activeTrackId] ?? 0) : 0,
      });
      const stateKey = getStageRuntimeStateKey(nextState);

      stageStateRef.current = nextState;

      if (
        !options.render &&
        position?.sectionId === lastRenderedSectionIdRef.current
      ) {
        return;
      }

      if (lastPublishedStateKeyRef.current === stateKey) {
        return;
      }

      lastPublishedStateKeyRef.current = stateKey;
      lastRenderedSectionIdRef.current = position?.sectionId ?? null;
      publishStageRuntimeState(nextState);
      setStageState(nextState);
    },
    [
      accidentals,
      activeSetListTrackId,
      playlist,
      scrollSpeed,
      setStageState,
      stageDisplayMode,
      theme,
      trackTransposes,
    ],
  );

  const applyViewportState = useCallback(
    (
      position: StageRuntimePosition | null,
      nextScrollSpeed: number,
      sentAt: number,
    ) => {
      const nextState = createStageRuntimeState({
        accidentals,
        displayMode: stageDisplayMode,
        playlist,
        position,
        scrollSpeed: nextScrollSpeed,
        theme,
        transpose: position
          ? (trackTransposes[position.setListTrackId] ?? 0)
          : activeTrackTranspose,
      });

      lastPublishedStateKeyRef.current = getStageRuntimeStateKey(nextState);
      stageStateRef.current = nextState;
      publishStageRuntimeState(nextState);
      setStageState(nextState);

      if (remoteScrollFrameRef.current !== null) {
        cancelAnimationFrame(remoteScrollFrameRef.current);
      }

      remoteScrollFrameRef.current = requestAnimationFrame(() => {
        remoteScrollFrameRef.current = null;
        isApplyingRemoteScrollRef.current = true;
        markProgrammaticScroll(programmaticScrollIgnoreUntilRef);
        scrollToStagePosition(
          position,
          sectionRefs.current,
          scrollerRef.current,
          getLatencyCompensationPx(nextScrollSpeed, sentAt),
        );
        setScrollSpeed(nextScrollSpeed);
        window.setTimeout(() => {
          isApplyingRemoteScrollRef.current = false;
        }, PROGRAMMATIC_SCROLL_IGNORE_MS);
      });
    },
    [
      accidentals,
      activeTrackTranspose,
      playlist,
      setStageState,
      stageDisplayMode,
      theme,
      trackTransposes,
    ],
  );

  const getStageSyncSnapshot = useCallback(
    () => ({
      position: stageStateRef.current?.position ?? stageState.position,
      speed: scrollSpeed,
    }),
    [scrollSpeed, stageState.position],
  );

  const stageSync = useStageSync({
    bandId: isLocal ? null : playlist.band?.id ?? null,
    canPublish: !isLocal && playlist.currentUser.canLead,
    eventId: playlist.eventId,
    getSnapshot: getStageSyncSnapshot,
    lockState,
    onSnapshot: (event: StageSyncSnapshot) => {
      if (syncMode === "unsynced") {
        return;
      }

      applyViewportState(
        event.position,
        clampScrollSpeed(event.speed),
        event.sentAt,
      );
      setLockState("locked");
    },
    onViewport: (event) => {
      if (syncMode === "unsynced") {
        return;
      }

      applyViewportState(
        event.position,
        clampScrollSpeed(event.speed),
        event.sentAt,
      );
      setLockState("locked");
    },
    role: playlist.currentUser.role,
    setListId: playlist.setListId,
    snapshot: {
      position: stageState.position,
      speed: scrollSpeed,
    },
    syncMode,
    userId: playlist.currentUser.id,
  });

  const rebuildStageLayoutMetrics = useCallback(() => {
    layoutMetricsRef.current = tracks.flatMap((track) =>
      track.sections.flatMap<StageSectionMetric>((section) => {
        const sectionElement = sectionRefs.current.get(section.id);

        if (!sectionElement) {
          return [];
        }

        const lineMetrics = section.lines.flatMap<StageLineMetric>((line) => {
          const lineElement = lineRefs.current.get(line.id);

          if (!lineElement) {
            return [];
          }

          return {
            ...line,
            top: lineElement.offsetTop,
          };
        });

        return {
          ...section,
          height: Math.max(sectionElement.offsetHeight, 1),
          lines: lineMetrics,
          top: sectionElement.offsetTop,
        };
      }),
    );
  }, [tracks]);

  const updateStagePosition = useCallback((options?: { render: boolean }) => {
    const scroller = scrollerRef.current;
    const sectionMetrics = layoutMetricsRef.current;

    if (!scroller || sectionMetrics.length === 0) {
      publishStageState(null, scrollSpeed, options);
      return;
    }

    const viewportTop = scroller.scrollTop;
    const anchorLine = scroller.scrollTop + scroller.clientHeight * 0.32;
    let nextActiveSection = sectionMetrics[0];

    for (const section of sectionMetrics) {
      if (section.top <= anchorLine) {
        nextActiveSection = section;
      } else {
        break;
      }
    }

    const sectionProgressRatio = getSectionProgressRatioFromMetrics(
      nextActiveSection,
      anchorLine,
    );
    const activeLine = findActiveLineFromMetrics(
      nextActiveSection.lines,
      anchorLine,
    );

    publishStageState(
      {
        lineId: activeLine?.id ?? null,
        lineIndex: activeLine?.index ?? null,
        lineNumber: activeLine ? activeLine.index + 1 : null,
        lineOffsetFromViewportTopPx: activeLine
          ? Math.round(activeLine.top - viewportTop)
          : null,
        sectionId: nextActiveSection.id,
        sectionNumber: nextActiveSection.number,
        sectionProgressRatio,
        sectionTitle: nextActiveSection.title,
        sectionTopOffsetPx: Math.round(nextActiveSection.top - viewportTop),
        setListTrackId: nextActiveSection.setListTrackId,
        trackId: nextActiveSection.trackId,
        trackTitle: nextActiveSection.trackTitle,
        viewportHeight: scroller.clientHeight,
      },
      scrollSpeed,
      options,
    );
  }, [publishStageState, scrollSpeed]);

  useEffect(() => {
    rebuildStageLayoutMetrics();
    updateStagePosition();
  }, [rebuildStageLayoutMetrics, stageDisplayMode, updateStagePosition]);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    let frameId: number | null = null;
    const scheduleMetricsRebuild = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        frameId = null;
        rebuildStageLayoutMetrics();
        updateStagePosition();
      });
    };
    const resizeObserver = new ResizeObserver(scheduleMetricsRebuild);

    resizeObserver.observe(scroller);

    for (const sectionElement of sectionRefs.current.values()) {
      resizeObserver.observe(sectionElement);
    }

    window.addEventListener("resize", scheduleMetricsRebuild);
    scheduleMetricsRebuild();

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMetricsRebuild);
    };
  }, [rebuildStageLayoutMetrics, stageDisplayMode, updateStagePosition]);

  useEffect(() => {
    if (scrollSpeed <= 0) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      lastFrameTimeRef.current = null;
      return;
    }

    let pendingScrollPixels = 0;

    const tick = (time: number) => {
      const scroller = scrollerRef.current;
      const previousTime = lastFrameTimeRef.current ?? time;
      const elapsedSeconds = Math.min((time - previousTime) / 1000, 0.08);
      lastFrameTimeRef.current = time;

      if (scroller) {
        if (performance.now() >= manualScrollPauseUntilRef.current) {
          markProgrammaticScroll(programmaticScrollIgnoreUntilRef);
          pendingScrollPixels +=
            elapsedSeconds * scrollSpeed * AUTO_SCROLL_PIXELS_PER_SECOND;
          const wholePixels = Math.floor(pendingScrollPixels);
          if (wholePixels > 0) {
            scroller.scrollTop += wholePixels;
            pendingScrollPixels -= wholePixels;
          }
          updateStagePosition({ render: false });
        }
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
  }, [scrollSpeed, updateStagePosition]);

  useEffect(() => {
    return () => {
      if (remoteScrollFrameRef.current !== null) {
        cancelAnimationFrame(remoteScrollFrameRef.current);
      }

      if (scrollEndTimerRef.current !== null) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, []);

  function jumpToSection(sectionId: string): void {
    const scroller = scrollerRef.current;
    const section = sectionRefs.current.get(sectionId);

    if (!scroller || !section) {
      return;
    }

    scroller.scrollTo({
      behavior: "smooth",
      top: Math.max(0, section.offsetTop - scroller.clientHeight * 0.18),
    });
    if (syncMode === "synced" && lockState === "locked") {
      setLockState("free");
    }

    window.setTimeout(() => {
      updateStagePosition();
      stageSync.publishViewport({
        mode: "jump",
        position: stageStateRef.current?.position ?? null,
        speed: scrollSpeed,
      });
    }, 180);
  }

  function updateScrollSpeed(
    updater: (currentScrollSpeed: number) => number,
  ): void {
    updateStagePosition();

    setScrollSpeed((currentScrollSpeed) => {
      const nextScrollSpeed = updater(currentScrollSpeed);
      const currentPosition =
        stageStateRef.current?.position ?? stageState.position;
      publishStageState(currentPosition, nextScrollSpeed);
      stageSync.publishSpeed({
        position: currentPosition,
        speed: nextScrollSpeed,
      });
      return nextScrollSpeed;
    });
  }

  function decreaseScrollSpeed(): void {
    const now = performance.now();

    if (now - lastSpeedDownAtRef.current <= 360) {
      lastSpeedDownAtRef.current = 0;
      updateScrollSpeed(() => 0);
      return;
    }

    lastSpeedDownAtRef.current = now;
    updateScrollSpeed((speed) => Math.max(0, speed - AUTO_SCROLL_SPEED_STEP));
  }

  function increaseScrollSpeed(): void {
    updateScrollSpeed((speed) =>
      Math.min(MAX_AUTO_SCROLL_SPEED, speed + AUTO_SCROLL_SPEED_STEP),
    );
  }

  function toggleAutoScroll(): void {
    updateScrollSpeed((speed) =>
      speed > 0 ? 0 : lastPlayingSpeedRef.current,
    );
  }

  function toggleSyncMode(): void {
    setSyncMode((current) => (current === "synced" ? "unsynced" : "synced"));
    setLockState("free");
  }

  function handleLocalScrollIntent(): void {
    isUserScrollingRef.current = true;
    manualScrollPauseUntilRef.current =
      performance.now() + MANUAL_SCROLL_PAUSE_MS;

    if (syncMode === "synced" && lockState === "locked") {
      setLockState("free");
    }
  }

  function handleStageScroll(): void {
    if (
      !isUserScrollingRef.current &&
      (isApplyingRemoteScrollRef.current ||
        performance.now() < programmaticScrollIgnoreUntilRef.current)
    ) {
      return;
    }

    updateStagePosition();

    if (!isUserScrollingRef.current) {
      return;
    }

    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = window.setTimeout(() => {
      scrollEndTimerRef.current = null;
      isUserScrollingRef.current = false;
      stageSync.publishViewport({
        mode: "scroll-end",
        position: stageStateRef.current?.position ?? null,
        speed: scrollSpeed,
      });
    }, 220);
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


  return (
    <main
      className={`grid h-dvh min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden font-mono ${
        isDark ? "bg-[#08090b] text-[#f5f3ed]" : "bg-[#f8f7f3] text-[#151515]"
      }`}
    >
      <button type="button" aria-label="Toggle color theme" title="Toggle color theme" onClick={() => setTheme(isDark ? "light" : "dark")} className={`fixed right-14 top-0.5 z-50 flex size-11 items-center justify-center rounded-full border backdrop-blur-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] sm:top-1.5 ${isDark ? "border-[#343740] bg-[#17191f] text-[#f5f3ed] hover:bg-white/10" : "border-[#d8d3c8] bg-white text-[#151515] hover:bg-black/10"}`}>
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
      <StageExitControl
        href={offline ? "/offline" : `/events/${playlist.eventId}`}
        onExit={onExit}
        aria-label="Close stage"
        title="Close stage"
        className={`fixed right-2 top-0.5 z-50 flex size-11 items-center justify-center rounded-full text-2xl backdrop-blur-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] sm:top-1.5 ${
          isDark
            ? "bg-[#08090b]/40 text-[#f5f3ed] hover:bg-white/10"
            : "bg-[#f8f7f3]/40 text-[#151515] hover:bg-black/10"
        }`}
      >
        <span aria-hidden="true">×</span>
      </StageExitControl>
      <div className="grid min-h-0 min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          ref={scrollerRef}
          onKeyDown={handleLocalScrollIntent}
          onPointerDown={handleLocalScrollIntent}
          onScroll={handleStageScroll}
          onTouchStart={handleLocalScrollIntent}
          onWheel={handleLocalScrollIntent}
          tabIndex={-1}
          className="min-h-0 overflow-x-hidden overflow-y-auto px-0 pb-[42vh] sm:px-8 lg:px-12"
        >
          <div className="mx-auto grid max-w-[980px] gap-2">
            {tracks.length ? (
              tracks.map((track) => (
                <article
                  key={track.setListTrackId}
                  className="grid min-w-0 gap-2"
                  data-stage-track-id={track.setListTrackId}
                >
                  <StageTrackHeader isDark={isDark} track={track} />
                  {track.isAvailable && track.sections.length ? (
                    <SongChart
                      sections={track.sections}
                      lyricsOnly={stageInstrument === "vocals"}
                      activeSectionIds={effectiveActiveSectionId ? [effectiveActiveSectionId] : []}
                      fontSize={`clamp(${13 * chartZoom}px, ${3.2 * chartZoom}vw, ${28 * chartZoom}px)`}
                      theme={isDark ? "dark" : "light"}
                      onSectionElement={(id, element) => {
                        if (element) sectionRefs.current.set(id, element);
                        else sectionRefs.current.delete(id);
                      }}
                      onLineElement={(ids, element) => {
                        for (const id of ids) {
                          if (element) lineRefs.current.set(id, element);
                          else lineRefs.current.delete(id);
                        }
                      }}
                      renderChord={(value) => {
                        const chordReference = getGuitarChordReference(value);
                        if (stageInstrument === "vocals" || !chordReference) {
                          return <strong className={`inline-block whitespace-nowrap rounded-sm px-0.5 font-black ${appearance.chordClassName} ${appearance.chordSurfaceClassName}`}>{value}</strong>;
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => setSelectedChord({ reference: chordReference, value })}
                            className={`inline-block whitespace-nowrap rounded-sm px-0.5 font-black transition hover:bg-[#ed1746] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${appearance.chordClassName} ${appearance.chordSurfaceClassName}`}
                          >
                            {value}
                          </button>
                        );
                      }}
                    />
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
          onClose={() => setIsNavigatorOpen(false)}
          onJump={jumpToSection}
          playlist={playlist}
          offline={isLocal}
          tracks={tracks}
        />
      </div>

      {selectedChord && stageInstrument !== "vocals" ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20 px-4 pb-20 sm:items-center sm:pb-4"
          onPointerDown={() => setSelectedChord(null)}
        >
          <div
            className="relative"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedChord(null)}
              className="absolute -right-3 -top-3 z-10 flex size-8 items-center justify-center rounded-full bg-[#ed1746] text-[18px] font-black leading-none text-white shadow-lg transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
              aria-label={`Close ${selectedChord.value} chord`}
            >
              ×
            </button>
            <StageChordPopoverContent
              chordReference={selectedChord.reference}
              instrument="guitar"
            />
          </div>
        </div>
      ) : null}

      <ChartPlaybackToolbar
        isDark={isDark} speed={scrollSpeed} zoom={chartZoom} minZoom={MIN_STAGE_ZOOM} maxZoom={MAX_STAGE_ZOOM} accidentals={accidentals}
        onPlay={toggleAutoScroll} onSpeedDown={decreaseScrollSpeed} onSpeedUp={increaseScrollSpeed}
        onZoomOut={() => setChartZoom((value) => Math.max(MIN_STAGE_ZOOM, value - STAGE_ZOOM_STEP))}
        onZoomIn={() => setChartZoom((value) => Math.min(MAX_STAGE_ZOOM, value + STAGE_ZOOM_STEP))}
        onAccidentalsChange={() => setAccidentals((value) => value === "sharps" ? "flats" : "sharps")}
        options={(closeOptions) => <>
          <p className="truncate text-[13px] font-bold">{activeAnchor ? `${activeAnchor.trackTitle} / ${activeAnchor.sectionTitle}` : playlist.setListTitle}</p>
          <ChartTransposeControls isDark={isDark} value={activeTrackTranspose} displayKey={activeTrackKey} disabled={!activeSetListTrackId} onChange={(value) => {
            if (activeSetListTrackId) setTrackTransposes((current) => ({ ...current, [activeSetListTrackId]: clampTranspose(value) }));
          }} />
          <ChartViewSelect isDark={isDark} vocals={stageInstrument === "vocals"} onChange={(vocals) => setStageInstrument(vocals ? "vocals" : "instruments")} />
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => { closeOptions(); setIsNavigatorOpen((value) => !value); }} className={stageButtonClass(isDark)}>Sections</button>
            <button type="button" onClick={() => jumpByOffset(-1)} disabled={!activeAnchor || anchors[0]?.id === activeAnchor.id} className={stageButtonClass(isDark)}>Prev</button>
            <button type="button" onClick={() => jumpByOffset(1)} disabled={!activeAnchor || anchors[anchors.length - 1]?.id === activeAnchor.id} className={stageButtonClass(isDark)}>Next</button>
          </div>
          {!isLocal && stageSync.isSyncAvailable ? <button type="button" onClick={toggleSyncMode} className={`${stageButtonClass(isDark)} gap-2`} aria-label={syncMode === "synced" ? "Unlink stage" : "Link stage"} aria-pressed={syncMode === "synced"}><StageSyncIcon synced={syncMode === "synced"} />{syncMode === "synced" ? "Unlink" : "Link"}</button> : null}
        </>}
      />
    </main>
  );
}

function StageTrackHeader({
  isDark,
  track,
}: {
  isDark: boolean;
  track: StageTrackDocument;
}) {
  return (
    <header
      className={`sticky top-0 z-20 flex h-12 min-w-0 self-start items-center justify-start gap-2 pl-3 pr-28 backdrop-blur-md sm:h-14 sm:gap-3 ${
        isDark ? "bg-[#08090b]/60 text-[#f5f3ed]" : "bg-[#f8f7f3]/60 text-[#151515]"
      }`}
    >
      {track.displayKey ? (
        <span
          aria-label={`Song key: ${track.displayKey}`}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#ed1746] px-2.5 text-white sm:h-9 sm:px-3"
        >
          <span className="text-[16px] font-black leading-none sm:text-[18px]">
            {track.displayKey}
          </span>
        </span>
      ) : null}
      <h2 className="min-w-0 truncate text-[14px] font-black leading-tight sm:text-[20px]">
        {track.title}
      </h2>
      {track.activeTranspose !== 0 ? (
        <span className="my-auto shrink-0 rounded-full bg-[#ed1746]/15 px-2 py-1 text-[10px] font-black text-[#ed1746]">
          {track.activeTranspose > 0 ? "+" : ""}
          {track.activeTranspose}
        </span>
      ) : null}
    </header>
  );
}

function StageExitControl({ href, onExit, children, className, title, "aria-label": label }: {
  href: string;
  onExit?: () => void;
  children: ReactNode;
  className: string;
  title?: string;
  "aria-label"?: string;
}) {
  if (onExit) {
    return <button type="button" aria-label={label} title={title} className={className} onClick={() => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      onExit();
    }}>{children}</button>;
  }
  return <Link href={href} aria-label={label} title={title} className={className}>{children}</Link>;
}

function StageNavigator({
  activeSectionId,
  isDark,
  isOpen,
  onClose,
  onJump,
  playlist,
  offline = false,
  tracks,
}: {
  activeSectionId: string | null;
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
  onJump: (sectionId: string) => void;
  playlist: StagePlaylistData;
  offline?: boolean;
  tracks: StageTrackDocument[];
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close sections"
        onClick={onClose}
        className="fixed inset-0 z-60 bg-black/35 lg:hidden"
      />
      <aside
      className={`fixed inset-y-0 right-0 z-70 grid w-[min(86vw,340px)] grid-rows-[auto_minmax(0,1fr)] border-l shadow-2xl lg:static lg:z-auto lg:w-auto lg:shadow-none ${
        isDark
          ? "border-[#23252a] bg-[#111216]"
          : "border-[#dedbd2] bg-[#fffdf8]"
      }`}
    >
      <div
        className={`flex items-start justify-between gap-3 border-b px-4 py-4 lg:pr-16 ${
          isDark ? "border-[#23252a]" : "border-[#dedbd2]"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold text-[#ed1746]">
            {offline ? playlist.setListTitle : playlist.band?.name ?? "No band linked"}
          </p>
          <h2 className="mt-1 text-[16px] font-black">Sections</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sections"
          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
            isDark
              ? "bg-[#23252a] hover:bg-[#30333a]"
              : "bg-[#ebe7dd] hover:bg-[#ddd8cc]"
          }`}
        >
          ×
        </button>
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
    </>
  );
}

function StageChordPopoverContent({
  chordReference,
  instrument,
}: {
  chordReference: GuitarChordReference;
  instrument: StageChordInstrument;
}) {
  if (instrument === "piano") {
    const pianoReference = getPianoChordReference(chordReference);

    return (
      <PianoChordCard
        chord={pianoReference.chord}
        compact
        initialVariationIndex={pianoReference.variationIndex}
        variationLabel={pianoReference.variationNumber}
      />
    );
  }

  if (instrument === "ukulele") {
    const ukuleleReference = getUkuleleChordReference(chordReference);

    return (
      <ChordCard
        chord={ukuleleReference.chord}
        compact
        instrumentLabel="ukulele"
        initialVariationIndex={ukuleleReference.variationIndex}
        variationLabel={ukuleleReference.variationNumber}
      />
    );
  }

  return (
    <ChordCard
      chord={chordReference.chord}
      compact
      initialVariationIndex={chordReference.variationIndex}
      variationLabel={chordReference.variationNumber}
    />
  );
}

function StageSyncIcon({ synced }: { synced: boolean }) {
  if (!synced) {
    return (
      <svg
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
        viewBox="0 0 24 24"
      >
        <path d="m18 6-12 12" />
        <path d="M8.5 8.5 7.2 9.8a4 4 0 0 0 5.7 5.7l1.3-1.3" />
        <path d="m15.5 15.5 1.3-1.3a4 4 0 0 0-5.7-5.7L9.8 9.8" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
      viewBox="0 0 24 24"
    >
      <path d="M10 13a5 5 0 0 0 7.1 0l2.1-2.1a5 5 0 0 0-7.1-7.1L11 4.9" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2.1 2.1a5 5 0 0 0 7.1 7.1l1.1-1.1" />
    </svg>
  );
}

type GuitarChordReference = {
  chord: ChordDefinition;
  displaySymbol: string;
  variationIndex: number;
  variationNumber: number | null;
};

type PianoChordReference = {
  chord: PianoChordDefinition;
  variationIndex: number;
  variationNumber: number | null;
};

type UkuleleChordReference = {
  chord: ChordDefinition;
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
    chord,
    displaySymbol: chord.symbol,
    variationIndex: parsedChord.variationNumber
      ? parsedChord.variationNumber - 1
      : 0,
    variationNumber: parsedChord.variationNumber,
  };
}

function getPianoChordReference(
  guitarReference: GuitarChordReference,
): PianoChordReference {
  const chord =
    findPianoChord(guitarReference.displaySymbol) ??
    createEmptyPianoChord(guitarReference.displaySymbol);

  return {
    chord,
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
    chord,
    variationIndex: guitarReference.variationIndex,
    variationNumber: guitarReference.variationNumber,
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

function getNormalizedChordCandidates(symbol: string): string[] {
  return [
    normalizeChordSymbol(symbol),
    normalizeChordSymbol(transposeChord(symbol, 0, "sharps") ?? ""),
    normalizeChordSymbol(transposeChord(symbol, 0, "flats") ?? ""),
  ].filter((value, index, values): value is string =>
    Boolean(value && values.indexOf(value) === index),
  );
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
    ...(parsedChord.bass ? { bass: parsedChord.bass } : {}),
    variations: [
      {
        id: `${symbol.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-empty`,
        frets: [0, 0, 0, 0, 0, 0],
      },
    ],
  };
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

function parseStageSections({
  setListTrackId,
  source,
  trackId,
  trackTitle,
}: {
  setListTrackId: string;
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
      setListTrackId,
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

    currentSection.lines.push({
      id: `${currentSection.id}-line-${currentSection.lines.length}`,
      index: currentSection.lines.length,
      text: line,
    });
  }

  return sections.filter((section) =>
    section.lines.some((line) => line.text.trim().length > 0),
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
    chordSurfaceClassName: isDark ? "bg-[#1c1d22]" : "bg-[#ededf0]",
  };

  if (mode === "vocals") {
    return {
      ...base,
      chordClassName: isDark ? "text-[#4b4b52]" : "text-[#c4c4cc]",
      chordSurfaceClassName: isDark ? "bg-[#15161a]" : "bg-[#f1f1f3]",
    };
  }

  return {
    ...base,
    chordClassName: isDark ? "text-[#d4d4d8]" : "text-[#3f3f46]",
  };
}

function scrollToStagePosition(
  position: StageRuntimePosition | null,
  sectionElements: Map<string, HTMLElement>,
  scroller: HTMLDivElement | null,
  leadOffsetPx = 0,
): void {
  if (!position || !scroller) {
    return;
  }

  const section = sectionElements.get(position.sectionId);

  if (!section) {
    return;
  }

  scroller.scrollTo({
    behavior: "auto",
    top: Math.max(
      0,
      section.offsetTop +
        section.offsetHeight * position.sectionProgressRatio -
        scroller.clientHeight * 0.32 +
        leadOffsetPx,
    ),
  });
}

function getLatencyCompensationPx(speed: number, sentAt: number): number {
  if (speed <= 0 || !Number.isFinite(sentAt)) {
    return 0;
  }

  const elapsedMs = Math.min(
    Math.max(0, Date.now() - sentAt),
    MAX_SYNC_LATENCY_COMPENSATION_MS,
  );

  return (elapsedMs / 1000) * speed * AUTO_SCROLL_PIXELS_PER_SECOND;
}

function clampScrollSpeed(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(6, Math.round(value * 2) / 2));
}

function clampTranspose(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-12, Math.min(12, Math.round(value)));
}

function markProgrammaticScroll(
  programmaticScrollIgnoreUntilRef: { current: number },
): void {
  programmaticScrollIgnoreUntilRef.current = Math.max(
    programmaticScrollIgnoreUntilRef.current,
    performance.now() + PROGRAMMATIC_SCROLL_IGNORE_MS,
  );
}

function createStageRuntimeState({
  accidentals,
  displayMode,
  playlist,
  position,
  scrollSpeed,
  theme,
  transpose,
}: {
  accidentals: AccidentalPreference;
  displayMode: StageDisplayMode;
  playlist: StagePlaylistData;
  position: StageRuntimePosition | null;
  scrollSpeed: number;
  theme: StageTheme;
  transpose: number;
}): StageRuntimeState {
  return {
    appearance: {
      accidentals,
      displayMode,
      theme,
      transpose,
    },
    channel: {
      bandId: playlist.band?.id ?? null,
      eventId: playlist.eventId,
      eventSetListId: playlist.id,
      setListId: playlist.setListId,
    },
    playback: {
      scrollSpeed,
      status: scrollSpeed > 0 ? "playing" : "paused",
    },
    position,
    updatedAt: Date.now(),
  };
}

function getStageRuntimeStateKey(state: StageRuntimeState): string {
  return JSON.stringify({
    appearance: state.appearance,
    channel: state.channel,
    playback: state.playback,
    position: state.position
      ? {
          sectionId: state.position.sectionId,
          setListTrackId: state.position.setListTrackId,
          trackId: state.position.trackId,
        }
      : null,
  });
}

function findActiveLineFromMetrics(
  lines: StageLineMetric[],
  anchorLine: number,
): StageLineMetric | null {
  let activeLine: StageLineMetric | null = null;

  for (const line of lines) {
    if (line.top <= anchorLine) {
      activeLine = line;
    } else {
      break;
    }
  }

  return activeLine;
}

function getSectionProgressRatioFromMetrics(
  section: StageSectionMetric,
  anchorLine: number,
): number {
  const rawProgress = (anchorLine - section.top) / section.height;

  return Math.min(1, Math.max(0, rawProgress));
}

function stageButtonClass(isDark: boolean): string {
  return `inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-40 ${
    isDark
      ? "border-[#343740] bg-[#17191f] text-[#f5f3ed] hover:border-[#ed1746]"
      : "border-[#d8d3c8] bg-white text-[#151515] hover:border-[#ed1746]"
  }`;
}
