import { SongNavigation } from "@/components/shared/song-navigation";
import { ScrollExit } from "@/app/setlists/_components/scroll-exit";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { BandTrackChart } from "@/app/setlists/_components/band-track-chart";
import { AppShell } from "@/components/shared/app-shell";
import { auth } from "@/lib/auth";
import { parseSetListTrackArrangement, parseSetListTrackTranspose } from "@/lib/setlists/setlist-track-settings";
import { SetListService } from "@/services/setlist-service";

export const metadata: Metadata = { title: "Band Setlist Track | ChordPH" };

export default async function BandSetListTrackPage({ params }: {
  params: Promise<{ assignmentId: string; setListTrackId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const { assignmentId, setListTrackId } = await params;
  const item = await SetListService.getBandSetListTrackForUser(session.user.id, assignmentId, setListTrackId);
  if (!item) notFound();

  const playlist = await SetListService.getBandSetListForUser(session.user.id, assignmentId);
  const currentIndex = playlist?.setList.tracks.findIndex((track) => track.id === setListTrackId) ?? -1;
  const previousTrack = currentIndex > 0 ? playlist?.setList.tracks[currentIndex - 1] : undefined;
  const nextTrack = currentIndex >= 0 ? playlist?.setList.tracks[currentIndex + 1] : undefined;
  const arrangement = parseSetListTrackArrangement(item.settings);
  return (
    <AppShell mobileDocumentScroll>
        <BandTrackChart
        songNavigation={<SongNavigation previous={previousTrack ? { href: `/setlists/bands/${assignmentId}/tracks/${previousTrack.id}`, title: previousTrack.track.title } : undefined} next={nextTrack ? { href: `/setlists/bands/${assignmentId}/tracks/${nextTrack.id}`, title: nextTrack.track.title } : undefined} />}
          title={item.track.title}
          artistName={item.track.artistName}
          setListTitle={item.setList.title}
          backHref={`/setlists/bands/${assignmentId}`}
          tuning={arrangement?.tuning ?? item.track.tuning}
          capo={arrangement?.capo ?? item.track.capo}
          tempo={arrangement?.tempo ?? item.track.tempo}
          timeSignature={arrangement?.timeSignature ?? item.track.timeSignature ?? ""}
          lyricsAndChords={arrangement?.lyricsAndChords ?? item.track.annotation?.lyricsAndChords ?? ""}
          baseKey={arrangement?.key ?? item.track.key}
          initialTranspose={parseSetListTrackTranspose(item.settings)}
        />
      <ScrollExit href={`/setlists/bands/${assignmentId}`} />
    </AppShell>
  );
}
