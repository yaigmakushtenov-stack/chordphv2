import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Dashboard } from "@/components/main/dashboard";
import { AnnotationEditor } from "@/components/track/annotation-editor";
import { AppShell } from "@/components/shared/app-shell";
import { auth } from "@/lib/auth";
import {
  getAnnotationTrack,
  getTemporaryTrackArtists,
  type AnnotationTrack,
} from "@/lib/music";
import type { AnnotationEditorData } from "@/types/track";

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
  const track = await getAnnotationTrack(session.user.id, trackId);

  if (!track) {
    notFound();
  }

  return (
    <AppShell>
      <Dashboard
        eyebrow="TRACK WORKSPACE"
        title="Annotate track"
        description="Add song details, collaborators, lyrics, chords, and rehearsal notes. Preview transposition without changing the saved source."
      >
        <AnnotationEditor initialData={toAnnotationEditorData(track)} />
      </Dashboard>
    </AppShell>
  );
}

function toAnnotationEditorData(track: AnnotationTrack): AnnotationEditorData {
  return {
    trackId: track.id,
    title: track.title,
    artistName: track.artistName,
    key: track.key ?? "",
    capo: track.capo,
    tempo: track.tempo,
    timeSignature: track.timeSignature ?? "",
    tuning: track.tuning ?? "",
    youtubeLink: track.youtubeLink ?? "",
    spotifyLink: track.spotifyLink ?? "",
    tags: track.tags,
    additionalArtists: getTemporaryTrackArtists(track.metadata),
    lyricsAndChords: track.annotation?.lyricsAndChords ?? "",
    notes: track.annotation?.notes ?? "",
    audio: track.musicFile
      ? {
          playbackUrl: `/music/files/${encodeURIComponent(track.musicFile.id)}/play`,
          originalFileName: track.musicFile.originalFileName,
          durationSeconds: getDurationSeconds(track.musicFile.metadata),
        }
      : null,
    detailsUpdatedAt: track.updatedAt.toISOString(),
    annotationUpdatedAt: track.annotation?.updatedAt.toISOString() ?? null,
  };
}

function getDurationSeconds(metadata: unknown): number | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).durationSeconds;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
