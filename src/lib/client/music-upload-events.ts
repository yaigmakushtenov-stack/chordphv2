"use client";

import { useSyncExternalStore } from "react";

import type { MusicFileListItemData } from "@/app/music/actions";

type Listener = () => void;

const EMPTY_UPLOADED_FILES: MusicFileListItemData[] = [];
const listeners = new Set<Listener>();
let uploadedFiles: MusicFileListItemData[] = [];

export function emitMusicFileUploaded(file: MusicFileListItemData): void {
  uploadedFiles = [
    file,
    ...uploadedFiles.filter((currentFile) => currentFile.id !== file.id),
  ];

  for (const listener of listeners) {
    listener();
  }
}

export function useUploadedMusicFiles(): MusicFileListItemData[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): MusicFileListItemData[] {
  return uploadedFiles;
}

function getServerSnapshot(): MusicFileListItemData[] {
  return EMPTY_UPLOADED_FILES;
}
