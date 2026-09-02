"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { EventService, EventServiceError } from "@/services/event-service";

export type CreateEventActionInput = {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  place: string;
  timezone?: string;
  locationAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type EventIdData = {
  eventId: string;
};

export async function createNew(
  input: CreateEventActionInput,
): Promise<ActionResult<EventIdData>> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to create an event.");
  }

  if (!isCreateEventActionInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The event details are invalid.");
  }

  const startDate = new Date(input.startDate);
  const endDate = input.endDate ? new Date(input.endDate) : null;

  try {
    const event = await EventService.createEvent({
      ownerId: session.user.id,
      title: input.title,
      description: input.description,
      startDate,
      endDate,
      place: input.place,
      timezone: input.timezone,
      locationAddress: input.locationAddress,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    revalidatePath("/events");
    return actionSuccess({ eventId: event.id });
  } catch (error: unknown) {
    if (!(error instanceof EventServiceError)) {
      throw error;
    }

    if (error.code === "NOT_FOUND") {
      return actionFailure("NOT_FOUND", error.message);
    }

    if (error.code === "FORBIDDEN") {
      return actionFailure("FORBIDDEN", error.message);
    }

    return actionFailure("VALIDATION_ERROR", error.message);
  }
}

function isCreateEventActionInput(
  value: unknown,
): value is CreateEventActionInput {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.startDate === "string" &&
    typeof value.place === "string" &&
    optionalString(value.description) &&
    optionalString(value.endDate) &&
    optionalString(value.timezone) &&
    optionalString(value.locationAddress) &&
    optionalNumberOrNull(value.latitude) &&
    optionalNumberOrNull(value.longitude)
  );
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function optionalNumberOrNull(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
