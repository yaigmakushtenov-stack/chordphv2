"use server";

import { headers } from "next/headers";

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/actions";
import { auth } from "@/lib/auth";
import * as NotificationService from "@/services/notification-service";
import type { PushPreferences } from "@/types/notifications";

export async function registerAndroidToken(token: string): Promise<ActionResult<null>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to enable notifications.");
  }
  if (typeof token !== "string" || !/^[\x21-\x7e]{20,4096}$/.test(token)) {
    return actionFailure("VALIDATION_ERROR", "The notification registration is invalid.");
  }
  try {
    await NotificationService.registerAndroidDevice({
      userId: session.user.id,
      sessionId: session.session.id,
      token,
    });
  } catch (error: unknown) {
    if (!(error instanceof NotificationService.NotificationServiceError)) {
      throw error;
    }
    return actionFailure("UNAUTHENTICATED", "Sign in again to enable notifications.");
  }
  return actionSuccess(null);
}

export async function unregisterDevice(): Promise<ActionResult<null>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to manage notifications.");
  }
  await NotificationService.unregisterSessionDevices(session.user.id, session.session.id);
  return actionSuccess(null);
}

export async function savePreferences(input: PushPreferences): Promise<ActionResult<null>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to manage notifications.");
  }
  if (
    typeof input !== "object" || input === null ||
    typeof input.bandInvites !== "boolean" || typeof input.newEvents !== "boolean"
  ) {
    return actionFailure("VALIDATION_ERROR", "The notification preferences are invalid.");
  }
  await NotificationService.savePreferences(session.user.id, {
    bandInvites: input.bandInvites,
    newEvents: input.newEvents,
  });
  return actionSuccess(null);
}
