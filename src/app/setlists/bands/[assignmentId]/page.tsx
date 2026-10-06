import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { BackLink } from "@/components/shared/back-link";
import { Dashboard } from "@/components/shared/dashboard";
import { SetListOptions } from "@/app/setlists/_components/setlist-options";
import { SetListEditor } from "@/app/setlists/_components/setlist-editor";
import { auth } from "@/lib/auth";
import { getTransposedSetListKey, parseSetListTrackArrangement, parseSetListTrackTranspose } from "@/lib/setlists/setlist-track-settings";
import { canViewStageTrack } from "@/services/event-service";
import { SetListService } from "@/services/setlist-service";
import type { SetListDetailData } from "@/types/setlist";

export const metadata: Metadata = { title: "Band Setlist | ChordPH" };

export default async function BandSetListPage({ params }: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const { assignmentId } = await params;
  const assignment = await SetListService.getBandSetListForUser(session.user.id, assignmentId);
  if (!assignment) notFound();

  const { setList } = assignment;
  const data: SetListDetailData = {
    id: setList.id,
    title: setList.title,
    description: setList.description,
    updatedAt: setList.updatedAt.toISOString(),
    tracks: setList.tracks.map((item) => {
      const available = canViewStageTrack(setList.ownerId, item.track);
      const arrangement = parseSetListTrackArrangement(item.settings);
      const transposeSemitones = available ? parseSetListTrackTranspose(item.settings) : 0;
      const baseKey = available ? (arrangement?.key ?? item.track.key) : "—";
      return {
        id: item.id,
        trackId: available ? item.track.id : null,
        title: available ? item.track.title : "Unavailable track",
        artistName: available ? item.track.artistName : "This track is no longer shared",
        key: available ? getTransposedSetListKey(baseKey, transposeSemitones) : "—",
        baseKey,
        transposeSemitones,
        tuning: available ? (arrangement?.tuning ?? item.track.tuning) : "—",
        arrangementLabel: null,
        isSetListCopy: item.track.visibilityStatus === "SETLIST_ONLY",
        isOwnerTrack: item.track.ownerId === session.user.id,
        isPublicTrack: item.track.visibilityStatus === "PUBLIC" && item.track.publicityStatus === "APPROVED",
        orderNumber: item.orderNumber,
      };
    }),
  };
  return (
    <AppShell documentScroll>
      <Dashboard
        documentScroll
        headerNavigation={<div className="flex items-center justify-between gap-3"><BackLink href="/setlists">All setlists</BackLink><SetListOptions request={{ kind: "band", id: assignmentId }} /></div>}
        title={setList.title}
        compactTitle
        description={`${assignment.group.name} · ${assignment.event.title}`}
        titleAction={data.tracks.some((track) => track.trackId) ? (
          <Link href={`/events/${assignment.event.id}/playlists/${assignment.eventSetList.id}/stage`} aria-label={`Open ${setList.title} in stage view`} title="Stage view · Medley" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ed1746] text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M8 4v16l13-8Z" /></svg>
          </Link>
        ) : null}
      >
        <SetListEditor setList={data} trackPath={`/setlists/bands/${assignmentId}/tracks`} />
      </Dashboard>
    </AppShell>
  );
}
