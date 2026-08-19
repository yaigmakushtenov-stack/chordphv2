"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  saveTrackAnnotationAction,
  type SaveTrackAnnotationActionInput,
} from "@/app/track/[trackId]/annotate/actions";
import {
  transposeChord,
  transposeChordPro,
  type AccidentalPreference,
} from "@/components/track/chord-pro";
import { showToast } from "@/components/shared/toast";

export type AnnotationEditorData = SaveTrackAnnotationActionInput & {
  playbackUrl: string;
  originalFileName: string;
  durationSeconds: number | null;
  updatedAt: string | null;
};

type AnnotationEditorProps = {
  initialData: AnnotationEditorData;
};

const MUSICAL_KEYS = [
  "",
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
];

const fieldClassName =
  "mt-1.5 h-10 w-full rounded-lg border border-[#dedede] bg-white px-3 text-[13px] text-[#111] outline-none transition focus:border-[#ed1746] focus:ring-2 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f5f5f5] dark:focus:border-[#ed1746]";
const labelClassName = "text-[12px] font-semibold text-[#555] dark:text-[#c4c4cc]";

export function AnnotationEditor({ initialData }: AnnotationEditorProps) {
  const [form, setForm] = useState(initialData);
  const [transposeBy, setTransposeBy] = useState(0);
  const [accidentals, setAccidentals] = useState<AccidentalPreference>("sharps");
  const [savedAt, setSavedAt] = useState(initialData.updatedAt);
  const [isPending, startTransition] = useTransition();
  const preview = useMemo(
    () => transposeChordPro(form.lyricsAndChords, transposeBy, accidentals),
    [accidentals, form.lyricsAndChords, transposeBy],
  );
  const displayedKey = form.originalKey
    ? transposeChord(form.originalKey, transposeBy, accidentals)
    : null;

  function updateField<Key extends keyof SaveTrackAnnotationActionInput>(
    field: Key,
    value: SaveTrackAnnotationActionInput[Key],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await saveTrackAnnotationAction({
        trackId: form.trackId,
        title: form.title,
        artist: form.artist,
        album: form.album,
        originalKey: form.originalKey,
        capo: form.capo,
        tempo: form.tempo,
        timeSignature: form.timeSignature,
        tuning: form.tuning,
        lyricsAndChords: form.lyricsAndChords,
        notes: form.notes,
      });

      if (!result.ok) {
        showToast({ title: "Could not save annotation", description: result.error.message, tone: "error" });
        return;
      }

      setSavedAt(result.data.updatedAt);
      showToast({ title: "Annotation saved", description: "Your track details and ChordPro document are up to date.", tone: "success" });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <div className="grid min-w-0 gap-4">
        <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold">{form.title || form.originalFileName}</p>
              <p className="mt-1 truncate text-[12px] text-[#717171] dark:text-[#a1a1aa]">{form.originalFileName}{form.durationSeconds !== null ? ` · ${formatDuration(form.durationSeconds)}` : ""}</p>
            </div>
            <Link href="/music" className="text-[12px] font-bold text-[#ed1746] hover:text-[#c9123a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">Back to library</Link>
          </div>
          <audio controls preload="metadata" src={form.playbackUrl} className="mt-4 w-full" aria-label={`Audio player for ${form.title}`} />
        </section>

        <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Title"><input required maxLength={200} value={form.title} onChange={(event) => updateField("title", event.target.value)} className={fieldClassName} /></Field>
            <Field label="Artist"><input maxLength={200} value={form.artist} onChange={(event) => updateField("artist", event.target.value)} className={fieldClassName} /></Field>
            <Field label="Album"><input maxLength={200} value={form.album} onChange={(event) => updateField("album", event.target.value)} className={fieldClassName} /></Field>
            <Field label="Original key"><select value={form.originalKey} onChange={(event) => updateField("originalKey", event.target.value)} className={fieldClassName}>{MUSICAL_KEYS.map((key) => <option key={key || "none"} value={key}>{key || "Not set"}</option>)}</select></Field>
            <Field label="Capo"><input type="number" min={0} max={12} value={form.capo ?? ""} onChange={(event) => updateField("capo", parseOptionalNumber(event.target.value))} className={fieldClassName} /></Field>
            <Field label="Tempo (BPM)"><input type="number" min={20} max={400} value={form.tempo ?? ""} onChange={(event) => updateField("tempo", parseOptionalNumber(event.target.value))} className={fieldClassName} /></Field>
            <Field label="Time signature"><input maxLength={16} placeholder="4/4" value={form.timeSignature} onChange={(event) => updateField("timeSignature", event.target.value)} className={fieldClassName} /></Field>
            <Field label="Tuning"><input maxLength={80} placeholder="E A D G B E" value={form.tuning} onChange={(event) => updateField("tuning", event.target.value)} className={fieldClassName} /></Field>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-[16px] font-bold">Lyrics and chords</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#717171] dark:text-[#a1a1aa]">Put section names such as <code>[Verse 1]</code>, <code>[Chorus]</code>, or <code>[Pre-Chorus]</code> on their own line. Put bracketed chords on the line above the lyrics, using spaces to position each chord above the word where it changes.</p></div>
            <span className="rounded-full bg-[#fff0f3] px-2 py-1 text-center text-[10px] font-bold text-[#ed1746] dark:bg-[#35141c]">CHORD FORMAT</span>
          </div>
          <textarea value={form.lyricsAndChords} maxLength={100000} onChange={(event) => updateField("lyricsAndChords", event.target.value)} placeholder={'[Verse 1]\n[D]\n  You were the Word at the beginning\n         [G]       [Bm]       [A]\nOne With God the Lord Most High'} className="mt-4 min-h-[420px] w-full resize-y rounded-xl border border-[#dedede] bg-[#fafafa] p-4 font-mono text-[13px] leading-6 text-[#111] outline-none transition focus:border-[#ed1746] focus:ring-2 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f5f5f5]" />
        </section>

        <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
          <Field label="Private notes"><textarea value={form.notes} maxLength={20000} onChange={(event) => updateField("notes", event.target.value)} placeholder="Arrangement, rehearsal, or performance notes" className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-[#dedede] bg-white p-3 text-[13px] leading-5 text-[#111] outline-none focus:border-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f5f5f5]" /></Field>
        </section>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
        <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-[16px] font-bold">Preview</h2><p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">Display only—saving keeps the original chords.</p></div>
            {displayedKey ? <span className="rounded-full bg-[#111] px-3 py-1.5 text-[11px] font-bold text-white dark:bg-white dark:text-[#111]">Key {displayedKey}</span> : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-[#dedede] bg-white dark:border-[#3a3a3f] dark:bg-[#202023]">
              <span className="border-r border-[#dedede] px-3 text-[11px] font-black dark:border-[#3a3a3f]">Tr.</span>
              <button type="button" disabled={transposeBy <= -12} onClick={() => setTransposeBy((value) => Math.max(-12, value - 1))} className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]" aria-label="Transpose down one semitone">−</button>
              <span className="min-w-8 text-center text-[12px] font-bold tabular-nums">{transposeBy}</span>
              <button type="button" disabled={transposeBy >= 12} onClick={() => setTransposeBy((value) => Math.min(12, value + 1))} className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]" aria-label="Transpose up one semitone">+</button>
            </div>
            <button type="button" onClick={() => setTransposeBy(0)} className="h-9 rounded-full border border-[#dedede] px-3 text-[11px] font-bold hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:hover:bg-[#28282c]">Reset</button>
            <select aria-label="Accidental preference" value={accidentals} onChange={(event) => setAccidentals(event.target.value as AccidentalPreference)} className="h-9 rounded-full border border-[#dedede] bg-white px-3 text-[11px] font-bold outline-none focus:border-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#202023]"><option value="sharps">Sharps ♯</option><option value="flats">Flats ♭</option></select>
          </div>
          <ChordPreview source={preview} />
        </section>
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
          <button type="submit" disabled={isPending} className="h-11 rounded-full bg-[#ed1746] px-5 text-[13px] font-bold text-white transition hover:bg-[#d90f3b] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">{isPending ? "Saving…" : "Save annotation"}</button>
          <p className="text-center text-[11px] text-[#717171] dark:text-[#a1a1aa]">{savedAt ? `Last saved ${formatSavedAt(savedAt)}` : "Not saved yet"}</p>
        </div>
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={labelClassName}>{label}{children}</label>;
}

function ChordPreview({ source }: { source: string }) {
  if (!source.trim()) {
    return <div className="mt-5 rounded-xl border border-dashed border-[#d9d9d9] px-4 py-14 text-center text-[13px] text-[#777] dark:border-[#3a3a3f] dark:text-[#a1a1aa]">Your formatted lyrics and chords will appear here.</div>;
  }

  return <div className="mt-5 max-h-[60vh] overflow-auto rounded-xl bg-[#fafafa] p-4 text-[14px] leading-7 dark:bg-[#202023]">{source.split("\n").map((line, index) => <PreviewLine key={index} line={line} />)}</div>;
}

function PreviewLine({ line }: { line: string }) {
  const sectionMatch = /^\s*\[([^\]\r\n]+)\]\s*$/.exec(line);

  if (sectionMatch && !transposeChord(sectionMatch[1].trim(), 0, "sharps")) {
    return (
      <div className="mb-3 mt-6 first:mt-0">
        <span className="inline-flex rounded-full bg-[#e9e9eb] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#4f4f55] dark:bg-[#343438] dark:text-[#d4d4d8]">
          {sectionMatch[1].trim()}
        </span>
      </div>
    );
  }

  const parts = line.split(/(\[[^\]\r\n]+\])/g).filter(Boolean);

  return <div className="min-h-7 whitespace-pre-wrap">{parts.map((part, index) => {
    if (!part.startsWith("[") || !part.endsWith("]")) {
      return <span key={index}>{part}</span>;
    }

    const value = part.slice(1, -1).trim();
    const isChord = Boolean(transposeChord(value, 0, "sharps"));

    return <strong key={index} className={isChord ? "mr-1 inline-block text-[12px] font-black text-[#ed1746]" : "mr-1 inline-block text-[12px] font-bold text-[#666] dark:text-[#b4b4bc]"}>{value}</strong>;
  })}</div>;
}

function parseOptionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${Math.round(seconds % 60).toString().padStart(2, "0")}`;
}

function formatSavedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
