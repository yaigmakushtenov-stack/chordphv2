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

  const arrangement = parseSetListTrackArrangement(item.settings);
  return (
    <AppShell documentScroll>
        <BandTrackChart
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
    </AppShell>
  );
}
