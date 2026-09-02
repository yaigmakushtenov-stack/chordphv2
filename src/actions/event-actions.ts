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

export type ReorderEventSetListsInput = {
  eventId: string;
  eventSetListIds: string[];
};

export type AssignEventSetListGroupInput = {
  eventId: string;
  eventSetListId: string;
  groupId: string | null;
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

export async function addSetList(
  eventId: string,
  setListId: string,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this event.");
  }

  if (!isId(eventId) || !isId(setListId)) {
    return actionFailure("VALIDATION_ERROR", "The selected playlist is invalid.");
  }

  try {
    await EventService.addSetListToEvent({
      ownerId: userId,
      eventId,
      setListId,
    });
    revalidateEvent(eventId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleEventServiceError(error);
  }
}

export async function removeSetList(
  eventId: string,
  eventSetListId: string,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this event.");
  }

  if (!isId(eventId) || !isId(eventSetListId)) {
    return actionFailure("VALIDATION_ERROR", "The selected playlist is invalid.");
  }

  try {
    await EventService.removeSetListFromEvent({
      ownerId: userId,
      eventId,
      eventSetListId,
    });
    revalidateEvent(eventId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleEventServiceError(error);
  }
}

export async function reorderSetLists(
  input: ReorderEventSetListsInput,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this event.");
  }

  if (!isReorderEventSetListsInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The playlist order is invalid.");
  }

  try {
    await EventService.reorderEventSetLists({
      ownerId: userId,
      eventId: input.eventId,
      eventSetListIds: input.eventSetListIds,
    });
    revalidateEvent(input.eventId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleEventServiceError(error);
  }
}

export async function assignSetListGroup(
  input: AssignEventSetListGroupInput,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this event.");
  }

  if (!isAssignEventSetListGroupInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The selected band is invalid.");
  }

  try {
    await EventService.assignGroupToEventSetList({
      ownerId: userId,
      eventId: input.eventId,
      eventSetListId: input.eventSetListId,
      groupId: input.groupId,
    });
    revalidateEvent(input.eventId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleEventServiceError(error);
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

function revalidateEvent(eventId: string): void {
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

function handleEventServiceError<T>(error: unknown): ActionResult<T> {
  if (!(error instanceof EventServiceError)) {
    throw error;
  }

  if (error.code === "NOT_FOUND") {
    return actionFailure("NOT_FOUND", error.message);
  }

  if (error.code === "FORBIDDEN") {
    return actionFailure("FORBIDDEN", error.message);
  }

  if (error.code === "CONFLICT") {
    return actionFailure("CONFLICT", error.message);
  }

  return actionFailure("VALIDATION_ERROR", error.message);
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

function isReorderEventSetListsInput(
  value: unknown,
): value is ReorderEventSetListsInput {
  return (
    isRecord(value) &&
    isId(value.eventId) &&
    Array.isArray(value.eventSetListIds) &&
    value.eventSetListIds.every(isId)
  );
}

function isAssignEventSetListGroupInput(
  value: unknown,
): value is AssignEventSetListGroupInput {
  return (
    isRecord(value) &&
    isId(value.eventId) &&
    isId(value.eventSetListId) &&
    (value.groupId === null || isId(value.groupId))
  );
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function optionalNumberOrNull(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "number";
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
