import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AnnotationEditor } from "@/app/track/_components/annotation-editor";
import { BackLink } from "@/components/shared/back-link";
import { TrackService } from "@/services/track-service";
import { SetListTrackArrangementEditor } from "@/app/setlists/_components/setlist-track-arrangement-editor";
import { AppShell } from "@/components/shared/app-shell";
import { Dashboard } from "@/components/shared/dashboard";
import { auth } from "@/lib/auth";
import { parseSetListTrackArrangement } from "@/lib/setlists/setlist-track-settings";
import { SetListService } from "@/services/setlist-service";
import type { SetListTrackArrangement } from "@/types/setlist";

export const metadata: Metadata = {
  title: "Edit Setlist Arrangement | ChordPH",
  description: "Customize a track for one ChordPH setlist.",
};

export default async function EditSetListTrackArrangementPage({
  params,
}: {
  params: Promise<{ setListId: string; setListTrackId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { setListId, setListTrackId } = await params;
  const item = await SetListService.getSetListTrackArrangement(
    session.user.id,
    setListId,
    setListTrackId,
  );

  if (!item || !item.track.annotation) {
    notFound();
  }

  if (item.track.visibilityStatus === "SETLIST_ONLY") {
    const [track, artistNames] = await Promise.all([
      TrackService.getCustomArrangementTrack(session.user.id, setListId, setListTrackId),
      TrackService.listArtistNames(),
    ]);
    if (!track) notFound();
    const returnHref = `/setlists/${setListId}/tracks/${setListTrackId}`;

    return (
      <AppShell documentScroll focusMode>
        <Dashboard
          documentScroll
          headerNavigation={<BackLink href={returnHref}>Back to arrangement</BackLink>}
          eyebrow="CUSTOM ARRANGEMENT"
          title="Edit custom arrangement"
          description="Changes apply only to this custom arrangement. The original track stays unchanged."
        >
          <AnnotationEditor
            initialArtistNames={artistNames}
            returnHref={returnHref}
            initialData={{
              trackId: track.id,
              title: track.title,
              artistName: track.artistName,
              key: track.key,
              capo: track.capo,
              tempo: track.tempo,
              timeSignature: track.timeSignature ?? "",
              tuning: track.tuning,
              youtubeLink: track.youtubeLink ?? "",
              spotifyLink: track.spotifyLink ?? "",
              tags: track.tags,
              additionalArtists: TrackService.getTemporaryTrackArtists(track.metadata),
              lyricsAndChords: track.annotation?.lyricsAndChords ?? "",
              notes: track.annotation?.notes ?? "",
              audio: null,
              detailsUpdatedAt: track.updatedAt.toISOString(),
              annotationUpdatedAt: track.annotation?.updatedAt.toISOString() ?? null,
              canPublishDirectly: false,
            }}
          />
        </Dashboard>
      </AppShell>
    );
  }

  const savedArrangement = parseSetListTrackArrangement(item.settings);
  const arrangement: SetListTrackArrangement = savedArrangement ?? {
    version: 1,
    label: "",
    key: item.track.key,
    tuning: item.track.tuning,
    capo: item.track.capo,
    tempo: item.track.tempo,
    timeSignature: item.track.timeSignature ?? "",
    lyricsAndChords: item.track.annotation.lyricsAndChords,
    notes:
      item.track.ownerId === session.user.id ? item.track.annotation.notes : "",
  };

  return (
    <AppShell documentScroll focusMode>
      <Dashboard
        documentScroll
        eyebrow="SETLIST ARRANGEMENT"
        title="Customize this track"
        description="These changes belong to this setlist entry and never modify the root track."
      >
        <SetListTrackArrangementEditor
          arrangement={arrangement}
          artistName={item.track.artistName}
          setListId={item.setList.id}
          setListTitle={item.setList.title}
          setListTrackId={item.id}
          trackTitle={item.track.title}
        />
      </Dashboard>
    </AppShell>
  );
}
