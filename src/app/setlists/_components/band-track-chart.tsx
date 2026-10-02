"use client";

import { useState } from "react";

import { SongChart, parseSongChartSource } from "@/components/shared/chords/song-chart";
import { transposeChordPro } from "@/lib/chords/chord-pro";
import { getTransposedSetListKey, MAX_SETLIST_TRANSPOSE } from "@/lib/setlists/setlist-track-settings";

type BandTrackChartProps = {
  lyricsAndChords: string;
  baseKey: string;
  initialTranspose: number;
};

export function BandTrackChart({ lyricsAndChords, baseKey, initialTranspose }: BandTrackChartProps) {
  const [transpose, setTranspose] = useState(initialTranspose);
  const source = transposeChordPro(lyricsAndChords, transpose, baseKey.includes("b") ? "flats" : "sharps");
  const buttonClass = "rounded-full border border-[#dedede] px-4 py-2 text-[12px] font-bold transition hover:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#3a3a3f] dark:hover:border-[#ed1746]";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" aria-label="Transpose down one semitone" disabled={transpose <= -MAX_SETLIST_TRANSPOSE} onClick={() => setTranspose((value) => value - 1)} className={buttonClass}>−</button>
        <span className="text-[13px] font-bold">Key {getTransposedSetListKey(baseKey, transpose)} · Transpose {transpose}</span>
        <button type="button" aria-label="Transpose up one semitone" disabled={transpose >= MAX_SETLIST_TRANSPOSE} onClick={() => setTranspose((value) => value + 1)} className={buttonClass}>+</button>
      </div>
      {lyricsAndChords.trim() ? (
        <SongChart sections={parseSongChartSource(source)} renderChord={(chord) => <span className="font-bold text-[#c61039] dark:text-[#ff7492]">{chord}</span>} />
      ) : <p className="text-[13px] text-[#666] dark:text-[#b4b4bc]">No lyrics or chords have been added to this track yet.</p>}
    </div>
  );
}
