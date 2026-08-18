"use client";

import { useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

type MiniAudioPlayerProps = {
  src: string;
  title: string;
  artist: string | null;
  durationSeconds: number | null;
  variant?: "default" | "compact";
};

const WAVE_BAR_COUNT = 42;

export function MiniAudioPlayer({
  src,
  title,
  artist,
  durationSeconds,
  variant = "default",
}: MiniAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const bars = useMemo(() => createWaveBars(title), [title]);
  const resolvedDuration = duration || durationSeconds || 0;
  const progress =
    resolvedDuration > 0 ? Math.min(1, currentTime / resolvedDuration) : 0;

  async function togglePlayback() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  function handleWaveSeek(event: MouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextProgress = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    const nextTime = nextProgress * resolvedDuration;

    if (audio && resolvedDuration > 0) {
      audio.currentTime = nextTime;
    }

    setCurrentTime(nextTime);
  }

  return (
    <div
      className={
        variant === "compact"
          ? "rounded-xl bg-[#f4f4f4] p-3 dark:bg-[#242427]"
          : "rounded-xl border border-[#e4e4e4] bg-white p-3 dark:border-[#36363b] dark:bg-[#18181b]"
      }
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) {
            setDuration(event.currentTarget.duration);
          }
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isPlaying ? "Pause duplicate track" : "Play duplicate track"}
          onClick={() => void togglePlayback()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#111] text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
        >
          <span aria-hidden="true" className="text-[15px] font-black">
            {isPlaying ? "Ⅱ" : "▶"}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold">{title}</p>
          <p className="mt-0.5 truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
            {artist || "Unknown artist"} · {formatDuration(resolvedDuration)}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="Seek duplicate track"
        onClick={handleWaveSeek}
        className={`mt-3 flex h-12 w-full items-center gap-0.5 rounded-lg px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
          variant === "compact"
            ? "bg-white dark:bg-[#18181b]"
            : "bg-[#f4f4f4] dark:bg-[#242427]"
        }`}
      >
        {bars.map((height, index) => {
          const active = index / bars.length <= progress;

          return (
            <span
              key={`${height}-${index}`}
              aria-hidden="true"
              className={`flex-1 rounded-full transition-colors ${
                active ? "bg-[#ed1746]" : "bg-[#c9c9c9] dark:bg-[#55555c]"
              }`}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </button>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#666] dark:text-[#b4b4bc]">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(resolvedDuration)}</span>
      </div>
    </div>
  );
}

function createWaveBars(seed: string) {
  let hash = 0;

  for (const character of seed) {
    hash = (hash << 5) - hash + character.charCodeAt(0);
    hash |= 0;
  }

  return Array.from({ length: WAVE_BAR_COUNT }, (_, index) => {
    const value = Math.sin((index + 1) * 1.7 + hash) * 0.5 + 0.5;

    return 24 + Math.round(value * 58);
  });
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}
