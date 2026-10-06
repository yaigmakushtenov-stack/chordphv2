"use client";

import { useState } from "react";
import * as OfflineActions from "@/actions/offline-actions";
import { useOfflineAccount } from "./offline-account-provider";
import { offlineMenuActionClass } from "./save-chart-offline";
import { showToast } from "@/components/shared/toast";
import { saveOfflineDownload } from "@/lib/client/offline-store";
import { OfflineSetupError, prepareOfflineReader } from "@/lib/client/offline-worker";
import type { OfflineSetListRequest } from "@/types/offline";

export function SaveSetListOffline({ request, onSaved }: { request: OfflineSetListRequest; onSaved?: () => void }) {
  const accountId = useOfflineAccount();
  const [pending, setPending] = useState(false);
  if (!accountId) return null;

  async function save(): Promise<void> {
    setPending(true);
    try {
      await prepareOfflineReader();
      const result = await OfflineActions.downloadSetList(request);
      if (!result.ok) { showToast({ title: "Setlist not saved", description: result.error.message, tone: "error" }); return; }
      if (result.data.accountId !== accountId) { showToast({ title: "Setlist not saved", description: "Your account changed. Reload before saving.", tone: "error" }); return; }
      await saveOfflineDownload(result.data.accountId, result.data.download);
      const unavailable = result.data.download.songs.filter((song) => !song.chart).length;
      showToast({ title: "Setlist saved offline", description: unavailable ? `${unavailable} unavailable song(s) could not be downloaded.` : "Setlist and charts are available in your Offline library.", tone: unavailable ? "info" : "success" });
      onSaved?.();
    } catch (error: unknown) {
      showToast({ title: "Setlist not saved", description: error instanceof OfflineSetupError ? error.message : "Check your connection and available browser storage, then retry.", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return <button type="button" disabled={pending} onClick={() => void save()} className={offlineMenuActionClass}>{pending ? "Saving…" : "Save offline"}</button>;
}
