"use client";

import { useMemo, useRef, useState } from "react";
import { ScreenWakeLock } from "@/components/shared/screen-wake-lock";
import { SongChart, parseSongChartSource } from "@/components/shared/chords/song-chart";
import { ChordCard } from "@/components/shared/chords/chord-card";
import { PianoChordCard } from "@/components/shared/chords/piano-chord-card";
import { ChordPopover } from "@/app/track/_components/chord-popover";
import { TrackAutoScroll } from "@/app/track/_components/track-auto-scroll";
import { GUITAR_CHORDS, PIANO_CHORDS, UKELELE_CHORDS, normalizeChordSymbol } from "@/data/chords";
import { splitVariationSuffix, transposeChordPro, type AccidentalPreference } from "@/lib/chords/chord-pro";
import { getTransposedSetListKey } from "@/lib/setlists/setlist-track-settings";
import type { OfflineChart as ChartData } from "@/types/offline";

export function OfflineChart({ chart }: { chart: ChartData }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [transpose, setTranspose] = useState(chart.transpose);
  const [fontSize, setFontSize] = useState(13);
  const [vocals, setVocals] = useState(false);
  const [instrument, setInstrument] = useState("guitar");
  const [accidentals, setAccidentals] = useState<AccidentalPreference>(chart.key.includes("b") ? "flats" : "sharps");
  const source = useMemo(() => transposeChordPro(chart.lyricsAndChords, transpose, accidentals), [chart.lyricsAndChords, transpose, accidentals]);

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

  return <article className="min-w-0">
    <ScreenWakeLock />
    <h2 className="break-words text-2xl font-black">{chart.title}</h2>
    <p className="mt-1 text-[13px] text-[#666] dark:text-[#b4b4bc]">{chart.artistName} · Key {getTransposedSetListKey(chart.key, transpose)}{chart.tempo ? ` · ${chart.tempo} BPM` : ""}{chart.timeSignature ? ` · ${chart.timeSignature}` : ""}</p>
    <p className="mt-1 text-[12px] text-[#666] dark:text-[#b4b4bc]">Tuning {chart.tuning}{chart.capo !== null ? ` · Capo ${chart.capo}` : ""}</p>
    <div ref={chartRef} className="mt-5">{chart.lyricsAndChords.trim() ? <SongChart lyricsOnly={vocals} sections={parseSongChartSource(source)} fontSize={fontSize} renderChord={renderChord} /> : <p className="text-[13px] text-[#666] dark:text-[#b4b4bc]">No lyrics or chords in this saved song.</p>}</div>
    {chart.notes ? <section className="mt-6"><h3 className="text-[13px] font-bold">Notes</h3><p className="mt-2 whitespace-pre-wrap break-words text-[13px] text-[#666] dark:text-[#b4b4bc]">{chart.notes}</p></section> : null}
    {chart.lyricsAndChords.trim() ? <TrackAutoScroll chartRef={chartRef} fontSize={fontSize} minFontSize={11} maxFontSize={18} onFontSizeChange={setFontSize}
      accidentals={accidentals} onAccidentalsChange={() => setAccidentals((value) => value === "sharps" ? "flats" : "sharps")}
      transpose={transpose} displayKey={getTransposedSetListKey(chart.key, transpose)} onTransposeChange={setTranspose} vocals={vocals} onVocalsChange={setVocals}
      instrumentOptions={<select aria-label="Chord diagram instrument" value={instrument} onChange={(event) => setInstrument(event.target.value)} className="h-10 rounded-full border border-[#d8d3c8] bg-white px-3 text-[12px] font-bold text-[#151515] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:border-[#343740] dark:bg-[#202023] dark:text-white"><option value="guitar">Guitar diagrams</option><option value="piano">Piano diagrams</option><option value="ukulele">Ukulele diagrams</option></select>}
    /> : null}
  </article>;
}
