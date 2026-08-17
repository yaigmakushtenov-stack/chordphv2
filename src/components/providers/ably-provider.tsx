"use client";

import type { Realtime } from "ably";
import { AblyProvider as AblyReactProvider } from "ably/react";
import { type ReactNode, useEffect, useState } from "react";

type AblyProviderProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export function AblyProvider({ children, fallback = null }: AblyProviderProps) {
  const [client, setClient] = useState<Realtime>();

  useEffect(() => {
    let cancelled = false;
    let realtime: Realtime | undefined;

    void import("ably").then(({ Realtime }) => {
      if (cancelled) {
        return;
      }

      realtime = new Realtime({
        authUrl: "/api/ably/token",
        authMethod: "GET",
        echoMessages: false,
      });

      setClient(realtime);
    });

    return () => {
      cancelled = true;
      realtime?.close();
    };
  }, []);

  if (!client) {
    return fallback;
  }

  return <AblyReactProvider client={client}>{children}</AblyReactProvider>;
}
