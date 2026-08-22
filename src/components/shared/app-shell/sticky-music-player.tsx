"use client";

import { useEffect, useRef } from "react";

import { WaveformSeekBar } from "@/components/shared/waveform-seek-bar";
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

  function handleWaveSeek(nextProgress: number) {
    const audio = audioRef.current;
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
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d90f3b] bg-[#ed1746] px-3 py-3 text-white shadow-[0_-18px_50px_rgba(237,23,70,0.24)] backdrop-blur dark:border-[#be123c] dark:bg-[#d90f3b] dark:text-white motion-safe:animate-[sticky-player-slide-up_220ms_cubic-bezier(0.22,1,0.36,1)]"
      style={{
        animationFillMode: "both",
      }}
    >
      <style>
        {`@keyframes sticky-player-slide-up{from{transform:translateY(100%);opacity:0.8}to{transform:translateY(0);opacity:1}}`}
      </style>
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
      <button
        type="button"
        aria-label="Close player"
        onClick={stopMusicPlayback}
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-[20px] leading-none text-white/75 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:text-white/75 dark:hover:bg-white/15 dark:hover:text-white"
      >
        ×
      </button>
      <div className="mx-auto grid max-w-[1180px] gap-3 md:grid-cols-[minmax(0,280px)_minmax(220px,1fr)] md:items-center">
        <div className="flex min-w-0 items-center gap-3 pr-10 md:pr-0">
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
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#ed1746] transition hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-white dark:text-[#d90f3b] dark:hover:bg-[#f4f4f4]"
          >
            <span aria-hidden="true" className="text-[15px] font-black">
              {playback.status === "playing" ? "Ⅱ" : "▶"}
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">{track.title}</p>
            <p className="mt-0.5 truncate text-[12px] text-white/80 dark:text-white/80">
              {track.artist || "Unknown artist"}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <WaveformSeekBar
            src={track.playbackUrl}
            seed={track.id}
            progress={progress}
            barCount={WAVE_BAR_COUNT}
            responsive
            maxBarCount={220}
            ariaLabel="Seek current track"
            onSeek={handleWaveSeek}
            activeBarClassName="bg-white"
            inactiveBarClassName="bg-white/45"
            className="flex h-11 w-full items-center gap-0.5 rounded-lg px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
          <div className="mt-1 flex justify-between text-[11px] font-semibold text-white/80 dark:text-white/80">
            <span>{formatDuration(playback.currentTime)}</span>
            <span>{formatDuration(durationSeconds)}</span>
          </div>
        </div>
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
