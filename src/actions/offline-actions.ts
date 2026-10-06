"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { getOfflineSetList } from "@/services/offline-service";
import type { OfflineDownload, OfflineSetListRequest } from "@/types/offline";

export async function downloadSetList(input: OfflineSetListRequest): Promise<ActionResult<{ accountId: string; download: OfflineDownload }>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return actionFailure("UNAUTHENTICATED", "Sign in to download a setlist.");
  if (!input || (input.kind !== "personal" && input.kind !== "band") || typeof input.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.id)) {
    return actionFailure("VALIDATION_ERROR", "Choose a valid setlist.");
  }
  const download = await getOfflineSetList(session.user.id, input);
  if (!download) return actionFailure("NOT_FOUND", "This setlist is unavailable or has more than 200 songs.");
  return actionSuccess({ accountId: session.user.id, download });
}
