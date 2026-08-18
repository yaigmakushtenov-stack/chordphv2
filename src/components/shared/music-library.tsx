"use client";

import { useCallback, useMemo, useState } from "react";

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
import {
  replaceMusicLibraryFiles,
  useMusicLibraryFiles,
} from "@/lib/client/music-library-store";

type MusicLibraryProps = {
  initialItems: PlaylistItem[];
};

export function MusicLibrary({ initialItems }: MusicLibraryProps) {
  const [sort, setSort] = useState<PlaylistSort>("latest");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialMusicFiles = useMemo(
    () => initialItems.map(toMusicFileData),
    [initialItems],
  );
  const musicFiles = useMusicLibraryFiles(initialMusicFiles);
  const displayItems = useMemo(
    () => sortPlaylistItems(musicFiles.map(toPlaylistItem), sort),
    [musicFiles, sort],
  );

  const loadFiles = useCallback(async (nextSort: PlaylistSort = sort) => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await listMusicFilesAction({ sort: nextSort });

    if (result.ok) {
      replaceMusicLibraryFiles(result.data);
    } else {
      replaceMusicLibraryFiles([]);
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
      <AudioUpload />
      {errorMessage ? (
        <div className="rounded-xl border border-[#ffd0d9] bg-[#fff4f5] px-4 py-3 text-[13px] font-medium text-[#be123c] dark:border-[#5c1f2d] dark:bg-[#241016] dark:text-[#fb7185]">
          {errorMessage}
        </div>
      ) : null}
      <Playlist
        items={displayItems}
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

function toMusicFileData(item: PlaylistItem): MusicFileListItemData {
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    album: item.album,
    originalFileName: item.originalFileName,
    contentType: item.contentType,
    sourceSizeBytes: item.sourceSizeBytes,
    storedSizeBytes: item.storedSizeBytes,
    durationSeconds: item.durationSeconds,
    playbackUrl: item.playbackUrl,
    createdAt: item.createdAt,
    uploadedAt: item.uploadedAt,
  };
}

function sortPlaylistItems(items: PlaylistItem[], sort: PlaylistSort) {
  return [...items].sort((left, right) => {
    if (sort === "alphabetical") {
      return left.title.localeCompare(right.title);
    }

    return getPlaylistItemTime(right) - getPlaylistItemTime(left);
  });
}

function getPlaylistItemTime(item: PlaylistItem) {
  return new Date(item.uploadedAt ?? item.createdAt).getTime();
}
