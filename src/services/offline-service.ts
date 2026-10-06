import "server-only";

import { GroupMembershipStatus, Prisma, PublicityStatus, VisibilityStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { parseSetListTrackArrangement, parseSetListTrackTranspose } from "@/lib/setlists/setlist-track-settings";
import type { OfflineDownload, OfflineSetListRequest } from "@/types/offline";

export async function getOfflineSetList(userId: string, request: OfflineSetListRequest): Promise<OfflineDownload | null> {
  const scope: Prisma.SetListWhereInput = request.kind === "personal"
    ? { id: request.id, ownerId: userId }
    : { eventGroupSetLists: { some: { id: request.id, group: { memberships: { some: { userId, status: GroupMembershipStatus.ACCEPTED } } } } } };
  const setList = await prisma.setList.findFirst({
    where: scope,
    select: {
      id: true, ownerId: true, title: true, description: true, updatedAt: true,
      tracks: { select: { id: true }, orderBy: [{ orderNumber: "asc" }, { id: "asc" }], take: 201 },
    },
  });
  if (!setList || setList.tracks.length > 200) return null;

  const entries = await prisma.setListTrack.findMany({
    where: {
      setListId: setList.id, setList: scope,
      track: { OR: [
        { ownerId: setList.ownerId },
        { visibilityStatus: VisibilityStatus.PUBLIC, publicityStatus: PublicityStatus.APPROVED },
      ] },
    },
    select: {
      id: true, settings: true,
      track: { select: {
        title: true, artistName: true, key: true, tuning: true, capo: true, tempo: true, timeSignature: true, ownerId: true,
        annotation: { select: { lyricsAndChords: true, notes: true } },
      } },
    },
    take: 200,
  });
  const href = request.kind === "personal" ? `/setlists/${request.id}` : `/setlists/bands/${request.id}`;
  const available = new Map(entries.map((item) => {
    const arrangement = parseSetListTrackArrangement(item.settings);
    return [item.id, {
      id: item.id, href: `${href}/tracks/${item.id}`, title: item.track.title, artistName: item.track.artistName,
      key: arrangement?.key ?? item.track.key, transpose: parseSetListTrackTranspose(item.settings),
      tuning: arrangement?.tuning ?? item.track.tuning, capo: arrangement ? arrangement.capo : item.track.capo,
      tempo: arrangement ? arrangement.tempo : item.track.tempo, timeSignature: arrangement?.timeSignature ?? item.track.timeSignature ?? "",
      lyricsAndChords: arrangement?.lyricsAndChords ?? item.track.annotation?.lyricsAndChords ?? "",
      notes: request.kind === "band" ? "" : arrangement?.notes ?? (item.track.ownerId === userId ? item.track.annotation?.notes ?? "" : ""),
    }] as const;
  }));
  return {
    id: `${request.kind}:${request.id}`, kind: "setlist", href, title: setList.title,
    subtitle: setList.description ?? "", updatedAt: setList.updatedAt.toISOString(), savedAt: new Date().toISOString(),
    songs: setList.tracks.map((item) => ({ id: item.id, chart: available.get(item.id) ?? null })),
  };
}
