"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  copyPublicAnnotationAction,
  submitAnnotationForReviewAction,
} from "@/app/track/[trackId]/actions";
import { ChordCard } from "@/components/chord-chart/chord-card";
import { ChordPopover } from "@/components/chord-chart/chord-popover";
import { showToast } from "@/components/shared/toast";

import {
  splitVariationSuffix,
  transposeChord,
  transposeChordPro,
  type AccidentalPreference,
} from "@/components/track/chord-pro";
import { GUITAR_CHORDS, type ChordDefinition } from "@/data/chords";

export type AnnotationViewerData = {
  id: string;
  title: string;
  artistName: string;
  key: string;
  tuning: string;
  capo: number | null;
  tempo: number | null;
  timeSignature: string;
  tags: string[];
  lyricsAndChords: string;
  notes: string;
  youtubeLink: string | null;
  spotifyLink: string | null;
  audio: { playbackUrl: string; originalFileName: string } | null;
  updatedAt: string;
  isOwner: boolean;
  isAuthenticated: boolean;
  publicityStatus: "PRIVATE" | "PENDING" | "REJECTED" | "APPROVED";
};

export function AnnotationViewer({ track }: { track: AnnotationViewerData }) {
  const router = useRouter();
  const [transpose, setTranspose] = useState(0);
  const [publicityStatus, setPublicityStatus] = useState(
    track.publicityStatus,
  );
  const [isPending, startTransition] = useTransition();
  const [accidentals, setAccidentals] =
    useState<AccidentalPreference>("sharps");
  const source = useMemo(
    () => transposeChordPro(track.lyricsAndChords, transpose, accidentals),
    [track.lyricsAndChords, transpose, accidentals],
  );
  const usedChords = useMemo(() => getUsedGuitarChords(source), [source]);
  const displayKey =
    transposeChord(track.key, transpose, accidentals) ?? track.key;

  function handleCopy(): void {
    startTransition(async () => {
      const result = await copyPublicAnnotationAction(track.id);

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
      const result = await submitAnnotationForReviewAction(track.id);

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

        {usedChords.length ? <TrackChordSection chords={usedChords} /> : null}

        {source.trim() ? (
          <div className="rounded-xl bg-[#fafafa] p-4 text-[15px] leading-8 dark:bg-[#202023] sm:p-6">
            {source.split("\n").map((line, index) => <ChordLine key={index} line={line} />)}
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

function ChordLine({ line }: { line: string }) {
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

    if (!chordReference) {
      return <strong key={index} className={isChord ? "mr-1 inline-block text-[13px] font-black text-[#ed1746]" : "mr-1 inline-block text-[12px] font-bold text-[#666] dark:text-[#b4b4bc]"}>{value}</strong>;
    }

    return (
      <ChordPopover
        key={index}
        chord={chordReference.chord}
        initialVariationIndex={chordReference.variationIndex}
      >
        <button
          type="button"
          className="mr-1 inline-block rounded bg-[#e7e7e9] px-1.5 py-0.5 text-[13px] font-black leading-none text-[#111] transition hover:bg-[#ffdce4] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#343438] dark:text-white dark:hover:bg-[#4a1c28]"
        >
          {chordReference.displaySymbol}
        </button>
      </ChordPopover>
    );
  })}</div>;
}

function TrackChordSection({
  chords,
}: {
  chords: GuitarChordReference[];
}) {
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
            aria-pressed="true"
            className="border-b-2 border-[#111] pb-2 text-[#111] dark:border-white dark:text-white"
          >
            Guitar
          </button>
          <button
            type="button"
            disabled
            className="cursor-not-allowed pb-2 text-[#8a8a8a] opacity-55 dark:text-[#a1a1aa]"
          >
            Ukelele
          </button>
          <button
            type="button"
            disabled
            className="cursor-not-allowed pb-2 text-[#8a8a8a] opacity-55 dark:text-[#a1a1aa]"
          >
            Piano
          </button>
        </div>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {chords.map((chordReference) => (
          <div
            key={chordReference.key}
            className="w-[118px] shrink-0 [&_article]:min-h-[168px] [&_article]:px-2 [&_article]:pt-2"
          >
            <ChordCard
              chord={chordReference.chord}
              initialVariationIndex={chordReference.variationIndex}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-[#717171] dark:text-[#a1a1aa]">{label}</dt><dd className="text-right font-bold">{value}</dd></div>;
}

type GuitarChordReference = {
  key: string;
  chord: ChordDefinition;
  displaySymbol: string;
  variationIndex: number;
};

function getUsedGuitarChords(source: string): GuitarChordReference[] {
  const references = new Map<string, GuitarChordReference>();

  for (const match of source.matchAll(/\[([^\]\r\n]+)\]/g)) {
    const reference = getGuitarChordReference(match[1].trim());

    if (!reference || references.has(reference.displaySymbol)) {
      continue;
    }

    references.set(reference.displaySymbol, reference);
  }

  return Array.from(references.values());
}

function getGuitarChordReference(value: string): GuitarChordReference | null {
  const parsedChord = splitVariationSuffix(value);
  const chord = findGuitarChord(parsedChord.symbol);

  if (!chord) {
    return null;
  }

  return {
    key: `${chord.symbol}-${parsedChord.variationNumber ?? 1}`,
    chord,
    displaySymbol: parsedChord.symbol,
    variationIndex: parsedChord.variationNumber
      ? parsedChord.variationNumber - 1
      : 0,
  };
}

function findGuitarChord(symbol: string): ChordDefinition | null {
  const candidates = [
    symbol,
    transposeChord(symbol, 0, "sharps"),
    transposeChord(symbol, 0, "flats"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const chord = GUITAR_CHORDS.find((item) => item.symbol === candidate);

    if (chord) {
      return chord;
    }
  }

  return null;
}
