import "server-only";

import {
  GroupMembershipStatus,
  Prisma,
  PublicityStatus,
  VisibilityStatus,
} from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  MAX_SETLIST_TRANSPOSE,
  mergeSetListTrackTranspose,
  mergeSetListTrackArrangement,
  parseSetListTrackArrangement,
  parseSetListTrackTranspose,
} from "@/lib/setlists/setlist-track-settings";
import { changeSongSections } from "@/lib/chords/song-sections";
import type { ChangeSetListTrackSectionsInput } from "@/types/setlist";
import type { SetListTrackArrangement } from "@/types/setlist";

const MAX_SETLIST_TITLE_LENGTH = 120;
const MAX_SETLIST_DESCRIPTION_LENGTH = 1_000;
const MAX_SETLIST_TRACKS = 200;

const setListSummarySelect = {
  id: true,
  title: true,
  description: true,
  updatedAt: true,
  _count: {
    select: {
      tracks: true,
    },
  },
} satisfies Prisma.SetListSelect;

const bandSetListSummarySelect = {
  id: true,
  group: { select: { name: true } },
  event: { select: { title: true } },
  setList: {
    select: {
      title: true,
      _count: { select: { tracks: true } },
    },
  },
} satisfies Prisma.EventGroupSetListSelect;

export type BandSetListSummaryRecord = Prisma.EventGroupSetListGetPayload<{
  select: typeof bandSetListSummarySelect;
}>;

const setListTrackSelect = {
  id: true,
  orderNumber: true,
  settings: true,
  track: {
    select: {
      id: true,
      ownerId: true,
      title: true,
      artistName: true,
      key: true,
      tuning: true,
      visibilityStatus: true,
      publicityStatus: true,
    },
  },
} satisfies Prisma.SetListTrackSelect;

const setListTrackArrangementSelect = {
  id: true,
  settings: true,
  setList: {
    select: {
      id: true,
      title: true,
      ownerId: true,
    },
  },
  track: {
    select: {
      id: true,
      ownerId: true,
      title: true,
      artistName: true,
      key: true,
      tuning: true,
      capo: true,
      tempo: true,
      timeSignature: true,
      tags: true,
      youtubeLink: true,
      spotifyLink: true,
      publicityStatus: true,
      visibilityStatus: true,
      originalTrack: {
        select: { id: true, ownerId: true, visibilityStatus: true, publicityStatus: true },
      },
      updatedAt: true,
      musicFile: {
        select: {
          id: true,
          originalFileName: true,
        },
      },
      annotation: {
        select: {
          lyricsAndChords: true,
          notes: true,
        },
      },
    },
  },
} satisfies Prisma.SetListTrackSelect;

const setListDetailSelect = {
  id: true,
  title: true,
  description: true,
  updatedAt: true,
  tracks: {
    orderBy: [{ orderNumber: "asc" as const }, { id: "asc" as const }],
    select: setListTrackSelect,
  },
} satisfies Prisma.SetListSelect;

const bandSetListDetailSelect = {
  group: { select: { name: true } },
  event: { select: { id: true, title: true } },
  eventSetList: { select: { id: true } },
  setList: { select: { ...setListDetailSelect, ownerId: true } },
} satisfies Prisma.EventGroupSetListSelect;

const bandSetListTrackSelect = {
  id: true,
  settings: true,
  setList: { select: { title: true, ownerId: true } },
  track: {
    select: {
      title: true,
      artistName: true,
      ownerId: true,
      visibilityStatus: true,
      publicityStatus: true,
      key: true,
      tuning: true,
      capo: true,
      tempo: true,
      timeSignature: true,
      annotation: { select: { lyricsAndChords: true } },
    },
  },
} satisfies Prisma.SetListTrackSelect;

export type BandSetListDetailRecord = Prisma.EventGroupSetListGetPayload<{
  select: typeof bandSetListDetailSelect;
}>;

export type BandSetListTrackRecord = Prisma.SetListTrackGetPayload<{
  select: typeof bandSetListTrackSelect;
}>;

function bandAssignmentWhere(userId: string, assignmentId: string): Prisma.EventGroupSetListWhereInput {
  return {
    id: requireId(assignmentId, "assignmentId"),
    group: {
      memberships: {
        some: {
          userId: requireId(userId, "userId"),
          status: GroupMembershipStatus.ACCEPTED,
        },
      },
    },
  };
}

export async function getBandSetListForUser(
  userId: string,
  assignmentId: string,
): Promise<BandSetListDetailRecord | null> {
  return prisma.eventGroupSetList.findFirst({
    where: bandAssignmentWhere(userId, assignmentId),
    select: bandSetListDetailSelect,
  });
}

export async function getBandSetListTrackForUser(
  userId: string,
  assignmentId: string,
  setListTrackId: string,
): Promise<BandSetListTrackRecord | null> {
  const item = await prisma.setListTrack.findFirst({
    where: {
      id: requireId(setListTrackId, "setListTrackId"),
      setList: {
        eventGroupSetLists: { some: bandAssignmentWhere(userId, assignmentId) },
      },
    },
    select: bandSetListTrackSelect,
  });

  if (!item || (item.track.ownerId !== item.setList.ownerId &&
    !(item.track.visibilityStatus === VisibilityStatus.PUBLIC &&
      item.track.publicityStatus === PublicityStatus.APPROVED))) {
    return null;
  }

  return item;
}

export type SetListSummaryRecord = Prisma.SetListGetPayload<{
  select: typeof setListSummarySelect;
}>;

export type SetListDetailRecord = Prisma.SetListGetPayload<{
  select: typeof setListDetailSelect;
}>;

export type SetListTrackArrangementRecord = Prisma.SetListTrackGetPayload<{
  select: typeof setListTrackArrangementSelect;
}>;

export type QuickAddSetListRecord = {
  id: string;
  title: string;
  trackCount: number;
  containsTrack: boolean;
  containsMatchingArrangement: boolean;
};

export type SetListBrowseTrackRecord = {
  id: string;
  title: string;
  artistName: string;
  key: string;
  tuning: string;
  isOwnerTrack: boolean;
  isInSetList: boolean;
};

export type SetListTrackBrowseResult = {
  setList: {
    id: string;
    title: string;
  };
  tracks: SetListBrowseTrackRecord[];
};

export class SetListServiceError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "SetListServiceError";
  }
}

export async function listSetListsForUser(
  ownerId: string,
): Promise<SetListSummaryRecord[]> {
  return prisma.setList.findMany({
    where: { ownerId: requireId(ownerId, "ownerId") },
    select: setListSummarySelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
  });
}

export async function listBandSetListsForUser(
  userId: string,
): Promise<BandSetListSummaryRecord[]> {
  return prisma.eventGroupSetList.findMany({
    where: {
      group: {
        memberships: {
          some: {
            userId: requireId(userId, "userId"),
            status: GroupMembershipStatus.ACCEPTED,
          },
        },
      },
    },
    select: bandSetListSummarySelect,
    orderBy: [{ setList: { updatedAt: "desc" } }, { id: "desc" }],
    take: 100,
  });
}

export async function listSetListsForQuickAdd(
  ownerId: string,
  trackId: string,
  matchingSettings?: Prisma.JsonValue,
): Promise<QuickAddSetListRecord[]> {
  const normalizedOwnerId = requireId(ownerId, "ownerId");
  const normalizedTrackId = requireId(trackId, "trackId");
  const matchingArrangement = parseSetListTrackArrangement(matchingSettings);
  const setLists = await prisma.setList.findMany({
    where: { ownerId: normalizedOwnerId },
    select: {
      id: true,
      title: true,
      _count: {
        select: { tracks: true },
      },
      tracks: {
        where: { trackId: normalizedTrackId },
        select: { settings: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
  });

  return setLists.map((setList) => ({
    id: setList.id,
    title: setList.title,
    trackCount: setList._count.tracks,
    containsTrack: setList.tracks.length > 0,
    containsMatchingArrangement:
      matchingArrangement !== null &&
      setList.tracks.some((track) =>
        haveEqualArrangements(track.settings, matchingArrangement),
      ),
  }));
}

export async function createSetList(input: {
  ownerId: string;
  title: string;
  description: string;
}): Promise<SetListSummaryRecord> {
  return prisma.setList.create({
    data: {
      ownerId: requireId(input.ownerId, "ownerId"),
      title: requireText(input.title, "title", MAX_SETLIST_TITLE_LENGTH),
      description: optionalText(
        input.description,
        "description",
        MAX_SETLIST_DESCRIPTION_LENGTH,
      ),
    },
    select: setListSummarySelect,
  });
}

export async function getSetListForOwner(
  ownerId: string,
  setListId: string,
): Promise<SetListDetailRecord | null> {
  const normalizedOwnerId = requireId(ownerId, "ownerId");
  const normalizedSetListId = requireId(setListId, "setListId");
  return prisma.setList.findFirst({
    where: {
      id: normalizedSetListId,
      ownerId: normalizedOwnerId,
    },
    select: setListDetailSelect,
  });
}

export async function getSetListTrackArrangement(
  ownerId: string,
  setListId: string,
  setListTrackId: string,
): Promise<SetListTrackArrangementRecord | null> {
  const normalizedOwnerId = requireId(ownerId, "ownerId");

  return prisma.setListTrack.findFirst({
    where: {
      id: requireId(setListTrackId, "setListTrackId"),
      setListId: requireId(setListId, "setListId"),
      setList: { ownerId: normalizedOwnerId },
      track: {
        OR: [
          { ownerId: normalizedOwnerId },
          {
            visibilityStatus: VisibilityStatus.PUBLIC,
            publicityStatus: PublicityStatus.APPROVED,
          },
        ],
      },
    },
    select: setListTrackArrangementSelect,
  });
}

export async function createSetListTrackCopy(input: {
  ownerId: string;
  setListId: string;
  setListTrackId: string;
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const setListId = requireId(input.setListId, "setListId");
  const entryId = requireId(input.setListTrackId, "setListTrackId");
  await runSerializableTransaction(async (transaction) => {
    await cloneSetListEntry(transaction, ownerId, setListId, entryId);
  });
}

async function cloneSetListEntry(
  transaction: Prisma.TransactionClient,
  ownerId: string,
  setListId: string,
  entryId: string,
): Promise<string> {
  const item = await transaction.setListTrack.findFirst({
    where: { id: entryId, setListId, setList: { ownerId } },
    select: {
      settings: true,
      track: {
        select: {
          id: true,
          ownerId: true,
          visibilityStatus: true,
          publicityStatus: true,
          originalTrackId: true,
          copyForEntryId: true,
          title: true,
          artistName: true,
          artistId: true,
          key: true,
          tuning: true,
          capo: true,
          tempo: true,
          timeSignature: true,
          tags: true,
          youtubeLink: true,
          spotifyLink: true,
          metadata: true,
          additionalArtists: { select: { artistId: true, joinPhrase: true } },
          annotation: { select: { type: true, lyricsAndChords: true, notes: true, formatVersion: true } },
        },
      },
    },
  });
  if (!item) {
    throw new SetListServiceError("NOT_FOUND", "Setlist track not found.");
  }
  const source = item.track;
  if (
    source.visibilityStatus === VisibilityStatus.SETLIST_ONLY &&
    source.copyForEntryId === entryId
  ) {
    return source.id;
  }
  if (
    source.ownerId !== ownerId &&
    !(source.visibilityStatus === VisibilityStatus.PUBLIC &&
      source.publicityStatus === PublicityStatus.APPROVED)
  ) {
    throw new SetListServiceError("FORBIDDEN", "This track is unavailable.");
  }
  const arrangement = parseSetListTrackArrangement(item.settings);
  const copy = await transaction.track.create({
    data: {
      ownerId,
      copyForEntryId: entryId,
      originalTrackId: source.visibilityStatus === VisibilityStatus.SETLIST_ONLY
        ? source.originalTrackId
        : source.id,
      visibilityStatus: VisibilityStatus.SETLIST_ONLY,
      publicityStatus: PublicityStatus.PRIVATE,
      title: source.title,
      artistName: source.artistName,
      artistId: source.artistId,
      key: arrangement?.key ?? source.key,
      tuning: arrangement?.tuning ?? source.tuning,
      capo: arrangement ? arrangement.capo : source.capo,
      tempo: arrangement ? arrangement.tempo : source.tempo,
      timeSignature: arrangement?.timeSignature ?? source.timeSignature,
      tags: source.tags,
      youtubeLink: source.youtubeLink,
      spotifyLink: source.spotifyLink,
      metadata: isJsonObject(source.metadata) && Array.isArray(source.metadata.additionalArtists)
        ? { additionalArtists: source.metadata.additionalArtists }
        : {},
      additionalArtists: { create: source.additionalArtists },
      annotation: source.annotation ? {
        create: {
          type: source.annotation.type,
          formatVersion: source.annotation.formatVersion,
          lyricsAndChords: arrangement?.lyricsAndChords ?? source.annotation.lyricsAndChords,
          notes: arrangement?.notes ?? (source.ownerId === ownerId ? source.annotation.notes : ""),
        },
      } : undefined,
    },
    select: { id: true },
  });
  await transaction.setListTrack.update({ where: { id: entryId }, data: { trackId: copy.id } });
  return copy.id;
}

export async function changeSetListTrackSections(
  input: ChangeSetListTrackSectionsInput & { ownerId: string },
): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const setListId = requireId(input.setListId, "setListId");
  const entryId = requireId(input.setListTrackId, "setListTrackId");
  await runSerializableTransaction(async (transaction) => {
    const item = await transaction.setListTrack.findFirst({
      where: {
        id: entryId,
        setListId,
        setList: { ownerId },
        track: {
          OR: [
            { ownerId },
            { visibilityStatus: VisibilityStatus.PUBLIC, publicityStatus: PublicityStatus.APPROVED },
          ],
        },
      },
      select: {
        trackId: true,
        settings: true,
        track: { select: { visibilityStatus: true, copyForEntryId: true, annotation: { select: { lyricsAndChords: true } } } },
      },
    });
    if (!item?.track.annotation) throw new SetListServiceError("NOT_FOUND", "Setlist track not found.");
    const source = parseSetListTrackArrangement(item.settings)?.lyricsAndChords ?? item.track.annotation.lyricsAndChords;
    if (source !== input.expectedSource) {
      throw new SetListServiceError("CONFLICT", "This arrangement changed. Refresh and try again.");
    }
    const updatedSource = changeSongSections(source, input.operation);
    if (updatedSource === null) throw new SetListServiceError("INVALID_INPUT", "The section change is invalid or would exceed the chart size limit.");
    if (updatedSource === source) return;

    if (item.track.visibilityStatus === VisibilityStatus.SETLIST_ONLY && item.track.copyForEntryId !== entryId) {
      throw new SetListServiceError("FORBIDDEN", "This arrangement does not belong to this setlist entry.");
    }
    const copyId = item.track.visibilityStatus === VisibilityStatus.SETLIST_ONLY
      ? item.trackId
      : await cloneSetListEntry(transaction, ownerId, setListId, entryId);
    await transaction.trackAnnotation.update({
      where: { trackId: copyId },
      data: { lyricsAndChords: updatedSource },
    });
    const settings = isJsonObject(item.settings) ? { ...item.settings } : {};
    delete settings.arrangement;
    await transaction.setListTrack.update({ where: { id: entryId }, data: { settings: settings as Prisma.InputJsonObject } });
    await transaction.track.update({ where: { id: copyId }, data: { updatedAt: new Date() } });
    await transaction.setList.update({ where: { id: setListId }, data: { updatedAt: new Date() } });
  });
}

export async function resetSetListTrackCopy(input: {
  ownerId: string;
  setListId: string;
  setListTrackId: string;
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const setListId = requireId(input.setListId, "setListId");
  const entryId = requireId(input.setListTrackId, "setListTrackId");
  await runSerializableTransaction(async (transaction) => {
    const item = await transaction.setListTrack.findFirst({
      where: { id: entryId, setListId, setList: { ownerId }, track: { visibilityStatus: VisibilityStatus.SETLIST_ONLY, copyForEntryId: entryId } },
      select: { trackId: true, track: { select: { originalTrack: { select: { id: true, ownerId: true, visibilityStatus: true, publicityStatus: true } } } } },
    });
    const original = item?.track.originalTrack;
    if (!item || !original || (original.ownerId !== ownerId && !(original.visibilityStatus === VisibilityStatus.PUBLIC && original.publicityStatus === PublicityStatus.APPROVED))) {
      throw new SetListServiceError("NOT_FOUND", "The original track is unavailable.");
    }
    await transaction.setListTrack.update({ where: { id: entryId }, data: { trackId: original.id, settings: {} } });
    await transaction.track.delete({ where: { id: item.trackId } });
  });
}

export async function saveSetListTrackArrangement(input: {
  ownerId: string;
  setListId: string;
  setListTrackId: string;
  arrangement: SetListTrackArrangement;
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const setListId = requireId(input.setListId, "setListId");
  const setListTrackId = requireId(input.setListTrackId, "setListTrackId");

  await runSerializableTransaction(async (transaction) => {
    const item = await transaction.setListTrack.findFirst({
      where: {
        id: setListTrackId,
        setListId,
        setList: { ownerId },
        track: { visibilityStatus: { not: VisibilityStatus.SETLIST_ONLY } },
      },
      select: { id: true, settings: true },
    });

    if (!item) {
      throw new SetListServiceError("NOT_FOUND", "Setlist track not found.");
    }

    await transaction.setListTrack.update({
      where: { id: item.id },
      data: {
        settings: mergeSetListTrackArrangement(
          item.settings,
          input.arrangement,
        ) as Prisma.InputJsonObject,
      },
    });
  });
}

export async function saveSetListTrackTranspose(input: {
  ownerId: string;
  setListId: string;
  setListTrackId: string;
  transposeSemitones: number;
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const setListId = requireId(input.setListId, "setListId");
  const setListTrackId = requireId(input.setListTrackId, "setListTrackId");

  if (
    !Number.isInteger(input.transposeSemitones) ||
    Math.abs(input.transposeSemitones) > MAX_SETLIST_TRANSPOSE
  ) {
    throw new SetListServiceError("INVALID_INPUT", "Transpose is invalid.");
  }

  await runSerializableTransaction(async (transaction) => {
    const item = await transaction.setListTrack.findFirst({
      where: {
        id: setListTrackId,
        setListId,
        setList: { ownerId },
      },
      select: { id: true, settings: true },
    });

    if (!item) {
      throw new SetListServiceError("NOT_FOUND", "Setlist track not found.");
    }

    if (parseSetListTrackTranspose(item.settings) === input.transposeSemitones) {
      return;
    }

    await transaction.setListTrack.update({
      where: { id: item.id },
      data: {
        settings: mergeSetListTrackTranspose(
          item.settings,
          input.transposeSemitones,
        ) as Prisma.InputJsonObject,
      },
    });
  });
}

export async function copySetListTrackArrangement(input: {
  ownerId: string;
  sourceSetListId: string;
  sourceSetListTrackId: string;
  targetSetListId: string;
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const sourceSetListId = requireId(input.sourceSetListId, "sourceSetListId");
  const sourceSetListTrackId = requireId(
    input.sourceSetListTrackId,
    "sourceSetListTrackId",
  );
  const targetSetListId = requireId(input.targetSetListId, "targetSetListId");

  if (sourceSetListId === targetSetListId) {
    throw new SetListServiceError(
      "CONFLICT",
      "This arrangement is already in that setlist.",
    );
  }

  await runSerializableTransaction(async (transaction) => {
    const [source, target, targetCount, lastTrack] = await Promise.all([
      transaction.setListTrack.findFirst({
        where: {
          id: sourceSetListTrackId,
          setListId: sourceSetListId,
          setList: { ownerId },
          track: {
            OR: [
              { ownerId },
              {
                visibilityStatus: VisibilityStatus.PUBLIC,
                publicityStatus: PublicityStatus.APPROVED,
              },
            ],
          },
        },
        select: { trackId: true, settings: true, track: { select: { visibilityStatus: true } } },
      }),
      transaction.setList.findFirst({
        where: { id: targetSetListId, ownerId },
        select: { id: true },
      }),
      transaction.setListTrack.count({ where: { setListId: targetSetListId } }),
      transaction.setListTrack.findFirst({
        where: { setListId: targetSetListId },
        select: { orderNumber: true },
        orderBy: [{ orderNumber: "desc" }, { id: "desc" }],
      }),
    ]);

    if (!source || !target) {
      throw new SetListServiceError(
        "NOT_FOUND",
        "Setlist arrangement not found.",
      );
    }

    const isCustomArrangement = source.track.visibilityStatus === VisibilityStatus.SETLIST_ONLY;

    if (targetCount >= MAX_SETLIST_TRACKS) {
      throw new SetListServiceError("CONFLICT", "This setlist has reached its track limit.");
    }

    const existing = isCustomArrangement ? null : await transaction.setListTrack.findFirst({
      where: { setListId: targetSetListId, trackId: source.trackId },
      select: { id: true },
    });

    if (existing) {
      throw new SetListServiceError(
        "CONFLICT",
        "This arrangement is already in that setlist.",
      );
    }

    const entry = await transaction.setListTrack.create({
      data: {
        setListId: targetSetListId,
        trackId: source.trackId,
        orderNumber: (lastTrack?.orderNumber ?? 0) + 1,
        settings: (isCustomArrangement && isJsonObject(source.settings)
          ? source.settings
          : {}) as Prisma.InputJsonObject,
      },
    });
    if (isCustomArrangement) {
      await cloneSetListEntry(transaction, ownerId, targetSetListId, entry.id);
    }
  });
}

export async function searchTracksForSetList(
  ownerId: string,
  setListId: string,
  query: string,
): Promise<SetListTrackBrowseResult | null> {
  const normalizedOwnerId = requireId(ownerId, "ownerId");
  const normalizedSetListId = requireId(setListId, "setListId");
  const normalizedQuery = query.trim().slice(0, 100);
  const setList = await prisma.setList.findFirst({
    where: {
      id: normalizedSetListId,
      ownerId: normalizedOwnerId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!setList) {
    return null;
  }

  const searchWhere = normalizedQuery
    ? {
        OR: [
          {
            title: {
              contains: normalizedQuery,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            artistName: {
              contains: normalizedQuery,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : {};
  const browseTrackSelect = {
    id: true,
    ownerId: true,
    title: true,
    artistName: true,
    key: true,
    tuning: true,
    setListTracks: {
      where: { setListId: normalizedSetListId },
      select: { id: true },
      take: 1,
    },
  } satisfies Prisma.TrackSelect;
  const [ownedTracks, publicTracks] = await Promise.all([
    prisma.track.findMany({
      where: {
        ...searchWhere,
        ownerId: normalizedOwnerId,
        visibilityStatus: { not: VisibilityStatus.SETLIST_ONLY },
      },
      select: browseTrackSelect,
      orderBy: [{ title: "asc" }, { id: "asc" }],
      take: 100,
    }),
    prisma.track.findMany({
      where: {
        ...searchWhere,
        ownerId: { not: normalizedOwnerId },
        visibilityStatus: VisibilityStatus.PUBLIC,
        publicityStatus: PublicityStatus.APPROVED,
      },
      select: browseTrackSelect,
      orderBy: [{ title: "asc" }, { id: "asc" }],
      take: 100,
    }),
  ]);
  const tracks = [...ownedTracks, ...publicTracks].map((track) => ({
    id: track.id,
    title: track.title,
    artistName: track.artistName,
    key: track.key,
    tuning: track.tuning,
    isOwnerTrack: track.ownerId === normalizedOwnerId,
    isInSetList: track.setListTracks.length > 0,
  }));

  return { setList, tracks };
}

export async function updateSetListDetails(input: {
  ownerId: string;
  setListId: string;
  title: string;
  description: string;
}): Promise<void> {
  const result = await prisma.setList.updateMany({
    where: {
      id: requireId(input.setListId, "setListId"),
      ownerId: requireId(input.ownerId, "ownerId"),
    },
    data: {
      title: requireText(input.title, "title", MAX_SETLIST_TITLE_LENGTH),
      description: optionalText(
        input.description,
        "description",
        MAX_SETLIST_DESCRIPTION_LENGTH,
      ),
    },
  });

  if (result.count === 0) {
    throw new SetListServiceError("NOT_FOUND", "Setlist not found.");
  }
}

export async function deleteSetList(input: {
  ownerId: string;
  setListId: string;
}): Promise<void> {
  const result = await prisma.setList.deleteMany({
    where: {
      id: requireId(input.setListId, "setListId"),
      ownerId: requireId(input.ownerId, "ownerId"),
    },
  });

  if (result.count === 0) {
    throw new SetListServiceError("NOT_FOUND", "Setlist not found.");
  }
}

export async function addTrackToSetList(input: {
  ownerId: string;
  setListId: string;
  trackId: string;
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const setListId = requireId(input.setListId, "setListId");
  const trackId = requireId(input.trackId, "trackId");

  await runSerializableTransaction(async (transaction) => {
    const [setList, track, existingTrack, trackCount, lastTrack] =
      await Promise.all([
        transaction.setList.findFirst({
          where: { id: setListId, ownerId },
          select: { id: true },
        }),
        transaction.track.findFirst({
          where: {
            id: trackId,
            visibilityStatus: { not: VisibilityStatus.SETLIST_ONLY },
            OR: [
              { ownerId },
              {
                visibilityStatus: VisibilityStatus.PUBLIC,
                publicityStatus: PublicityStatus.APPROVED,
              },
            ],
          },
          select: { id: true },
        }),
        transaction.setListTrack.findFirst({
          where: { setListId, trackId },
          select: { id: true },
        }),
        transaction.setListTrack.count({ where: { setListId } }),
        transaction.setListTrack.findFirst({
          where: { setListId },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true },
        }),
      ]);

    if (!setList) {
      throw new SetListServiceError("NOT_FOUND", "Setlist not found.");
    }

    if (!track) {
      throw new SetListServiceError(
        "FORBIDDEN",
        "This track is private or unavailable.",
      );
    }

    if (existingTrack) {
      throw new SetListServiceError(
        "CONFLICT",
        "This track is already in the setlist.",
      );
    }

    if (trackCount >= MAX_SETLIST_TRACKS) {
      throw new SetListServiceError(
        "INVALID_INPUT",
        `A setlist can contain up to ${MAX_SETLIST_TRACKS} tracks.`,
      );
    }

    await transaction.setListTrack.create({
      data: {
        setListId,
        trackId,
        orderNumber: (lastTrack?.orderNumber ?? 0) + 1,
      },
    });
  });
}

export async function removeTrackFromSetList(input: {
  ownerId: string;
  setListId: string;
  setListTrackId: string;
}): Promise<void> {
  const result = await prisma.setListTrack.deleteMany({
    where: {
      id: requireId(input.setListTrackId, "setListTrackId"),
      setListId: requireId(input.setListId, "setListId"),
      setList: {
        ownerId: requireId(input.ownerId, "ownerId"),
      },
    },
  });

  if (result.count === 0) {
    throw new SetListServiceError("NOT_FOUND", "Setlist track not found.");
  }
}

export async function moveSetListTrack(input: {
  ownerId: string;
  setListId: string;
  setListTrackId: string;
  direction: "up" | "down";
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const setListId = requireId(input.setListId, "setListId");
  const setListTrackId = requireId(input.setListTrackId, "setListTrackId");

  if (input.direction !== "up" && input.direction !== "down") {
    throw new SetListServiceError("INVALID_INPUT", "Direction is invalid.");
  }

  await runSerializableTransaction(async (transaction) => {
    const setList = await transaction.setList.findFirst({
      where: { id: setListId, ownerId },
      select: {
        tracks: {
          orderBy: [{ orderNumber: "asc" }, { id: "asc" }],
          select: { id: true, orderNumber: true },
        },
      },
    });

    if (!setList) {
      throw new SetListServiceError("NOT_FOUND", "Setlist not found.");
    }

    const currentIndex = setList.tracks.findIndex(
      (track) => track.id === setListTrackId,
    );
    const targetIndex =
      input.direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0) {
      throw new SetListServiceError("NOT_FOUND", "Setlist track not found.");
    }

    if (targetIndex < 0 || targetIndex >= setList.tracks.length) {
      return;
    }

    const current = setList.tracks[currentIndex];
    const target = setList.tracks[targetIndex];

    await transaction.setListTrack.update({
      where: { id: current.id },
      data: { orderNumber: -1 },
    });
    await transaction.setListTrack.update({
      where: { id: target.id },
      data: { orderNumber: current.orderNumber },
    });
    await transaction.setListTrack.update({
      where: { id: current.id },
      data: { orderNumber: target.orderNumber },
    });
  });
}

export async function reorderSetListTracks(input: {
  ownerId: string;
  setListId: string;
  setListTrackIds: string[];
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const setListId = requireId(input.setListId, "setListId");
  const setListTrackIds = requireUniqueIds(input.setListTrackIds);

  await runSerializableTransaction(async (transaction) => {
    const setList = await transaction.setList.findFirst({
      where: { id: setListId, ownerId },
      select: {
        tracks: {
          orderBy: [{ orderNumber: "asc" }, { id: "asc" }],
          select: { id: true },
        },
      },
    });

    if (!setList) {
      throw new SetListServiceError("NOT_FOUND", "Setlist not found.");
    }

    const currentIds = setList.tracks.map((track) => track.id);
    const currentIdSet = new Set(currentIds);
    const hasExactTracks =
      currentIds.length === setListTrackIds.length &&
      setListTrackIds.every((id) => currentIdSet.has(id));

    if (!hasExactTracks) {
      throw new SetListServiceError(
        "CONFLICT",
        "The setlist changed. Refresh and try arranging it again.",
      );
    }

    if (currentIds.every((id, index) => id === setListTrackIds[index])) {
      return;
    }

    await transaction.setListTrack.updateMany({
      where: { setListId },
      data: { orderNumber: { multiply: -1 } },
    });
    await Promise.all(
      setListTrackIds.map((id, index) =>
        transaction.setListTrack.update({
          where: { id },
          data: { orderNumber: index + 1 },
        }),
      ),
    );
    await transaction.setList.update({
      where: { id: setListId },
      data: { updatedAt: new Date() },
    });
  });
}

function requireId(value: unknown, field: string): string {
  return requireText(value, field, 255);
}

function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new SetListServiceError("INVALID_INPUT", `${field} is required.`);
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    throw new SetListServiceError("INVALID_INPUT", `${field} is invalid.`);
  }

  return normalized;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (typeof value !== "string" || value.length > maxLength) {
    throw new SetListServiceError("INVALID_INPUT", `${field} is invalid.`);
  }

  return value.trim() || null;
}

function requireUniqueIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_SETLIST_TRACKS) {
    throw new SetListServiceError("INVALID_INPUT", "Track order is invalid.");
  }

  const ids = value.map((id) => requireId(id, "setListTrackId"));

  if (new Set(ids).size !== ids.length) {
    throw new SetListServiceError("INVALID_INPUT", "Track order is invalid.");
  }

  return ids;
}

async function runSerializableTransaction<T>(
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error: unknown) {
      if (!hasErrorCode(error, "P2034") || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Serializable transaction retry limit was reached.");
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function haveEqualArrangements(
  settings: Prisma.JsonValue,
  expected: SetListTrackArrangement,
): boolean {
  const arrangement = parseSetListTrackArrangement(settings);
  return arrangement !== null && JSON.stringify(arrangement) === JSON.stringify(expected);
}

export const SetListService = {
  getBandSetListForUser,
  getBandSetListTrackForUser,
  listBandSetListsForUser,
  changeSetListTrackSections,
  addTrackToSetList,
  copySetListTrackArrangement,
  createSetList,
  createSetListTrackCopy,
  resetSetListTrackCopy,
  deleteSetList,
  getSetListForOwner,
  getSetListTrackArrangement,
  listSetListsForQuickAdd,
  listSetListsForUser,
  moveSetListTrack,
  removeTrackFromSetList,
  reorderSetListTracks,
  saveSetListTrackArrangement,
  saveSetListTrackTranspose,
  searchTracksForSetList,
  updateSetListDetails,
};
