"use server";

import "server-only";

import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import {
  copyPublicTrackToPersonalLibrary,
  submitTrackForPublicReview,
  TrackAnnotationServiceError,
} from "@/lib/music";

type TrackActionData = {
  trackId: string;
};

export async function copyPublicAnnotationAction(
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
    const track = await copyPublicTrackToPersonalLibrary(userId, trackId);
    return actionSuccess({ trackId: track.id });
  } catch (error: unknown) {
    return handleTrackServiceError(error);
  }
}

export async function submitAnnotationForReviewAction(
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
    const track = await submitTrackForPublicReview(userId, trackId);
    return actionSuccess({ trackId: track.id });
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
    return actionFailure("NOT_FOUND", "Annotation not found.");
  }

  return actionFailure("VALIDATION_ERROR", error.message);
}

function isTrackId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
