"use server";

import "server-only";

import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import {
  saveTrackAnnotation,
  TrackAnnotationServiceError,
} from "@/lib/music";

export type SaveTrackAnnotationActionInput = {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  originalKey: string;
  capo: number | null;
  tempo: number | null;
  timeSignature: string;
  tuning: string;
  lyricsAndChords: string;
  notes: string;
};

export type SavedTrackAnnotationData = {
  updatedAt: string;
};

export async function saveTrackAnnotationAction(
  input: SaveTrackAnnotationActionInput,
): Promise<ActionResult<SavedTrackAnnotationData>> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to annotate this track.");
  }

  if (!isSaveInput(input)) {
    return actionFailure("VALIDATION_ERROR", "The annotation details are invalid.");
  }

  try {
    const track = await saveTrackAnnotation({
      ...input,
      ownerId: session.user.id,
      artist: emptyToNull(input.artist),
      album: emptyToNull(input.album),
      originalKey: emptyToNull(input.originalKey),
      timeSignature: emptyToNull(input.timeSignature),
      tuning: emptyToNull(input.tuning),
    });

    return actionSuccess({
      updatedAt: track.annotation?.updatedAt.toISOString() ?? new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (!(error instanceof TrackAnnotationServiceError)) {
      throw error;
    }

    if (error.code === "NOT_FOUND") {
      return actionFailure("NOT_FOUND", "Track not found.");
    }

    return actionFailure("VALIDATION_ERROR", error.message);
  }
}

function isSaveInput(value: unknown): value is SaveTrackAnnotationActionInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Record<string, unknown>;
  const stringFields = [
    "trackId",
    "title",
    "artist",
    "album",
    "originalKey",
    "timeSignature",
    "tuning",
    "lyricsAndChords",
    "notes",
  ];

  return (
    stringFields.every((field) => typeof input[field] === "string") &&
    isNullableNumber(input.capo) &&
    isNullableNumber(input.tempo)
  );
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function emptyToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}
