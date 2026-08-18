"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MouseEvent } from "react";

import {
  pauseMusicPlayback,
  resumeMusicPlayback,
  stopMusicPlayback,
  updateMusicPlaybackProgress,
  useMusicPlayback,
} from "@/lib/client/music-playback-store";

const WAVE_BAR_COUNT = 72;

export function StickyMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playback = useMusicPlayback();
  const track = playback.track;
  const bars = useMemo(
    () => createWaveBars(track?.id ?? "empty"),
    [track?.id],
  );
  const durationSeconds = playback.durationSeconds ?? track?.durationSeconds ?? 0;
  const progress =
    durationSeconds > 0 ? Math.min(1, playback.currentTime / durationSeconds) : 0;

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !track) {
      return;
    }

    if (audio.src !== new URL(track.playbackUrl, window.location.href).href) {
      audio.src = track.playbackUrl;
      audio.currentTime = 0;
    }

    if (playback.status === "playing") {
      void audio.play();
      return;
    }

    audio.pause();
  }, [playback.status, track]);

  if (!track) {
    return null;
  }

  function handleWaveSeek(event: MouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextProgress = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    const nextTime = nextProgress * durationSeconds;

    if (audio && durationSeconds > 0) {
      audio.currentTime = nextTime;
    }

    updateMusicPlaybackProgress({
      currentTime: nextTime,
      durationSeconds,
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5e5e5] bg-white/95 px-3 py-3 text-[#111] shadow-[0_-18px_50px_rgba(0,0,0,0.14)] backdrop-blur dark:border-[#29292c] dark:bg-[#121214]/95 dark:text-[#f5f5f5]">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const nextDuration = Number.isFinite(event.currentTarget.duration)
            ? event.currentTarget.duration
            : null;

          updateMusicPlaybackProgress({
            currentTime: event.currentTarget.currentTime,
            durationSeconds: nextDuration,
          });
        }}
        onTimeUpdate={(event) =>
          updateMusicPlaybackProgress({
            currentTime: event.currentTarget.currentTime,
            durationSeconds: Number.isFinite(event.currentTarget.duration)
              ? event.currentTarget.duration
              : null,
          })
        }
        onEnded={pauseMusicPlayback}
      />
      <div className="mx-auto grid max-w-[1180px] gap-3 md:grid-cols-[minmax(0,280px)_minmax(220px,1fr)_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label={
              playback.status === "playing" ? "Pause track" : "Play track"
            }
            onClick={
              playback.status === "playing"
                ? pauseMusicPlayback
                : resumeMusicPlayback
            }
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#111] text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
          >
            <span aria-hidden="true" className="text-[15px] font-black">
              {playback.status === "playing" ? "Ⅱ" : "▶"}
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">{track.title}</p>
            <p className="mt-0.5 truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
              {track.artist || "Unknown artist"}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <button
            type="button"
            aria-label="Seek current track"
            onClick={handleWaveSeek}
            className="flex h-11 w-full items-center gap-0.5 rounded-lg bg-[#f4f4f4] px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#242427]"
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
            <span>{formatDuration(playback.currentTime)}</span>
            <span>{formatDuration(durationSeconds)}</span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close player"
          onClick={stopMusicPlayback}
          className="hidden size-9 items-center justify-center rounded-full text-[20px] leading-none text-[#666] transition hover:bg-[#f3f3f3] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] md:flex dark:text-[#b4b4bc] dark:hover:bg-[#28282c] dark:hover:text-white"
        >
          ×
        </button>
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
    const value = Math.sin((index + 1) * 1.35 + hash) * 0.5 + 0.5;

    return 22 + Math.round(value * 60);
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
