"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setOfflineAccount } from "@/lib/client/offline-store";

const OfflineAccountContext = createContext<string | null>(null);

export function OfflineAccountProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [readyAccount, setReadyAccount] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setOfflineAccount(userId).then(() => {
      if (!cancelled) setReadyAccount(userId);
    }).catch(() => {
      if (!cancelled) setReadyAccount(null);
    });
    return () => { cancelled = true; };
  }, [userId]);
  return <OfflineAccountContext.Provider value={readyAccount === userId ? readyAccount : null}>{children}</OfflineAccountContext.Provider>;
}

export function useOfflineAccount(): string | null {
  return useContext(OfflineAccountContext);
}
