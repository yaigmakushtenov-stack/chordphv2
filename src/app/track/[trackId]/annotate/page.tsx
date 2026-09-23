import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Dashboard } from "@/components/shared/dashboard";
import { AnnotationEditor } from "@/app/track/_components/annotation-editor";
import { AppShell } from "@/components/shared/app-shell";
import { BackLink } from "@/components/shared/back-link";
import { auth } from "@/lib/auth";
import {
  TrackService,
  type AnnotationTrack,
} from "@/services/track-service";
import type { AnnotationEditorData } from "@/types/track";

export const metadata: Metadata = {
  title: "Edit Chord Chart/Tab | ChordPH",
  description: "Edit lyrics, chords, tabs, musical details, and notes for a track.",
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
  const [track, artistNames] = await Promise.all([
    TrackService.getAnnotationTrack(session.user.id, trackId),
    TrackService.listArtistNames(),
  ]);

  if (!track) {
    notFound();
  }

  return (
    <AppShell documentScroll focusMode>
      <Dashboard
        documentScroll
        headerNavigation={
          <BackLink href="/">Back to dashboard</BackLink>
        }
        eyebrow="TRACK WORKSPACE"
        title="Edit chord chart/tab"
        description="Add song details, collaborators, lyrics, chords, and rehearsal notes. Preview transposition without changing the saved source."
      >
        <AnnotationEditor
          initialArtistNames={artistNames}
          initialData={toAnnotationEditorData(track)}
        />
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
    additionalArtists: TrackService.getTemporaryTrackArtists(track.metadata),
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
    canPublishDirectly:
      track.owner.role === "ADMIN" &&
      !(
        track.visibilityStatus === "PUBLIC" &&
        track.publicityStatus === "APPROVED"
      ),
  };
}

function getDurationSeconds(metadata: unknown): number | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).durationSeconds;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
