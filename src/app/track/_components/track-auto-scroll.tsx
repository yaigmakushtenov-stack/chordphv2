"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import {
  AUTO_SCROLL_PIXELS_PER_SECOND,
  AUTO_SCROLL_SPEED_STEP,
  MAX_AUTO_SCROLL_SPEED,
} from "@/components/shared/auto-scroll-speed-controls";

type TrackAutoScrollProps = {
  chartRef: RefObject<HTMLDivElement | null>;
};

export function TrackAutoScroll({ chartRef }: TrackAutoScrollProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(3);
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
        setIsRunning(false);
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
        setIsRunning(false);
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
        setIsRunning(false);
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

  const speedButtonClass = "flex size-9 shrink-0 items-center justify-center rounded-full text-[18px] font-bold transition hover:bg-[#f1f1f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#343438]";

  return (
    <div ref={controlsRef} role="group" aria-label="Auto-scroll controls" className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-3 z-40 flex w-[52px] flex-col items-center rounded-full border border-[#dedede] bg-white p-1 text-[#171719] shadow-lg sm:right-5 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f4f4f5]">
      <button
        type="button"
        aria-pressed={isRunning}
        aria-label={isRunning ? "Pause auto-scroll" : "Start auto-scroll"}
        title={isRunning ? "Pause auto-scroll" : "Start auto-scroll"}
        onClick={() => setIsRunning((value) => !value)}
        className="flex size-10 items-center justify-center rounded-full bg-[#ed1746] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#ed1746] dark:text-white dark:hover:bg-[#ff315d]"
      >
        <span aria-hidden="true" className="text-[18px] leading-none">{isRunning ? "Ⅱ" : "↓"}</span>
      </button>
      <button type="button" aria-label="Increase auto-scroll speed" disabled={speed >= MAX_AUTO_SCROLL_SPEED} onClick={() => setSpeed((value) => Math.min(MAX_AUTO_SCROLL_SPEED, value + AUTO_SCROLL_SPEED_STEP))} className={speedButtonClass}>+</button>
      <span role="status" aria-label={`Auto-scroll speed ${speed}`} className="min-w-8 text-center text-[11px] font-bold leading-4 tabular-nums">{speed}×</span>
      <button type="button" aria-label="Decrease auto-scroll speed" disabled={speed <= AUTO_SCROLL_SPEED_STEP} onClick={() => setSpeed((value) => Math.max(AUTO_SCROLL_SPEED_STEP, value - AUTO_SCROLL_SPEED_STEP))} className={speedButtonClass}>−</button>
    </div>
  );
}
