"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import * as SetListActions from "@/actions/setlist-actions";
import { showToast } from "@/components/shared/toast";
import { MUSICAL_KEYS, TRACK_TUNINGS } from "@/lib/music/track-options";
import type { SetListTrackArrangement } from "@/types/setlist";

type SetListTrackArrangementEditorProps = {
  arrangement: SetListTrackArrangement;
  artistName: string;
  setListId: string;
  setListTitle: string;
  setListTrackId: string;
  trackTitle: string;
};

export function SetListTrackArrangementEditor({
  arrangement: initialArrangement,
  artistName,
  setListId,
  setListTitle,
  setListTrackId,
  trackTitle,
}: SetListTrackArrangementEditorProps) {
  const router = useRouter();
  const [arrangement, setArrangement] = useState(initialArrangement);
  const [isPending, startTransition] = useTransition();

  function update<Key extends keyof SetListTrackArrangement>(
    field: Key,
    value: SetListTrackArrangement[Key],
  ): void {
    setArrangement((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    startTransition(async () => {
      const result = await SetListActions.saveTrackArrangement({
        setListId,
        setListTrackId,
        arrangement,
      });

      if (!result.ok) {
        showToast({
          title: "Arrangement not saved",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      showToast({ title: "Arrangement saved", tone: "success" });
      router.push(`/setlists/${setListId}/tracks/${setListTrackId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="rounded-2xl border border-[#e4e4e4] bg-white p-5 dark:border-[#303034] dark:bg-[#171719]">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#ed1746]">
          {setListTitle}
        </p>
        <h2 className="mt-2 text-[22px] font-black">{trackTitle}</h2>
        <p className="mt-1 text-[13px] text-[#666] dark:text-[#b4b4bc]">
          {artistName} · The root track will not be changed.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Arrangement label">
            <input
              maxLength={80}
              value={arrangement.label}
              onChange={(event) => update("label", event.target.value)}
              placeholder="Acoustic, Sunday key…"
              className={fieldClassName}
            />
          </Field>
          <Field label="Key">
            <select
              value={arrangement.key}
              onChange={(event) => update("key", event.target.value)}
              className={fieldClassName}
            >
              {MUSICAL_KEYS.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </Field>
          <Field label="Tuning">
            <select
              value={arrangement.tuning}
              onChange={(event) => update("tuning", event.target.value)}
              className={fieldClassName}
            >
              {TRACK_TUNINGS.map((tuning) => (
                <option key={tuning} value={tuning}>{tuning}</option>
              ))}
            </select>
          </Field>
          <Field label="Time signature">
            <input
              maxLength={16}
              value={arrangement.timeSignature}
              onChange={(event) => update("timeSignature", event.target.value)}
              placeholder="4/4"
              className={fieldClassName}
            />
          </Field>
          <Field label="Capo">
            <input
              type="number"
              min={0}
              max={12}
              value={arrangement.capo ?? ""}
              onChange={(event) =>
                update("capo", parseOptionalInteger(event.target.value))
              }
              className={fieldClassName}
            />
          </Field>
          <Field label="Tempo (BPM)">
            <input
              type="number"
              min={20}
              max={400}
              value={arrangement.tempo ?? ""}
              onChange={(event) =>
                update("tempo", parseOptionalInteger(event.target.value))
              }
              className={fieldClassName}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e4e4e4] bg-white p-5 dark:border-[#303034] dark:bg-[#171719]">
        <Field label="Lyrics and chords">
          <textarea
            required
            maxLength={100_000}
            value={arrangement.lyricsAndChords}
            wrap="off"
            onChange={(event) => update("lyricsAndChords", event.target.value)}
            className="mt-1.5 min-h-[480px] w-full resize-y overflow-auto rounded-xl border border-[#dedede] bg-[#fafafa] p-4 font-mono text-[13px] leading-6 outline-none transition [tab-size:4] focus:border-[#ed1746] focus:ring-2 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023]"
          />
        </Field>
      </section>

      <section className="rounded-2xl border border-[#e4e4e4] bg-white p-5 dark:border-[#303034] dark:bg-[#171719]">
        <Field label="Arrangement notes">
          <textarea
            maxLength={20_000}
            rows={5}
            value={arrangement.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Rehearsal cues, transitions, or performance notes"
            className="mt-1.5 w-full resize-y rounded-xl border border-[#dedede] bg-white p-3 text-[13px] leading-5 outline-none transition focus:border-[#ed1746] focus:ring-2 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023]"
          />
        </Field>
      </section>

      <footer className="flex flex-wrap justify-end gap-2 rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
        <Link
          href={`/setlists/${setListId}`}
          className="inline-flex h-11 items-center rounded-full border border-[#d9d9d9] px-5 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || !arrangement.lyricsAndChords.trim()}
          className="inline-flex h-11 items-center rounded-full bg-[#ed1746] px-6 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-wait disabled:opacity-55"
        >
          {isPending ? "Saving…" : "Save arrangement"}
        </button>
      </footer>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[12px] font-bold">
      {label}
      {children}
    </label>
  );
}

function parseOptionalInteger(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

const fieldClassName =
  "mt-1.5 h-11 w-full rounded-xl border border-[#dedede] bg-white px-3 text-[13px] outline-none transition focus:border-[#ed1746] focus:ring-2 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023]";
