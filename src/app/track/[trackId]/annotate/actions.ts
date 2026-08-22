"use server";

import "server-only";

import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import {
  saveTrackAnnotation,
  saveTrackDetails,
  TrackAnnotationServiceError,
} from "@/lib/music";
import type {
  SavedTrackData,
  SaveTrackAnnotationActionInput,
  SaveTrackDetailsActionInput,
} from "@/types/track";

export async function saveTrackDetailsAction(
  input: SaveTrackDetailsActionInput,
): Promise<ActionResult<SavedTrackData>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to update this track.");
  }

  if (!isTrackDetailsInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The track details are invalid.");
  }

  try {
    const track = await saveTrackDetails({
      ...input,
      ownerId: userId,
      key: emptyToNull(input.key),
      timeSignature: emptyToNull(input.timeSignature),
      tuning: emptyToNull(input.tuning),
      youtubeLink: emptyToNull(input.youtubeLink),
      spotifyLink: emptyToNull(input.spotifyLink),
    });

    return actionSuccess({ updatedAt: track.updatedAt.toISOString() });
  } catch (error: unknown) {
    return handleTrackServiceError(error);
  }
}

export async function saveTrackAnnotationAction(
  input: SaveTrackAnnotationActionInput,
): Promise<ActionResult<SavedTrackData>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to annotate this track.");
  }

  if (!isTrackAnnotationInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The annotation is invalid.");
  }

  try {
    const track = await saveTrackAnnotation({
      ...input,
      ownerId: userId,
    });

    return actionSuccess({
      updatedAt: track.annotation?.updatedAt.toISOString() ?? new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleTrackServiceError(error);
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

function handleTrackServiceError<T>(error: unknown): ActionResult<T> {
  if (!(error instanceof TrackAnnotationServiceError)) {
    throw error;
  }

  if (error.code === "NOT_FOUND") {
    return actionFailure("NOT_FOUND", "Track not found.");
  }

  return actionFailure("VALIDATION_ERROR", error.message);
}

function isTrackDetailsInput(value: unknown): value is SaveTrackDetailsActionInput {
  if (!isRecord(value)) {
    return false;
  }

  const stringFields = [
    "trackId",
    "title",
    "artistName",
    "key",
    "timeSignature",
    "tuning",
    "youtubeLink",
    "spotifyLink",
  ];

  return (
    stringFields.every((field) => typeof value[field] === "string") &&
    isNullableNumber(value.capo) &&
    isNullableNumber(value.tempo) &&
    Array.isArray(value.tags) &&
    Array.isArray(value.additionalArtists)
  );
}

function isTrackAnnotationInput(
  value: unknown,
): value is SaveTrackAnnotationActionInput {
  return (
    isRecord(value) &&
    typeof value.trackId === "string" &&
    typeof value.lyricsAndChords === "string" &&
    typeof value.notes === "string"
  );
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function emptyToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
