"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

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
  ariaLabel: string;
  onSeek: (progress: number) => void;
};

const waveformCache = new Map<string, number[]>();

export function WaveformSeekBar({
  src,
  seed,
  progress,
  barCount,
  responsive = false,
  maxBarCount = barCount,
  className,
  activeBarClassName = "bg-[#ed1746]",
  inactiveBarClassName = "bg-[#c9c9c9] dark:bg-[#55555c]",
  ariaLabel,
  onSeek,
}: WaveformSeekBarProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [responsiveBarCount, setResponsiveBarCount] = useState<number | null>(
    null,
  );
  const effectiveBarCount = responsive
    ? (responsiveBarCount ?? barCount)
    : barCount;
  const fallbackBars = useMemo(
    () => createFallbackBars(seed, effectiveBarCount),
    [effectiveBarCount, seed],
  );
  const loadingBars = useMemo(
    () => createLoadingBars(effectiveBarCount),
    [effectiveBarCount],
  );
  const cacheKey = `${src}:${effectiveBarCount}`;
  const [bars, setBars] = useState(loadingBars);

  useEffect(() => {
    if (!responsive) {
      return;
    }

    const button = buttonRef.current;

    if (!button || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateBarCount = () => {
      const nextBarCount = Math.max(
        barCount,
        Math.min(maxBarCount, Math.round(button.offsetWidth / 9)),
      );

      setResponsiveBarCount(nextBarCount);
    };
    const resizeObserver = new ResizeObserver(updateBarCount);

    resizeObserver.observe(button);

    return () => resizeObserver.disconnect();
  }, [barCount, maxBarCount, responsive]);

  useEffect(() => {
    const cachedBars = waveformCache.get(cacheKey);

    if (cachedBars?.length === effectiveBarCount) {
      window.setTimeout(() => setBars(cachedBars), 0);
      return;
    }

    const abortController = new AbortController();

    window.setTimeout(() => setBars(loadingBars), 0);
    void createAudioPeaks(src, effectiveBarCount, abortController.signal)
      .then((peaks) => {
        waveformCache.set(cacheKey, peaks);
        setBars(peaks);
      })
      .catch(() => {
        setBars(fallbackBars);
      });

    return () => abortController.abort();
  }, [cacheKey, effectiveBarCount, fallbackBars, loadingBars, src]);

  function handleSeek(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextProgress = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );

    onSeek(nextProgress);
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleSeek}
      ref={buttonRef}
      className={className}
    >
      {bars.map((height, index) => {
        const active = index / bars.length <= progress;

        return (
          <span
            key={index}
            aria-hidden="true"
            className={`flex-1 rounded-full transition-[height,background-color] duration-300 ease-out ${
              active ? activeBarClassName : inactiveBarClassName
            }`}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </button>
  );
}

async function createAudioPeaks(
  src: string,
  barCount: number,
  signal: AbortSignal,
): Promise<number[]> {
  const response = await fetch(src, { signal });

  if (!response.ok) {
    throw new Error("Audio waveform source unavailable.");
  }

  const audioData = await response.arrayBuffer();
  const AudioContextConstructor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error("AudioContext is unavailable.");
  }
  const audioContext = new AudioContextConstructor();

  try {
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const samples = audioBuffer.getChannelData(0);
    const bucketSize = Math.max(1, Math.floor(samples.length / barCount));
    const peaks = Array.from({ length: barCount }, (_, index) => {
      const start = index * bucketSize;
      const end = Math.min(samples.length, start + bucketSize);
      let sum = 0;

      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
        sum += Math.abs(samples[sampleIndex] ?? 0);
      }

      return sum / Math.max(1, end - start);
    });
    const maxPeak = Math.max(...peaks, 0.01);

    return peaks.map((peak) => 18 + Math.round((peak / maxPeak) * 72));
  } finally {
    await audioContext.close();
  }
}

function createFallbackBars(seed: string, barCount: number): number[] {
  let hash = 0;

  for (const character of seed) {
    hash = (hash << 5) - hash + character.charCodeAt(0);
    hash |= 0;
  }

  return Array.from({ length: barCount }, (_, index) => {
    const value = Math.sin((index + 1) * 1.35 + hash) * 0.5 + 0.5;

    return 22 + Math.round(value * 60);
  });
}

function createLoadingBars(barCount: number): number[] {
  return Array.from({ length: barCount }, () => 18);
}
