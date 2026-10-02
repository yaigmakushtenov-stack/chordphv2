"use client";

import { authClient } from "@/lib/auth-client";

export function SessionRefresh(): null {
  authClient.useSession();

  return null;
}
