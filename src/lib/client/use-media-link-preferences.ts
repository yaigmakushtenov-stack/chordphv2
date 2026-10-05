"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  MEDIA_LINK_PREFERENCES_COOKIE,
  parseMediaLinkPreferences,
  serializeMediaLinkPreferences,
  type MediaLinkPreferences,
} from "@/lib/music/media-link-preferences";

const CHANGE_EVENT = "chordph:media-link-preferences";

function readCookie(): string {
  try {
    return document.cookie.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${MEDIA_LINK_PREFERENCES_COOKIE}=`))
      ?.slice(MEDIA_LINK_PREFERENCES_COOKIE.length + 1) ?? "";
  } catch (error: unknown) {
    if (error instanceof DOMException) return "";
    throw error;
  }
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("focus", listener);
  };
}

function getServerSnapshot(): string {
  return "";
}

export function saveMediaLinkPreferences(
  preferences: MediaLinkPreferences,
): boolean {
  const value = serializeMediaLinkPreferences(preferences);
  try {
    document.cookie = `${MEDIA_LINK_PREFERENCES_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  } catch (error: unknown) {
    if (error instanceof DOMException) return false;
    throw error;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return readCookie() === value;
}

export function useMediaLinkPreferences(): MediaLinkPreferences {
  const value = useSyncExternalStore(subscribe, readCookie, getServerSnapshot);
  return useMemo(() => parseMediaLinkPreferences(value), [value]);
}
