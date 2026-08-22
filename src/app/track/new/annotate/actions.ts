"use server";

import "server-only";

import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import {
  createTrackWithAnnotation,
  TrackAnnotationServiceError,
} from "@/lib/music";
import type {
  CreatedTrackAnnotationData,
  CreateTrackAnnotationActionInput,
} from "@/types/track";

export async function createTrackAnnotationAction(
  input: CreateTrackAnnotationActionInput,
): Promise<ActionResult<CreatedTrackAnnotationData>> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to create an annotation.");
  }

  if (!isCreateInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The annotation details are invalid.");
  }

  try {
    const track = await createTrackWithAnnotation({
      ...input,
      ownerId: session.user.id,
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

function isCreateInput(value: unknown): value is CreateTrackAnnotationActionInput {
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
