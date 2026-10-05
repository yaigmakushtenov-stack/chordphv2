"use client";

import { useEffect, useRef, useState } from "react";

import { AudioPracticeControls } from "@/components/shared/audio-practice-controls";
import { WaveformSeekBar } from "@/components/shared/waveform-seek-bar";
import { useAudioPractice } from "@/lib/client/use-audio-practice";

type PracticeAudioPlayerProps = {
  src: string;
  title: string;
  className?: string;
  hidden?: boolean;
};

export function PracticeAudioPlayer(props: PracticeAudioPlayerProps) {
  return <AudioPlayer key={props.src} {...props} />;
}

function AudioPlayer({ src, title, className, hidden = false }: PracticeAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const practice = useAudioPractice(audioRef, src);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (hidden) audioRef.current?.pause();
  }, [hidden]);

  useEffect(() => {
    if (!isPlaying) return;
    let frame: number;
    let lastUpdate = 0;
    function update(timestamp: number): void {
      if (timestamp - lastUpdate >= 50) {
        setCurrentTime(audioRef.current?.currentTime ?? 0);
        lastUpdate = timestamp;
      }
      frame = window.requestAnimationFrame(update);
    }
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying]);

  function seek(progress: number): void {
    practice.seek(progress * practice.duration);
    setCurrentTime(audioRef.current?.currentTime ?? 0);
  }

  const controlClassName = "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[#ed1746] transition hover:bg-[#ffe4ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#fb7185] dark:hover:bg-[#3a111d]";

  return (
    <div className={className} hidden={hidden}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
      <div className="rounded-xl border border-[#dedede] bg-[#fafafa] px-2.5 py-1.5 dark:border-[#3a3a3f] dark:bg-[#202023]">
        <WaveformSeekBar
          src={src}
          seed={src}
          barCount={96}
          responsive
          maxBarCount={256}
          progress={practice.duration > 0 ? currentTime / practice.duration : 0}
          durationSeconds={practice.duration}
          disabled={practice.duration <= 0}
          onSeek={seek}
          ariaLabel={`Seek through ${title}`}
          className="h-10 w-full rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
        />
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            disabled={practice.duration <= 0}
            onClick={() => { if (isPlaying) audioRef.current?.pause(); else void practice.play(); }}
            className={controlClassName}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              {isPlaying ? <path d="M6 4h4v16H6zm8 0h4v16h-4z" /> : <path d="m7 4 15 8-15 8z" />}
            </svg>
          </button>
          <span className="flex-1 text-[12px] font-semibold tabular-nums text-[#555] dark:text-[#d4d4d8]" aria-label="Elapsed time and total duration">
            {formatTime(currentTime)} / {formatTime(practice.duration)}
          </span>
          <button
            type="button"
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            aria-pressed={isMuted}
            onClick={() => {
              if (!audioRef.current) return;
              audioRef.current.muted = !isMuted;
              setIsMuted(!isMuted);
            }}
            className={controlClassName}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H3v6h3l5 4z" />
              {isMuted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />}
            </svg>
          </button>
        </div>
      </div>
      <AudioPracticeControls practice={practice} />
    </div>
  );
}

function formatTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}
