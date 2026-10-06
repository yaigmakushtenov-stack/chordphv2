"use client";

import { useState } from "react";
import { showToast } from "@/components/shared/toast";
import { useOfflineAccount } from "@/components/shared/offline/offline-account-provider";
import { saveOfflineDownload } from "@/lib/client/offline-store";
import { OfflineSetupError, prepareOfflineReader } from "@/lib/client/offline-worker";
import type { OfflineChart } from "@/types/offline";

export const offlineButtonClass = "inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#dedede] bg-white px-3 py-2 text-[12px] font-bold text-[#444] transition hover:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-wait disabled:opacity-50 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#d4d4d8] dark:hover:border-[#ed1746]";
export const offlineMenuActionClass = "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-wait disabled:opacity-50 dark:hover:bg-[#343438]";

export function SaveChartOffline({ chart, updatedAt, onSaved }: { chart: OfflineChart; updatedAt: string; onSaved?: () => void }) {
  const accountId = useOfflineAccount();
  const [pending, setPending] = useState(false);
  if (!accountId) return null;

  async function save(): Promise<void> {
    if (!accountId) return;
    setPending(true);
    try {
      await prepareOfflineReader();
      await saveOfflineDownload(accountId, {
        id: `chart:${chart.href}`, kind: "chart", href: chart.href, title: chart.title,
        subtitle: chart.artistName, updatedAt, savedAt: new Date().toISOString(),
        songs: [{ id: chart.id, chart }],
      });
      showToast({ title: "Chart saved offline", description: "Available in your Offline library on this device.", tone: "success" });
      onSaved?.();
    } catch (error: unknown) {
      showToast({ title: "Chart not saved", description: error instanceof OfflineSetupError ? error.message : "Check your connection and available browser storage, then retry.", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return <button type="button" disabled={pending} onClick={() => void save()} className={offlineMenuActionClass}>{pending ? "Saving…" : "Save offline"}</button>;
}
