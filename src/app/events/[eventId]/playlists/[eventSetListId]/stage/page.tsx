import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { StageView } from "@/app/events/_components/stage-view";
import {
  canViewStageTrack,
  EventService,
  type EventStagePlaylistRecord,
} from "@/services/event-service";
import { auth } from "@/lib/auth";
import { parseSetListTrackArrangement } from "@/lib/setlists/setlist-track-settings";
import type { StagePlaylistData } from "@/types/stage";

export const metadata: Metadata = {
  title: "Stage | ChordPH",
  description: "Play an event playlist in a continuous stage view.",
};

export default async function EventPlaylistStagePage({
  params,
}: {
  params: Promise<{ eventId: string; eventSetListId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { eventId, eventSetListId } = await params;
  const stagePlaylist = await EventService.getStagePlaylistForOwner({
    ownerId: session.user.id,
    eventId,
    eventSetListId,
  });

  if (!stagePlaylist) {
    notFound();
  }

  return <StageView playlist={toStagePlaylistData(stagePlaylist, session.user.id)} />;
}

function toStagePlaylistData(
  playlist: EventStagePlaylistRecord,
  ownerId: string,
): StagePlaylistData {
  const band = playlist.eventGroupSetLists[0]?.group ?? null;

  return {
    id: playlist.id,
    eventId: playlist.event.id,
    eventTitle: playlist.event.title,
    setListId: playlist.setList.id,
    setListTitle: playlist.setList.title,
    band: band ? { id: band.id, name: band.name } : null,
    tracks: playlist.setList.tracks.map((item) => {
      const arrangement = parseSetListTrackArrangement(item.settings);
      const isViewable = canViewStageTrack(ownerId, item.track);
      const lyricsAndChords = isViewable
        ? (arrangement?.lyricsAndChords ??
          item.track.annotation?.lyricsAndChords ??
          "")
        : "";

      return {
        id: item.track.id,
        setListTrackId: item.id,
        title: isViewable ? item.track.title : "Unavailable track",
        artistName: isViewable
          ? item.track.artistName
          : "This track is no longer public",
        key: isViewable ? (arrangement?.key ?? item.track.key) : "",
        capo: isViewable ? (arrangement?.capo ?? item.track.capo) : null,
        tempo: isViewable ? (arrangement?.tempo ?? item.track.tempo) : null,
        timeSignature: isViewable
          ? (arrangement?.timeSignature ?? item.track.timeSignature ?? "")
          : "",
        tuning: isViewable ? (arrangement?.tuning ?? item.track.tuning) : "",
        lyricsAndChords,
        orderNumber: item.orderNumber,
        isAvailable: isViewable && lyricsAndChords.trim().length > 0,
      };
    }),
  };
}
