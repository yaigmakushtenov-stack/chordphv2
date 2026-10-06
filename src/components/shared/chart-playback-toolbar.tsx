"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { AutoScrollSpeedControls } from "@/components/shared/auto-scroll-speed-controls";
import type { AccidentalPreference } from "@/lib/chords/chord-pro";

export function ChartPlaybackDock({ areaRef, dockRef, children }: { areaRef: RefObject<HTMLElement | null>; dockRef?: RefObject<HTMLDivElement | null>; children: ReactNode }) {
  const [bounds, setBounds] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    function updateBounds(): void {
      if (!area) return;
      const rect = area.getBoundingClientRect();
      const left = Math.max(0, rect.left + area.clientLeft);
      const right = Math.min(document.documentElement.clientWidth, rect.left + area.clientLeft + area.clientWidth);
      const next = { left, width: Math.max(0, right - left) };
      setBounds((current) => current?.left === next.left && current.width === next.width ? current : next);
    }
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(area);
    window.addEventListener("resize", updateBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [areaRef]);

  return <div ref={dockRef} data-chart-playback-dock className="@container/playback pointer-events-none fixed bottom-0 z-40 flex justify-center" style={bounds ? { left: bounds.left, width: bounds.width } : { visibility: "hidden" }}>{children}</div>;
}

type ChartPlaybackToolbarProps = {
  isDark: boolean;
  speed: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  accidentals: AccidentalPreference;
  onPlay: () => void;
  onSpeedDown: () => void;
  onSpeedUp: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onAccidentalsChange: () => void;
  transposeControls: ReactNode;
  viewControls: ReactNode;
  diagramControls?: ReactNode;
  options?: ReactNode | ((close: () => void) => ReactNode);
  className?: string;
};

export function ChartPlaybackToolbar({ isDark, speed, zoom, minZoom, maxZoom, accidentals, onPlay, onSpeedDown, onSpeedUp, onZoomOut, onZoomIn, onAccidentalsChange, transposeControls, viewControls, diagramControls, options, className = "" }: ChartPlaybackToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const surface = isDark ? "border-[#343740] bg-[#17191f] text-[#f5f3ed]" : "border-[#d8d3c8] bg-white text-[#151515]";
  const iconClass = `flex size-9 shrink-0 items-center justify-center rounded-full border transition hover:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] @min-[360px]/playback:size-11 ${surface}`;

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus({ preventScroll: true });
    function closeOnOutside(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return <div ref={rootRef} className={`relative min-w-0 border-t px-1.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] @min-[360px]/playback:px-3 @min-[640px]/playback:px-2 @min-[960px]/playback:px-4 ${isDark ? "border-[#23252a] bg-[#111216] text-[#f5f3ed]" : "border-[#dedbd2] bg-[#fffdf8] text-[#151515]"} ${className}`}>
    {isOpen ? <div id={panelId} ref={panelRef} tabIndex={-1} role="dialog" aria-label="Chart playback options" className={`slide-up-panel absolute bottom-full left-2 right-2 z-50 mb-2 grid max-h-[calc(100dvh-9rem)] gap-3 overflow-y-auto rounded-xl border p-3 shadow-2xl outline-none @min-[640px]/playback:left-1/2 @min-[640px]/playback:right-auto @min-[640px]/playback:w-[min(24rem,calc(100cqw-1rem))] @min-[640px]/playback:-translate-x-1/2 ${options ? "" : "@min-[960px]/playback:hidden"} ${surface}`}>
      <div className="flex justify-end"><button type="button" aria-label="Close playback options" onClick={() => { setIsOpen(false); triggerRef.current?.focus(); }} className={iconClass}>×</button></div>
      <div className="@min-[640px]/playback:hidden">{transposeControls}</div>
      <div className="grid gap-3 @min-[960px]/playback:hidden *:w-full">{viewControls}{diagramControls}</div>
      {typeof options === "function" ? options(() => setIsOpen(false)) : options}
    </div> : null}
    <div role="group" aria-label="Chart playback toolbar" className="mx-auto flex w-full max-w-full items-center justify-between gap-0.5 @min-[360px]/playback:gap-1 @min-[640px]/playback:w-fit @min-[640px]/playback:justify-center @min-[640px]/playback:gap-1.5 @min-[960px]/playback:gap-3">
      <button type="button" aria-label={speed > 0 ? "Pause auto-scroll" : "Play auto-scroll"} aria-pressed={speed > 0} onClick={onPlay} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ed1746] text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] @min-[360px]/playback:size-11">
        <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24">{speed > 0 ? <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></> : <path d="m7 4 14 8-14 8V4Z" />}</svg>
      </button>
      <AutoScrollSpeedControls compact speed={speed} isDark={isDark} onDecrease={onSpeedDown} onIncrease={onSpeedUp} decreaseLabel="Decrease auto-scroll speed. Double tap to stop." />
      <div className="hidden shrink-0 @min-[640px]/playback:block">{transposeControls}</div>
      <div role="group" aria-label="Chart font size controls" className={`inline-flex h-10 shrink-0 items-center overflow-hidden rounded-full border @min-[360px]/playback:h-11 ${surface}`}>
        <button type="button" aria-label="Decrease chart font size" disabled={zoom <= minZoom} onClick={onZoomOut} className="flex h-full w-7 items-center justify-center transition hover:bg-[#ed1746] hover:text-white focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] disabled:opacity-40"><ZoomIcon /></button>
        <span className="min-w-9 text-center text-[11px] font-black tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Increase chart font size" disabled={zoom >= maxZoom} onClick={onZoomIn} className="flex h-full w-7 items-center justify-center transition hover:bg-[#ed1746] hover:text-white focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] disabled:opacity-40"><ZoomIcon plus /></button>
      </div>
      <button type="button" aria-label={accidentals === "sharps" ? "Use flat chord names" : "Use sharp chord names"} onClick={onAccidentalsChange} className={`${iconClass} font-black`}>{accidentals === "sharps" ? "♯" : "♭"}</button>
      <div className="hidden shrink-0 items-center gap-3 @min-[960px]/playback:flex">{viewControls}{diagramControls}</div>
      <button ref={triggerRef} type="button" aria-label="Open playback options" aria-controls={panelId} aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)} className={`${iconClass} ${options ? "" : "@min-[960px]/playback:hidden"}`}><span aria-hidden="true" className="grid gap-0.5"><span className="size-1 rounded-full bg-current" /><span className="size-1 rounded-full bg-current" /><span className="size-1 rounded-full bg-current" /></span></button>
    </div>
  </div>;
}

export function ChartTransposeControls({ value, displayKey, onChange, disabled = false, isDark }: { value: number; displayKey: string; onChange: (value: number) => void; disabled?: boolean; isDark: boolean }) {
  const buttonClass = "flex h-full w-7 shrink-0 items-center justify-center font-bold transition hover:bg-[#ed1746] hover:text-white focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] disabled:opacity-40";
  return <div className="flex min-w-0 items-center gap-1 whitespace-nowrap text-[11px] font-bold @min-[640px]/playback:*:h-11">
    <span className={`inline-flex h-9 shrink-0 items-center rounded-full bg-[#ed1746]/15 px-2.5 ${isDark ? "text-[#ff7492]" : "text-[#c61039]"}`}>Key {displayKey}</span>
    <div role="group" aria-label="Transpose controls" className={`inline-flex h-9 shrink-0 items-center overflow-hidden rounded-full border ${isDark ? "border-[#343740] bg-[#202023]" : "border-[#d8d3c8] bg-white"}`}>
      <span className="px-2">Tr.</span>
      <button type="button" disabled={disabled || value <= -12} aria-label="Transpose down one semitone" onClick={() => onChange(value - 1)} className={buttonClass}>−</button>
      <span className="min-w-7 text-center tabular-nums">{value > 0 ? "+" : ""}{value}</span>
      <button type="button" disabled={disabled || value >= 12} aria-label="Transpose up one semitone" onClick={() => onChange(value + 1)} className={buttonClass}>+</button>
    </div>
    <button type="button" disabled={disabled || value === 0} onClick={() => onChange(0)} className="h-9 shrink-0 rounded-full border border-current/20 px-2.5 transition hover:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-[#ed1746] disabled:opacity-40">Reset</button>
  </div>;
}

export function ChartViewSelect({ vocals, onChange, isDark }: { vocals: boolean; onChange: (vocals: boolean) => void; isDark: boolean }) {
  return <select aria-label="Chart view" value={vocals ? "vocals" : "instruments"} onChange={(event) => onChange(event.target.value === "vocals")} className={`h-11 rounded-full border px-3 text-[12px] font-bold focus-visible:outline-2 focus-visible:outline-[#ed1746] ${isDark ? "border-[#343740] bg-[#202023] text-white" : "border-[#d8d3c8] bg-white text-[#151515]"}`}><option value="instruments">Instruments</option><option value="vocals">Vocals</option></select>;
}

export function ChartDiagramSelect({ value, onChange, isDark }: { value: "guitar" | "piano" | "ukulele"; onChange: (value: "guitar" | "piano" | "ukulele") => void; isDark?: boolean }) {
  return <select aria-label="Chord diagram instrument" value={value} onChange={(event) => {
    const next = event.target.value;
    if (next === "guitar" || next === "piano" || next === "ukulele") onChange(next);
  }} className={`h-11 rounded-full border px-3 text-[12px] font-bold focus-visible:outline-2 focus-visible:outline-[#ed1746] ${isDark === true ? "border-[#343740] bg-[#202023] text-white" : isDark === false ? "border-[#d8d3c8] bg-white text-[#151515]" : "border-[#d8d3c8] bg-white text-[#151515] dark:border-[#343740] dark:bg-[#202023] dark:text-white"}`}><option value="guitar">Guitar diagrams</option><option value="piano">Piano diagrams</option><option value="ukulele">Ukulele diagrams</option></select>;
}

function ZoomIcon({ plus = false }: { plus?: boolean }) {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5M7.5 10.5h6" />{plus ? <path d="M10.5 7.5v6" /> : null}</svg>;
}
