"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import * as TrackActions from "@/actions/track-actions";
import { showToast } from "@/components/shared/toast";

type DeleteChordChartDialogProps = {
  trackId: string;
  title: string;
  artistName: string;
  onClose: () => void;
};

export function DeleteChordChartDialog({ trackId, title, artistName, onClose }: DeleteChordChartDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function deleteChart(): void {
    if (isDeleting) return;
    setError(null);
    startDeleting(async () => {
      const result = await TrackActions.deleteChordChart(trackId);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      showToast({ title: "Chord chart deleted", tone: "success" });
      onClose();
      router.push("/annotation");
      router.refresh();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={isDeleting}
      onCancel={(event) => { event.preventDefault(); if (!isDeleting) onClose(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-[#dedede] bg-white p-5 text-[#171717] shadow-xl backdrop:bg-black/60 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-white"
    >
      <h2 id={titleId} className="text-[18px] font-black">Delete chord chart?</h2>
      <div id={descriptionId} className="mt-3 space-y-2 text-[13px] leading-5 text-[#555] dark:text-[#d4d4d8]">
        <p>Permanently delete <strong className="break-words">{title}</strong> by {artistName} and its annotations? This cannot be undone.</p>
        <p>Uploaded audio stays in the music library. Charts used in setlists or custom arrangements must be removed from those places first.</p>
      </div>
      {error ? <p role="alert" className="mt-3 text-[12px] text-red-700 dark:text-red-300">{error}</p> : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          autoFocus
          disabled={isDeleting}
          onClick={onClose}
          className="h-10 rounded-full border border-[#dedede] bg-white px-4 text-[12px] font-bold text-[#333] transition hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-white dark:hover:bg-[#343438]"
        >Cancel</button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={deleteChart}
          className="h-10 rounded-full bg-[#ed1746] px-4 text-[12px] font-bold text-white transition hover:bg-[#cf123b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-wait disabled:opacity-50 dark:bg-[#ed1746] dark:text-white dark:hover:bg-[#ff315d]"
        >{isDeleting ? "Deleting…" : "Delete permanently"}</button>
      </div>
    </dialog>
  );
}
