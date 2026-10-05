"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import {
  TrackAnnotationServiceError,
  TrackAudioServiceError,
  TrackDeletionServiceError,
  TrackService,
} from "@/services/track-service";
import type {
  AttachTrackAudioActionInput,
  CreatedTrackAnnotationData,
  CreateTrackAnnotationActionInput,
  SavedTrackData,
  SaveTrackAnnotationActionInput,
  SaveTrackDetailsActionInput,
} from "@/types/track";

type TrackActionData = {
  trackId: string;
};

export async function deleteChordChart(trackId: string): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return actionFailure("UNAUTHENTICATED", "Sign in to delete a chord chart.");
  if (!isTrackId(trackId) || trackId.trim().length > 255) {
    return actionFailure("VALIDATION_ERROR", "The chord chart is invalid.");
  }
  try {
    await TrackService.deleteTrackAsSuperAdmin(userId, trackId.trim());
  } catch (error: unknown) {
    if (!(error instanceof TrackDeletionServiceError)) throw error;
    switch (error.code) {
      case "FORBIDDEN":
        return actionFailure("FORBIDDEN", "Only the verified super-admin account can delete chord charts.");
      case "NOT_FOUND":
        return actionFailure("NOT_FOUND", "Chord chart not found.");
      case "IN_USE":
        return actionFailure("CONFLICT", "This chart is used in a setlist or custom arrangement. Remove those references before deleting it.");
      case "CONFLICT":
        return actionFailure("CONFLICT", "The chart changed while deleting. Refresh the page and try again.");
    }
  }
  revalidatePath(`/track/${trackId.trim()}`, "layout");
  revalidatePath("/annotation");
  revalidatePath("/browse");
  revalidatePath("/");
  return actionSuccess(null);
}

export async function attachAudio(
  input: AttachTrackAudioActionInput,
): Promise<ActionResult<null>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to attach audio.");
  }
  if (
    !isRecord(input) ||
    !isTrackId(input.trackId) ||
    input.trackId.trim().length > 255 ||
    !isTrackId(input.musicFileId) ||
    input.musicFileId.trim().length > 255
  ) {
    return actionFailure("VALIDATION_ERROR", "The audio attachment is invalid.");
  }

  let track: Awaited<ReturnType<typeof TrackService.attachTrackAudio>>;
  try {
    track = await TrackService.attachTrackAudio({
      ownerId: userId,
      trackId: input.trackId.trim(),
      musicFileId: input.musicFileId.trim(),
    });
  } catch (error: unknown) {
    if (!(error instanceof TrackAudioServiceError)) throw error;
    switch (error.code) {
      case "NOT_FOUND":
        return actionFailure("NOT_FOUND", "Track not found.");
      case "ALREADY_ATTACHED":
        return actionFailure(
          "CONFLICT",
          "This track already has audio. Refresh the page.",
        );
      case "AUDIO_UNAVAILABLE":
        return actionFailure(
          "VALIDATION_ERROR",
          "This audio is unavailable or already attached to another track. Upload a separate copy.",
        );
      case "CONFLICT":
        return actionFailure(
          "CONFLICT",
          "Audio changed while attaching. Refresh the page or retry.",
        );
    }
  }

  revalidateCustomArrangement(track.copyForEntry);
  revalidatePath(`/track/${input.trackId.trim()}`);
  revalidatePath(`/track/${input.trackId.trim()}/annotate`);
  revalidatePath("/annotation");
  return actionSuccess(null);
}

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

    revalidateCustomArrangement(track.copyForEntry);
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

    revalidateCustomArrangement(track.copyForEntry);
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

export async function publishAsAdmin(
  trackId: string,
): Promise<ActionResult<TrackActionData>> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return actionFailure("UNAUTHENTICATED", "Sign in to publish this track.");
  }

  if (!isTrackId(trackId)) {
    return actionFailure("VALIDATION_ERROR", "The track is invalid.");
  }

  try {
    const track = await TrackService.publishAdminTrack(userId, trackId);
    return actionSuccess({ trackId: track.id });
  } catch (error: unknown) {
    return handleTrackServiceError(error, "Track not found.");
  }
}

function revalidateCustomArrangement(entry: { id: string; setListId: string } | null): void {
  if (!entry) return;
  revalidatePath(`/setlists/${entry.setListId}`);
  revalidatePath(`/setlists/${entry.setListId}/tracks/${entry.id}`, "layout");
  revalidatePath("/events/[eventId]/playlists/[eventSetListId]/stage", "page");
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

  if (error.code === "FORBIDDEN") {
    return actionFailure("FORBIDDEN", "You cannot publish this track.");
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
