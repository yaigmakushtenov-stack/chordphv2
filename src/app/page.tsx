import type { Metadata } from "next";
import { headers } from "next/headers";

import { Dashboard } from "@/components/main/dashboard";
import { DashboardHome } from "@/components/main/dashboard-home";
import { AppShell } from "@/components/shared/app-shell";
import { auth } from "@/lib/auth";
import { listReadyMusicFiles, type MusicFileSearchResult } from "@/lib/music";
import type { MusicFileListItemData } from "@/types/music";

export const metadata: Metadata = {
  title: "ChordPH | Guitar chords, tabs, and lyrics",
  description:
    "Explore guitar chords, tabs, and lyrics for OPM favorites and global hits.",
};

const NEWEST_SONGS_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const libraryItems = session?.user?.id
    ? (await listReadyMusicFiles({
        ownerId: session.user.id,
        sort: "latest",
      })).map(toMusicFileListItemData)
    : [];
  const newestSongs = libraryItems.filter(isNewestSong);

  return (
    <AppShell>
      <Dashboard
        eyebrow="CHORDPH - MADE IN THE PHILIPPINES"
        title="Dashboard"
        description="Create track annotations and keep your chords, lyrics, references, and practice library in one workspace."
      >
        <DashboardHome initialNewestSongs={newestSongs} />
      </Dashboard>
    </AppShell>
  );
}

function toMusicFileListItemData(
  file: MusicFileSearchResult,
): MusicFileListItemData {
  return {
    id: file.id,
    title: file.title || file.originalFileName,
    artist: file.artist,
    album: file.album,
    originalFileName: file.originalFileName,
    contentType: file.contentType,
    sourceSizeBytes: file.sourceSizeBytes,
    storedSizeBytes: file.storedSizeBytes,
    durationSeconds: getDurationSeconds(file.metadata),
    playbackUrl: `/music/files/${encodeURIComponent(file.id)}/play`,
    createdAt: file.createdAt.toISOString(),
    uploadedAt: file.uploadedAt?.toISOString() ?? null,
  };
}

function isNewestSong(file: MusicFileListItemData) {
  return (
    Date.now() - new Date(file.uploadedAt ?? file.createdAt).getTime() <=
    NEWEST_SONGS_WINDOW_MS
  );
}

function getDurationSeconds(metadata: unknown) {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).durationSeconds;

  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
