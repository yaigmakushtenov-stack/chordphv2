"use client";

import Link from "next/link";
import { Roboto_Mono } from "next/font/google";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { transposeChord, transposeChordPro } from "@/lib/chords/chord-pro";
import type { AccidentalPreference } from "@/lib/chords/chord-pro";
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

const stageFont = Roboto_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-stage",
});

const AUTO_SCROLL_PIXELS_PER_SECOND = 34;
const MANUAL_SCROLL_PAUSE_MS = 700;
const PROGRAMMATIC_SCROLL_IGNORE_MS = 80;

type StageAppearance = {
  activeSectionBorderClassName: string;
  chordClassName: string;
  idleSectionBorderClassName: string;
  labelClassName: string;
  lyricClassName: string;
  sectionSurfaceClassName: string;
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

type StageInstrumentId = "guitar" | "piano" | "ukulele" | "vocals";

const STAGE_INSTRUMENT_CONFIG: Array<{
  displayMode: StageDisplayMode;
  id: StageInstrumentId;
  label: string;
  shortLabel: string;
}> = [
  { displayMode: "default", id: "guitar", label: "Guitar", shortLabel: "Gtr" },
  { displayMode: "default", id: "piano", label: "Piano", shortLabel: "Pno" },
  {
    displayMode: "default",
    id: "ukulele",
    label: "Ukulele",
    shortLabel: "Uku",
  },
  { displayMode: "vocals", id: "vocals", label: "Vocals", shortLabel: "Vox" },
];

export function StageView({ playlist }: { playlist: StagePlaylistData }) {
  const [theme, setTheme] = useState<StageTheme>("dark");
  const [stageInstrument, setStageInstrument] =
    useState<StageInstrumentId>("guitar");
  const [trackTransposes, setTrackTransposes] = useState<StageTrackTransposes>(
    {},
  );
  const [accidentals, setAccidentals] =
    useState<AccidentalPreference>("sharps");
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInstrumentMenuOpen, setIsInstrumentMenuOpen] = useState(false);
  const [syncMode, setSyncMode] = useState<StageSyncMode>("synced");
  const [lockState, setLockState] = useState<StageSyncLockState>("free");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const lineRefs = useRef(new Map<string, HTMLParagraphElement>());
  const layoutMetricsRef = useRef<StageSectionMetric[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastPublishedStateKeyRef = useRef("");
  const remoteScrollFrameRef = useRef<number | null>(null);
  const scrollEndTimerRef = useRef<number | null>(null);
  const lastSpeedDownAtRef = useRef(0);
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
  const selectedStageInstrument =
    STAGE_INSTRUMENT_CONFIG.find((item) => item.id === stageInstrument) ??
    STAGE_INSTRUMENT_CONFIG[0];
  const stageDisplayMode = selectedStageInstrument.displayMode;
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

  useEffect(() => {
    stageStateRef.current = stageState;
  }, [stageState]);

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

      if (!options.render) {
        return;
      }

      if (lastPublishedStateKeyRef.current === stateKey) {
        return;
      }

      lastPublishedStateKeyRef.current = stateKey;
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
    (position: StageRuntimePosition | null, nextScrollSpeed: number) => {
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
      trackTransposes,
    }),
    [scrollSpeed, stageState.position, trackTransposes],
  );

  const stageSync = useStageSync({
    bandId: playlist.band?.id ?? null,
    canPublish: playlist.currentUser.canLead,
    eventId: playlist.eventId,
    getSnapshot: getStageSyncSnapshot,
    lockState,
    onSnapshot: (event: StageSyncSnapshot) => {
      setTrackTransposes(event.trackTransposes);

      if (syncMode === "unsynced") {
        return;
      }

      applyViewportState(event.position, clampScrollSpeed(event.speed));
      setLockState("locked");
    },
    onTrackTranspose: (event) => {
      if (!event.setListTrackId) {
        return;
      }

      setTrackTransposes((current) => ({
        ...current,
        [event.setListTrackId]: clampTranspose(event.transpose),
      }));
    },
    onViewport: (event) => {
      if (syncMode === "unsynced") {
        return;
      }

      applyViewportState(event.position, clampScrollSpeed(event.speed));
      setLockState("locked");
    },
    role: playlist.currentUser.role,
    setListId: playlist.setListId,
    snapshot: {
      position: stageState.position,
      speed: scrollSpeed,
      trackTransposes,
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

    const tick = (time: number) => {
      const scroller = scrollerRef.current;
      const previousTime = lastFrameTimeRef.current ?? time;
      const elapsedSeconds = Math.min((time - previousTime) / 1000, 0.08);
      lastFrameTimeRef.current = time;

      if (scroller) {
        if (performance.now() >= manualScrollPauseUntilRef.current) {
          markProgrammaticScroll(programmaticScrollIgnoreUntilRef);
          scroller.scrollTop +=
            elapsedSeconds * scrollSpeed * AUTO_SCROLL_PIXELS_PER_SECOND;
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
    updateScrollSpeed((speed) => Math.max(0, speed - 1));
  }

  function toggleSyncMode(): void {
    setSyncMode((current) => (current === "synced" ? "unsynced" : "synced"));
    setLockState("free");
  }

  function updateActiveTrackTranspose(offset: -1 | 1): void {
    if (!activeSetListTrackId) {
      return;
    }

    setTrackTransposes((current) => {
      const nextTranspose = clampTranspose(
        (current[activeSetListTrackId] ?? 0) + offset,
      );
      const nextTransposes = {
        ...current,
        [activeSetListTrackId]: nextTranspose,
      };

      stageSync.publishTrackTranspose({
        setListTrackId: activeSetListTrackId,
        transpose: nextTranspose,
      });

      return nextTransposes;
    });
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

  async function enterFullscreen(): Promise<void> {
    await document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <main
      className={`${stageFont.variable} grid h-dvh min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden font-[family:var(--font-stage)] ${
        isDark ? "bg-[#08090b] text-[#f5f3ed]" : "bg-[#f8f7f3] text-[#151515]"
      }`}
    >
      <div className="grid min-h-0 min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          ref={scrollerRef}
          onKeyDown={handleLocalScrollIntent}
          onPointerDown={handleLocalScrollIntent}
          onScroll={handleStageScroll}
          onTouchStart={handleLocalScrollIntent}
          onWheel={handleLocalScrollIntent}
          tabIndex={-1}
          className="min-h-0 overflow-y-auto px-0 pb-[42vh] pt-6 sm:px-8 lg:px-12"
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
                            className={`overflow-x-auto rounded-lg px-3 py-4 font-[family:var(--font-stage)] text-[10px] leading-[1.4] sm:text-[24px] sm:leading-[1.5] md:text-[28px] md:leading-[1.52] ${
                              appearance.sectionSurfaceClassName
                            }`}
                          >
                            {section.lines.map((line) => (
                              <StageChordLine
                                key={line.id}
                                ref={(element) => {
                                  if (element) {
                                    lineRefs.current.set(line.id, element);
                                  } else {
                                    lineRefs.current.delete(line.id);
                                  }
                                }}
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
        className={`relative border-t px-3 py-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-2 sm:px-4 ${
          isDark
            ? "border-[#23252a] bg-[#111216]"
            : "border-[#dedbd2] bg-[#fffdf8]"
        }`}
      >
        {isMobileMenuOpen ? (
          <div
            className={`absolute bottom-full left-3 right-3 z-40 mb-2 grid gap-3 rounded-lg border p-3 shadow-2xl sm:hidden ${
              isDark
                ? "border-[#343740] bg-[#111216] text-[#f5f3ed]"
                : "border-[#d8d3c8] bg-[#fffdf8] text-[#151515]"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-[#ed1746]">
                {playlist.eventTitle}
              </p>
              <p className="truncate text-[15px] font-black">
                {activeAnchor
                  ? `${activeAnchor.trackTitle} / ${activeAnchor.sectionTitle}`
                  : playlist.setListTitle}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/events/${playlist.eventId}`}
                className={stageButtonClass(isDark)}
              >
                Back
              </Link>
              <button
                type="button"
                onClick={() => setIsNavigatorOpen((current) => !current)}
                className={stageButtonClass(isDark)}
              >
                Sections
              </button>
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
                onClick={() => jumpByOffset(1)}
                disabled={
                  !activeAnchor ||
                  anchors[anchors.length - 1]?.id === activeAnchor.id
                }
                className={stageButtonClass(isDark)}
              >
                Next
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
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#ed1746] px-4 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
              >
                Fullscreen
              </button>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
              <div
                className={`inline-flex h-10 items-center overflow-hidden rounded-full border ${
                  isDark
                    ? "border-[#343740] bg-[#17191f]"
                    : "border-[#d8d3c8] bg-white"
                }`}
              >
                <button
                  type="button"
                  disabled={!activeSetListTrackId || activeTrackTranspose <= -12}
                  onClick={() => updateActiveTrackTranspose(-1)}
                  className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#ed1746] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Transpose down one semitone"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-[12px] font-black tabular-nums">
                  {activeTrackTranspose}
                </span>
                <button
                  type="button"
                  disabled={!activeSetListTrackId || activeTrackTranspose >= 12}
                  onClick={() => updateActiveTrackTranspose(1)}
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
                className={`h-10 min-w-0 rounded-full border px-3 text-[12px] font-bold outline-none focus:border-[#ed1746] ${
                  isDark
                    ? "border-[#343740] bg-[#17191f] text-[#f5f3ed]"
                    : "border-[#d8d3c8] bg-white text-[#151515]"
                }`}
              >
                <option value="sharps">Sharps</option>
                <option value="flats">Flats</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`flex h-10 items-center justify-center rounded-full border px-3 text-[12px] font-black ${
                  isDark
                    ? "border-[#343740] bg-[#17191f] text-[#f5f3ed]"
                    : "border-[#d8d3c8] bg-white text-[#151515]"
                }`}
              >
                {getStageSyncLabel({
                  isSyncAvailable: stageSync.isSyncAvailable,
                  lockState,
                  status: stageSync.status,
                  syncMode,
                })}
              </div>
              {stageSync.lastControllerLabel ? (
                <div
                  className={`flex h-10 items-center justify-center rounded-full px-3 text-[12px] font-black ${
                    isDark ? "bg-[#23252a]" : "bg-[#ebe7dd]"
                  }`}
                >
                  By {stageSync.lastControllerLabel}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="flex min-w-0 items-center justify-between gap-2 sm:hidden">
          <div
            className={`inline-flex h-11 shrink-0 items-center overflow-hidden rounded-full border ${
              isDark
                ? "border-[#343740] bg-[#17191f]"
                : "border-[#d8d3c8] bg-white"
            }`}
            aria-label="Auto-scroll speed controls"
          >
            <button
              type="button"
              onClick={decreaseScrollSpeed}
              className="flex h-full w-11 items-center justify-center text-[18px] font-black transition hover:bg-[#ed1746] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
              aria-label="Decrease auto-scroll speed. Double tap to stop."
            >
              -
            </button>
            <span className="flex h-full min-w-20 items-center justify-center px-2 text-[12px] font-black tabular-nums">
              {scrollSpeed === 0 ? "Off" : `Speed ${scrollSpeed}`}
            </span>
            <button
              type="button"
              onClick={() =>
                updateScrollSpeed((speed) => Math.min(12, speed + 1))
              }
              className="flex h-full w-11 items-center justify-center bg-[#ed1746] text-[18px] font-black text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
              aria-label="Increase auto-scroll speed"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={toggleSyncMode}
            className={`flex size-11 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
              syncMode === "synced"
                ? "border-[#ed1746] bg-[#ed1746] text-white"
                : isDark
                  ? "border-[#343740] bg-[#17191f] text-[#f5f3ed]"
                  : "border-[#d8d3c8] bg-white text-[#151515]"
            }`}
            aria-label={syncMode === "synced" ? "Unsync stage" : "Sync stage"}
            aria-pressed={syncMode === "synced"}
          >
            <StageSyncIcon synced={syncMode === "synced"} />
          </button>
          <div className="relative shrink-0">
            {isInstrumentMenuOpen ? (
              <div
                className={`absolute bottom-full right-0 z-50 mb-2 grid min-w-36 gap-1 rounded-lg border p-1.5 shadow-2xl ${
                  isDark
                    ? "border-[#343740] bg-[#111216] text-[#f5f3ed]"
                    : "border-[#d8d3c8] bg-[#fffdf8] text-[#151515]"
                }`}
              >
                {STAGE_INSTRUMENT_CONFIG.map((instrument) => (
                  <button
                    key={instrument.id}
                    type="button"
                    onClick={() => {
                      setStageInstrument(instrument.id);
                      setIsInstrumentMenuOpen(false);
                    }}
                    className={`flex h-9 items-center justify-between rounded-md px-3 text-left text-[12px] font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
                      stageInstrument === instrument.id
                        ? "bg-[#ed1746] text-white"
                        : isDark
                          ? "hover:bg-[#202229]"
                          : "hover:bg-[#f0ede5]"
                    }`}
                  >
                    <span>{instrument.label}</span>
                    <span className="text-[10px] uppercase opacity-70">
                      {instrument.shortLabel}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsInstrumentMenuOpen((current) => !current);
              }}
              className={stageIconButtonClass(isDark)}
              aria-label="Select stage instrument"
              aria-expanded={isInstrumentMenuOpen}
            >
              <span className="text-[11px] font-black" aria-hidden="true">
                {selectedStageInstrument.shortLabel}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsInstrumentMenuOpen(false);
              setIsMobileMenuOpen((current) => !current);
            }}
            className={stageIconButtonClass(isDark)}
            aria-label="Open stage options"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="grid gap-0.5" aria-hidden="true">
              <span className="size-1 rounded-full bg-current" />
              <span className="size-1 rounded-full bg-current" />
              <span className="size-1 rounded-full bg-current" />
            </span>
          </button>
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-[12px] font-bold text-[#ed1746]">
            {playlist.eventTitle}
          </p>
          <p
            className={`truncate text-[15px] font-black ${
              isDark ? "text-[#f5f3ed]" : "text-[#151515]"
            }`}
          >
            {activeAnchor
              ? `${activeAnchor.trackTitle} / ${activeAnchor.sectionTitle}`
              : playlist.setListTitle}
          </p>
        </div>
        <div className="hidden min-w-0 items-center gap-2 overflow-x-auto pb-0.5 sm:flex sm:justify-end sm:pb-0">
          <Link
            href={`/events/${playlist.eventId}`}
            className={stageButtonClass(isDark)}
          >
            Back
          </Link>
          <div
            className={`flex h-10 shrink-0 items-center justify-center rounded-full border px-3 text-[12px] font-black ${
              isDark
                ? "border-[#343740] bg-[#17191f] text-[#f5f3ed]"
                : "border-[#d8d3c8] bg-white text-[#151515]"
            }`}
          >
            {getStageSyncLabel({
              isSyncAvailable: stageSync.isSyncAvailable,
              lockState,
              status: stageSync.status,
              syncMode,
            })}
          </div>
          {stageSync.lastControllerLabel ? (
            <div
              className={`flex h-10 shrink-0 items-center justify-center rounded-full px-3 text-[12px] font-black ${
                isDark ? "bg-[#23252a]" : "bg-[#ebe7dd]"
              }`}
            >
              By {stageSync.lastControllerLabel}
            </div>
          ) : null}
          <button
            type="button"
            onClick={toggleSyncMode}
            className={stageButtonClass(isDark)}
          >
            {syncMode === "synced" ? "Unsync" : "Sync"}
          </button>
          <button
            type="button"
            onClick={() => setIsNavigatorOpen((current) => !current)}
            className={stageButtonClass(isDark)}
          >
            Sections
          </button>
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
            onClick={decreaseScrollSpeed}
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
            onClick={() =>
              updateScrollSpeed((speed) => Math.min(12, speed + 1))
            }
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
            className="inline-flex h-10 shrink-0 items-center rounded-full bg-[#ed1746] px-4 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
          >
            Fullscreen
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
              disabled={!activeSetListTrackId || activeTrackTranspose <= -12}
              onClick={() => updateActiveTrackTranspose(-1)}
              className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#ed1746] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Transpose down one semitone"
            >
              -
            </button>
            <span className="min-w-8 text-center text-[12px] font-black tabular-nums">
              {activeTrackTranspose}
            </span>
            <button
              type="button"
              disabled={!activeSetListTrackId || activeTrackTranspose >= 12}
              onClick={() => updateActiveTrackTranspose(1)}
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

const StageChordLine = forwardRef<HTMLParagraphElement, {
  appearance: StageAppearance;
  line: StageLine;
}>(function StageChordLine({
  appearance,
  line,
}, ref) {
  const parts = getStageLineParts(line.text);

  if (parts.length === 0) {
    return <p ref={ref} className="min-h-[1.45em]">&nbsp;</p>;
  }

  return (
    <p
      ref={ref}
      className={`whitespace-pre sm:whitespace-pre-wrap ${appearance.lyricClassName}`}
    >
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
});

function FragmentText({ children }: { children: ReactNode }) {
  return <>{children}</>;
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
      chordClassName: isDark ? "text-[#4b4b52]" : "text-[#c4c4cc]",
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
        scroller.clientHeight * 0.32,
    ),
  });
}

function getStageSyncLabel(sync: {
  isSyncAvailable: boolean;
  lockState: StageSyncLockState;
  status: string;
  syncMode: StageSyncMode;
}): string {
  if (!sync.isSyncAvailable) {
    return "Solo stage";
  }

  if (sync.status === "connecting") {
    return "Syncing";
  }

  if (sync.status !== "connected") {
    return "Offline";
  }

  if (sync.syncMode === "unsynced") {
    return "Unsync + Free";
  }

  return sync.lockState === "locked" ? "Sync + Locked" : "Sync + Free";
}

function clampScrollSpeed(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(12, Math.round(value)));
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

function stageIconButtonClass(isDark: boolean): string {
  return `flex size-11 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
    isDark
      ? "border-[#343740] bg-[#17191f] text-[#f5f3ed] hover:border-[#ed1746]"
      : "border-[#d8d3c8] bg-white text-[#151515] hover:border-[#ed1746]"
  }`;
}
