import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import type { MusicFileListItemData } from "@/app/music/actions";
import { Dashboard } from "@/components/main/dashboard";
import {
  AnnotationEditor,
  type AnnotationEditorData,
} from "@/components/track/annotation-editor";
import { AppShell } from "@/components/shared/app-shell";
import { auth } from "@/lib/auth";
import {
  getAnnotationTrack,
  listReadyMusicFiles,
  type AnnotationTrack,
  type MusicFileSearchResult,
} from "@/lib/music";

export const metadata: Metadata = {
  title: "Annotate Track | ChordPH",
  description: "Add lyrics, chords, musical details, and notes to a track.",
};

export default async function AnnotateTrackPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { trackId } = await params;
  const [track, libraryFiles] = await Promise.all([
    getAnnotationTrack(session.user.id, trackId),
    listReadyMusicFiles({ ownerId: session.user.id, sort: "latest" }),
  ]);

  if (!track) {
    notFound();
  }

  const libraryItems = libraryFiles.map(toMusicFileListItemData);

  return (
    <AppShell initialLibraryItems={libraryItems}>
      <Dashboard
        eyebrow="TRACK WORKSPACE"
        title="Annotate track"
        description="Listen while you add song details, ChordPro lyrics, chords, and rehearsal notes. Preview transposition without changing the saved source."
      >
        <AnnotationEditor initialData={toAnnotationEditorData(track)} />
      </Dashboard>
    </AppShell>
  );
}

function toAnnotationEditorData(track: AnnotationTrack): AnnotationEditorData {
  return {
    trackId: track.id,
    title: track.title || track.originalFileName,
    artist: track.artist ?? "",
    album: track.album ?? "",
    originalKey: track.annotation?.originalKey ?? "",
    capo: track.annotation?.capo ?? null,
    tempo: track.annotation?.tempo ?? null,
    timeSignature: track.annotation?.timeSignature ?? "",
    tuning: track.annotation?.tuning ?? "",
    lyricsAndChords: track.annotation?.lyricsAndChords ?? "",
    notes: track.annotation?.notes ?? "",
    playbackUrl: `/music/files/${encodeURIComponent(track.id)}/play`,
    originalFileName: track.originalFileName,
    durationSeconds: getDurationSeconds(track.metadata),
    updatedAt: track.annotation?.updatedAt.toISOString() ?? null,
  };
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

function getDurationSeconds(metadata: unknown): number | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).durationSeconds;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
