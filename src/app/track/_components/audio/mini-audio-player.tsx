"use client";

import { useRef, useState } from "react";

import { WaveformSeekBar } from "@/components/shared/waveform-seek-bar";

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

  function handleWaveSeek(nextProgress: number) {
    const audio = audioRef.current;
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
      <WaveformSeekBar
        src={src}
        seed={title}
        progress={progress}
        barCount={WAVE_BAR_COUNT}
        ariaLabel="Seek duplicate track"
        onSeek={handleWaveSeek}
        className={`mt-3 flex h-12 w-full items-center gap-0.5 rounded-lg px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
          variant === "compact"
            ? "bg-white dark:bg-[#18181b]"
            : "bg-[#f4f4f4] dark:bg-[#242427]"
        }`}
      />
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#666] dark:text-[#b4b4bc]">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(resolvedDuration)}</span>
      </div>
    </div>
  );
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
