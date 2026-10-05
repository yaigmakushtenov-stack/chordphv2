"use client";

import { useCallback, useSyncExternalStore } from "react";

export type PracticeMarker = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export type AudioPracticePreferences = {
  speed: number;
  markers: PracticeMarker[];
};

export const PRACTICE_SPEEDS = [0.5, 0.65, 0.75, 0.85, 1] as const;
export const MIN_PRACTICE_LOOP_SECONDS = 0.5;
export const MAX_PRACTICE_MARKERS = 20;

const DEFAULT_PREFERENCES: AudioPracticePreferences = { speed: 1, markers: [] };
const STORAGE_PREFIX = "chordph:audio-practice:v1:";
const CHANGE_EVENT = "chordph:audio-practice-updated";
const cache = new Map<string, { raw: string | null; value: AudioPracticePreferences }>();

export function isPracticeLoop(start: number, end: number, duration: number): boolean {
  return Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(duration)
    && start >= 0 && end - start >= MIN_PRACTICE_LOOP_SECONDS && end <= duration;
}

export function parseAudioPracticePreferences(raw: string | null): AudioPracticePreferences {
  if (!raw) return DEFAULT_PREFERENCES;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return DEFAULT_PREFERENCES;
    throw error;
  }

  if (!isRecord(value) || value.version !== 1) return DEFAULT_PREFERENCES;

  const markers = Array.isArray(value.markers)
    ? value.markers.filter(isPracticeMarker).slice(0, MAX_PRACTICE_MARKERS)
    : [];

  return {
    speed: typeof value.speed === "number" && PRACTICE_SPEEDS.some((speed) => speed === value.speed)
      ? value.speed : 1,
    markers: markers.filter((marker, index) => markers.findIndex((item) => item.id === marker.id) === index),
  };
}

export function useAudioPracticePreferences(source: string): {
  preferences: AudioPracticePreferences;
  savePreferences: (update: Partial<AudioPracticePreferences>) => boolean;
} {
  const key = `${STORAGE_PREFIX}${source}`;
  const subscribe = useCallback((listener: () => void) => {
    function handleStorage(event: StorageEvent): void {
      if (event.key === key || event.key === null) listener();
    }
    function handleChange(event: Event): void {
      if (event instanceof CustomEvent && event.detail === key) listener();
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHANGE_EVENT, handleChange);
    };
  }, [key]);
  const getSnapshot = useCallback(() => readPreferences(key), [key]);
  const preferences = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PREFERENCES);
  const savePreferences = useCallback((update: Partial<AudioPracticePreferences>): boolean => {
    const value = { ...readPreferences(key), ...update };
    const raw = JSON.stringify({ version: 1, ...value });
    let persisted = true;
    try {
      window.localStorage.setItem(key, raw);
      cache.set(key, { raw, value });
    } catch (error: unknown) {
      if (!(error instanceof DOMException)) throw error;
      cache.set(key, { raw: cache.get(key)?.raw ?? null, value });
      persisted = false;
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
    return persisted;
  }, [key]);

  return { preferences, savePreferences };
}

function readPreferences(key: string): AudioPracticePreferences {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch (error: unknown) {
    if (!(error instanceof DOMException)) throw error;
    return cache.get(key)?.value ?? DEFAULT_PREFERENCES;
  }
  const previous = cache.get(key);
  if (previous && previous.raw === raw) return previous.value;
  const value = parseAudioPracticePreferences(raw);
  cache.set(key, { raw, value });
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPracticeMarker(value: unknown): value is PracticeMarker {
  return isRecord(value) && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 100
    && typeof value.label === "string" && value.label.trim().length > 0 && value.label.length <= 80
    && typeof value.start === "number" && typeof value.end === "number"
    && isPracticeLoop(value.start, value.end, value.end);
}
