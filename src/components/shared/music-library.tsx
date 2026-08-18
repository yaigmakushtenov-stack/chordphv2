"use client";

import { useCallback, useState } from "react";

import {
  listMusicFilesAction,
  type MusicFileListItemData,
} from "@/app/music/actions";
import { AudioUpload } from "@/components/shared/audio-upload";
import {
  Playlist,
  type PlaylistItem,
  type PlaylistSort,
} from "@/components/shared/playlist";

type MusicLibraryProps = {
  initialItems: PlaylistItem[];
};

export function MusicLibrary({ initialItems }: MusicLibraryProps) {
  const [items, setItems] = useState<PlaylistItem[]>(initialItems);
  const [sort, setSort] = useState<PlaylistSort>("latest");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFiles = useCallback(async (nextSort: PlaylistSort = sort) => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await listMusicFilesAction({ sort: nextSort });

    if (result.ok) {
      setItems(result.data.map(toPlaylistItem));
    } else {
      setItems([]);
      setErrorMessage(result.error.message);
    }

    setIsLoading(false);
  }, [sort]);

  function handleSortChange(nextSort: PlaylistSort) {
    setSort(nextSort);
    void loadFiles(nextSort);
  }

  return (
    <div className="grid gap-5">
      <AudioUpload onUploadComplete={() => void loadFiles()} />
      {errorMessage ? (
        <div className="rounded-xl border border-[#ffd0d9] bg-[#fff4f5] px-4 py-3 text-[13px] font-medium text-[#be123c] dark:border-[#5c1f2d] dark:bg-[#241016] dark:text-[#fb7185]">
          {errorMessage}
        </div>
      ) : null}
      <Playlist
        items={items}
        sort={sort}
        onSortChange={handleSortChange}
        isLoading={isLoading}
      />
    </div>
  );
}

function toPlaylistItem(file: MusicFileListItemData): PlaylistItem {
  return {
    id: file.id,
    title: file.title,
    artist: file.artist,
    album: file.album,
    originalFileName: file.originalFileName,
    contentType: file.contentType,
    sourceSizeBytes: file.sourceSizeBytes,
    storedSizeBytes: file.storedSizeBytes,
    durationSeconds: file.durationSeconds,
    playbackUrl: file.playbackUrl,
    createdAt: file.createdAt,
    uploadedAt: file.uploadedAt,
  };
}
