import "server-only";

import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const MAX_EVENT_TITLE_LENGTH = 120;
const MAX_EVENT_DESCRIPTION_LENGTH = 1_000;
const MAX_LOCATION_TEXT_LENGTH = 255;
const MAX_TIMEZONE_LENGTH = 100;

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

export type EventSummaryRecord = Prisma.EventGetPayload<{
  select: typeof eventSummarySelect;
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
    public readonly code: "INVALID_INPUT" | "NOT_FOUND" | "FORBIDDEN",
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

function requireText(value: string, field: string, maxLength: number): string {
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

export const EventService = {
  createEvent,
  getEventForOwner,
  listEventsForUser,
};
