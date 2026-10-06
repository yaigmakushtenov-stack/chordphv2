"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppMenuProvider, LeftLibraryPanel, MobileMenuButton } from "@/components/shared/app-shell/left-library-panel";
import { ScreenWakeLock } from "@/components/shared/screen-wake-lock";
import { StageView } from "@/app/events/_components/stage-view";
import { createOfflineStagePlaylist } from "@/lib/client/offline-stage";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { offlineButtonClass } from "@/components/shared/offline/save-chart-offline";
import { authClient } from "@/lib/auth-client";
import { OFFLINE_CHANGE_EVENT, readOfflineState, removeOfflineDownload, saveOfflineEdits, setOfflineAccount } from "@/lib/client/offline-store";
import type { OfflineDownload } from "@/types/offline";
import { OfflineChart } from "./offline-chart";
import { OfflineOptions } from "./offline-options";
import { OfflineEditDialog } from "./offline-edit-dialog";

export function OfflineLibrary() {
  const mainRef = useRef<HTMLElement>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{ accountId: string; originals: OfflineDownload[]; download?: OfflineDownload; wholeLibrary: boolean } | null>(null);
  const [editError, setEditError] = useState("");
  const [downloads, setDownloads] = useState<OfflineDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [songId, setSongId] = useState<string | null>(null);
  const [stageOpen, setStageOpen] = useState(false);
  const [kind, setKind] = useState<OfflineDownload["kind"] | null>(null);
  const [online, setOnline] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<OfflineDownload | "all" | null>(null);
  const [pending, setPending] = useState(false);
  const [storageKept, setStorageKept] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const state = await readOfflineState();
      setAccountId(state.accountId);
      setEditTarget((current) => current && current.accountId !== state.accountId ? null : current);
      setDownloads(state.accountId ? state.downloads : []);
      setMessage("");
    } catch {
      setDownloads([]);
      setMessage("Offline storage is unavailable in this browser. Enable browser storage and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (navigator.onLine) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 4_000);
        let session;
        try {
          session = await authClient.getSession({ fetchOptions: { signal: controller.signal, cache: "no-store" } });
        } catch {
          session = null;
        } finally {
          window.clearTimeout(timeout);
        }
        if (cancelled) return;
        if (session && !session.error) {
          try {
            await setOfflineAccount(session.data?.user.id ?? null);
          } catch {
            setDownloads([]);
            setMessage("Couldn't verify this device's offline storage. Reload and try again.");
            setLoading(false);
            return;
          }
        }
      }
      if (!cancelled) await refresh();
    }
    void load();
    function connectivity(): void { setOnline(navigator.onLine); }
    function changed(): void { void refresh(); }
    connectivity();
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    window.addEventListener(OFFLINE_CHANGE_EVENT, changed);
    window.addEventListener("storage", changed);
    return () => {
      cancelled = true;
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
      window.removeEventListener(OFFLINE_CHANGE_EVENT, changed);
      window.removeEventListener("storage", changed);
    };
  }, [refresh]);

  useEffect(() => {
    function locationChanged(): void {
      const params = new URLSearchParams(window.location.search);
      setSelectedId(params.get("download"));
      setSongId(params.get("song"));
      setStageOpen(params.get("stage") === "1");
      const filter = params.get("kind");
      setKind(filter === "chart" || filter === "setlist" ? filter : null);
      mainRef.current?.scrollTo({ top: 0 });
    }
    locationChanged();
    window.addEventListener("popstate", locationChanged);
    return () => window.removeEventListener("popstate", locationChanged);
  }, []);

  const from = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("from");
  const requestedDownload = downloads.find((download) => download.id === selectedId)
    ?? (!selectedId ? downloads.find((download) => download.href === from || download.songs.some((song) => song.chart?.href === from)) : undefined);
  const requestedSong = requestedDownload?.songs.find((song) => song.id === songId || (!songId && song.chart?.href === from));
  const activeSong = requestedSong ?? (requestedDownload?.kind === "chart" ? requestedDownload.songs[0] : undefined);
  const stagePlaylist = useMemo(() => requestedDownload ? createOfflineStagePlaylist(requestedDownload) : null, [requestedDownload]);
  const visibleDownloads = downloads.filter((download) => !kind || download.kind === kind);

  function navigate(download: OfflineDownload | null, song?: string): void {
    const params = new URLSearchParams();
    if (download) params.set("download", download.id);
    if (song) params.set("song", song);
    window.history.pushState(null, "", `/offline${params.size ? `?${params}` : ""}`);
    setSelectedId(download?.id ?? null);
    setSongId(song ?? null);
    setStageOpen(false);
    setKind(null);
    window.scrollTo({ top: 0 });
    mainRef.current?.scrollTo({ top: 0 });
  }

  async function remove(): Promise<void> {
    if (!removeTarget) return;
    setPending(true);
    try {
      await removeOfflineDownload(removeTarget === "all" ? undefined : removeTarget.id);
      setEditTarget(null);
      if (removeTarget === "all" || removeTarget.id === requestedDownload?.id) navigate(null);
      setRemoveTarget(null);
      await refresh();
    } catch {
      setMessage("Couldn't remove this download. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function keepDownloads(): Promise<void> {
    try {
      setStorageKept(await navigator.storage.persist());
    } catch {
      setStorageKept(false);
    }
  }

  function openEdit(download?: OfflineDownload): void {
    if (!accountId) return;
    setEditError("");
    setEditTarget({ accountId, originals: download ? [download] : downloads, download: download?.kind === "setlist" ? download : undefined, wholeLibrary: !download });
  }

  async function saveEdits(edits: OfflineDownload[]): Promise<void> {
    if (!editTarget) return;
    setPending(true);
    setEditError("");
    try {
      await saveOfflineEdits(editTarget.accountId, editTarget.originals, edits, editTarget.wholeLibrary);
      setEditTarget(null);
      await refresh();
    } catch {
      setEditError("Couldn't save changes. Your downloads or account may have changed. Cancel, reopen Edit and try again.");
    } finally { setPending(false); }
  }

  function openStage(download: OfflineDownload): void {
    const params = new URLSearchParams({ download: download.id, stage: "1" });
    window.history.pushState(null, "", `/offline?${params}`);
    setSelectedId(download.id);
    setSongId(null);
    setStageOpen(true);
  }

  if (stageOpen && requestedDownload && stagePlaylist) {
    return <div data-scroll-mode="contained" className="h-dvh overflow-hidden">
      <ScreenWakeLock />
      <StageView key={requestedDownload.id} playlist={stagePlaylist} offline onExit={() => navigate(requestedDownload)} />
    </div>;
  }

  const bytes = new Blob([JSON.stringify(downloads)]).size;
  return <AppMenuProvider><div data-scroll-mode="responsive" className="flex min-h-dvh flex-col bg-[#f4f4f4] text-[#111] lg:h-dvh lg:overflow-hidden dark:bg-black dark:text-[#f5f5f5]">
    <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-[#dedede] bg-white px-3 py-3 dark:border-[#303034] dark:bg-[#111113]">
      <div className="flex min-w-0 items-center gap-2"><MobileMenuButton /><button type="button" onClick={() => navigate(null)} className="truncate rounded text-[15px] font-black focus-visible:outline-2 focus-visible:outline-[#ed1746]">Chord<span className="text-[#ed1746]">PH</span> · Offline</button></div>
      <div className="flex shrink-0 items-center gap-2"><span className="hidden text-[11px] text-[#666] sm:inline dark:text-[#b4b4bc]">{online ? "Saved on this device" : "Offline"}</span><ThemeToggle /></div>
    </header>
    <div className="grid flex-1 gap-2 p-2 lg:min-h-0 lg:grid-cols-[minmax(220px,280px)_1fr]">
    <LeftLibraryPanel offlineReader disconnected={!online} />
    <main ref={mainRef} className="min-w-0 rounded-xl bg-white px-4 pb-28 pt-6 sm:px-6 lg:overflow-y-auto lg:overscroll-y-contain dark:bg-[#111113]">
      {message ? <p role="alert" className="mb-4 text-[13px] text-[#c90f39] dark:text-[#fb7185]">{message}</p> : null}
      {loading ? <p role="status" className="text-[13px]">Loading saved songs…</p> : requestedDownload ? <>
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" className={offlineButtonClass} onClick={() => activeSong && requestedDownload.kind === "setlist" ? navigate(requestedDownload) : navigate(null)}>← {activeSong && requestedDownload.kind === "setlist" ? requestedDownload.title : "Offline library"}</button>
          {!activeSong ? <OfflineOptions label="Saved setlist options" onEdit={() => openEdit(requestedDownload)} /> : null}
        </div>
        {activeSong?.chart ? <>
          <OfflineChart key={`${requestedDownload.id}:${activeSong.id}`} chart={activeSong.chart} playbackAreaRef={mainRef} />
          {requestedDownload.kind === "setlist" ? <div className="mt-6 flex flex-wrap gap-2">{requestedDownload.songs.map((song, index) => <button key={song.id} type="button" disabled={!song.chart} aria-current={song.id === activeSong.id ? "true" : undefined} className={`${offlineButtonClass} ${song.id === activeSong.id ? "border-[#ed1746]!" : ""}`} onClick={() => navigate(requestedDownload, song.id)}>{index + 1}. {song.chart?.title ?? "Unavailable song"}</button>)}</div> : null}
        </> : <>
          <div className="flex items-center gap-3"><h1 className="min-w-0 break-words text-2xl font-black">{requestedDownload.title}</h1><OfflineStageButton download={requestedDownload} onPlay={() => openStage(requestedDownload)} /></div>
          <ol className="mt-5 divide-y divide-[#dedede] dark:divide-[#303034]">{requestedDownload.songs.map((song, index) => <li key={song.id}><button type="button" disabled={!song.chart} onClick={() => navigate(requestedDownload, song.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-4 text-left transition hover:bg-white focus-visible:outline-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:hover:bg-[#202023]">
            <span className="text-[12px] text-[#666] dark:text-[#b4b4bc]">{index + 1}</span><span className="min-w-0 flex-1"><span className="block break-words text-[14px] font-bold">{song.chart?.title ?? "Unavailable song"}</span><span className="text-[12px] text-[#666] dark:text-[#b4b4bc]">{song.chart?.artistName ?? "This song was not accessible when saved."}</span></span>
          </button></li>)}</ol>
          {!requestedDownload.songs.length ? <p className="mt-4 text-[13px]">This saved setlist has no songs.</p> : null}
        </>}
        <p className="mt-6 text-[11px] text-[#666] dark:text-[#b4b4bc]">Saved {new Date(requestedDownload.savedAt).toLocaleString()}.{requestedDownload.editedAt ? ` Edited on this device ${new Date(requestedDownload.editedAt).toLocaleString()}.` : ""} Saving again online replaces this copy.</p>
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-black">Offline library</h1>{downloads.length ? <OfflineOptions label="Offline library options" onEdit={() => openEdit()} onClear={() => setRemoveTarget("all")} /> : null}</div>
        <p className="mt-2 text-[13px] text-[#666] dark:text-[#b4b4bc]">Before rehearsal, open a song or setlist and choose Save offline. Downloads stay in this browser and are cleared when you log out or switch accounts.</p>
        {kind ? <div className="mt-3 flex items-center gap-2"><span className="text-[12px] font-bold">{kind === "chart" ? "Saved songs" : "Saved setlists"}</span><button type="button" className={offlineButtonClass} onClick={() => navigate(null)}>Show all</button></div> : null}
        {from ? <p role="status" className="mt-3 text-[13px] text-[#c90f39] dark:text-[#fb7185]">This page isn’t saved. Choose a downloaded song or setlist below.</p> : null}
        {downloads.length ? <>
          <p className="mt-4 text-[12px] text-[#666] dark:text-[#b4b4bc]">{downloads.length} downloads · {bytes < 1_000_000 ? `${Math.ceil(bytes / 1_000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`} of song data</p>
          <OfflineSavedSections downloads={visibleDownloads} kind={kind} onOpen={navigate} />
          <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void keepDownloads()} className={offlineButtonClass}>Keep downloads on this device</button><p role="status" className="text-[12px] text-[#666] dark:text-[#b4b4bc]">{storageKept === true ? "Browser storage protection enabled." : storageKept === false ? "The browser couldn’t protect storage. Check your downloads before leaving." : "Browser cleanup or clearing site data can remove downloads."}</p></div>
        </> : <OfflineSavedSections downloads={visibleDownloads} kind={kind} onOpen={navigate} />}
      </>}
    </main>
    </div>
    {editTarget ? <OfflineEditDialog downloads={editTarget.originals} download={editTarget.download} pending={pending} error={editError} onCancel={() => setEditTarget(null)} onSave={(edits) => void saveEdits(edits)} onDelete={editTarget.download ? () => setRemoveTarget(editTarget.download!) : undefined} /> : null}
    {removeTarget ? <RemoveDownloadDialog title={removeTarget === "all" ? "all saved charts and setlists" : removeTarget.title} pending={pending} onCancel={() => setRemoveTarget(null)} onConfirm={() => void remove()} /> : null}
  </div></AppMenuProvider>;
}

function RemoveDownloadDialog({ title, pending, onCancel, onConfirm }: { title: string; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  useEffect(() => { dialog?.showModal(); return () => dialog?.close(); }, [dialog]);
  return <dialog ref={setDialog} onCancel={(event) => { event.preventDefault(); if (!pending) onCancel(); }} aria-labelledby="remove-download-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[#dedede] bg-white p-5 text-[#111] shadow-xl backdrop:bg-black/60 dark:border-[#303034] dark:bg-[#202023] dark:text-white">
    <h2 id="remove-download-title" className="text-[16px] font-bold">Remove offline download?</h2>
    <p className="mt-3 break-words text-[13px] text-[#666] dark:text-[#b4b4bc]">Remove {title} from this device to free space? Your songs in the app will remain available online.</p>
    <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={pending} onClick={onCancel} className={offlineButtonClass}>Cancel</button><button type="button" disabled={pending} onClick={onConfirm} className={`${offlineButtonClass} border-[#ed1746]! bg-[#ed1746]! text-white!`}>{pending ? "Removing…" : "Remove download"}</button></div>
  </dialog>;
}

function OfflineStageButton({ download, onPlay }: { download: OfflineDownload; onPlay: () => void }) {
  return <button type="button" disabled={!download.songs.some((song) => song.chart)} onClick={onPlay} aria-label={`Open ${download.title} in stage view`} title="Stage view · Medley" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ed1746] text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M8 4v16l13-8Z" /></svg></button>;
}

function OfflineSavedSections({ downloads, kind, onOpen }: { downloads: OfflineDownload[]; kind: OfflineDownload["kind"] | null; onOpen: (download: OfflineDownload) => void }) {
  return <div className="mt-5 grid gap-6">{(["chart", "setlist"] as const).filter((group) => !kind || group === kind).map((group) => {
    const items = downloads.filter((download) => download.kind === group);
    const heading = group === "chart" ? "Saved songs" : "Saved playlists";
    return <section key={group} aria-label={heading}>
      <h2 className="mb-3 text-[15px] font-bold">{heading}</h2>
      {items.length ? <ul className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9] dark:divide-[#303034] dark:border-[#303034]">{items.map((download) => <li key={download.id} className="px-2 py-2 sm:px-3">
        <button type="button" onClick={() => onOpen(download)} className="flex w-full min-w-0 items-center gap-3 rounded-lg px-1 py-2 text-left transition hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] sm:px-2 dark:hover:bg-[#1f1f22]">
          <span className="min-w-0 flex-1"><span className="block break-words text-[15px] font-bold hover:text-[#ed1746]">{download.title}</span>{group === "chart" && download.subtitle ? <span className="mt-1 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">{download.subtitle}</span> : null}</span>
          {group === "setlist" ? <span className="shrink-0 rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">{download.songs.length} {download.songs.length === 1 ? "track" : "tracks"}</span> : null}
        </button>
      </li>)}</ul> : <p className="text-[13px] text-[#666] dark:text-[#b4b4bc]">No {group === "chart" ? "songs" : "playlists"} saved yet.</p>}
    </section>;
  })}</div>;
}
