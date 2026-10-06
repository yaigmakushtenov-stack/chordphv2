"use client";

import { useMemo, useRef, useState } from "react";

import { BackLink } from "@/components/shared/back-link";
import { ScreenWakeLock } from "@/components/shared/screen-wake-lock";
import { ChordCard } from "@/components/shared/chords/chord-card";
import { PianoChordCard } from "@/components/shared/chords/piano-chord-card";
import { ChartDiagramSelect } from "@/components/shared/chart-playback-toolbar";
import { ChordPopover } from "@/app/track/_components/chord-popover";
import { TrackAutoScroll } from "@/app/track/_components/track-auto-scroll";
import { SongChart, parseSongChartSource } from "@/components/shared/chords/song-chart";
import { GUITAR_CHORDS, PIANO_CHORDS, UKELELE_CHORDS, normalizeChordSymbol } from "@/data/chords";
import { splitVariationSuffix, transposeChordPro, type AccidentalPreference } from "@/lib/chords/chord-pro";
import { getTransposedSetListKey, MAX_SETLIST_TRANSPOSE } from "@/lib/setlists/setlist-track-settings";

type BandTrackChartProps = {
  title: string;
  artistName: string;
  setListTitle: string;
  backHref: string;
  tuning: string;
  capo: number | null;
  tempo: number | null;
  timeSignature: string;
  lyricsAndChords: string;
  baseKey: string;
  initialTranspose: number;
};

export function BandTrackChart({ title, artistName, setListTitle, backHref, tuning, capo, tempo, timeSignature, lyricsAndChords, baseKey, initialTranspose }: BandTrackChartProps) {
  const playbackAreaRef = useRef<HTMLElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [transpose, setTranspose] = useState(initialTranspose);
  const [fontSize, setFontSize] = useState(13);
  const [vocals, setVocals] = useState(false);
  const [instrument, setInstrument] = useState<"guitar" | "piano" | "ukulele">("guitar");
  const [accidentals, setAccidentals] = useState<AccidentalPreference>(baseKey.includes("b") ? "flats" : "sharps");
  const source = useMemo(() => transposeChordPro(lyricsAndChords, transpose, accidentals), [lyricsAndChords, transpose, accidentals]);

  function renderChord(value: string) {
    const parsed = splitVariationSuffix(value);
    const symbol = normalizeChordSymbol(parsed.symbol);
    const definition = (instrument === "ukulele" ? UKELELE_CHORDS : GUITAR_CHORDS).find((chord) => normalizeChordSymbol(chord.symbol) === symbol);
    const piano = PIANO_CHORDS.find((chord) => normalizeChordSymbol(chord.symbol) === symbol);
    const content = instrument === "piano" && piano
      ? <PianoChordCard key={value} chord={piano} compact displaySymbol={parsed.symbol} initialVariationIndex={(parsed.variationNumber ?? 1) - 1} />
      : instrument !== "piano" && definition ? <ChordCard key={value} chord={definition} compact instrumentLabel={instrument} displaySymbol={parsed.symbol} initialVariationIndex={(parsed.variationNumber ?? 1) - 1} /> : null;
    const label = <button type="button" className="rounded font-bold text-[#c61039] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:text-[#ff7492]" aria-label={`${value} chord diagram`}>{value}</button>;
    return content ? <ChordPopover content={content}>{label}</ChordPopover> : <span className="font-bold text-[#c61039] dark:text-[#ff7492]">{value}</span>;
  }

  return (
    <section ref={playbackAreaRef} className="min-w-0 flex-1 rounded-xl bg-white p-3 pb-28 text-[#111] sm:p-6 sm:pb-28 dark:bg-[#121214] dark:text-[#f5f5f5]">
      <ScreenWakeLock />
      <BackLink href={backHref}>{setListTitle}</BackLink>
      <h1 className="mt-5 break-words text-2xl font-black sm:text-3xl">{title}</h1>
      <p className="mt-1 text-[13px] text-[#666] dark:text-[#b4b4bc]">{artistName} · Key {getTransposedSetListKey(baseKey, transpose)}{tempo ? ` · ${tempo} BPM` : ""}{timeSignature ? ` · ${timeSignature}` : ""}</p>
      <p className="mt-1 text-[12px] text-[#666] dark:text-[#b4b4bc]">Tuning {tuning}{capo !== null ? ` · Capo ${capo}` : ""}</p>
      <div ref={chartRef} className="mt-6">
        {lyricsAndChords.trim() ? <SongChart lyricsOnly={vocals} sections={parseSongChartSource(source)} fontSize={fontSize} renderChord={renderChord} /> : <p className="text-[13px] text-[#666] dark:text-[#b4b4bc]">No lyrics or chords have been added to this track yet.</p>}
      </div>
      {lyricsAndChords.trim() ? <TrackAutoScroll chartRef={chartRef} playbackAreaRef={playbackAreaRef} fontSize={fontSize} minFontSize={11} maxFontSize={18} onFontSizeChange={setFontSize}
        accidentals={accidentals} onAccidentalsChange={() => setAccidentals((value) => value === "sharps" ? "flats" : "sharps")}
        transpose={transpose} displayKey={getTransposedSetListKey(baseKey, transpose)} onTransposeChange={(value) => setTranspose(Math.max(-MAX_SETLIST_TRANSPOSE, Math.min(MAX_SETLIST_TRANSPOSE, value)))}
        vocals={vocals} onVocalsChange={setVocals} instrumentOptions={<ChartDiagramSelect value={instrument} onChange={setInstrument} />}
      /> : null}
    </section>
  );
}
