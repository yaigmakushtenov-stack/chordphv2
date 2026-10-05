"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

import {
  isPracticeLoop,
  MAX_PRACTICE_MARKERS,
  MIN_PRACTICE_LOOP_SECONDS,
  PRACTICE_SPEEDS,
  useAudioPracticePreferences,
  type PracticeMarker,
} from "@/lib/client/audio-practice-store";

type PracticeLoop = { start: number | null; end: number | null; enabled: boolean };

export type AudioPractice = {
  duration: number;
  pitchSupported: boolean;
  error: string | null;
  message: string | null;
  loop: PracticeLoop;
  loopEnabled: boolean;
  canLoop: boolean;
  speed: number;
  markers: PracticeMarker[];
  play: () => Promise<void>;
  seek: (time: number) => void;
  setStart: () => void;
  setEnd: () => void;
  changeSpeed: (speed: number) => void;
  saveMarker: (label: string) => boolean;
  loadMarker: (marker: PracticeMarker) => void;
  deleteMarker: (id: string) => void;
  toggleLoop: () => void;
  clearLoop: () => void;
};

export function useAudioPractice(audioRef: RefObject<HTMLAudioElement | null>, source: string): AudioPractice {
  const { preferences, savePreferences } = useAudioPracticePreferences(source);
  const [loop, setLoop] = useState<PracticeLoop>({ start: null, end: null, enabled: false });
  const [duration, setDuration] = useState(0);
  const [pitchSupported, setPitchSupported] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canLoop = loop.start !== null && loop.end !== null && isPracticeLoop(loop.start, loop.end, duration);
  const loopEnabled = canLoop && loop.enabled;

  const play = useCallback(async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    try {
      await audio.play();
    } catch (error: unknown) {
      if (!(error instanceof DOMException)) throw error;
      if (error.name === "AbortError") return;
      audio.pause();
      setError("Playback could not start. Try Play again.");
    }
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function updateDuration(): void {
      if (!audio) return;
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setPitchSupported("preservesPitch" in audio);
    }
    function handlePlaying(): void {
      setError(null);
    }
    function handleError(): void {
      setError("Audio could not be loaded. Try reopening the player.");
    }
    const timeout = window.setTimeout(() => {
      updateDuration();
    }, 0);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleError);
    return () => {
      window.clearTimeout(timeout);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleError);
      audio.pause();
    };
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const supported = "preservesPitch" in audio;
    if (supported) audio.preservesPitch = true;
    audio.playbackRate = supported ? preferences.speed : 1;
  }, [audioRef, preferences.speed]);

  useEffect(() => {
    const audio = audioRef.current;
    const { start, end } = loop;
    if (!audio || !loopEnabled || start === null || end === null) return;
    const loopStart = start;
    const loopEnd = end;
    let frame: number | null = null;

    function enforceLoop(): void {
      if (!audio || audio.seeking) return;
      if (audio.currentTime >= loopEnd || audio.currentTime < loopStart) {
        audio.currentTime = loopStart;
      }
    }
    function tick(): void {
      enforceLoop();
      if (audio && !audio.paused) frame = window.requestAnimationFrame(tick);
      else frame = null;
    }
    function startWatching(): void {
      if (frame === null) frame = window.requestAnimationFrame(tick);
    }
    function stopWatching(): void {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
    }
    function repeatAtEnd(): void {
      if (!audio) return;
      audio.currentTime = loopStart;
      void play();
    }

    enforceLoop();
    if (!audio.paused) startWatching();
    audio.addEventListener("play", startWatching);
    audio.addEventListener("pause", stopWatching);
    audio.addEventListener("timeupdate", enforceLoop);
    audio.addEventListener("seeked", enforceLoop);
    audio.addEventListener("ended", repeatAtEnd);
    return () => {
      stopWatching();
      audio.removeEventListener("play", startWatching);
      audio.removeEventListener("pause", stopWatching);
      audio.removeEventListener("timeupdate", enforceLoop);
      audio.removeEventListener("seeked", enforceLoop);
      audio.removeEventListener("ended", repeatAtEnd);
    };
  }, [audioRef, loop, loopEnabled, play]);

  function seek(time: number): void {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time) || duration <= 0) return;
    const nextTime = Math.max(0, Math.min(duration, time));
    audio.currentTime = loopEnabled && loop.start !== null && loop.end !== null
      && (nextTime < loop.start || nextTime >= loop.end) ? loop.start : nextTime;
  }

  function setStart(): void {
    const start = audioRef.current?.currentTime ?? 0;
    if (duration <= 0 || start > duration - MIN_PRACTICE_LOOP_SECONDS) {
      setMessage("Set A at least half a second before the end of the audio.");
      return;
    }
    setLoop({ start, end: loop.end !== null && isPracticeLoop(start, loop.end, duration) ? loop.end : null, enabled: false });
    setMessage(null);
  }

  function setEnd(): void {
    const end = audioRef.current?.currentTime ?? 0;
    if (loop.start === null || !isPracticeLoop(loop.start, end, duration)) {
      setMessage("Set A first, then set B at least half a second later.");
      return;
    }
    setLoop({ ...loop, end, enabled: false });
    setMessage(null);
  }

  function changeSpeed(speed: number): void {
    if (!pitchSupported || !PRACTICE_SPEEDS.some((value) => value === speed)) return;
    setMessage(savePreferences({ speed }) ? null : "Speed changed for this session. Device storage is unavailable.");
  }

  function saveMarker(label: string): boolean {
    if (!canLoop || loop.start === null || loop.end === null) return false;
    if (preferences.markers.length >= MAX_PRACTICE_MARKERS) {
      setMessage("You have 20 saved loops for this audio. Delete one to save another.");
      return false;
    }
    const marker: PracticeMarker = {
      id: crypto.randomUUID(), label: label.trim().slice(0, 80) || `Loop ${preferences.markers.length + 1}`,
      start: loop.start, end: loop.end,
    };
    const persisted = savePreferences({ markers: [...preferences.markers, marker] });
    setMessage(persisted ? "Loop saved on this device." : "Loop saved for this session only. Device storage is unavailable.");
    return true;
  }

  function loadMarker(marker: PracticeMarker): void {
    if (!isPracticeLoop(marker.start, marker.end, duration)) {
      setMessage("This saved loop falls outside the current audio. Set new A and B points.");
      return;
    }
    setLoop({ start: marker.start, end: marker.end, enabled: true });
    if (audioRef.current) audioRef.current.currentTime = marker.start;
    setMessage(null);
    void play();
  }

  function deleteMarker(id: string): void {
    const persisted = savePreferences({ markers: preferences.markers.filter((marker) => marker.id !== id) });
    setMessage(persisted ? "Saved loop deleted." : "Loop deleted for this session only. Device storage is unavailable.");
  }

  return {
    duration, pitchSupported, error, message, loop, loopEnabled, canLoop,
    speed: pitchSupported ? preferences.speed : 1, markers: preferences.markers,
    play, seek, setStart, setEnd, changeSpeed, saveMarker, loadMarker, deleteMarker,
    toggleLoop: () => setLoop({ ...loop, enabled: canLoop && !loop.enabled }),
    clearLoop: () => { setLoop({ start: null, end: null, enabled: false }); setMessage(null); },
  };
}
