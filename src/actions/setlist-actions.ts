"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { parseSetListTrackArrangement } from "@/lib/setlists/setlist-track-settings";
import {
  SetListService,
  SetListServiceError,
} from "@/services/setlist-service";
import type {
  MoveSetListTrackInput,
  CopySetListTrackArrangementInput,
  ReorderSetListTracksInput,
  SaveSetListTrackArrangementInput,
  SetListDetailsInput,
  UpdateSetListDetailsInput,
} from "@/types/setlist";

type SetListIdData = {
  setListId: string;
};

export async function createNew(
  input: SetListDetailsInput,
): Promise<ActionResult<SetListIdData>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to create a setlist.");
  }

  if (!isSetListDetailsInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The setlist details are invalid.");
  }

  try {
    const setList = await SetListService.createSetList({
      ...input,
      ownerId: userId,
    });
    revalidatePath("/setlists");
    return actionSuccess({ setListId: setList.id });
  } catch (error: unknown) {
    return handleSetListServiceError(error);
  }
}

export async function saveDetails(
  input: UpdateSetListDetailsInput,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this setlist.");
  }

  if (!isUpdateSetListDetailsInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The setlist details are invalid.");
  }

  try {
    await SetListService.updateSetListDetails({ ...input, ownerId: userId });
    revalidateSetList(input.setListId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleSetListServiceError(error);
  }
}

export async function deleteSetList(
  setListId: string,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to delete this setlist.");
  }

  if (!isId(setListId)) {
    return actionFailure("VALIDATION_ERROR", "The selected setlist is invalid.");
  }

  try {
    await SetListService.deleteSetList({ ownerId: userId, setListId });
    revalidatePath("/setlists");
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleSetListServiceError(error);
  }
}

export async function addTrack(
  setListId: string,
  trackId: string,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this setlist.");
  }

  if (!isId(setListId) || !isId(trackId)) {
    return actionFailure("VALIDATION_ERROR", "The selected track is invalid.");
  }

  try {
    await SetListService.addTrackToSetList({
      ownerId: userId,
      setListId,
      trackId,
    });
    revalidateSetList(setListId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleSetListServiceError(error);
  }
}

export async function removeTrack(
  setListId: string,
  setListTrackId: string,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this setlist.");
  }

  if (!isId(setListId) || !isId(setListTrackId)) {
    return actionFailure("VALIDATION_ERROR", "The selected track is invalid.");
  }

  try {
    await SetListService.removeTrackFromSetList({
      ownerId: userId,
      setListId,
      setListTrackId,
    });
    revalidateSetList(setListId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleSetListServiceError(error);
  }
}

export async function moveTrack(
  input: MoveSetListTrackInput,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this setlist.");
  }

  if (!isMoveSetListTrackInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The track move is invalid.");
  }

  try {
    await SetListService.moveSetListTrack({ ...input, ownerId: userId });
    revalidateSetList(input.setListId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleSetListServiceError(error);
  }
}

export async function reorderTracks(
  input: ReorderSetListTracksInput,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this setlist.");
  }

  if (!isReorderSetListTracksInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The track order is invalid.");
  }

  try {
    await SetListService.reorderSetListTracks({ ...input, ownerId: userId });
    revalidateSetList(input.setListId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleSetListServiceError(error);
  }
}

export async function saveTrackArrangement(
  input: SaveSetListTrackArrangementInput,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this arrangement.");
  }

  const arrangement = parseSetListTrackArrangement({
    arrangement: input?.arrangement,
  });

  if (
    !input ||
    !isId(input.setListId) ||
    !isId(input.setListTrackId) ||
    !arrangement
  ) {
    return actionFailure("VALIDATION_ERROR", "The arrangement details are invalid.");
  }

  try {
    await SetListService.saveSetListTrackArrangement({
      ownerId: userId,
      setListId: input.setListId,
      setListTrackId: input.setListTrackId,
      arrangement,
    });
    revalidateSetList(input.setListId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleSetListServiceError(error);
  }
}

export async function copyTrackArrangement(
  input: CopySetListTrackArrangementInput,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to copy this arrangement.");
  }

  if (
    !input ||
    !isId(input.sourceSetListId) ||
    !isId(input.sourceSetListTrackId) ||
    !isId(input.targetSetListId)
  ) {
    return actionFailure("VALIDATION_ERROR", "The selected arrangement is invalid.");
  }

  try {
    await SetListService.copySetListTrackArrangement({
      ownerId: userId,
      ...input,
    });
    revalidateSetList(input.targetSetListId);
    return actionSuccess(null);
  } catch (error: unknown) {
    return handleSetListServiceError(error);
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

function revalidateSetList(setListId: string): void {
  revalidatePath("/setlists");
  revalidatePath(`/setlists/${setListId}`);
}

function handleSetListServiceError<T>(error: unknown): ActionResult<T> {
  if (!(error instanceof SetListServiceError)) {
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

function isSetListDetailsInput(value: unknown): value is SetListDetailsInput {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.description === "string"
  );
}

function isUpdateSetListDetailsInput(
  value: unknown,
): value is UpdateSetListDetailsInput {
  return (
    isRecord(value) &&
    isId(value.setListId) &&
    typeof value.title === "string" &&
    typeof value.description === "string"
  );
}

function isMoveSetListTrackInput(
  value: unknown,
): value is MoveSetListTrackInput {
  return (
    isRecord(value) &&
    isId(value.setListId) &&
    isId(value.setListTrackId) &&
    (value.direction === "up" || value.direction === "down")
  );
}

function isReorderSetListTracksInput(
  value: unknown,
): value is ReorderSetListTracksInput {
  return (
    isRecord(value) &&
    isId(value.setListId) &&
    Array.isArray(value.setListTrackIds) &&
    value.setListTrackIds.every(isId)
  );
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
