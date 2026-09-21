"use client";

import { useSyncExternalStore } from "react";

import type { PracticeResumeItem } from "@/types/dashboard";

const STORAGE_KEY = "chordph:practice-resume";
const UPDATE_EVENT = "chordph:practice-resume-updated";

let cachedRawValue: string | null | undefined;
let cachedItem: PracticeResumeItem | null = null;

export function savePracticeResume(item: PracticeResumeItem): void {
  try {
    const serialized = JSON.stringify(item);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    cachedRawValue = serialized;
    cachedItem = item;
    window.dispatchEvent(new Event(UPDATE_EVENT));
  } catch (error) {
    console.warn("Practice resume state could not be saved.", error);
  }
}

export function usePracticeResume(): PracticeResumeItem | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onStoreChange: () => void): () => void {
  function handleStorage(event: StorageEvent): void {
    if (event.key === STORAGE_KEY) {
      cachedRawValue = undefined;
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(UPDATE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(UPDATE_EVENT, onStoreChange);
  };
}

function getSnapshot(): PracticeResumeItem | null {
  let rawValue: string | null;

  try {
    rawValue = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Practice resume state could not be read.", error);
    return null;
  }

  if (rawValue === cachedRawValue) {
    return cachedItem;
  }

  cachedRawValue = rawValue;
  cachedItem = parsePracticeResumeItem(rawValue);

  return cachedItem;
}

function getServerSnapshot(): PracticeResumeItem | null {
  return null;
}

function parsePracticeResumeItem(value: string | null): PracticeResumeItem | null {
  if (!value) {
    return null;
  }

  try {
    const item: unknown = JSON.parse(value);

    if (
      typeof item !== "object" ||
      item === null ||
      !("href" in item) ||
      typeof item.href !== "string" ||
      !("id" in item) ||
      typeof item.id !== "string" ||
      !("title" in item) ||
      typeof item.title !== "string" ||
      !("subtitle" in item) ||
      typeof item.subtitle !== "string" ||
      !("lastOpenedAt" in item) ||
      typeof item.lastOpenedAt !== "string" ||
      !("type" in item) ||
      (item.type !== "track" && item.type !== "setlist") ||
      !("key" in item) ||
      (item.key !== null && typeof item.key !== "string") ||
      !("tempo" in item) ||
      (item.tempo !== null && typeof item.tempo !== "number")
    ) {
      return null;
    }

    return item as PracticeResumeItem;
  } catch (error) {
    console.warn("Practice resume state is invalid.", error);
    return null;
  }
}
