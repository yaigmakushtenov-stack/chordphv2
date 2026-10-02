"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { bindAndroidPush } from "@/lib/client/android-push";

type AndroidPushRegistrationProps = {
  userId: string;
  sessionId: string;
};

export function AndroidPushRegistration({ userId, sessionId }: AndroidPushRegistrationProps) {
  const router = useRouter();

  useEffect(() => bindAndroidPush(userId, sessionId, (href) => router.push(href)), [userId, sessionId, router]);

  return null;
}
