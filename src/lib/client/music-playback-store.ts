"use client";

import { useSyncExternalStore } from "react";

import type { MusicFileListItemData } from "@/types/music";

type Listener = () => void;

export type MusicPlaybackStatus = "idle" | "playing" | "paused";

export type MusicPlaybackState = {
  track: MusicFileListItemData | null;
  status: MusicPlaybackStatus;
  currentTime: number;
  durationSeconds: number | null;
};

const listeners = new Set<Listener>();
const EMPTY_PLAYBACK_STATE: MusicPlaybackState = {
  track: null,
  status: "idle",
  currentTime: 0,
  durationSeconds: null,
};
let playbackState: MusicPlaybackState = EMPTY_PLAYBACK_STATE;

export function playMusicTrack(track: MusicFileListItemData): void {
  setPlaybackState({
    track,
    status: "playing",
    currentTime: playbackState.track?.id === track.id ? playbackState.currentTime : 0,
    durationSeconds: track.durationSeconds,
  });
}

export function pauseMusicPlayback(): void {
  if (!playbackState.track) {
    return;
  }

  setPlaybackState({
    ...playbackState,
    status: "paused",
  });
}

export function resumeMusicPlayback(): void {
  if (!playbackState.track) {
    return;
  }

  setPlaybackState({
    ...playbackState,
    status: "playing",
  });
}

export function toggleMusicTrack(track: MusicFileListItemData): void {
  if (playbackState.track?.id === track.id && playbackState.status === "playing") {
    pauseMusicPlayback();
    return;
  }

  playMusicTrack(track);
}

export function updateMusicPlaybackProgress(input: {
  currentTime: number;
  durationSeconds: number | null;
}): void {
  if (!playbackState.track) {
    return;
  }

  setPlaybackState({
    ...playbackState,
    currentTime: input.currentTime,
    durationSeconds: input.durationSeconds,
  });
}

export function stopMusicPlayback(): void {
  setPlaybackState(EMPTY_PLAYBACK_STATE);
}

export function useMusicPlayback(): MusicPlaybackState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function setPlaybackState(nextState: MusicPlaybackState): void {
  playbackState = nextState;

  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): MusicPlaybackState {
  return playbackState;
}

function getServerSnapshot(): MusicPlaybackState {
  return EMPTY_PLAYBACK_STATE;
}
