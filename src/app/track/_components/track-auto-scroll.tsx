"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import {
  AUTO_SCROLL_PIXELS_PER_SECOND,
  AUTO_SCROLL_SPEED_STEP,
  MAX_AUTO_SCROLL_SPEED,
} from "@/components/shared/auto-scroll-speed-controls";

import { ChartPlaybackToolbar, ChartTransposeControls, ChartViewSelect } from "@/components/shared/chart-playback-toolbar";
import { useAppTheme } from "@/providers/theme-provider";
import type { AccidentalPreference } from "@/lib/chords/chord-pro";

type TrackAutoScrollProps = {
  chartRef: RefObject<HTMLDivElement | null>;
  fontSize: number;
  minFontSize: number;
  maxFontSize: number;
  onFontSizeChange: (size: number) => void;
  accidentals: AccidentalPreference;
  onAccidentalsChange: () => void;
  transpose: number;
  displayKey: string;
  onTransposeChange: (value: number) => void;
  transposeDisabled?: boolean;
  vocals: boolean;
  onVocalsChange: (vocals: boolean) => void;
  instrumentOptions?: ReactNode;
};

export function TrackAutoScroll({ chartRef, fontSize, minFontSize, maxFontSize, onFontSizeChange, accidentals, onAccidentalsChange, transpose, displayKey, onTransposeChange, transposeDisabled, vocals, onVocalsChange, instrumentOptions }: TrackAutoScrollProps) {
  const { resolvedTheme } = useAppTheme();
  const [speed, setSpeed] = useState(0);
  const isRunning = speed > 0;
  const lastPlayingSpeedRef = useRef(3);
  const lastSpeedDownAtRef = useRef(0);
  useEffect(() => { if (speed > 0) lastPlayingSpeedRef.current = speed; }, [speed]);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRunning) return;

    let frameId = 0;
    let previousTime: number | null = null;
    let position: number | null = null;
    let previousScroller: HTMLElement | null = null;

    function scrollFrame(time: number): void {
      const chart = chartRef.current;
      if (!chart) {
        setSpeed(0);
        return;
      }

      let scroller = chart.parentElement;
      while (scroller && (
        !/^(auto|scroll)$/.test(getComputedStyle(scroller).overflowY) ||
        scroller.scrollHeight <= scroller.clientHeight + 1
      )) {
        scroller = scroller.parentElement;
      }
      scroller ??= document.scrollingElement as HTMLElement | null;
      if (!scroller) {
        setSpeed(0);
        return;
      }

      const viewportBottom = scroller === document.scrollingElement
        ? window.innerHeight
        : scroller.getBoundingClientRect().bottom;
      const chartBottomLimit = Math.min(
        viewportBottom,
        controlsRef.current?.getBoundingClientRect().top ?? viewportBottom,
      ) - 16;
      if (chart.getBoundingClientRect().bottom <= chartBottomLimit ||
        scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 1) {
        setSpeed(0);
        return;
      }

      if (scroller !== previousScroller || position === null || Math.abs(scroller.scrollTop - position) > 2) {
        position = scroller.scrollTop;
        previousScroller = scroller;
      }
      if (previousTime !== null) {
        position += Math.min(time - previousTime, 100) / 1000 * speed * AUTO_SCROLL_PIXELS_PER_SECOND;
        scroller.scrollTo({ top: position, behavior: "instant" });
      }
      previousTime = time;
      frameId = requestAnimationFrame(scrollFrame);
    }

    frameId = requestAnimationFrame(scrollFrame);
    return () => cancelAnimationFrame(frameId);
  }, [chartRef, isRunning, speed]);

  function decreaseSpeed(): void {
    const now = performance.now();
    if (now - lastSpeedDownAtRef.current <= 360) {
      lastSpeedDownAtRef.current = 0;
      setSpeed(0);
      return;
    }
    lastSpeedDownAtRef.current = now;
    setSpeed((value) => Math.max(0, value - AUTO_SCROLL_SPEED_STEP));
  }

  return <div ref={controlsRef} className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
    <ChartPlaybackToolbar
      className="pointer-events-auto w-fit max-w-full rounded-t-2xl border-x shadow-lg"
      isDark={resolvedTheme === "dark"} speed={speed} zoom={fontSize / 13} minZoom={minFontSize / 13} maxZoom={maxFontSize / 13} accidentals={accidentals}
      onPlay={() => setSpeed((value) => value > 0 ? 0 : lastPlayingSpeedRef.current)}
      onSpeedDown={decreaseSpeed} onSpeedUp={() => setSpeed((value) => Math.min(MAX_AUTO_SCROLL_SPEED, value + AUTO_SCROLL_SPEED_STEP))}
      onZoomOut={() => onFontSizeChange(Math.max(minFontSize, fontSize - 1))}
      onZoomIn={() => onFontSizeChange(Math.min(maxFontSize, fontSize + 1))}
      onAccidentalsChange={onAccidentalsChange}
      options={<>
        <ChartTransposeControls isDark={resolvedTheme === "dark"} value={transpose} displayKey={displayKey} onChange={onTransposeChange} disabled={transposeDisabled} />
        <ChartViewSelect isDark={resolvedTheme === "dark"} vocals={vocals} onChange={onVocalsChange} />
        {!vocals ? instrumentOptions : null}
      </>}
    />
  </div>;
}
