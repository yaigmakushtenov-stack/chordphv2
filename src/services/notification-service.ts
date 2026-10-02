import "server-only";

import { randomUUID } from "node:crypto";
import type { Message } from "firebase-admin/messaging";

import {
  NotificationType,
  GroupMembershipStatus,
  Prisma,
  PushDeliveryStatus,
} from "@/generated/prisma/client";
import { getPushMessaging } from "@/lib/notifications/firebase-admin";
import prisma from "@/lib/prisma";
import type { PushPreferences } from "@/types/notifications";

const MAX_ATTEMPTS = 5;
const DELIVERY_WINDOW_MS = 24 * 60 * 60 * 1_000;
const LEASE_MS = 5 * 60 * 1_000;
const CHANNEL_ID = "band_activity";
const TRANSIENT_CODES = new Set([
  "messaging/server-unavailable",
  "messaging/internal-error",
  "messaging/quota-exceeded",
  "messaging/message-rate-exceeded",
  "messaging/device-message-rate-exceeded",
  "app/network-error",
  "app/network-timeout",
]);
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

export async function registerAndroidDevice(input: {
  userId: string;
  sessionId: string;
  token: string;
}): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (transaction) => {
        const session = await transaction.betterAuthSession.findFirst({
          where: {
            id: input.sessionId,
            userId: input.userId,
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        });

        if (!session) {
          throw new NotificationServiceError("UNAUTHENTICATED");
        }

        await transaction.pushDevice.deleteMany({
          where: {
            OR: [
              { sessionId: input.sessionId, token: { not: input.token } },
              {
                token: input.token,
                OR: [{ userId: { not: input.userId } }, { sessionId: { not: input.sessionId } }],
              },
            ],
          },
        });
        await transaction.pushDevice.upsert({
          where: { token: input.token },
          create: input,
          update: { lastSeenAt: new Date() },
          select: { id: true },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (error: unknown) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002")
      ) {
        continue;
      }
      throw error;
    }
  }
}

export class NotificationServiceError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED") {
    super("The notification session is no longer active.");
    this.name = "NotificationServiceError";
  }
}

export async function unregisterSessionDevices(
  userId: string,
  sessionId: string,
): Promise<void> {
  await prisma.pushDevice.deleteMany({ where: { userId, sessionId } });
}

export async function getPreferences(userId: string): Promise<PushPreferences> {
  return await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { bandInvites: true, newEvents: true },
  }) ?? { bandInvites: true, newEvents: true };
}

export async function savePreferences(
  userId: string,
  preferences: PushPreferences,
): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...preferences },
    update: preferences,
    select: { userId: true },
  });
}

export async function queueNotifications(
  transaction: Prisma.TransactionClient,
  input: {
    userIds: string[];
    groupId: string;
    eventId?: string;
    type: NotificationType;
    title: string;
    body: string;
    href: string;
  },
): Promise<void> {
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) {
    return;
  }

  const notifications = await transaction.notification.createManyAndReturn({
    data: userIds.map((userId) => ({
      userId,
      groupId: input.groupId,
      eventId: input.eventId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    })),
    select: { id: true, userId: true },
  });
  const preference = input.type === NotificationType.BAND_ADDED
    ? { bandInvites: true }
    : { newEvents: true };
  const devices = await transaction.pushDevice.findMany({
    where: {
      userId: { in: userIds },
      session: { expiresAt: { gt: new Date() } },
      user: {
        OR: [
          { notificationPreferences: { is: null } },
          { notificationPreferences: { is: preference } },
        ],
      },
    },
    select: { id: true, userId: true },
  });
  const notificationIds = new Map(notifications.map((item) => [item.userId, item.id]));
  if (devices.length > 0) {
    await transaction.pushDelivery.createMany({
      data: devices.map((device) => ({
        deviceId: device.id,
        notificationId: notificationIds.get(device.userId)!,
      })),
    });
  }
}

export type DispatchResult = {
  configured: boolean;
  processed: number;
  sent: number;
};

export async function dispatchPendingNotifications(): Promise<DispatchResult> {
  const messaging = getPushMessaging();
  if (!messaging) {
    return { configured: false, processed: 0, sent: 0 };
  }

  const now = new Date();
  const leaseId = randomUUID();
  const availableLease = {
    OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
  };
  await prisma.pushDelivery.updateMany({
    where: {
      status: PushDeliveryStatus.PENDING,
      OR: [
        { attempts: { gte: MAX_ATTEMPTS } },
        { notification: { createdAt: { lte: new Date(now.getTime() - DELIVERY_WINDOW_MS) } } },
      ],
      AND: [availableLease],
    },
    data: {
      status: PushDeliveryStatus.FAILED,
      errorCode: "DELIVERY_EXPIRED",
      leaseId: null,
      leaseUntil: null,
    },
  });
  const eligible = {
    status: PushDeliveryStatus.PENDING,
    attempts: { lt: MAX_ATTEMPTS },
    nextAttemptAt: { lte: now },
    notification: { createdAt: { gt: new Date(now.getTime() - DELIVERY_WINDOW_MS) } },
    ...availableLease,
  } satisfies Prisma.PushDeliveryWhereInput;
  const candidates = await prisma.pushDelivery.findMany({
    where: eligible,
    orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
    take: 100,
    select: { id: true },
  });
  if (candidates.length === 0) {
    return { configured: true, processed: 0, sent: 0 };
  }

  await prisma.pushDelivery.updateMany({
    where: { ...eligible, id: { in: candidates.map((item) => item.id) } },
    data: {
      leaseId,
      leaseUntil: new Date(now.getTime() + LEASE_MS),
      attempts: { increment: 1 },
    },
  });
  const deliveries = await prisma.pushDelivery.findMany({
    where: { leaseId, status: PushDeliveryStatus.PENDING },
    select: {
      id: true,
      attempts: true,
      notification: {
        select: {
          id: true,
          userId: true,
          groupId: true,
          title: true,
          body: true,
          href: true,
          type: true,
          createdAt: true,
        },
      },
      device: {
        select: {
          id: true,
          token: true,
          userId: true,
          session: { select: { userId: true, expiresAt: true } },
          user: {
            select: {
              notificationPreferences: { select: { bandInvites: true, newEvents: true } },
            },
          },
        },
      },
    },
  });
  const memberships = deliveries.length > 0 ? await prisma.groupMembership.findMany({
    where: {
      status: GroupMembershipStatus.ACCEPTED,
      OR: deliveries.map(({ notification }) => ({ groupId: notification.groupId, userId: notification.userId })),
    },
    select: { groupId: true, userId: true },
  }) : [];
  const acceptedMemberships = new Set(memberships.map((membership) => `${membership.groupId}:${membership.userId}`));
  const active = deliveries.filter(({ notification, device }) => {
    const preferences = device.user.notificationPreferences;
    return device.userId === notification.userId &&
      acceptedMemberships.has(`${notification.groupId}:${notification.userId}`) &&
      device.session.userId === notification.userId &&
      device.session.expiresAt > new Date() &&
      (notification.type === NotificationType.BAND_ADDED
        ? preferences?.bandInvites !== false
        : preferences?.newEvents !== false);
  });
  const activeIds = new Set(active.map((item) => item.id));
  await prisma.pushDelivery.updateMany({
    where: { leaseId, id: { in: deliveries.filter((item) => !activeIds.has(item.id)).map((item) => item.id) } },
    data: { status: PushDeliveryStatus.CANCELLED, leaseId: null, leaseUntil: null },
  });
  if (active.length === 0) {
    return { configured: true, processed: deliveries.length, sent: 0 };
  }

  const messages: Message[] = active.map(({ device, notification }) => ({
    token: device.token,
    notification: { title: notification.title, body: notification.body },
    data: {
      notificationId: notification.id,
      href: notification.href,
      type: notification.type,
      recipientId: notification.userId,
    },
    android: {
      priority: "high",
      ttl: Math.max(0, DELIVERY_WINDOW_MS - (Date.now() - notification.createdAt.getTime())),
      notification: {
        channelId: CHANNEL_ID,
        icon: "ic_stat_notification",
        color: "#ed1746",
        tag: notification.id,
        visibility: "private",
      },
    },
  }));

  let outcomes: { success: boolean; code: string | null }[];
  try {
    const response = await messaging.sendEach(messages);
    outcomes = response.responses.map((item) => ({ success: item.success, code: item.error?.code ?? null }));
  } catch (error: unknown) {
    const code = providerErrorCode(error);
    if (!TRANSIENT_CODES.has(code)) {
      throw error;
    }
    outcomes = active.map(() => ({ success: false, code }));
  }

  const groups = new Map<string, { ids: string[]; data: Prisma.PushDeliveryUpdateManyMutationInput }>();
  const invalidDevices: { id: string; token: string }[] = [];
  let sent = 0;
  outcomes.forEach((outcome, index) => {
    const delivery = active[index];
    const retry = !outcome.success && TRANSIENT_CODES.has(outcome.code ?? "") && delivery.attempts < MAX_ATTEMPTS;
    const status = outcome.success
      ? PushDeliveryStatus.SENT
      : retry ? PushDeliveryStatus.PENDING : PushDeliveryStatus.FAILED;
    const nextAttemptAt = new Date(now.getTime() + Math.min(60 * 60 * 1_000, 60_000 * 2 ** (delivery.attempts - 1)));
    const key = `${status}:${outcome.code}:${retry ? delivery.attempts : 0}`;
    const group = groups.get(key) ?? {
      ids: [],
      data: {
        status,
        leaseId: null,
        leaseUntil: null,
        errorCode: outcome.code,
        ...(outcome.success ? { sentAt: new Date() } : {}),
        ...(retry ? { nextAttemptAt } : {}),
      },
    };
    group.ids.push(delivery.id);
    groups.set(key, group);
    if (outcome.success) {
      sent += 1;
    } else if (INVALID_TOKEN_CODES.has(outcome.code ?? "")) {
      invalidDevices.push({ id: delivery.device.id, token: delivery.device.token });
    }
  });
  await prisma.$transaction([
    ...[...groups.values()].map((group) => prisma.pushDelivery.updateMany({
      where: { leaseId, id: { in: group.ids } },
      data: group.data,
    })),
    ...(invalidDevices.length > 0 ? [prisma.pushDevice.deleteMany({ where: { OR: invalidDevices } })] : []),
  ]);
  return { configured: true, processed: deliveries.length, sent };
}

export async function dispatchAfterMutation(): Promise<void> {
  try {
    const result = await dispatchPendingNotifications();
    if (!result.configured) {
      console.warn("Android push delivery is waiting for Firebase server configuration.");
    }
  } catch (error: unknown) {
    console.error("Android push delivery did not complete; pending deliveries remain queued.", {
      incidentId: randomUUID(),
      code: providerErrorCode(error),
    });
  }
}

function providerErrorCode(error: unknown): string {
  if (
    typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" && /^(messaging|app)\/[a-z-]+$/.test(error.code)
  ) {
    return error.code;
  }
  return "UNEXPECTED_ERROR";
}
