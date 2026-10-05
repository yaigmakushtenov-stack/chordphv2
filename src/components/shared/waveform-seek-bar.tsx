"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

type WaveformSeekBarProps = {
  src: string;
  seed: string;
  progress: number;
  barCount: number;
  responsive?: boolean;
  maxBarCount?: number;
  className?: string;
  activeBarClassName?: string;
  inactiveBarClassName?: string;
  cursorClassName?: string;
  ariaLabel: string;
  onSeek: (progress: number) => void;
  durationSeconds?: number;
  disabled?: boolean;
};

const waveformCache = new Map<string, number[]>();

export function WaveformSeekBar({
  src,
  progress,
  barCount,
  responsive = false,
  maxBarCount = barCount,
  className,
  activeBarClassName = "bg-[#ed1746]",
  inactiveBarClassName = "bg-[#92929a] dark:bg-[#a1a1aa]",
  cursorClassName = "bg-[#ed1746] dark:bg-[#fb7185]",
  ariaLabel,
  onSeek,
  durationSeconds = 100,
  disabled = false,
}: WaveformSeekBarProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const [responsiveBarCount, setResponsiveBarCount] = useState<number | null>(
    null,
  );
  const effectiveBarCount = responsive
    ? (responsiveBarCount ?? barCount)
    : barCount;
  const [waveform, setWaveform] = useState<{ src: string; peaks: number[]; unavailable: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const peaks = waveform?.src === src ? waveform.peaks : null;
  const bars = Array.from({ length: effectiveBarCount }, (_, index) =>
    peaks?.[Math.floor(index * peaks.length / effectiveBarCount)] ?? 18,
  );
  const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;

  useEffect(() => {
    if (!responsive) {
      return;
    }

    const bar = waveformRef.current;

    if (!bar || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateBarCount = () => {
      const nextBarCount = Math.max(
        barCount,
        Math.min(maxBarCount, Math.round(bar.offsetWidth / 2)),
      );

      setResponsiveBarCount(nextBarCount);
    };
    const resizeObserver = new ResizeObserver(updateBarCount);

    resizeObserver.observe(bar);

    return () => resizeObserver.disconnect();
  }, [barCount, maxBarCount, responsive]);

  useEffect(() => {
    const abortController = new AbortController();
    const timeout = window.setTimeout(() => {
      const cached = waveformCache.get(src);
      if (cached) {
        setWaveform({ src, peaks: cached, unavailable: false });
        return;
      }
      setWaveform(null);
      void createAudioPeaks(src, 1024, abortController.signal)
        .then((peaks) => {
          if (abortController.signal.aborted) return;
          if (waveformCache.size >= 16) {
            const oldest = waveformCache.keys().next().value;
            if (oldest !== undefined) waveformCache.delete(oldest);
          }
          waveformCache.set(src, peaks);
          setWaveform({ src, peaks, unavailable: false });
        })
        .catch((error: unknown) => {
          if (abortController.signal.aborted) return;
          if (!(error instanceof Error)) throw error;
          setWaveform({ src, peaks: [], unavailable: true });
        });
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [src, retry]);

  function handleSeek(event: PointerEvent<HTMLDivElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    if (disabled || rect.width <= 0) return;
    const nextProgress = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );

    onSeek(nextProgress);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = 5 / Math.max(1, durationSeconds);
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1
      : event.key === "ArrowRight" || event.key === "ArrowUp" ? safeProgress + step
      : event.key === "ArrowLeft" || event.key === "ArrowDown" ? safeProgress - step : null;
    if (next === null || disabled) return;
    event.preventDefault();
    onSeek(Math.max(0, Math.min(1, next)));
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-orientation="horizontal"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, durationSeconds)}
        aria-valuenow={safeProgress * Math.max(0, durationSeconds)}
        aria-valuetext={`${Math.floor(safeProgress * durationSeconds)} seconds`}
        title={waveform?.src === src && waveform.unavailable ? "Waveform unavailable. You can still drag to seek." : "Drag to seek. Arrow keys move five seconds."}
        onPointerDown={(event) => {
          if (event.button !== 0 || disabled) return;
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          handleSeek(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) handleSeek(event);
        }}
        onPointerUp={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          handleSeek(event);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={handleKeyDown}
        ref={waveformRef}
        className={`absolute inset-0 flex touch-none select-none items-center gap-px ${disabled ? "cursor-wait" : "cursor-ew-resize"}`}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#dedede] dark:bg-[#3a3a3f]" />
        {peaks?.length ? bars.map((height, index) => {
          const active = (index + 1) / bars.length <= safeProgress;

          return (
            <span
              key={index}
              aria-hidden="true"
              className={`relative min-w-0 flex-1 transition-colors ${
                active ? activeBarClassName : inactiveBarClassName
              }`}
              style={{ height: `${height}%` }}
            />
          );
        }) : null}
        <span aria-hidden="true" className={`pointer-events-none absolute inset-y-1 -translate-x-1/2 rounded-full shadow-sm ${cursorClassName}`} style={{ left: `${safeProgress * 100}%`, width: 2 }}>
          <span className={`absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full ${cursorClassName}`} />
        </span>
      </div>
      {!peaks?.length ? (
        <span role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-medium text-[#777] dark:text-[#a1a1aa]">
          {waveform?.src === src && waveform.unavailable ? "Waveform unavailable" : "Loading waveform…"}
        </span>
      ) : null}
      {waveform?.src === src && waveform.unavailable ? (
        <button
          type="button"
          onClick={() => setRetry((current) => current + 1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#202023] dark:text-[#fb7185]"
        >Retry</button>
      ) : null}
    </div>
  );
}

async function createAudioPeaks(
  src: string,
  barCount: number,
  signal: AbortSignal,
): Promise<number[]> {
  const url = new URL(src, window.location.href);
  if (url.origin === window.location.origin && /^\/music\/files\/[^/]+\/play$/.test(url.pathname)) {
    url.searchParams.set("waveform", "1");
  }
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error("Audio waveform source unavailable.");
  }

  const audioData = await response.arrayBuffer();
  if (audioData.byteLength > 50 * 1024 * 1024) throw new Error("Audio is too large to display a waveform.");
  signal.throwIfAborted();
  const audioContext = new OfflineAudioContext(1, 1, 8_000);
  const audioBuffer = await audioContext.decodeAudioData(audioData);
  signal.throwIfAborted();
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => audioBuffer.getChannelData(index));
  const peaks = Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor(index * audioBuffer.length / barCount);
    const end = Math.floor((index + 1) * audioBuffer.length / barCount);
    let sum = 0;
    for (const samples of channels) {
      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
        sum += Math.abs(samples[sampleIndex] ?? 0);
      }
    }
    return sum / Math.max(1, (end - start) * channels.length);
  });
  const maxPeak = Math.max(...peaks, 0.01);
  return peaks.map((peak) => 2 + Math.round((peak / maxPeak) * 96));
}
