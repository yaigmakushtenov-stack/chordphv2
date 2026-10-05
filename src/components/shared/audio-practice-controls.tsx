"use client";

import { useId, useState } from "react";

import { PRACTICE_SPEEDS } from "@/lib/client/audio-practice-store";
import type { AudioPractice } from "@/lib/client/use-audio-practice";

type AudioPracticeControlsProps = {
  practice: AudioPractice;
};

const buttonClassName = "inline-flex min-h-9 items-center justify-center rounded-full border border-[#d9d9d9] bg-white text-[11px] font-bold text-[#333] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#e4e4e7] dark:hover:border-[#fb7185] dark:hover:text-[#fb7185]";

export function AudioPracticeControls({ practice }: AudioPracticeControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const panelId = useId();
  const speedId = useId();
  const nameId = useId();
  const hasAudio = practice.duration > 0;

  function saveLoop(): void {
    if (practice.canLoop && practice.saveMarker(label)) setLabel("");
  }

  return (
    <div className="mt-3 text-[#171717] dark:text-[#f5f5f5]">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
        className={`${buttonClassName} px-3`}
      >
        {isOpen ? "Hide practice" : "Practice"}
        {practice.loopEnabled ? " · Loop on" : ""}
        {practice.speed !== 1 ? ` · ${practice.speed}×` : ""}
      </button>
      {practice.error ? <p role="alert" className="mt-2 rounded-lg bg-white p-2 text-[12px] text-red-700 dark:bg-[#202023] dark:text-red-300">{practice.error}</p> : null}
      {isOpen ? (
        <div id={panelId} className="mt-2 max-h-[45dvh] space-y-3 overflow-y-auto rounded-xl border border-[#dedede] bg-[#fafafa] p-3 dark:border-[#3a3a3f] dark:bg-[#18181b]">
          <div className="grid grid-cols-[4rem_repeat(5,minmax(0,1fr))] items-center gap-1">
            <label htmlFor={speedId} className="sr-only">Playback speed</label>
            <div className="relative min-w-0">
              <select
                id={speedId}
                value={practice.speed}
                disabled={!practice.pitchSupported}
                title={practice.pitchSupported ? "Playback speed" : "Speed adjustment is unavailable in this browser"}
                onChange={(event) => practice.changeSpeed(Number(event.target.value))}
                className={`${buttonClassName} w-full appearance-none pl-2 pr-5`}
              >
                {PRACTICE_SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
              </select>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-[#555] dark:text-[#d4d4d8]"><path d="m6 9 6 6 6-6" /></svg>
            </div>
            <button type="button" disabled={!hasAudio} onClick={practice.setStart} className={`${buttonClassName} min-w-0 px-0`} aria-label="Set loop start A at current position" title={`Set A · ${formatPracticeTime(practice.loop.start)}`}>A</button>
            <button type="button" disabled={!hasAudio || practice.loop.start === null} onClick={practice.setEnd} className={`${buttonClassName} min-w-0 px-0`} aria-label="Set loop end B at current position" title={`Set B · ${formatPracticeTime(practice.loop.end)}`}>B</button>
            <button
              type="button"
              disabled={!practice.canLoop}
              aria-pressed={practice.loopEnabled}
              aria-label={practice.loopEnabled ? "Turn A–B loop off" : "Turn A–B loop on"}
              title={practice.loopEnabled ? "Loop on" : "Loop off"}
              onClick={practice.toggleLoop}
              className={practice.loopEnabled
                ? "inline-flex min-h-9 min-w-0 items-center justify-center rounded-full border border-[#ed1746] bg-[#ed1746] text-white transition hover:bg-[#cf123b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#ed1746] dark:bg-[#ed1746] dark:text-white dark:hover:bg-[#ff315d]"
                : `${buttonClassName} min-w-0 px-0`}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3" /></svg>
            </button>
            <button type="button" disabled={practice.loop.start === null && practice.loop.end === null} onClick={practice.clearLoop} className={`${buttonClassName} min-w-0 px-0`} aria-label="Clear A–B points" title="Clear A–B">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
            <button type="button" disabled={!practice.canLoop} onClick={saveLoop} className={`${buttonClassName} min-w-0 px-0`} aria-label="Save named loop on this device" title="Save loop on this device">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21 2-2V7l-4-4H5L3 5v14l2 2zm-12 0v-8h10v8M7 3v5h8V3" /></svg>
            </button>
          </div>
          {practice.loop.start !== null || practice.loop.end !== null ? <p className="text-[11px] tabular-nums text-[#666] dark:text-[#b4b4bc]">A {formatPracticeTime(practice.loop.start)} <span aria-hidden="true">·</span> B {formatPracticeTime(practice.loop.end)}</p> : null}
          <div>
            <label htmlFor={nameId} className="sr-only">Loop name</label>
            <input
              id={nameId}
              value={label}
              maxLength={80}
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                if (!event.repeat) saveLoop();
              }}
              placeholder="Loop name"
              className="h-9 w-full min-w-0 rounded-lg border border-[#d9d9d9] bg-white px-3 text-[11px]! font-medium text-[#171717] outline-none placeholder:text-[#777] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f5f5f5] dark:placeholder:text-[#a1a1aa]"
            />
          </div>
          {practice.markers.length ? (
            <ul aria-label="Saved practice loops" className="space-y-2">
              {practice.markers.map((marker) => (
                <li key={marker.id} className="flex min-w-0 items-center gap-2">
                  <button type="button" disabled={!hasAudio} onClick={() => practice.loadMarker(marker)} className={`${buttonClassName} min-w-0 flex-1 justify-between gap-2 px-3`} aria-label={`Load loop ${marker.label} from ${formatPracticeTime(marker.start)} to ${formatPracticeTime(marker.end)}`}>
                    <span className="truncate">{marker.label}</span>
                    <span className="shrink-0 tabular-nums">{formatPracticeTime(marker.start)}–{formatPracticeTime(marker.end)}</span>
                  </button>
                  <button type="button" onClick={() => practice.deleteMarker(marker.id)} className={`${buttonClassName} px-3`} aria-label={`Delete saved loop ${marker.label}`}>Delete</button>
                </li>
              ))}
            </ul>
          ) : null}
          {practice.message ? <p role="status" className="text-[12px] text-[#555] dark:text-[#d4d4d8]">{practice.message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function formatPracticeTime(seconds: number | null): string {
  if (seconds === null) return "—";
  const tenths = Math.round(seconds * 10);
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, "0")}.${tenths % 10}`;
}
