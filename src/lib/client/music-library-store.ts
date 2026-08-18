"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import type { MusicFileListItemData } from "@/app/music/actions";

type Listener = () => void;

const EMPTY_MUSIC_FILES: MusicFileListItemData[] = [];
const listeners = new Set<Listener>();
let musicFiles: MusicFileListItemData[] = [];

export function upsertMusicLibraryFile(file: MusicFileListItemData): void {
  setMusicLibraryFiles([file, ...musicFiles]);
}

export function replaceMusicLibraryFiles(files: MusicFileListItemData[]): void {
  setMusicLibraryFiles(files);
}

export function useMusicLibraryFiles(
  initialFiles: MusicFileListItemData[] = EMPTY_MUSIC_FILES,
): MusicFileListItemData[] {
  useEffect(() => {
    if (initialFiles.length) {
      setMusicLibraryFiles([...musicFiles, ...initialFiles]);
    }
  }, [initialFiles]);

  const cachedFiles = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return useMemo(
    () => mergeMusicLibraryFiles(cachedFiles, initialFiles),
    [cachedFiles, initialFiles],
  );
}

function setMusicLibraryFiles(files: MusicFileListItemData[]): void {
  musicFiles = mergeMusicLibraryFiles(files);
  notify();
}

function mergeMusicLibraryFiles(
  primaryFiles: MusicFileListItemData[],
  secondaryFiles: MusicFileListItemData[] = EMPTY_MUSIC_FILES,
): MusicFileListItemData[] {
  const merged = new Map<string, MusicFileListItemData>();

  for (const file of [...primaryFiles, ...secondaryFiles]) {
    merged.set(file.id, file);
  }

  return Array.from(merged.values()).sort(compareNewestMusicFiles);
}

function compareNewestMusicFiles(
  left: MusicFileListItemData,
  right: MusicFileListItemData,
): number {
  return getMusicFileTime(right) - getMusicFileTime(left);
}

function getMusicFileTime(file: MusicFileListItemData): number {
  return new Date(file.uploadedAt ?? file.createdAt).getTime();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): MusicFileListItemData[] {
  return musicFiles;
}

function getServerSnapshot(): MusicFileListItemData[] {
  return EMPTY_MUSIC_FILES;
}
