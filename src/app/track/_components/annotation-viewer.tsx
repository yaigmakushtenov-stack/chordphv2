"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import * as TrackActions from "@/actions/track-actions";
import { ChordCard } from "@/components/shared/chords/chord-card";
import { ChordPopover } from "@/app/track/_components/chord-popover";
import { PianoChordCard } from "@/components/shared/chords/piano-chord-card";
import { showToast } from "@/components/shared/toast";

import {
  splitVariationSuffix,
  transposeChord,
  transposeChordPro,
  type AccidentalPreference,
} from "@/app/track/_lib/chord-pro";
import {
  GUITAR_CHORDS,
  PIANO_CHORDS,
  UKELELE_CHORDS,
  normalizeChordSymbol,
  type ChordDefinition,
  type PianoChordDefinition,
} from "@/data/chords";
import { APP_CONSTANTS } from "@/lib/app-constants";
import type { AnnotationViewerData } from "@/types/track";
import type { TrackPreference } from "@/types/track-preference";

export function AnnotationViewer({ track }: { track: AnnotationViewerData }) {
  const router = useRouter();
  const [transpose, setTranspose] = useState(0);
  const [publicityStatus, setPublicityStatus] = useState(
    track.publicityStatus,
  );
  const [isPending, startTransition] = useTransition();
  const [accidentals, setAccidentals] =
    useState<AccidentalPreference>("sharps");
  const [chordInstrument, setChordInstrument] =
    useState<TrackChordInstrument>("guitar");
  const [trackPreference, setTrackPreference] = useState<TrackPreference>({
    c: {},
  });
  const source = useMemo(
    () => transposeChordPro(track.lyricsAndChords, transpose, accidentals),
    [track.lyricsAndChords, transpose, accidentals],
  );
  const usedChords = useMemo(() => getUsedGuitarChords(source), [source]);
  const displayKey =
    transposeChord(track.key, transpose, accidentals) ?? track.key;

  function handleCopy(): void {
    startTransition(async () => {
      const result = await TrackActions.copyPublicAnnotation(track.id);

      if (!result.ok) {
        showToast({
          title: "Unable to save a personal copy",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      showToast({
        title: "Saved to your annotations",
        description: "You can now edit your personal copy.",
        tone: "success",
      });
      router.push(`/track/${result.data.trackId}/annotate`);
    });
  }

  function handleReviewSubmission(): void {
    startTransition(async () => {
      const result = await TrackActions.submitForReview(track.id);

      if (!result.ok) {
        showToast({
          title: "Unable to submit for review",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setPublicityStatus("PENDING");
      showToast({
        title: "Submitted for admin review",
        description:
          "The annotation stays private until an admin approves it.",
        tone: "success",
      });
      router.refresh();
    });
  }

  function handleVariationChange(
    instrument: TrackChordInstrument,
    chordReference: GuitarChordReference,
    variationIndex: number,
  ): void {
    setTrackPreference((currentPreference) => {
      const chordPreference: TrackPreference["c"][string] = [
        ...(currentPreference.c[chordReference.key] ?? []),
      ];
      chordPreference[getChordPreferenceField(instrument)] = variationIndex;

      return {
        ...currentPreference,
        c: {
          ...currentPreference.c,
          [chordReference.key]: chordPreference,
        },
      };
    });
  }

  async function handleCopyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast({
        title: "Public link copied",
        description: "Anyone with this link can view the annotation.",
        tone: "success",
      });
    } catch {
      showToast({
        title: "Unable to copy the link",
        description: "Copy the address from your browser instead.",
        tone: "error",
      });
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-2xl border border-[#e4e4e4] bg-white p-5 dark:border-[#303034] dark:bg-[#171719]">
        <div className="flex flex-col gap-4 border-b border-[#e6e6e6] pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-[#303034]">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ed1746]">Personal chord sheet</p>
            <h2 className="mt-2 truncate text-2xl font-black">{track.title}</h2>
            <p className="mt-1 text-[14px] text-[#666] dark:text-[#b4b4bc]">{track.artistName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {track.isOwner ? (
              <>
                {publicityStatus === "APPROVED" ? (
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[#d9d9d9] px-4 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
                  >
                    Copy public link
                  </button>
                ) : null}
                {publicityStatus === "PRIVATE" ||
                publicityStatus === "REJECTED" ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleReviewSubmission}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[#d9d9d9] px-4 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
                  >
                    {isPending ? "Submitting…" : "Submit for review"}
                  </button>
                ) : null}
                {publicityStatus === "PENDING" ? (
                  <span className="inline-flex h-10 items-center rounded-full bg-[#fff4d6] px-4 text-[11px] font-bold text-[#8a5a00] dark:bg-[#3b2b08] dark:text-[#facc15]">
                    Pending admin review
                  </span>
                ) : null}
                <Link href={`/track/${track.id}/annotate`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">Edit annotation</Link>
              </>
            ) : track.isAuthenticated ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleCopy}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
              >
                {isPending ? "Saving…" : "Save as personal copy"}
              </button>
            ) : (
              <Link href="/login" className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">Sign in to save a copy</Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 py-4">
          <span className="rounded-full bg-[#111] px-3 py-1.5 text-[11px] font-bold text-white dark:bg-white dark:text-[#111]">Key {displayKey}</span>
          <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-[#dedede] bg-white dark:border-[#3a3a3f] dark:bg-[#202023]">
            <span className="border-r border-[#dedede] px-3 text-[11px] font-black dark:border-[#3a3a3f]">Tr.</span>
            <button type="button" disabled={transpose <= -12} onClick={() => setTranspose((value) => Math.max(-12, value - 1))} className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]" aria-label="Transpose down one semitone">−</button>
            <span className="min-w-8 text-center text-[12px] font-bold tabular-nums">{transpose}</span>
            <button type="button" disabled={transpose >= 12} onClick={() => setTranspose((value) => Math.min(12, value + 1))} className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]" aria-label="Transpose up one semitone">+</button>
          </div>
          <button type="button" onClick={() => setTranspose(0)} className="h-9 rounded-full border border-[#dedede] px-3 text-[11px] font-bold hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:hover:bg-[#28282c]">Reset</button>
          <select aria-label="Accidental preference" value={accidentals} onChange={(event) => setAccidentals(event.target.value as AccidentalPreference)} className="h-9 rounded-full border border-[#dedede] bg-white px-3 text-[11px] font-bold outline-none focus:border-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#202023]">
            <option value="sharps">Sharps ♯</option>
            <option value="flats">Flats ♭</option>
          </select>
        </div>

        {usedChords.length ? (
          <TrackChordSection
            chords={usedChords}
            instrument={chordInstrument}
            onInstrumentChange={setChordInstrument}
            trackPreference={trackPreference}
            onVariationChange={handleVariationChange}
          />
        ) : null}

        {source.trim() ? (
          <div className="rounded-xl bg-[#fafafa] p-4 text-[15px] leading-8 dark:bg-[#202023] sm:p-6">
            {source.split("\n").map((line, index) => (
              <ChordLine
                key={index}
                line={line}
                chordInstrument={chordInstrument}
                trackPreference={trackPreference}
                onVariationChange={handleVariationChange}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] px-5 py-16 text-center dark:border-[#3a3a3f]">
            <h3 className="text-[15px] font-bold">No lyrics or chords yet</h3>
            <p className="mt-2 text-[13px] text-[#666] dark:text-[#b4b4bc]">This track is saved and can be completed from the editor.</p>
          </div>
        )}
      </section>

      <aside className="grid content-start gap-4">
        <section className="rounded-2xl border border-[#e4e4e4] bg-white p-5 dark:border-[#303034] dark:bg-[#171719]">
          <h2 className="text-[14px] font-bold">Track details</h2>
          <dl className="mt-4 grid gap-3 text-[12px]">
            <Detail label="Original key" value={track.key} />
            <Detail label="Tuning" value={track.tuning} />
            <Detail label="Capo" value={track.capo === null ? "Not set" : String(track.capo)} />
            <Detail label="Tempo" value={track.tempo === null ? "Not set" : `${track.tempo} BPM`} />
            <Detail label="Time signature" value={track.timeSignature || "Not set"} />
          </dl>
          {track.tags.length ? <div className="mt-4 flex flex-wrap gap-1.5">{track.tags.map((tag) => <span key={tag} className="rounded-full bg-[#fff0f3] px-2.5 py-1 text-[10px] font-bold text-[#c90f39] dark:bg-[#3a111d] dark:text-[#fb7185]">{tag}</span>)}</div> : null}
        </section>

        <section className="rounded-2xl border border-[#e4e4e4] bg-white p-5 dark:border-[#303034] dark:bg-[#171719]">
          <h2 className="text-[14px] font-bold">Track references</h2>
          {track.audio ? <audio controls preload="metadata" src={track.audio.playbackUrl} aria-label={`Audio player for ${track.title}`} className="mt-4 w-full" /> : <p className="mt-3 text-[12px] leading-5 text-[#666] dark:text-[#b4b4bc]">No MP3 attached. This does not affect the annotation.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {track.youtubeLink ? <a href={track.youtubeLink} target="_blank" rel="noreferrer" className="rounded-full border border-[#dedede] px-3 py-2 text-[11px] font-bold hover:border-[#ed1746] hover:text-[#ed1746] dark:border-[#3a3a3f]">YouTube</a> : null}
            {track.spotifyLink ? <a href={track.spotifyLink} target="_blank" rel="noreferrer" className="rounded-full border border-[#dedede] px-3 py-2 text-[11px] font-bold hover:border-[#ed1746] hover:text-[#ed1746] dark:border-[#3a3a3f]">Spotify</a> : null}
          </div>
        </section>

        {track.notes ? <section className="rounded-2xl border border-[#e4e4e4] bg-white p-5 dark:border-[#303034] dark:bg-[#171719]"><h2 className="text-[14px] font-bold">Private notes</h2><p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-[#555] dark:text-[#c4c4cc]">{track.notes}</p></section> : null}
      </aside>
    </div>
  );
}

export function ChordLine({
  line,
  chordInstrument,
  showVariationLabels = true,
  trackPreference,
  onVariationChange,
}: {
  line: string;
  chordInstrument: TrackChordInstrument;
  showVariationLabels?: boolean;
  trackPreference: TrackPreference;
  onVariationChange: (
    instrument: TrackChordInstrument,
    chordReference: GuitarChordReference,
    variationIndex: number,
  ) => void;
}) {
  const sectionMatch = /^\s*\[([^\]\r\n]+)\]\s*$/.exec(line);
  if (sectionMatch && !transposeChord(sectionMatch[1].trim(), 0, "sharps")) {
    return <div className="mb-3 mt-6 first:mt-0"><span className="inline-flex rounded-full bg-[#e9e9eb] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#4f4f55] dark:bg-[#343438] dark:text-[#d4d4d8]">{sectionMatch[1].trim()}</span></div>;
  }

  const parts = line.split(/(\[[^\]\r\n]+\])/g).filter(Boolean);
  return <div className="min-h-8 whitespace-pre-wrap">{parts.map((part, index) => {
    if (!part.startsWith("[") || !part.endsWith("]")) return <span key={index}>{part}</span>;
    const value = part.slice(1, -1).trim();
    const isChord = Boolean(transposeChord(value, 0, "sharps"));
    const chordReference = isChord ? getGuitarChordReference(value) : null;
    const pianoReference = chordReference
      ? getPianoChordReference(chordReference)
      : null;
    const ukuleleReference = chordReference
      ? getUkuleleChordReference(chordReference)
      : null;

    if (!chordReference) {
      return <strong key={index} className={isChord ? "mr-1 inline-block text-[13px] font-black text-[#ed1746]" : "mr-1 inline-block text-[12px] font-bold text-[#666] dark:text-[#b4b4bc]"}>{value}</strong>;
    }

    return (
      <ChordPopover
        key={index}
        content={
          chordInstrument === "piano" && pianoReference ? (
            <PianoChordCard
              key={`${pianoReference.chord.symbol}-${pianoReference.variationIndex}`}
              chord={pianoReference.chord}
              compact
              initialVariationIndex={pianoReference.variationIndex}
              selectedVariationIndex={getSelectedVariationIndex(
                "piano",
                chordReference,
                pianoReference.variationIndex,
                trackPreference,
              )}
              onVariationIndexChange={(variationIndex) =>
                onVariationChange("piano", chordReference, variationIndex)
              }
              variationLabel={
                showVariationLabels
                  ? getPianoChordVariationLabel(pianoReference)
                  : null
              }
            />
          ) : chordInstrument === "ukulele" && ukuleleReference ? (
            <ChordCard
              key={`${ukuleleReference.chord.symbol}-${ukuleleReference.variationIndex}`}
              chord={ukuleleReference.chord}
              compact
              instrumentLabel="ukulele"
              initialVariationIndex={ukuleleReference.variationIndex}
              selectedVariationIndex={getSelectedVariationIndex(
                "ukulele",
                chordReference,
                ukuleleReference.variationIndex,
                trackPreference,
              )}
              onVariationIndexChange={(variationIndex) =>
                onVariationChange("ukulele", chordReference, variationIndex)
              }
              variationLabel={
                showVariationLabels
                  ? getUkuleleChordVariationLabel(ukuleleReference)
                  : null
              }
            />
          ) : (
            <ChordCard
              key={`${chordReference.chord.symbol}-${chordReference.variationIndex}`}
              chord={chordReference.chord}
              compact
              initialVariationIndex={chordReference.variationIndex}
              selectedVariationIndex={getSelectedVariationIndex(
                "guitar",
                chordReference,
                chordReference.variationIndex,
                trackPreference,
              )}
              onVariationIndexChange={(variationIndex) =>
                onVariationChange("guitar", chordReference, variationIndex)
              }
              variationLabel={
                showVariationLabels ? getChordVariationLabel(chordReference) : null
              }
            />
          )
        }
      >
        <button
          type="button"
          className="mr-1 inline-block rounded bg-[#e7e7e9] px-1.5 py-0.5 text-[13px] font-black leading-none text-[#111] transition hover:bg-[#ffdce4] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#343438] dark:text-white dark:hover:bg-[#4a1c28]"
        >
          <PreferredChordSymbolLabel
            chordInstrument={chordInstrument}
            chordReference={chordReference}
            pianoReference={pianoReference}
            ukuleleReference={ukuleleReference}
            showVariationLabels={showVariationLabels}
            trackPreference={trackPreference}
          />
        </button>
      </ChordPopover>
    );
  })}</div>;
}

export function TrackChordSection({
  chords,
  instrument,
  showVariationLabels = true,
  onInstrumentChange,
  trackPreference,
  onVariationChange,
}: {
  chords: GuitarChordReference[];
  instrument: TrackChordInstrument;
  showVariationLabels?: boolean;
  onInstrumentChange: (instrument: TrackChordInstrument) => void;
  trackPreference: TrackPreference;
  onVariationChange: (
    instrument: TrackChordInstrument,
    chordReference: GuitarChordReference,
    variationIndex: number,
  ) => void;
}) {
  const pianoChords = useMemo(
    () => chords.map(getPianoChordReference),
    [chords],
  );
  const ukuleleChords = useMemo(
    () => chords.map(getUkuleleChordReference),
    [chords],
  );

  return (
    <section className="border-t border-[#e6e6e6] py-5 dark:border-[#303034]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-[20px] font-black uppercase tracking-[0.02em]">
          Chords
        </h3>
        <div
          className="flex gap-5 overflow-x-auto text-[13px] font-black uppercase"
          aria-label="Chord instrument"
        >
          <button
            type="button"
            aria-pressed={instrument === "guitar"}
            onClick={() => onInstrumentChange("guitar")}
            className={
              instrument === "guitar"
                ? "border-b-2 border-[#111] pb-2 text-[#111] dark:border-white dark:text-white"
                : "pb-2 text-[#8a8a8a] transition hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#a1a1aa] dark:hover:text-white"
            }
          >
            Guitar
          </button>
          <button
            type="button"
            aria-pressed={instrument === "ukulele"}
            onClick={() => onInstrumentChange("ukulele")}
            className={
              instrument === "ukulele"
                ? "border-b-2 border-[#111] pb-2 text-[#111] dark:border-white dark:text-white"
                : "pb-2 text-[#8a8a8a] transition hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#a1a1aa] dark:hover:text-white"
            }
          >
            Ukulele
          </button>
          <button
            type="button"
            aria-pressed={instrument === "piano"}
            onClick={() => onInstrumentChange("piano")}
            className={
              instrument === "piano"
                ? "border-b-2 border-[#111] pb-2 text-[#111] dark:border-white dark:text-white"
                : "pb-2 text-[#8a8a8a] transition hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#a1a1aa] dark:hover:text-white"
            }
          >
            Piano
          </button>
        </div>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {instrument === "guitar"
          ? chords.map((chordReference) => (
              <div
                key={chordReference.key}
                className="w-[108px] shrink-0 [&_article]:min-h-[156px] [&_article]:px-2 [&_article]:pt-2"
              >
                <ChordCard
                  chord={chordReference.chord}
                  initialVariationIndex={chordReference.variationIndex}
                  selectedVariationIndex={getSelectedVariationIndex(
                    "guitar",
                    chordReference,
                    chordReference.variationIndex,
                    trackPreference,
                  )}
                  onVariationIndexChange={(variationIndex) =>
                    onVariationChange("guitar", chordReference, variationIndex)
                  }
                  variationLabel={
                    showVariationLabels
                      ? getChordVariationLabel(chordReference)
                      : null
                  }
                  unframed
                />
              </div>
            ))
          : instrument === "ukulele"
          ? ukuleleChords.map((chordReference, index) => (
              <div
                key={chordReference.key}
                className="w-[108px] shrink-0 [&_article]:min-h-[156px] [&_article]:px-2 [&_article]:pt-2"
              >
                <ChordCard
                  chord={chordReference.chord}
                  instrumentLabel="ukulele"
                  initialVariationIndex={chordReference.variationIndex}
                  selectedVariationIndex={getSelectedVariationIndex(
                    "ukulele",
                    chords[index],
                    chordReference.variationIndex,
                    trackPreference,
                  )}
                  onVariationIndexChange={(variationIndex) =>
                    onVariationChange("ukulele", chords[index], variationIndex)
                  }
                  variationLabel={
                    showVariationLabels
                      ? getUkuleleChordVariationLabel(chordReference)
                      : null
                  }
                  unframed
                />
              </div>
            ))
          : pianoChords.map((chordReference, index) => (
              <div
                key={chordReference.key}
                className="w-[154px] shrink-0 [&_article]:min-h-[164px] [&_article]:px-2 [&_article]:pt-2"
              >
                <PianoChordCard
                  chord={chordReference.chord}
                  initialVariationIndex={chordReference.variationIndex}
                  selectedVariationIndex={getSelectedVariationIndex(
                    "piano",
                    chords[index],
                    chordReference.variationIndex,
                    trackPreference,
                  )}
                  onVariationIndexChange={(variationIndex) =>
                    onVariationChange("piano", chords[index], variationIndex)
                  }
                  variationLabel={
                    showVariationLabels
                      ? getPianoChordVariationLabel(chordReference)
                      : null
                  }
                  unframed
                />
              </div>
            ))}
      </div>
    </section>
  );
}

function PreferredChordSymbolLabel({
  chordInstrument,
  chordReference,
  pianoReference,
  ukuleleReference,
  showVariationLabels,
  trackPreference,
}: {
  chordInstrument: TrackChordInstrument;
  chordReference: GuitarChordReference;
  pianoReference: PianoChordReference | null;
  ukuleleReference: UkuleleChordReference | null;
  showVariationLabels: boolean;
  trackPreference: TrackPreference;
}) {
  if (chordInstrument === "piano" && pianoReference) {
    const selectedVariationIndex = getSelectedVariationIndex(
      "piano",
      chordReference,
      pianoReference.variationIndex,
      trackPreference,
    );
    const selectedVariation =
      pianoReference.chord.variations[selectedVariationIndex];

    return <>{selectedVariation?.symbol ?? chordReference.displaySymbol}</>;
  }

  if (chordInstrument === "ukulele" && ukuleleReference) {
    const selectedVariationIndex = getSelectedVariationIndex(
      "ukulele",
      chordReference,
      ukuleleReference.variationIndex,
      trackPreference,
    );
    const selectedVariationNumber = selectedVariationIndex + 1;
    const hasPreference =
      getChordPreference(trackPreference, chordReference)?.[2] !== undefined;

    if (
      !showVariationLabels ||
      !APP_CONSTANTS.featureFlag.showChordVariationLabel ||
      (!ukuleleReference.hasExplicitVariation && !hasPreference)
    ) {
      return <>{chordReference.displaySymbol}</>;
    }

    return (
      <>
        {chordReference.displaySymbol}
        <sup className="ml-0.5 align-super text-[0.62em] leading-none">
          {selectedVariationNumber}
        </sup>
      </>
    );
  }

  const selectedVariationIndex = getSelectedVariationIndex(
    "guitar",
    chordReference,
    chordReference.variationIndex,
    trackPreference,
  );
  const selectedVariationNumber = selectedVariationIndex + 1;
  const hasPreference =
    getChordPreference(trackPreference, chordReference)?.[0] !== undefined;

  if (
    !showVariationLabels ||
    !APP_CONSTANTS.featureFlag.showChordVariationLabel ||
    (!chordReference.hasExplicitVariation && !hasPreference)
  ) {
    return <>{chordReference.displaySymbol}</>;
  }

  return (
    <>
      {chordReference.displaySymbol}
      <sup className="ml-0.5 align-super text-[0.62em] leading-none">
        {selectedVariationNumber}
      </sup>
    </>
  );
}

function getChordVariationLabel(chordReference: GuitarChordReference) {
  return APP_CONSTANTS.featureFlag.showChordVariationLabel &&
    chordReference.hasExplicitVariation
    ? chordReference.variationNumber
    : null;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-[#717171] dark:text-[#a1a1aa]">{label}</dt><dd className="text-right font-bold">{value}</dd></div>;
}

type GuitarChordReference = {
  key: string;
  chord: ChordDefinition;
  displaySymbol: string;
  hasExplicitVariation: boolean;
  variationIndex: number;
  variationNumber: number | null;
};

type TrackChordInstrument = "guitar" | "ukulele" | "piano";

type PianoChordReference = {
  key: string;
  chord: PianoChordDefinition;
  hasExplicitVariation: boolean;
  variationIndex: number;
  variationNumber: number | null;
};

type UkuleleChordReference = {
  key: string;
  chord: ChordDefinition;
  hasExplicitVariation: boolean;
  variationIndex: number;
  variationNumber: number | null;
};

export function getUsedGuitarChords(source: string): GuitarChordReference[] {
  const references = new Map<string, GuitarChordReference>();

  for (const match of source.matchAll(/\[([^\]\r\n]+)\]/g)) {
    const reference = getGuitarChordReference(match[1].trim());

    if (!reference || references.has(reference.key)) {
      continue;
    }

    references.set(reference.key, reference);
  }

  return Array.from(references.values());
}

function getGuitarChordReference(value: string): GuitarChordReference | null {
  const parsedChord = splitVariationSuffix(value);
  const normalizedSymbol = normalizeChordSymbol(parsedChord.symbol);

  if (!normalizedSymbol) {
    return null;
  }

  const chord =
    findGuitarChord(normalizedSymbol) ?? createEmptyGuitarChord(normalizedSymbol);

  if (!chord) {
    return null;
  }

  return {
    key: `${chord.symbol}-${parsedChord.variationNumber ?? 1}`,
    chord,
    displaySymbol: chord.symbol,
    hasExplicitVariation: parsedChord.variationNumber !== null,
    variationIndex: parsedChord.variationNumber
      ? parsedChord.variationNumber - 1
      : 0,
    variationNumber: parsedChord.variationNumber,
  };
}

function findGuitarChord(symbol: string): ChordDefinition | null {
  const candidates = getNormalizedChordCandidates(symbol);

  for (const candidate of candidates) {
    const chord = GUITAR_CHORDS.find((item) => item.symbol === candidate);

    if (chord) {
      return chord;
    }
  }

  return null;
}

function getPianoChordReference(
  guitarReference: GuitarChordReference,
): PianoChordReference {
  const chord =
    findPianoChord(guitarReference.displaySymbol) ??
    createEmptyPianoChord(guitarReference.displaySymbol);

  return {
    key: `${chord.symbol}-${guitarReference.variationNumber ?? 1}`,
    chord,
    hasExplicitVariation: guitarReference.hasExplicitVariation,
    variationIndex: guitarReference.variationIndex,
    variationNumber: guitarReference.variationNumber,
  };
}

function getUkuleleChordReference(
  guitarReference: GuitarChordReference,
): UkuleleChordReference {
  const chord =
    findUkuleleChord(guitarReference.displaySymbol) ??
    createEmptyUkuleleChord(guitarReference.displaySymbol);

  return {
    key: `${chord.symbol}-${guitarReference.variationNumber ?? 1}`,
    chord,
    hasExplicitVariation: guitarReference.hasExplicitVariation,
    variationIndex: guitarReference.variationIndex,
    variationNumber: guitarReference.variationNumber,
  };
}

function getPianoChordVariationLabel(chordReference: PianoChordReference) {
  return APP_CONSTANTS.featureFlag.showChordVariationLabel &&
    chordReference.hasExplicitVariation
    ? chordReference.variationNumber
    : null;
}

function getUkuleleChordVariationLabel(chordReference: UkuleleChordReference) {
  return APP_CONSTANTS.featureFlag.showChordVariationLabel &&
    chordReference.hasExplicitVariation
    ? chordReference.variationNumber
    : null;
}

function getSelectedVariationIndex(
  instrument: TrackChordInstrument,
  chordReference: GuitarChordReference,
  fallbackVariationIndex: number,
  trackPreference: TrackPreference,
) {
  return (
    getChordPreference(trackPreference, chordReference)?.[
      getChordPreferenceField(instrument)
    ] ?? fallbackVariationIndex
  );
}

function getChordPreference(
  trackPreference: TrackPreference,
  chordReference: GuitarChordReference,
) {
  return trackPreference.c[chordReference.key];
}

function getChordPreferenceField(instrument: TrackChordInstrument): 0 | 1 | 2 {
  if (instrument === "guitar") {
    return 0;
  }

  return instrument === "piano" ? 1 : 2;
}

function findPianoChord(symbol: string): PianoChordDefinition | null {
  const candidates = getNormalizedChordCandidates(symbol);

  for (const candidate of candidates) {
    const chord = PIANO_CHORDS.find((item) => item.symbol === candidate);

    if (chord) {
      return chord;
    }
  }

  return null;
}

function findUkuleleChord(symbol: string): ChordDefinition | null {
  const candidates = getNormalizedChordCandidates(symbol);

  for (const candidate of candidates) {
    const chord = UKELELE_CHORDS.find((item) => item.symbol === candidate);

    if (chord) {
      return chord;
    }
  }

  return null;
}

function createEmptyGuitarChord(symbol: string): ChordDefinition | null {
  const parsedChord = parseChordSymbol(symbol);

  if (!parsedChord) {
    return null;
  }

  return {
    symbol,
    root: parsedChord.root,
    quality: parsedChord.quality,
    bass: parsedChord.bass,
    variations: [
      {
        id: `${symbol.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-empty`,
        frets: [0, 0, 0, 0, 0, 0],
      },
    ],
  };
}

function getNormalizedChordCandidates(symbol: string): string[] {
  return [
    normalizeChordSymbol(symbol),
    normalizeChordSymbol(transposeChord(symbol, 0, "sharps") ?? ""),
    normalizeChordSymbol(transposeChord(symbol, 0, "flats") ?? ""),
  ].filter((value, index, values): value is string =>
    Boolean(value && values.indexOf(value) === index),
  );
}

function createEmptyPianoChord(symbol: string): PianoChordDefinition {
  const parsedChord = parseChordSymbol(symbol);

  return {
    symbol,
    root: parsedChord?.root ?? symbol,
    quality: parsedChord?.quality ?? "",
    variations: [
      {
        id: `${symbol.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-empty`,
        symbol,
        label: "No chord data",
        notes: [],
      },
    ],
  };
}

function createEmptyUkuleleChord(symbol: string): ChordDefinition {
  const parsedChord = parseChordSymbol(symbol);

  return {
    symbol,
    root: parsedChord?.root ?? symbol,
    quality: parsedChord?.quality ?? "",
    ...(parsedChord?.bass ? { bass: parsedChord.bass } : {}),
    variations: [
      {
        id: `${symbol.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-empty`,
        frets: [0, 0, 0, 0],
      },
    ],
  };
}

function parseChordSymbol(symbol: string): {
  root: string;
  quality: string;
  bass?: string;
} | null {
  const match = /^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/.exec(symbol);

  if (!match) {
    return null;
  }

  return {
    root: match[1],
    quality: match[2],
    ...(match[3] ? { bass: match[3] } : {}),
  };
}
