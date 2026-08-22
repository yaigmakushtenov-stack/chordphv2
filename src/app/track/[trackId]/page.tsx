import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { Dashboard } from "@/components/shared/dashboard";
import { AppShell } from "@/components/shared/app-shell";
import { AnnotationViewer } from "@/app/track/_components/annotation-viewer";
import { auth } from "@/lib/auth";
import { TrackService, type AnnotationTrack } from "@/services/track-service";
import type { AnnotationViewerData } from "@/types/track";

export const metadata: Metadata = {
  title: "Track Annotation | ChordPH",
  description: "View a personal lyrics and chord annotation.",
};

export default async function TrackPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  const { trackId } = await params;
  const viewerId = session?.user?.id ?? null;
  const track = await TrackService.getViewableAnnotationTrack(
    trackId,
    viewerId,
  );

  if (!track) {
    notFound();
  }

  const isOwner = viewerId === track.ownerId;

  return (
    <AppShell>
      <Dashboard
        eyebrow={isOwner ? "PERSONAL ANNOTATION" : "PUBLIC ANNOTATION"}
        title={track.title}
        description={`Lyrics and chords by ${track.artistName}. Transpose the display without changing your saved chords.`}
      >
        <AnnotationViewer
          track={toViewerData(track, {
            isOwner,
            isAuthenticated: Boolean(viewerId),
          })}
        />
      </Dashboard>
    </AppShell>
  );
}

function toViewerData(
  track: AnnotationTrack,
  viewer: { isOwner: boolean; isAuthenticated: boolean },
): AnnotationViewerData {
  return {
    id: track.id,
    title: track.title,
    artistName: track.artistName,
    key: track.key,
    tuning: track.tuning,
    capo: track.capo,
    tempo: track.tempo,
    timeSignature: track.timeSignature ?? "",
    tags: track.tags,
    lyricsAndChords: track.annotation?.lyricsAndChords ?? "",
    notes: viewer.isOwner ? (track.annotation?.notes ?? "") : "",
    youtubeLink: track.youtubeLink,
    spotifyLink: track.spotifyLink,
    audio: track.musicFile
      ? {
          playbackUrl: `/music/files/${encodeURIComponent(track.musicFile.id)}/play`,
          originalFileName: track.musicFile.originalFileName,
        }
      : null,
    updatedAt: track.updatedAt.toISOString(),
    isOwner: viewer.isOwner,
    isAuthenticated: viewer.isAuthenticated,
    publicityStatus: track.publicityStatus,
  };
}
