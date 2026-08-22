"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import * as TrackActions from "@/actions/track-actions";
import { AudioUpload } from "@/app/track/_components/audio/audio-upload";
import { showToast } from "@/components/shared/toast";
import {
  MUSICAL_KEYS,
  MAX_TRACK_TAGS,
  TRACK_JOIN_PHRASES,
  TRACK_TAG_GROUPS,
  TRACK_TAGS,
  TRACK_TUNINGS,
} from "@/lib/music/track-options";
import {
  formatPlainChordLines,
  transposeChord,
  transposeChordPro,
  type AccidentalPreference,
} from "@/app/track/_lib/chord-pro";
import type { MusicFileListItemData } from "@/types/music";
import type {
  AnnotationEditorData,
  SaveTrackAnnotationActionInput,
  SaveTrackDetailsActionInput,
} from "@/types/track";

type AnnotationEditorProps = {
  initialData: AnnotationEditorData;
  mode?: "create" | "edit";
};

type TrackDetailsDraft = Omit<SaveTrackDetailsActionInput, "trackId">;
type TrackAnnotationDraft = Omit<SaveTrackAnnotationActionInput, "trackId">;
type SelectedTrackAudio = Pick<
  MusicFileListItemData,
  "id" | "title" | "originalFileName" | "playbackUrl" | "durationSeconds"
>;

type StoredTrackDetailsDraft = Omit<TrackDetailsDraft, "tags"> & {
  tags?: string[];
};

type StoredAnnotationDraft = {
  details: StoredTrackDetailsDraft;
  annotation: TrackAnnotationDraft;
  audio?: SelectedTrackAudio | null;
};

const NEW_TRACK_DRAFT_KEY = "chordph:new-track-annotation:v1";

const fieldClassName =
  "mt-1.5 h-10 w-full rounded-lg border border-[#dedede] bg-white px-3 text-[13px] text-[#111] outline-none transition focus:border-[#ed1746] focus:ring-2 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f5f5f5] dark:focus:border-[#ed1746]";
const labelClassName =
  "text-[12px] font-semibold text-[#555] dark:text-[#c4c4cc]";

export function AnnotationEditor({
  initialData,
  mode = "edit",
}: AnnotationEditorProps) {
  const router = useRouter();
  const isCreateMode = mode === "create";
  const [currentStep, setCurrentStep] = useState(1);
  const [details, setDetails] = useState<TrackDetailsDraft>({
    title: initialData.title,
    artistName: initialData.artistName,
    key: initialData.key,
    capo: initialData.capo,
    tempo: initialData.tempo,
    timeSignature: initialData.timeSignature,
    tuning: normalizeTrackTuning(initialData.tuning),
    youtubeLink: initialData.youtubeLink,
    spotifyLink: initialData.spotifyLink,
    tags: initialData.tags,
    additionalArtists: initialData.additionalArtists,
  });
  const [annotation, setAnnotation] = useState<TrackAnnotationDraft>({
    lyricsAndChords: initialData.lyricsAndChords,
    notes: initialData.notes,
  });
  const [selectedAudio, setSelectedAudio] = useState<SelectedTrackAudio | null>(
    null,
  );
  const [detailsSavedAt, setDetailsSavedAt] = useState(
    initialData.detailsUpdatedAt,
  );
  const [annotationSavedAt, setAnnotationSavedAt] = useState(
    initialData.annotationUpdatedAt,
  );
  const [transposeBy, setTransposeBy] = useState(0);
  const [accidentals, setAccidentals] =
    useState<AccidentalPreference>("sharps");
  const [isDetailsPending, startDetailsTransition] = useTransition();
  const [isAnnotationPending, startAnnotationTransition] = useTransition();
  const [isDraftReady, setIsDraftReady] = useState(!isCreateMode);
  const [draftStorageAvailable, setDraftStorageAvailable] = useState(true);
  const preview = useMemo(
    () =>
      transposeChordPro(
        annotation.lyricsAndChords,
        transposeBy,
        accidentals,
      ),
    [accidentals, annotation.lyricsAndChords, transposeBy],
  );
  const chordLineFormatting = useMemo(
    () => formatPlainChordLines(annotation.lyricsAndChords),
    [annotation.lyricsAndChords],
  );
  const displayedKey = details.key
    ? transposeChord(details.key, transposeBy, accidentals)
    : null;

  useEffect(() => {
    if (!isCreateMode) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        const savedDraft = window.localStorage.getItem(NEW_TRACK_DRAFT_KEY);

        if (savedDraft) {
          const parsedDraft: unknown = JSON.parse(savedDraft);

          if (isStoredAnnotationDraft(parsedDraft)) {
            setDetails({
              ...parsedDraft.details,
              tuning: normalizeTrackTuning(parsedDraft.details.tuning),
              tags: normalizeTrackTags(parsedDraft.details.tags),
            });
            setAnnotation(parsedDraft.annotation);
            setSelectedAudio(parsedDraft.audio ?? null);
          }
        }
      } catch {
        setDraftStorageAvailable(false);
      } finally {
        setIsDraftReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isCreateMode]);

  useEffect(() => {
    if (!isCreateMode || !isDraftReady || !draftStorageAvailable) {
      return;
    }

    try {
      const draft: StoredAnnotationDraft = {
        details,
        annotation,
        audio: selectedAudio,
      };
      window.localStorage.setItem(NEW_TRACK_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      const timeoutId = window.setTimeout(() => {
        setDraftStorageAvailable(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [
    annotation,
    details,
    draftStorageAvailable,
    isCreateMode,
    isDraftReady,
    selectedAudio,
  ]);

  function updateDetails<Key extends keyof TrackDetailsDraft>(
    field: Key,
    value: TrackDetailsDraft[Key],
  ) {
    setDetails((current) => ({ ...current, [field]: value }));
  }

  function updateAnnotation<Key extends keyof TrackAnnotationDraft>(
    field: Key,
    value: TrackAnnotationDraft[Key],
  ) {
    setAnnotation((current) => ({ ...current, [field]: value }));
  }

  function saveDetails() {
    const trackId = initialData.trackId;

    if (!trackId) {
      return;
    }

    startDetailsTransition(async () => {
      const result = await TrackActions.saveDetails({
        trackId,
        ...details,
      });

      if (!result.ok) {
        showToast({
          title: "Could not save track details",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setDetailsSavedAt(result.data.updatedAt);
      showToast({
        title: "Track details saved",
        description: "Song and collaborator details are up to date.",
        tone: "success",
      });
    });
  }

  function saveAnnotation() {
    startAnnotationTransition(async () => {
      if (isCreateMode) {
        const result = await TrackActions.createNew({
          musicFileId: selectedAudio?.id ?? null,
          ...details,
          ...annotation,
        });

        if (!result.ok) {
          showToast({
            title: "Could not create track",
            description: result.error.message,
            tone: "error",
          });
          return;
        }

        try {
          window.localStorage.removeItem(NEW_TRACK_DRAFT_KEY);
        } catch {
          setDraftStorageAvailable(false);
        }
        showToast({
          title: "Track created",
          description: "Your private track and annotation are ready.",
          tone: "success",
        });
        router.replace(`/track/${result.data.trackId}`);
        return;
      }

      if (!initialData.trackId) {
        return;
      }

      const result = await TrackActions.saveAnnotation({
        trackId: initialData.trackId,
        ...annotation,
      });

      if (!result.ok) {
        showToast({
          title: "Could not save annotation",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setAnnotationSavedAt(result.data.updatedAt);
      showToast({
        title: "Annotation saved",
        description: "Your lyrics, chords, and notes are up to date.",
        tone: "success",
      });
    });
  }

  function addArtist() {
    updateDetails("additionalArtists", [
      ...details.additionalArtists,
      { artistName: "", joinPhrase: "&" },
    ]);
  }

  function updateAdditionalArtist(
    index: number,
    value: TrackDetailsDraft["additionalArtists"][number],
  ) {
    updateDetails(
      "additionalArtists",
      details.additionalArtists.map((artist, artistIndex) =>
        artistIndex === index ? value : artist,
      ),
    );
  }

  function removeAdditionalArtist(index: number) {
    updateDetails(
      "additionalArtists",
      details.additionalArtists.filter(
        (_artist, artistIndex) => artistIndex !== index,
      ),
    );
  }

  function goToNextStep() {
    if (currentStep === 1 && !validateSongAndArtists(details)) {
      showToast({
        title: "Complete the song and artist details",
        description:
          "Add a title and a unique name for every listed artist.",
        tone: "error",
      });
      return;
    }

    if (currentStep === 2 && !validateMusicDetails(details)) {
      showToast({
        title: "Check the music details",
        description:
          "Add the key and tuning, use a capo from 0–12, a tempo from 20–400 BPM, and valid web links.",
        tone: "error",
      });
      return;
    }

    setCurrentStep((step) => Math.min(3, step + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(1, step - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formatDetectedChordLines() {
    if (!chordLineFormatting.convertedLineCount) {
      return;
    }

    updateAnnotation(
      "lyricsAndChords",
      chordLineFormatting.formattedSource,
    );
    showToast({
      title: "Chord lines formatted",
      description: `${chordLineFormatting.convertedChordCount} chords across ${chordLineFormatting.convertedLineCount} lines were placed in brackets.`,
      tone: "success",
    });
  }

  return (
    <div className="grid gap-4">
      {isCreateMode ? (
        <CreationProgress
          currentStep={currentStep}
          draftStatus={
            !isDraftReady
              ? "Restoring draft…"
              : draftStorageAvailable
                ? "Draft saved in this browser"
                : "Browser draft storage is unavailable"
          }
        />
      ) : null}

      <div
        className={
          !isCreateMode || currentStep === 3
            ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]"
            : "grid gap-4"
        }
      >
      <div className="grid min-w-0 gap-4">
        {!isCreateMode ? (
          <AudioPanel title={details.title} audio={initialData.audio} />
        ) : null}

        {(!isCreateMode || currentStep === 1) ? (
          <SongArtistsSection
            details={details}
            isCreateMode={isCreateMode}
            isDetailsPending={isDetailsPending}
            onUpdate={updateDetails}
            onAddArtist={addArtist}
            onUpdateAdditionalArtist={updateAdditionalArtist}
            onRemoveAdditionalArtist={removeAdditionalArtist}
            onSave={saveDetails}
            savedAt={detailsSavedAt}
          />
        ) : null}

        {(!isCreateMode || currentStep === 2) ? (
          <>
            <MusicDetailsSection
              details={details}
              isCreateMode={isCreateMode}
              isDetailsPending={isDetailsPending}
              onUpdate={updateDetails}
              onSave={saveDetails}
              savedAt={detailsSavedAt}
            />
            <TrackReferencesSection
              details={details}
              isCreateMode={isCreateMode}
              onUpdate={updateDetails}
              selectedAudio={selectedAudio}
              onAudioSelect={setSelectedAudio}
              onAudioRemove={() => setSelectedAudio(null)}
            />
          </>
        ) : null}

        {(!isCreateMode || currentStep === 3) ? (
          <>
            <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-bold">Lyrics and chords</h2>
                  <p className="mt-1 text-[12px] leading-5 text-[#717171] dark:text-[#a1a1aa]">
                    Put section names such as <code>[Verse 1]</code>,{" "}
                    <code>[Chorus]</code>, or <code>[Pre-Chorus]</code> on their own
                    line. Put bracketed chords on the line above the lyrics.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={!chordLineFormatting.convertedLineCount}
                    onClick={formatDetectedChordLines}
                    className="h-8 rounded-full border border-[#ed1746] px-3 text-[11px] font-bold text-[#ed1746] transition hover:bg-[#fff0f3] disabled:cursor-not-allowed disabled:border-[#dedede] disabled:text-[#999] disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:disabled:border-[#3a3a3f] dark:hover:bg-[#35141c]"
                  >
                    {chordLineFormatting.convertedLineCount
                      ? `Format ${chordLineFormatting.convertedLineCount} chord ${chordLineFormatting.convertedLineCount === 1 ? "line" : "lines"}`
                      : "Format pasted chords"}
                  </button>
                  <span className="rounded-full bg-[#fff0f3] px-2 py-1 text-center text-[10px] font-bold text-[#ed1746] dark:bg-[#35141c]">
                    CHORD FORMAT
                  </span>
                </div>
              </div>
              <textarea
                value={annotation.lyricsAndChords}
                maxLength={100_000}
                onChange={(event) =>
                  updateAnnotation("lyricsAndChords", event.target.value)
                }
                placeholder={
                  "[Verse 1]\n[D]\n  You were the Word at the beginning\n         [G]       [Bm]       [A]\nOne With God the Lord Most High"
                }
                className="mt-4 min-h-[420px] w-full resize-y rounded-xl border border-[#dedede] bg-[#fafafa] p-4 font-mono text-[13px] leading-6 text-[#111] outline-none transition focus:border-[#ed1746] focus:ring-2 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f5f5f5]"
              />
            </section>

            <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
              <Field label="Private annotation notes">
                <textarea
                  value={annotation.notes}
                  maxLength={20_000}
                  onChange={(event) => updateAnnotation("notes", event.target.value)}
                  placeholder="Arrangement, rehearsal, or performance notes"
                  className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-[#dedede] bg-white p-3 text-[13px] leading-5 text-[#111] outline-none focus:border-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f5f5f5]"
                />
              </Field>
            </section>

          </>
        ) : null}
      </div>

      {(!isCreateMode || currentStep === 3) ? (
        <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold">Preview</h2>
                <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
                  Display only—saving keeps the original chords.
                </p>
              </div>
              {displayedKey ? (
                <span className="rounded-full bg-[#111] px-3 py-1.5 text-[11px] font-bold text-white dark:bg-white dark:text-[#111]">
                  Key {displayedKey}
                </span>
              ) : null}
            </div>
            <TransposeControls
              value={transposeBy}
              accidentals={accidentals}
              onValueChange={setTransposeBy}
              onAccidentalsChange={setAccidentals}
            />
            <ChordPreview source={preview} />
          </section>
          {!isCreateMode ? (
            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
              <button
                type="button"
                disabled={isAnnotationPending}
                onClick={saveAnnotation}
                className="h-11 rounded-full bg-[#ed1746] px-5 text-[13px] font-bold text-white transition hover:bg-[#d90f3b] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
              >
                {isAnnotationPending ? "Saving…" : "Save annotation"}
              </button>
              <p className="text-center text-[11px] text-[#717171] dark:text-[#a1a1aa]">
                {annotationSavedAt
                  ? `Annotation last saved ${formatSavedAt(annotationSavedAt)}`
                  : "Annotation not saved yet"}
              </p>
            </div>
          ) : null}
        </aside>
      ) : null}
      </div>

      {isCreateMode ? (
        <CreationNavigation
          currentStep={currentStep}
          isPending={isAnnotationPending}
          draftReady={isDraftReady}
          onBack={goToPreviousStep}
          onNext={goToNextStep}
          onCreate={saveAnnotation}
        />
      ) : null}
    </div>
  );
}

type DetailsUpdate = <Key extends keyof TrackDetailsDraft>(
  field: Key,
  value: TrackDetailsDraft[Key],
) => void;

function SongArtistsSection({
  details,
  isCreateMode,
  isDetailsPending,
  onUpdate,
  onAddArtist,
  onUpdateAdditionalArtist,
  onRemoveAdditionalArtist,
  onSave,
  savedAt,
}: {
  details: TrackDetailsDraft;
  isCreateMode: boolean;
  isDetailsPending: boolean;
  onUpdate: DetailsUpdate;
  onAddArtist: () => void;
  onUpdateAdditionalArtist: (
    index: number,
    value: TrackDetailsDraft["additionalArtists"][number],
  ) => void;
  onRemoveAdditionalArtist: (index: number) => void;
  onSave: () => void;
  savedAt: string | null;
}) {
  return (
    <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
      <SectionHeader
        title="Song and artists"
        description="Start with the required information people use to identify this track."
        isCreateMode={isCreateMode}
        isPending={isDetailsPending}
        onSave={onSave}
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Track title">
          <input
            required
            maxLength={200}
            value={details.title}
            onChange={(event) => onUpdate("title", event.target.value)}
            className={fieldClassName}
          />
        </Field>
        <Field label="Primary artist">
          <input
            required
            maxLength={200}
            value={details.artistName}
            onChange={(event) => onUpdate("artistName", event.target.value)}
            className={fieldClassName}
          />
        </Field>
      </div>
      <div className="mt-5 border-t border-[#ececec] pt-5 dark:border-[#303034]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-bold">Additional artists</h3>
            <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
              Optional collaborators are kept as private draft metadata.
            </p>
          </div>
          <button
            type="button"
            disabled={details.additionalArtists.length >= 10}
            onClick={onAddArtist}
            className="h-9 rounded-full border border-[#dedede] px-4 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
          >
            + Add artist
          </button>
        </div>
        {details.additionalArtists.length ? (
          <div className="mt-4 grid gap-3">
            {details.additionalArtists.map((artist, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-xl bg-[#f7f7f7] p-3 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-end dark:bg-[#202023]"
              >
                <Field label="Join phrase">
                  <select
                    value={artist.joinPhrase}
                    onChange={(event) =>
                      onUpdateAdditionalArtist(index, {
                        ...artist,
                        joinPhrase: event.target.value as typeof artist.joinPhrase,
                      })
                    }
                    className={fieldClassName}
                  >
                    {TRACK_JOIN_PHRASES.map((phrase) => (
                      <option key={phrase} value={phrase}>
                        {phrase}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Artist name">
                  <input
                    required
                    maxLength={200}
                    value={artist.artistName}
                    onChange={(event) =>
                      onUpdateAdditionalArtist(index, {
                        ...artist,
                        artistName: event.target.value,
                      })
                    }
                    className={fieldClassName}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => onRemoveAdditionalArtist(index)}
                  className="h-10 rounded-full px-3 text-[12px] font-bold text-[#777] transition hover:bg-white hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#a1a1aa] dark:hover:bg-[#2b2b2f] dark:hover:text-[#fb7185]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {!isCreateMode && savedAt ? (
        <SavedAt value={savedAt} label="Details" />
      ) : null}
    </section>
  );
}

function MusicDetailsSection({
  details,
  isCreateMode,
  isDetailsPending,
  onUpdate,
  onSave,
  savedAt,
}: {
  details: TrackDetailsDraft;
  isCreateMode: boolean;
  isDetailsPending: boolean;
  onUpdate: DetailsUpdate;
  onSave: () => void;
  savedAt: string | null;
}) {
  return (
    <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
      <SectionHeader
        title="Music details"
        description="Key and tuning are required. Add the remaining optional details when available."
        isCreateMode={isCreateMode}
        isPending={isDetailsPending}
        onSave={onSave}
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Original key">
          <select
            required
            value={details.key}
            onChange={(event) => onUpdate("key", event.target.value)}
            className={fieldClassName}
          >
            <option value="" disabled>
              Select key
            </option>
            {MUSICAL_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Capo (optional)">
          <input
            type="number"
            min={0}
            max={12}
            value={details.capo ?? ""}
            onChange={(event) =>
              onUpdate("capo", parseOptionalNumber(event.target.value))
            }
            className={fieldClassName}
          />
        </Field>
        <Field label="Tempo in BPM (optional)">
          <input
            type="number"
            min={20}
            max={400}
            value={details.tempo ?? ""}
            onChange={(event) =>
              onUpdate("tempo", parseOptionalNumber(event.target.value))
            }
            className={fieldClassName}
          />
        </Field>
        <Field label="Time signature (optional)">
          <input
            maxLength={16}
            placeholder="4/4"
            value={details.timeSignature}
            onChange={(event) => onUpdate("timeSignature", event.target.value)}
            className={fieldClassName}
          />
        </Field>
        <Field label="Tuning">
          <select
            required
            value={details.tuning}
            onChange={(event) => onUpdate("tuning", event.target.value)}
            className={fieldClassName}
          >
            <option value="" disabled>
              Select tuning
            </option>
            {TRACK_TUNINGS.map((tuning) => (
              <option key={tuning} value={tuning}>
                {tuning}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <TrackTagsField
        selectedTags={details.tags}
        onChange={(tags) => onUpdate("tags", tags)}
      />
      {!isCreateMode && savedAt ? (
        <SavedAt value={savedAt} label="Details" />
      ) : null}
    </section>
  );
}

function TrackTagsField({
  selectedTags,
  onChange,
}: {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) {
  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((selectedTag) => selectedTag !== tag));
      return;
    }

    if (selectedTags.length < MAX_TRACK_TAGS) {
      onChange([...selectedTags, tag]);
    }
  }

  return (
    <div className="mt-5 border-t border-[#ececec] pt-5 dark:border-[#303034]">
      <div>
        <h3 className="text-[14px] font-bold">Tags (optional)</h3>
        <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
          Select up to {MAX_TRACK_TAGS} languages, styles, occasions, or moods.
        </p>
      </div>
      <details className="group mt-3 rounded-xl border border-[#dedede] bg-white dark:border-[#3a3a3f] dark:bg-[#202023]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">
          <span>
            {selectedTags.length
              ? `${selectedTags.length} ${selectedTags.length === 1 ? "tag" : "tags"} selected`
              : "Select tags"}
          </span>
          <span
            aria-hidden="true"
            className="text-[#777] transition group-open:rotate-180 dark:text-[#a1a1aa]"
          >
            ▾
          </span>
        </summary>
        <div className="border-t border-[#ececec] p-3 dark:border-[#303034]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {TRACK_TAG_GROUPS.map((group) => (
              <fieldset key={group.label}>
                <legend className="text-[11px] font-black uppercase tracking-[0.08em] text-[#777] dark:text-[#a1a1aa]">
                  {group.label}
                </legend>
                <div className="mt-2 grid gap-1">
                  {group.tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    const isDisabled =
                      !isSelected && selectedTags.length >= MAX_TRACK_TAGS;

                    return (
                      <label
                        key={tag}
                        className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-[12px] font-medium transition hover:bg-[#f4f4f4] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#ed1746] dark:hover:bg-[#2a2a2e]"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleTag(tag)}
                          className="size-4 accent-[#ed1746]"
                        />
                        {tag}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      </details>
      {selectedTags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-[#fff0f3] px-2.5 text-[11px] font-bold text-[#ed1746] transition hover:bg-[#ffe2e7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#35141c] dark:hover:bg-[#481a25]"
              aria-label={`Remove ${tag} tag`}
            >
              {tag} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TrackReferencesSection({
  details,
  isCreateMode,
  onUpdate,
  selectedAudio,
  onAudioSelect,
  onAudioRemove,
}: {
  details: TrackDetailsDraft;
  isCreateMode: boolean;
  onUpdate: DetailsUpdate;
  selectedAudio: SelectedTrackAudio | null;
  onAudioSelect: (audio: SelectedTrackAudio) => void;
  onAudioRemove: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
      <div>
        <h2 className="text-[16px] font-bold">Track references</h2>
        <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
          Add any optional source that can help identify or annotate the track.
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="YouTube link (optional)">
          <input
            type="url"
            maxLength={500}
            value={details.youtubeLink}
            onChange={(event) => onUpdate("youtubeLink", event.target.value)}
            className={fieldClassName}
          />
        </Field>
        <Field label="Spotify link (optional)">
          <input
            type="url"
            maxLength={500}
            value={details.spotifyLink}
            onChange={(event) => onUpdate("spotifyLink", event.target.value)}
            className={fieldClassName}
          />
        </Field>
      </div>
      {isCreateMode ? (
        <div className="mt-5 border-t border-[#ececec] pt-5 dark:border-[#303034]">
          <OptionalAudioSection
            selectedAudio={selectedAudio}
            onSelect={onAudioSelect}
            onRemove={onAudioRemove}
            embedded
          />
        </div>
      ) : null}
    </section>
  );
}

function SectionHeader({
  title,
  description,
  isCreateMode,
  isPending,
  onSave,
}: {
  title: string;
  description: string;
  isCreateMode: boolean;
  isPending: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[16px] font-bold">{title}</h2>
        <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
          {description}
        </p>
      </div>
      {!isCreateMode ? (
        <button
          type="button"
          disabled={isPending}
          onClick={onSave}
          className="h-9 rounded-full bg-[#111] px-4 text-[12px] font-bold text-white transition hover:bg-[#2c2c2c] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
        >
          {isPending ? "Saving…" : "Save details"}
        </button>
      ) : null}
    </div>
  );
}

function SavedAt({ value, label }: { value: string; label: string }) {
  return (
    <p className="mt-4 text-right text-[11px] text-[#717171] dark:text-[#a1a1aa]">
      {label} last saved {formatSavedAt(value)}
    </p>
  );
}

function CreationProgress({
  currentStep,
  draftStatus,
}: {
  currentStep: number;
  draftStatus: string;
}) {
  const steps = ["Song & artists", "Music details", "Annotation"];

  return (
    <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isComplete = stepNumber < currentStep;

          return (
            <div key={step} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${
                  isActive || isComplete
                    ? "bg-[#ed1746] text-white"
                    : "bg-[#ededee] text-[#666] dark:bg-[#2b2b2f] dark:text-[#b4b4bc]"
                }`}
              >
                {isComplete ? "✓" : stepNumber}
              </span>
              <div>
                <p className="text-[11px] font-semibold text-[#777] dark:text-[#a1a1aa]">
                  Step {stepNumber}
                </p>
                <p className="text-[13px] font-bold">{step}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-[#ececec] pt-3 text-[11px] text-[#717171] dark:border-[#303034] dark:text-[#a1a1aa]">
        {draftStatus} · The Track and annotation are created together on the final step.
      </p>
    </section>
  );
}

function CreationNavigation({
  currentStep,
  isPending,
  draftReady,
  onBack,
  onNext,
  onCreate,
}: {
  currentStep: number;
  isPending: boolean;
  draftReady: boolean;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-[#e4e4e4] bg-white/95 p-3 shadow-lg backdrop-blur dark:border-[#303034] dark:bg-[#171719]/95">
      <button
        type="button"
        disabled={currentStep === 1 || isPending}
        onClick={onBack}
        className="h-10 rounded-full border border-[#dedede] px-5 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#3a3a3f]"
      >
        Back
      </button>
      <p className="hidden text-[11px] text-[#717171] sm:block dark:text-[#a1a1aa]">
        Step {currentStep} of 3
      </p>
      {currentStep < 3 ? (
        <button
          type="button"
          disabled={!draftReady}
          onClick={onNext}
          className="h-10 rounded-full bg-[#ed1746] px-6 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] disabled:cursor-wait disabled:opacity-60"
        >
          Next
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending || !draftReady}
          onClick={onCreate}
          className="h-10 rounded-full bg-[#ed1746] px-6 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create track & save annotation"}
        </button>
      )}
    </div>
  );
}

function validateSongAndArtists(details: TrackDetailsDraft): boolean {
  const names = [
    details.artistName,
    ...details.additionalArtists.map((artist) => artist.artistName),
  ].map((name) => name.trim().toLowerCase());

  return (
    Boolean(details.title.trim()) &&
    names.every(Boolean) &&
    new Set(names).size === names.length
  );
}

function validateMusicDetails(details: TrackDetailsDraft): boolean {
  const hasRequiredDetails =
    MUSICAL_KEYS.some((key) => key === details.key) &&
    TRACK_TUNINGS.some((tuning) => tuning === details.tuning);
  const hasValidCapo =
    details.capo === null ||
    (Number.isInteger(details.capo) && details.capo >= 0 && details.capo <= 12);
  const hasValidTempo =
    details.tempo === null ||
    (Number.isFinite(details.tempo) &&
      details.tempo >= 20 &&
      details.tempo <= 400);

  return (
    hasRequiredDetails &&
    hasValidCapo &&
    hasValidTempo &&
    isOptionalHttpUrl(details.youtubeLink) &&
    isOptionalHttpUrl(details.spotifyLink)
  );
}

function normalizeTrackTuning(value: string): string {
  if (value.trim().toUpperCase() === "E A D G B E") {
    return "Standard";
  }

  return TRACK_TUNINGS.some((tuning) => tuning === value) ? value : "";
}

function normalizeTrackTags(value: string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter((tag) =>
        TRACK_TAGS.some((allowedTag) => allowedTag === tag),
      ),
    ),
  ).slice(0, MAX_TRACK_TAGS);
}

function isOptionalHttpUrl(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isStoredAnnotationDraft(value: unknown): value is StoredAnnotationDraft {
  if (!isRecord(value) || !isRecord(value.details) || !isRecord(value.annotation)) {
    return false;
  }

  const details = value.details;
  const annotation = value.annotation;
  const detailStrings = [
    "title",
    "artistName",
    "key",
    "timeSignature",
    "tuning",
    "youtubeLink",
    "spotifyLink",
  ];

  return (
    detailStrings.every((field) => typeof details[field] === "string") &&
    isNullableFiniteNumber(details.capo) &&
    isNullableFiniteNumber(details.tempo) &&
    (details.tags === undefined ||
      (Array.isArray(details.tags) &&
        details.tags.every((tag) =>
          TRACK_TAGS.some((allowedTag) => allowedTag === tag),
        ))) &&
    Array.isArray(details.additionalArtists) &&
    details.additionalArtists.every(isStoredArtist) &&
    typeof annotation.lyricsAndChords === "string" &&
    typeof annotation.notes === "string" &&
    (value.audio === undefined ||
      value.audio === null ||
      isStoredTrackAudio(value.audio))
  );
}

function isStoredTrackAudio(value: unknown): value is SelectedTrackAudio {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.originalFileName === "string" &&
    typeof value.playbackUrl === "string" &&
    isNullableFiniteNumber(value.durationSeconds)
  );
}

function isStoredArtist(value: unknown): value is TrackDetailsDraft["additionalArtists"][number] {
  return (
    isRecord(value) &&
    typeof value.artistName === "string" &&
    typeof value.joinPhrase === "string" &&
    TRACK_JOIN_PHRASES.includes(
      value.joinPhrase as TrackDetailsDraft["additionalArtists"][number]["joinPhrase"],
    )
  );
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function OptionalAudioSection({
  selectedAudio,
  onSelect,
  onRemove,
  embedded = false,
}: {
  selectedAudio: SelectedTrackAudio | null;
  onSelect: (audio: SelectedTrackAudio) => void;
  onRemove: () => void;
  embedded?: boolean;
}) {
  return (
    <div className="grid gap-4">
      {selectedAudio ? (
        <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">
                {selectedAudio.title}
              </p>
              <p className="mt-1 truncate text-[11px] text-[#717171] dark:text-[#a1a1aa]">
                {selectedAudio.originalFileName}
              </p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="h-9 rounded-full border border-[#dedede] px-4 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] dark:border-[#3a3a3f]"
            >
              Detach
            </button>
          </div>
          <audio
            controls
            preload="metadata"
            src={selectedAudio.playbackUrl}
            className="mt-3 w-full"
            aria-label={`Audio preview for ${selectedAudio.title}`}
          />
        </section>
      ) : null}

      <AudioUpload
        embedded={embedded}
        heading={selectedAudio ? "Replace optional audio" : "Optional audio"}
        description="Upload one reference audio file only when it helps with annotation or rehearsal. MP3 and other common audio formats up to 50 MB are supported."
        multiple={false}
        onUploadComplete={(file) =>
          onSelect({
            id: file.id,
            title: file.title,
            originalFileName: file.originalFileName,
            playbackUrl: file.playbackUrl,
            durationSeconds: file.durationSeconds,
          })
        }
      />
    </div>
  );
}


function AudioPanel({
  title,
  audio,
}: {
  title: string;
  audio: AnnotationEditorData["audio"];
}) {
  return (
    <section className="rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold">{title}</p>
          <p className="mt-1 truncate text-[12px] text-[#717171] dark:text-[#a1a1aa]">
            {audio
              ? `${audio.originalFileName}${
                  audio.durationSeconds !== null
                    ? ` · ${formatDuration(audio.durationSeconds)}`
                    : ""
                }`
              : "Private annotation draft · No audio attached"}
          </p>
        </div>
        <Link
          href="/"
          className="text-[12px] font-bold text-[#ed1746] hover:text-[#c9123a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
        >
          Back to dashboard
        </Link>
      </div>
      {audio ? (
        <audio
          controls
          preload="metadata"
          src={audio.playbackUrl}
          className="mt-4 w-full"
          aria-label={`Audio player for ${title}`}
        />
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[#d9d9d9] px-4 py-6 text-center text-[12px] text-[#717171] dark:border-[#3a3a3f] dark:text-[#a1a1aa]">
          You can write and save this annotation without uploading an MP3.
        </div>
      )}
    </section>
  );
}

function TransposeControls({
  value,
  accidentals,
  onValueChange,
  onAccidentalsChange,
}: {
  value: number;
  accidentals: AccidentalPreference;
  onValueChange: (value: number) => void;
  onAccidentalsChange: (value: AccidentalPreference) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-[#dedede] bg-white dark:border-[#3a3a3f] dark:bg-[#202023]">
        <span className="border-r border-[#dedede] px-3 text-[11px] font-black dark:border-[#3a3a3f]">
          Tr.
        </span>
        <button
          type="button"
          disabled={value <= -12}
          onClick={() => onValueChange(Math.max(-12, value - 1))}
          className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]"
          aria-label="Transpose down one semitone"
        >
          −
        </button>
        <span className="min-w-8 text-center text-[12px] font-bold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          disabled={value >= 12}
          onClick={() => onValueChange(Math.min(12, value + 1))}
          className="flex h-full w-9 items-center justify-center text-[16px] font-bold transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]"
          aria-label="Transpose up one semitone"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={() => onValueChange(0)}
        className="h-9 rounded-full border border-[#dedede] px-3 text-[11px] font-bold hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:hover:bg-[#28282c]"
      >
        Reset
      </button>
      <select
        aria-label="Accidental preference"
        value={accidentals}
        onChange={(event) =>
          onAccidentalsChange(event.target.value as AccidentalPreference)
        }
        className="h-9 rounded-full border border-[#dedede] bg-white px-3 text-[11px] font-bold outline-none focus:border-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#202023]"
      >
        <option value="sharps">Sharps ♯</option>
        <option value="flats">Flats ♭</option>
      </select>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={labelClassName}>
      {label}
      {children}
    </label>
  );
}

function ChordPreview({ source }: { source: string }) {
  if (!source.trim()) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-[#d9d9d9] px-4 py-14 text-center text-[13px] text-[#777] dark:border-[#3a3a3f] dark:text-[#a1a1aa]">
        Your formatted lyrics and chords will appear here.
      </div>
    );
  }

  return (
    <div className="mt-5 max-h-[60vh] overflow-auto rounded-xl bg-[#fafafa] p-4 text-[14px] leading-7 dark:bg-[#202023]">
      {source.split("\n").map((line, index) => (
        <PreviewLine key={index} line={line} />
      ))}
    </div>
  );
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

  return (
    <div className="min-h-7 whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (!part.startsWith("[") || !part.endsWith("]")) {
          return <span key={index}>{part}</span>;
        }

        const value = part.slice(1, -1).trim();
        const isChord = Boolean(transposeChord(value, 0, "sharps"));

        return (
          <strong
            key={index}
            className={
              isChord
                ? "mr-1 inline-block text-[12px] font-black text-[#ed1746]"
                : "mr-1 inline-block text-[12px] font-bold text-[#666] dark:text-[#b4b4bc]"
            }
          >
            {value}
          </strong>
        );
      })}
    </div>
  );
}

function parseOptionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${Math.round(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function formatSavedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
