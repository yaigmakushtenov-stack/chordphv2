"use client";

import { useMemo, useState } from "react";

import { ChordCard } from "@/components/chord-chart/chord-card";
import { PianoChordCard } from "@/components/chord-chart/piano-chord-card";
import {
  GUITAR_CHORDS,
  PIANO_CHORDS,
  type ChordDefinition,
  type Instrument,
  type PianoChordDefinition,
} from "@/data/chords";

const INSTRUMENTS: Array<{ id: Instrument; label: string }> = [
  { id: "guitar", label: "Guitar" },
  { id: "ukelele", label: "Ukelele" },
  { id: "piano", label: "Piano" },
];

export function ChordChart() {
  const [instrument, setInstrument] = useState<Instrument>("guitar");
  const [query, setQuery] = useState("");

  const guitarChords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (instrument !== "guitar") {
      return [];
    }

    if (!normalizedQuery) {
      return GUITAR_CHORDS;
    }

    return GUITAR_CHORDS.filter((chord) =>
      chordMatchesQuery(chord, normalizedQuery),
    );
  }, [instrument, query]);

  const pianoChords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (instrument !== "piano") {
      return [];
    }

    if (!normalizedQuery) {
      return PIANO_CHORDS;
    }

    return PIANO_CHORDS.filter((chord) =>
      chordMatchesQuery(chord, normalizedQuery),
    );
  }, [instrument, query]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div
          className="flex w-full gap-2 overflow-x-auto pb-1 xl:w-auto"
          aria-label="Choose instrument"
        >
          {INSTRUMENTS.map((item) => {
            const isActive = instrument === item.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setInstrument(item.id)}
                className={`h-10 shrink-0 rounded-full border px-5 text-[13px] font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
                  isActive
                    ? "border-[#111] bg-[#111] text-white dark:border-white dark:bg-white dark:text-[#111]"
                    : "border-[#dedede] bg-white text-[#666] hover:border-[#b8b8b8] hover:text-[#111] dark:border-[#303034] dark:bg-[#18181b] dark:text-[#b4b4bc] dark:hover:border-[#4a4a50] dark:hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <label className="flex h-11 w-full items-center gap-3 rounded-full border border-[#dedede] bg-white px-4 text-[#777] transition focus-within:border-[#b8b8b8] focus-within:shadow-[0_0_0_3px_rgba(237,23,70,0.08)] xl:max-w-[360px] dark:border-[#303034] dark:bg-[#18181b] dark:text-[#a1a1aa] dark:focus-within:border-[#4a4a50]">
          <span className="sr-only">Search chords</span>
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chords..."
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[#171717] outline-none placeholder:text-[#8b8b8b] dark:text-[#f5f5f5] dark:placeholder:text-[#707079]"
          />
        </label>
      </div>

      {instrument === "guitar" ? (
        guitarChords.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
            {guitarChords.map((chord) => (
              <ChordCard key={chord.symbol} chord={chord} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-[#fafafa] px-6 py-14 text-center dark:border-[#3b3b40] dark:bg-[#18181b]">
            <p className="text-[14px] font-bold">No guitar chords found</p>
            <p className="mt-1 text-[13px] text-[#666] dark:text-[#b4b4bc]">
              Try another chord name or clear the search field.
            </p>
          </div>
        )
      ) : null}

      {instrument === "piano" ? (
        pianoChords.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {pianoChords.map((chord) => (
              <PianoChordCard key={chord.symbol} chord={chord} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-[#fafafa] px-6 py-14 text-center dark:border-[#3b3b40] dark:bg-[#18181b]">
            <p className="text-[14px] font-bold">No piano chords found</p>
            <p className="mt-1 text-[13px] text-[#666] dark:text-[#b4b4bc]">
              Try another chord name or clear the search field.
            </p>
          </div>
        )
      ) : null}

      {instrument === "ukelele" ? (
        <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-[#fafafa] px-6 py-14 text-center dark:border-[#3b3b40] dark:bg-[#18181b]">
          <p className="text-[14px] font-bold">Ukelele chords are next</p>
          <p className="mt-1 text-[13px] text-[#666] dark:text-[#b4b4bc]">
            This chart is structured to add this instrument without changing the
            chord data API.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function chordMatchesQuery(
  chord: ChordDefinition | PianoChordDefinition,
  query: string,
) {
  const searchableValues = [
    chord.symbol,
    chord.root,
    chord.quality,
    ...(chord.aliases ?? []),
  ];

  return searchableValues.some((value) => value.toLowerCase().includes(query));
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
  );
}
