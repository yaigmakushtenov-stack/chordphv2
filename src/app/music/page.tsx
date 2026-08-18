import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Dashboard } from "@/components/main/dashboard";
import { AppShell } from "@/components/shared/app-shell";
import { MusicLibrary } from "@/components/shared/music-library";
import type { PlaylistItem } from "@/components/shared/playlist";
import { auth } from "@/lib/auth";
import { listReadyMusicFiles, type MusicFileSearchResult } from "@/lib/music";

export const metadata: Metadata = {
  title: "Music Library | ChordPH",
  description: "Upload and play your ChordPH audio files.",
};

export default async function MusicPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const files = await listReadyMusicFiles({
    ownerId: session.user.id,
    sort: "latest",
  });
  const libraryItems = files.map(toPlaylistItem);

  return (
    <AppShell initialLibraryItems={libraryItems}>
      <Dashboard
        eyebrow="MUSIC LIBRARY"
        title="Dashboard"
        description="Upload audio, review files owned by your account, and play shareable public-by-link tracks."
      >
        <MusicLibrary initialItems={libraryItems} />
      </Dashboard>
    </AppShell>
  );
}

function toPlaylistItem(file: MusicFileSearchResult): PlaylistItem {
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
