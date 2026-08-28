"use server";

import "server-only";

import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import {
  TrackAnnotationServiceError,
  TrackService,
} from "@/services/track-service";
import type {
  CreatedTrackAnnotationData,
  CreateTrackAnnotationActionInput,
  SavedTrackData,
  SaveTrackAnnotationActionInput,
  SaveTrackDetailsActionInput,
} from "@/types/track";

type TrackActionData = {
  trackId: string;
};

export async function createNew(
  input: CreateTrackAnnotationActionInput,
): Promise<ActionResult<CreatedTrackAnnotationData>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to create an annotation.");
  }

  if (!isCreateInput(input)) {
    return actionFailure(
      "VALIDATION_ERROR",
      "The annotation details are invalid.",
    );
  }

  try {
    const track = await TrackService.createTrackWithAnnotation({
      ...input,
      ownerId: userId,
      key: emptyToNull(input.key),
      timeSignature: emptyToNull(input.timeSignature),
      tuning: emptyToNull(input.tuning),
      youtubeLink: emptyToNull(input.youtubeLink),
      spotifyLink: emptyToNull(input.spotifyLink),
    });

    return actionSuccess({ trackId: track.id });
  } catch (error: unknown) {
    if (!(error instanceof TrackAnnotationServiceError)) {
      throw error;
    }

    return actionFailure("VALIDATION_ERROR", error.message);
  }
}

export async function saveDetails(
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
    const track = await TrackService.saveTrackDetails({
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
    return handleTrackServiceError(error, "Track not found.");
  }
}

export async function saveAnnotation(
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
    const track = await TrackService.saveTrackAnnotation({
      ...input,
      ownerId: userId,
    });

    return actionSuccess({
      updatedAt:
        track.annotation?.updatedAt.toISOString() ?? new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleTrackServiceError(error, "Track not found.");
  }
}

export async function copyPublicAnnotation(
  trackId: string,
): Promise<ActionResult<TrackActionData>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure(
      "UNAUTHENTICATED",
      "Sign in to save this annotation as your own.",
    );
  }

  if (!isTrackId(trackId)) {
    return actionFailure("VALIDATION_ERROR", "The track is invalid.");
  }

  try {
    const track = await TrackService.copyPublicTrackToPersonalLibrary(
      userId,
      trackId,
    );
    return actionSuccess({ trackId: track.id });
  } catch (error: unknown) {
    return handleTrackServiceError(error, "Annotation not found.");
  }
}

export async function submitForReview(
  trackId: string,
): Promise<ActionResult<TrackActionData>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure(
      "UNAUTHENTICATED",
      "Sign in to submit this annotation for review.",
    );
  }

  if (!isTrackId(trackId)) {
    return actionFailure("VALIDATION_ERROR", "The track is invalid.");
  }

  try {
    const track = await TrackService.submitTrackForPublicReview(userId, trackId);
    return actionSuccess({ trackId: track.id });
  } catch (error: unknown) {
    return handleTrackServiceError(error, "Annotation not found.");
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

function handleTrackServiceError<T>(
  error: unknown,
  notFoundMessage: string,
): ActionResult<T> {
  if (!(error instanceof TrackAnnotationServiceError)) {
    throw error;
  }

  if (error.code === "NOT_FOUND") {
    return actionFailure("NOT_FOUND", notFoundMessage);
  }

  return actionFailure("VALIDATION_ERROR", error.message);
}

function isCreateInput(
  value: unknown,
): value is CreateTrackAnnotationActionInput {
  if (!isRecord(value)) {
    return false;
  }

  const stringFields = [
    "title",
    "artistName",
    "key",
    "timeSignature",
    "tuning",
    "youtubeLink",
    "spotifyLink",
    "lyricsAndChords",
    "notes",
  ];

  return (
    stringFields.every((field) => typeof value[field] === "string") &&
    (value.musicFileId === null || typeof value.musicFileId === "string") &&
    isNullableNumber(value.capo) &&
    isNullableNumber(value.tempo) &&
    Array.isArray(value.tags) &&
    Array.isArray(value.additionalArtists)
  );
}

function isTrackDetailsInput(
  value: unknown,
): value is SaveTrackDetailsActionInput {
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

function isTrackId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
