import "server-only";

import {
  Prisma,
  PublicityStatus,
  VisibilityStatus,
} from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const MAX_EVENT_TITLE_LENGTH = 120;
const MAX_EVENT_DESCRIPTION_LENGTH = 1_000;
const MAX_LOCATION_TEXT_LENGTH = 255;
const MAX_TIMEZONE_LENGTH = 100;
const MAX_EVENT_SETLISTS = 100;

const eventSummarySelect = {
  id: true,
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  place: true,
  timezone: true,
  locationAddress: true,
  latitude: true,
  longitude: true,
  updatedAt: true,
  _count: {
    select: {
      eventSetLists: true,
    },
  },
} satisfies Prisma.EventSelect;

const eventDetailSelect = {
  id: true,
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  place: true,
  timezone: true,
  locationAddress: true,
  latitude: true,
  longitude: true,
  updatedAt: true,
  eventSetLists: {
    orderBy: [{ orderNumber: "asc" as const }, { id: "asc" as const }],
    select: {
      id: true,
      setListId: true,
      orderNumber: true,
      setList: {
        select: {
          id: true,
          title: true,
          description: true,
          _count: {
            select: {
              tracks: true,
            },
          },
        },
      },
      eventGroupSetLists: {
        take: 1,
        orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
        select: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.EventSelect;

const eventStagePlaylistSelect = {
  id: true,
  eventId: true,
  setListId: true,
  event: {
    select: {
      id: true,
      ownerId: true,
      title: true,
    },
  },
  setList: {
    select: {
      id: true,
      title: true,
      tracks: {
        orderBy: [{ orderNumber: "asc" as const }, { id: "asc" as const }],
        select: {
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
              capo: true,
              tempo: true,
              timeSignature: true,
              tuning: true,
              visibilityStatus: true,
              publicityStatus: true,
              annotation: {
                select: {
                  lyricsAndChords: true,
                  notes: true,
                },
              },
            },
          },
        },
      },
    },
  },
  eventGroupSetLists: {
    take: 1,
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
    select: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.EventSetListSelect;

export type EventSummaryRecord = Prisma.EventGetPayload<{
  select: typeof eventSummarySelect;
}>;

export type EventDetailRecord = Prisma.EventGetPayload<{
  select: typeof eventDetailSelect;
}>;

export type EventStagePlaylistRecord = Prisma.EventSetListGetPayload<{
  select: typeof eventStagePlaylistSelect;
}>;

export type CreateEventInput = {
  ownerId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date | null;
  place: string;
  timezone?: string;
  locationAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export class EventServiceError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "EventServiceError";
  }
}

export async function listEventsForUser(
  ownerId: string,
): Promise<EventSummaryRecord[]> {
  return prisma.event.findMany({
    where: { ownerId: requireText(ownerId, "ownerId", 255) },
    select: eventSummarySelect,
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    take: 100,
  });
}

export async function getEventForOwner(
  ownerId: string,
  eventId: string,
): Promise<EventSummaryRecord | null> {
  return prisma.event.findFirst({
    where: {
      id: requireText(eventId, "eventId", 255),
      ownerId: requireText(ownerId, "ownerId", 255),
    },
    select: eventSummarySelect,
  });
}

export async function getEventDetailForOwner(
  ownerId: string,
  eventId: string,
): Promise<EventDetailRecord | null> {
  return prisma.event.findFirst({
    where: {
      id: requireText(eventId, "eventId", 255),
      ownerId: requireText(ownerId, "ownerId", 255),
    },
    select: eventDetailSelect,
  });
}

export async function getStagePlaylistForOwner(input: {
  ownerId: string;
  eventId: string;
  eventSetListId: string;
}): Promise<EventStagePlaylistRecord | null> {
  const ownerId = requireId(input.ownerId, "ownerId");

  return prisma.eventSetList.findFirst({
    where: {
      id: requireId(input.eventSetListId, "eventSetListId"),
      eventId: requireId(input.eventId, "eventId"),
      event: {
        ownerId,
      },
      setList: {
        ownerId,
      },
    },
    select: eventStagePlaylistSelect,
  });
}

export function canViewStageTrack(
  ownerId: string,
  track: {
    ownerId: string;
    publicityStatus: PublicityStatus;
    visibilityStatus: VisibilityStatus;
  },
): boolean {
  return (
    track.ownerId === ownerId ||
    (track.visibilityStatus === VisibilityStatus.PUBLIC &&
      track.publicityStatus === PublicityStatus.APPROVED)
  );
}

export async function createEvent(
  input: CreateEventInput,
): Promise<EventSummaryRecord> {
  const startDate = requireDate(input.startDate, "startDate");
  const endDate = optionalDate(input.endDate, "endDate");

  if (endDate && endDate <= startDate) {
    throw new EventServiceError(
      "INVALID_INPUT",
      "End date must be after the start date.",
    );
  }

  return prisma.event.create({
    data: {
      ownerId: requireText(input.ownerId, "ownerId", 255),
      title: requireText(input.title, "title", MAX_EVENT_TITLE_LENGTH),
      description: optionalText(
        input.description,
        "description",
        MAX_EVENT_DESCRIPTION_LENGTH,
      ),
      startDate,
      endDate,
      place: requireText(input.place, "place", MAX_LOCATION_TEXT_LENGTH),
      timezone: optionalText(input.timezone, "timezone", MAX_TIMEZONE_LENGTH),
      locationAddress: optionalText(
        input.locationAddress,
        "locationAddress",
        MAX_LOCATION_TEXT_LENGTH,
      ),
      latitude: optionalCoordinate(input.latitude, "latitude", -90, 90),
      longitude: optionalCoordinate(input.longitude, "longitude", -180, 180),
    },
    select: eventSummarySelect,
  });
}

export async function addSetListToEvent(input: {
  ownerId: string;
  eventId: string;
  setListId: string;
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const eventId = requireId(input.eventId, "eventId");
  const setListId = requireId(input.setListId, "setListId");

  await runSerializableTransaction(async (transaction) => {
    const [event, setList, existingSetList, setListCount, lastSetList] =
      await Promise.all([
        transaction.event.findFirst({
          where: { id: eventId, ownerId },
          select: { id: true },
        }),
        transaction.setList.findFirst({
          where: { id: setListId, ownerId },
          select: { id: true },
        }),
        transaction.eventSetList.findFirst({
          where: { eventId, setListId },
          select: { id: true },
        }),
        transaction.eventSetList.count({ where: { eventId } }),
        transaction.eventSetList.findFirst({
          where: { eventId },
          orderBy: [{ orderNumber: "desc" }, { id: "desc" }],
          select: { orderNumber: true },
        }),
      ]);

    if (!event) {
      throw new EventServiceError("NOT_FOUND", "Event not found.");
    }

    if (!setList) {
      throw new EventServiceError("NOT_FOUND", "Playlist not found.");
    }

    if (existingSetList) {
      throw new EventServiceError(
        "CONFLICT",
        "This playlist is already on the event.",
      );
    }

    if (setListCount >= MAX_EVENT_SETLISTS) {
      throw new EventServiceError(
        "INVALID_INPUT",
        `An event can contain up to ${MAX_EVENT_SETLISTS} playlists.`,
      );
    }

    await transaction.eventSetList.create({
      data: {
        eventId,
        setListId,
        orderNumber: (lastSetList?.orderNumber ?? 0) + 1,
      },
    });
  });
}

export async function removeSetListFromEvent(input: {
  ownerId: string;
  eventId: string;
  eventSetListId: string;
}): Promise<void> {
  const result = await prisma.eventSetList.deleteMany({
    where: {
      id: requireId(input.eventSetListId, "eventSetListId"),
      eventId: requireId(input.eventId, "eventId"),
      event: {
        ownerId: requireId(input.ownerId, "ownerId"),
      },
    },
  });

  if (result.count === 0) {
    throw new EventServiceError("NOT_FOUND", "Event playlist not found.");
  }
}

export async function reorderEventSetLists(input: {
  ownerId: string;
  eventId: string;
  eventSetListIds: string[];
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const eventId = requireId(input.eventId, "eventId");
  const eventSetListIds = requireUniqueIds(input.eventSetListIds);

  await runSerializableTransaction(async (transaction) => {
    const event = await transaction.event.findFirst({
      where: { id: eventId, ownerId },
      select: {
        eventSetLists: {
          orderBy: [{ orderNumber: "asc" }, { id: "asc" }],
          select: { id: true },
        },
      },
    });

    if (!event) {
      throw new EventServiceError("NOT_FOUND", "Event not found.");
    }

    const currentIds = event.eventSetLists.map((setList) => setList.id);
    const currentIdSet = new Set(currentIds);
    const hasExactSetLists =
      currentIds.length === eventSetListIds.length &&
      eventSetListIds.every((id) => currentIdSet.has(id));

    if (!hasExactSetLists) {
      throw new EventServiceError(
        "CONFLICT",
        "The event changed. Refresh and try arranging it again.",
      );
    }

    if (currentIds.every((id, index) => id === eventSetListIds[index])) {
      return;
    }

    await transaction.eventSetList.updateMany({
      where: { eventId },
      data: { orderNumber: { multiply: -1 } },
    });
    await Promise.all(
      eventSetListIds.map((id, index) =>
        transaction.eventSetList.update({
          where: { id },
          data: { orderNumber: index + 1 },
        }),
      ),
    );
    await transaction.event.update({
      where: { id: eventId },
      data: { updatedAt: new Date() },
    });
  });
}

export async function assignGroupToEventSetList(input: {
  ownerId: string;
  eventId: string;
  eventSetListId: string;
  groupId: string | null;
}): Promise<void> {
  const ownerId = requireId(input.ownerId, "ownerId");
  const eventId = requireId(input.eventId, "eventId");
  const eventSetListId = requireId(input.eventSetListId, "eventSetListId");
  const groupId =
    input.groupId === null ? null : requireId(input.groupId, "groupId");

  await runSerializableTransaction(async (transaction) => {
    const eventSetList = await transaction.eventSetList.findFirst({
      where: {
        id: eventSetListId,
        eventId,
        event: { ownerId },
      },
      select: {
        setListId: true,
      },
    });

    if (!eventSetList) {
      throw new EventServiceError("NOT_FOUND", "Event playlist not found.");
    }

    await transaction.eventGroupSetList.deleteMany({
      where: {
        eventId,
        setListId: eventSetList.setListId,
      },
    });

    if (!groupId) {
      await transaction.event.update({
        where: { id: eventId },
        data: { updatedAt: new Date() },
      });
      return;
    }

    const membership = await transaction.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: ownerId,
        },
      },
      select: { groupId: true },
    });

    if (!membership) {
      throw new EventServiceError(
        "FORBIDDEN",
        "You do not have access to this band.",
      );
    }

    const existingEventGroup = await transaction.eventGroups.findUnique({
      where: {
        eventId_groupId: {
          eventId,
          groupId,
        },
      },
      select: { id: true },
    });

    if (!existingEventGroup) {
      const lastGroup = await transaction.eventGroups.findFirst({
        where: { eventId },
        orderBy: [{ orderNumber: "desc" }, { id: "desc" }],
        select: { orderNumber: true },
      });

      await transaction.eventGroups.create({
        data: {
          eventId,
          groupId,
          orderNumber: (lastGroup?.orderNumber ?? 0) + 1,
        },
      });
    }

    await transaction.eventGroupSetList.create({
      data: {
        eventId,
        groupId,
        setListId: eventSetList.setListId,
      },
    });

    await transaction.event.update({
      where: { id: eventId },
      data: { updatedAt: new Date() },
    });
  });
}

function requireId(value: unknown, field: string): string {
  return requireText(value, field, 255);
}

function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new EventServiceError("INVALID_INPUT", `${field} is required.`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue.length > maxLength) {
    throw new EventServiceError(
      "INVALID_INPUT",
      `${field} must be between 1 and ${maxLength} characters.`,
    );
  }

  return normalizedValue;
}

function requireUniqueIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_EVENT_SETLISTS) {
    throw new EventServiceError("INVALID_INPUT", "Playlist order is invalid.");
  }

  const ids = value.map((id) => requireId(id, "eventSetListId"));

  if (new Set(ids).size !== ids.length) {
    throw new EventServiceError("INVALID_INPUT", "Playlist order is invalid.");
  }

  return ids;
}

function optionalText(
  value: string | null | undefined,
  field: string,
  maxLength: number,
): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new EventServiceError("INVALID_INPUT", `${field} is invalid.`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > maxLength) {
    throw new EventServiceError(
      "INVALID_INPUT",
      `${field} must be ${maxLength} characters or less.`,
    );
  }

  return normalizedValue;
}

function requireDate(value: Date, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new EventServiceError("INVALID_INPUT", `${field} is invalid.`);
  }

  return value;
}

function optionalDate(
  value: Date | null | undefined,
  field: string,
): Date | null {
  if (value == null) {
    return null;
  }

  return requireDate(value, field);
}

function optionalCoordinate(
  value: number | null | undefined,
  field: string,
  min: number,
  max: number,
): number | null {
  if (value == null) {
    return null;
  }

  if (!Number.isFinite(value) || value < min || value > max) {
    throw new EventServiceError("INVALID_INPUT", `${field} is invalid.`);
  }

  return value;
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

export const EventService = {
  addSetListToEvent,
  assignGroupToEventSetList,
  createEvent,
  getEventDetailForOwner,
  getEventForOwner,
  getStagePlaylistForOwner,
  listEventsForUser,
  removeSetListFromEvent,
  reorderEventSetLists,
};
