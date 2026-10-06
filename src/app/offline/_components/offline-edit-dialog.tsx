"use client";

import { type FormEvent, useEffect, useState } from "react";
import { offlineButtonClass } from "@/components/shared/offline/save-chart-offline";
import { DragHandleIcon, useDragReorder } from "@/components/shared/use-drag-reorder";
import { getTransposedSetListKey } from "@/lib/setlists/setlist-track-settings";
import type { OfflineDownload } from "@/types/offline";

type EditRow = { id: string; title: string; kind?: OfflineDownload["kind"]; subtitle?: string; transposeLabel?: string };

export function OfflineEditDialog({ downloads, download, pending, error, onCancel, onSave, onDelete }: {
  downloads: OfflineDownload[];
  download?: OfflineDownload;
  pending: boolean;
  error: string;
  onCancel: () => void;
  onSave: (edits: OfflineDownload[]) => void;
  onDelete?: () => void;
}) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const [title, setTitle] = useState(download?.title ?? "");
  const [rows, setRows] = useState<EditRow[]>(download
    ? download.songs.map((song) => ({
      id: song.id,
      title: song.chart?.title ?? "Unavailable song",
      subtitle: song.chart ? `${song.chart.artistName} · Key ${getTransposedSetListKey(song.chart.key, song.chart.transpose)} · ${song.chart.tuning}` : "This song was unavailable when saved.",
      transposeLabel: song.chart?.transpose ? `Transposed ${song.chart.transpose > 0 ? "+" : ""}${song.chart.transpose} · ${song.chart.key} → ${getTransposedSetListKey(song.chart.key, song.chart.transpose)}` : undefined,
    }))
    : ["setlist", "chart"].flatMap((kind) => downloads.filter((item) => item.kind === kind).map((item) => ({ id: item.id, title: item.title, kind: item.kind }))));
  const [removeId, setRemoveId] = useState<string | null>(null);
  useEffect(() => { dialog?.showModal(); return () => dialog?.close(); }, [dialog]);

  function updateCategory(kind: OfflineDownload["kind"], next: EditRow[]): void {
    setRows((current) => kind === "setlist"
      ? [...next, ...current.filter((row) => row.kind === "chart")]
      : [...current.filter((row) => row.kind === "setlist"), ...next]);
  }

  function save(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (pending || removeId) return;
    onSave(download ? [{ ...download, title, songs: rows.map((row) => download.songs.find((song) => song.id === row.id)!) }]
      : rows.map((row) => ({ ...downloads.find((item) => item.id === row.id)!, title: row.title })));
  }

  const inputClass = "h-11 min-w-0 w-full rounded-xl border border-[#d9d9d9] bg-white px-3 text-[13px] outline-none focus:border-[#ed1746] focus:ring-2 focus:ring-[#ed1746]/15 dark:border-[#3a3a3f] dark:bg-[#202023]";
  const footerButtonClass = "inline-flex h-11 items-center justify-center rounded-full border border-[#d9d9d9] px-2 text-[11px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:border-[#3a3a3f]";
  const removal = rows.find((row) => row.id === removeId);

  return <dialog ref={setDialog} data-offline-edit-scroll aria-labelledby="offline-edit-title" onCancel={(event) => { event.preventDefault(); if (!pending) onCancel(); }} className="offline-edit-drawer fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-[#dedede] bg-white text-[#111] shadow-2xl backdrop:bg-black/60 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[min(92vw,440px)] sm:rounded-none sm:rounded-l-3xl dark:border-[#343438] dark:bg-[#171719] dark:text-white">
    <div className="flex items-start justify-between gap-4 border-b border-[#ececec] p-5 sm:p-6 dark:border-[#303034]">
      <div><p className="text-[10px] font-bold tracking-[0.2em] text-[#ed1746]">{download ? "SAVED SETLIST" : "OFFLINE LIBRARY"}</p><h2 id="offline-edit-title" className="mt-1 text-[22px] font-black">{download ? "Edit saved setlist" : "Edit offline library"}</h2><p className="mt-2 text-[12px] text-[#666] dark:text-[#b4b4bc]">Changes stay on this device.</p></div>
      <button type="button" disabled={pending} onClick={onCancel} aria-label="Close offline editor" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f1f1f1] text-xl transition hover:bg-[#e4e4e4] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:bg-[#28282c] dark:hover:bg-[#343438]">×</button>
    </div>
    <form onSubmit={save}>
      {download ? <label className="grid gap-2 border-b border-[#ececec] p-5 text-[12px] font-bold sm:p-6 dark:border-[#303034]">Setlist name<input autoFocus required maxLength={120} value={title} disabled={pending} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label> : null}
      <div className="space-y-6 p-5 sm:p-6">
      {download ? <OfflineEditRows title="Songs" rows={rows} editNames={false} pending={pending} removing={Boolean(removal)} onChange={setRows} onRemove={setRemoveId} /> : <>
        <OfflineEditRows title="Setlists" rows={rows.filter((row) => row.kind === "setlist")} editNames pending={pending} removing={Boolean(removal)} onChange={(next) => updateCategory("setlist", next)} onRemove={setRemoveId} />
        <OfflineEditRows title="Songs" rows={rows.filter((row) => row.kind === "chart")} editNames pending={pending} removing={Boolean(removal)} onChange={(next) => updateCategory("chart", next)} onRemove={setRemoveId} />
      </>}
      {removal ? <div role="alert" className="rounded-xl border border-[#f5b5c4] bg-[#fff0f3] p-3 dark:border-[#682234] dark:bg-[#3a111d]">
        <p className="break-words text-[13px]">Remove {removal.title} {download ? "from this saved setlist" : "from this device"}? This takes effect when you save changes.</p>
        <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setRemoveId(null)} className={offlineButtonClass}>Keep</button><button type="button" onClick={() => { setRows((current) => current.filter((row) => row.id !== removeId)); setRemoveId(null); }} className={offlineButtonClass}>Remove</button></div>
      </div> : null}
      {error ? <p role="alert" className="mt-3 text-[13px] text-[#c90f39] dark:text-[#fb7185]">{error}</p> : null}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-[#dedede] p-5 sm:p-6 dark:border-[#303034]">
        {onDelete ? <button type="button" disabled={pending} onClick={onDelete} className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-red-200 px-2 text-[11px] font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/35">Delete setlist</button> : null}
        <div className="ml-auto flex items-center gap-2">
        <button type="button" disabled={pending} onClick={onCancel} className={footerButtonClass}>Cancel</button>
        <button type="submit" disabled={pending || Boolean(removal) || (download ? !title.trim() : rows.some((row) => !row.title.trim()))} className={`${footerButtonClass} border-[#ed1746]! bg-[#ed1746]! text-white!`}>{pending ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </form>
  </dialog>;
}

function OfflineEditRows({ title, rows, editNames, pending, removing, onChange, onRemove }: {
  title: "Setlists" | "Songs";
  rows: EditRow[];
  editNames: boolean;
  pending: boolean;
  removing: boolean;
  onChange: (rows: EditRow[]) => void;
  onRemove: (id: string) => void;
}) {
  const headingId = title === "Setlists" ? "offline-edit-setlists" : "offline-edit-songs";
  const reorder = useDragReorder({ items: rows, onChange, disabled: pending || removing, scrollSelector: "[data-offline-edit-scroll]" });
  const controlClass = "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#d9d9d9] text-[15px] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-[#ed1746] disabled:opacity-35 dark:border-[#3a3a3f]";

  return <section aria-labelledby={headingId}>
    <h3 id={headingId} className="mb-3 text-[12px] font-bold">{title}</h3>
    <ol className="divide-y divide-[#dedede] dark:divide-[#303034]">{rows.map((row, index) => <li key={row.id} ref={(element) => reorder.bindRow(row.id, element)} className={`flex min-w-0 items-center gap-3 py-4 transition ${reorder.draggedId === row.id ? "relative z-10 bg-[#fff0f3] opacity-75 shadow-lg dark:bg-[#3a111d]" : ""}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f1f1f1] text-[12px] font-black dark:bg-[#28282c]">{index + 1}</span>
      <div className="min-w-0 flex-1">{editNames
        ? <input aria-label={`${title === "Setlists" ? "Setlist" : "Song"} name ${index + 1}`} required maxLength={120} disabled={pending} value={row.title} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, title: event.target.value } : item))} className="h-11 min-w-0 w-full rounded-xl border border-[#d9d9d9] bg-white px-3 text-[13px] outline-none focus:border-[#ed1746] focus:ring-2 focus:ring-[#ed1746]/15 dark:border-[#3a3a3f] dark:bg-[#202023]" />
        : <><span className="block truncate text-[15px] font-bold">{row.title}</span><span className="mt-0.5 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">{row.subtitle}</span>{row.transposeLabel ? <span className="mt-1 block truncate text-[10px] font-bold text-[#c90f39] dark:text-[#fb7185]">{row.transposeLabel}</span> : null}</>}</div>
      <div className="flex shrink-0 gap-1">
        <button type="button" disabled={pending || removing} onPointerDown={(event) => reorder.start(event, row.id)} onPointerMove={reorder.move} onPointerUp={reorder.end} onPointerCancel={reorder.cancel} onKeyDown={(event) => reorder.keyDown(event, row.id)} aria-label={`Arrange ${row.title}. Use arrow keys or drag.`} className={`${controlClass} touch-none cursor-grab active:cursor-grabbing`}><DragHandleIcon /></button>
        <button type="button" disabled={pending || removing} onClick={() => onRemove(row.id)} aria-label={`Remove ${row.title}`} className={controlClass}>×</button>
      </div>
    </li>)}</ol>
    {!rows.length ? <p className="text-[13px] text-[#666] dark:text-[#b4b4bc]">No saved {title.toLowerCase()}.</p> : null}
  </section>;
}
