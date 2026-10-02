"use server";

import "server-only";

import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { MediaLinkService } from "@/services/media-link-service";
import type {
  MediaLinkSearchInput,
  MediaLinkSearchResult,
} from "@/types/media-link";

const MAX_SEARCH_FIELD_LENGTH = 200;

export async function findForTrack(
  input: MediaLinkSearchInput,
): Promise<ActionResult<MediaLinkSearchResult>> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to find media links.");
  }

  if (!isMediaLinkSearchInput(input)) {
    return actionFailure(
      "VALIDATION_ERROR",
      "Add a valid song title and primary artist first.",
    );
  }

  const result = await MediaLinkService.findMediaLinks({
    artistName: input.artistName.trim(),
    title: input.title.trim(),
  });

  return actionSuccess(result);
}

function isMediaLinkSearchInput(value: unknown): value is MediaLinkSearchInput {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isSearchField(value.title) &&
    isSearchField(value.artistName)
  );
}

function isSearchField(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= MAX_SEARCH_FIELD_LENGTH
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
