import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AnnotationViewer } from "@/app/track/_components/annotation-viewer";
import { AppShell } from "@/components/shared/app-shell";
import { auth } from "@/lib/auth";
import { parseSetListTrackArrangement } from "@/lib/setlists/setlist-track-settings";
import { SetListService } from "@/services/setlist-service";
import type { AnnotationViewerData } from "@/types/track";

export const metadata: Metadata = {
  title: "Setlist Arrangement | ChordPH",
  description: "View a customized track arrangement within a setlist.",
};

export default async function SetListTrackArrangementPage({
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

  const arrangement = parseSetListTrackArrangement(item.settings);
  const isRootOwner = item.track.ownerId === session.user.id;
  const track: AnnotationViewerData = {
    id: item.track.id,
    title: item.track.title,
    artistName: item.track.artistName,
    key: arrangement?.key ?? item.track.key,
    tuning: arrangement?.tuning ?? item.track.tuning,
    capo: arrangement?.capo ?? item.track.capo,
    tempo: arrangement?.tempo ?? item.track.tempo,
    timeSignature: arrangement?.timeSignature ?? item.track.timeSignature ?? "",
    tags: item.track.tags,
    lyricsAndChords:
      arrangement?.lyricsAndChords ?? item.track.annotation.lyricsAndChords,
    notes:
      arrangement?.notes ?? (isRootOwner ? item.track.annotation.notes : ""),
    youtubeLink: item.track.youtubeLink,
    spotifyLink: item.track.spotifyLink,
    audio: item.track.musicFile
      ? {
          playbackUrl: `/music/files/${encodeURIComponent(item.track.musicFile.id)}/play`,
          originalFileName: item.track.musicFile.originalFileName,
        }
      : null,
    updatedAt: item.track.updatedAt.toISOString(),
    isOwner: isRootOwner,
    isAuthenticated: true,
    publicityStatus: item.track.publicityStatus,
  };
  const quickAddSetLists = await SetListService.listSetListsForQuickAdd(
    session.user.id,
    item.track.id,
    item.settings,
  );

  return (
    <AppShell>
      <AnnotationViewer
        quickAddSetLists={quickAddSetLists}
        setListContext={{
          arrangementLabel: arrangement?.label || null,
          setListId: item.setList.id,
          setListTitle: item.setList.title,
          setListTrackId: item.id,
        }}
        track={track}
      />
    </AppShell>
  );
}
