"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import * as SetListActions from "@/actions/setlist-actions";
import * as TrackActions from "@/actions/track-actions";
import { ChordCard } from "@/components/shared/chords/chord-card";
import { ChordFullscreenPerformanceLauncher } from "@/components/shared/chords/chord-fullscreen-performance";
import { ChordPopover } from "@/app/track/_components/chord-popover";
import { BackButton } from "@/components/shared/back-button";
import { BackLink } from "@/components/shared/back-link";
import { PianoChordCard } from "@/components/shared/chords/piano-chord-card";
import { SongChart, parseSongChartSource } from "@/components/shared/chords/song-chart";
import { ShareLinkButton } from "@/components/shared/share-link-button";
import { showToast } from "@/components/shared/toast";
import { MAX_SETLIST_TRANSPOSE } from "@/lib/setlists/setlist-track-settings";

import {
  splitVariationSuffix,
  transposeChord,
  transposeChordPro,
  type AccidentalPreference,
} from "@/lib/chords/chord-pro";
import {
  GUITAR_CHORDS,
  PIANO_CHORDS,
  UKELELE_CHORDS,
  normalizeChordSymbol,
  type ChordDefinition,
  type PianoChordDefinition,
} from "@/data/chords";
import { APP_CONSTANTS } from "@/lib/app-constants";
import type { QuickAddSetListData } from "@/types/setlist";
import type { AnnotationViewerData } from "@/types/track";
import type { TrackPreference } from "@/types/track-preference";

const MIN_CHART_FONT_SIZE = 11;
const MAX_CHART_FONT_SIZE = 18;

export function AnnotationViewer({
  quickAddSetLists,
  setListContext,
  track,
}: {
  quickAddSetLists: QuickAddSetListData[];
  setListContext?: {
    arrangementLabel: string | null;
    setListId: string;
    setListTitle: string;
    setListTrackId: string;
    transposeSemitones: number;
  };
  track: AnnotationViewerData;
}) {
  const router = useRouter();
  const [transpose, setTranspose] = useState(
    setListContext?.transposeSemitones ?? 0,
  );
  const [publicityStatus, setPublicityStatus] = useState(
    track.publicityStatus,
  );
  const [isPending, startTransition] = useTransition();
  const [accidentals, setAccidentals] = useState<AccidentalPreference>(
    setListContext && track.key.includes("b") ? "flats" : "sharps",
  );
  const [chordInstrument, setChordInstrument] =
    useState<TrackChordInstrument>("guitar");
  const [chartFontSize, setChartFontSize] = useState(13);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);
  const optionsPanelRef = useRef<HTMLDivElement>(null);
  const optionsTriggerRef = useRef<HTMLButtonElement>(null);
  const [trackPreference, setTrackPreference] = useState<TrackPreference>({
    c: {},
  });
  const source = useMemo(
    () => transposeChordPro(track.lyricsAndChords, transpose, accidentals),
    [track.lyricsAndChords, transpose, accidentals],
  );
  const usedChords = useMemo(() => getUsedGuitarChords(source), [source]);
  const chartSections = useMemo(() => parseSongChartSource(source), [source]);
  const displayKey =
    transposeChord(track.key, transpose, accidentals) ?? track.key;

  useEffect(() => {
    if (!isOptionsOpen) {
      return;
    }

    optionsPanelRef.current?.focus();

    function handlePointerDown(pointerEvent: PointerEvent): void {
      if (!optionsRef.current?.contains(pointerEvent.target as Node)) {
        setIsOptionsOpen(false);
      }
    }

    function handleKeyDown(keyboardEvent: KeyboardEvent): void {
      if (keyboardEvent.key === "Escape") {
        setIsOptionsOpen(false);
        optionsTriggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOptionsOpen]);

  function handleTransposeChange(nextTranspose: number): void {
    if (isPending || nextTranspose === transpose) {
      return;
    }

    if (!setListContext) {
      setTranspose(nextTranspose);
      return;
    }

    startTransition(async () => {
      const result = await SetListActions.saveTrackTranspose({
        setListId: setListContext.setListId,
        setListTrackId: setListContext.setListTrackId,
        transposeSemitones: nextTranspose,
      });

      if (!result.ok) {
        showToast({
          title: "Transpose not saved",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setTranspose(nextTranspose);
    });
  }

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

  return (
    <div className="grid h-full min-h-0 w-full overflow-y-auto bg-white dark:bg-[#121214] xl:grid-cols-[minmax(0,1fr)_320px] xl:overflow-hidden">
      <ChordFullscreenPerformanceLauncher
        chordInstrument={chordInstrument}
        onVariationChange={handleVariationChange}
        track={{
          title: track.title,
          artistName: track.artistName,
          key: setListContext ? displayKey : track.key,
          lyricsAndChords: setListContext ? source : track.lyricsAndChords,
        }}
        trackPreference={trackPreference}
      />
      <section className="min-w-0 p-3 sm:p-6 xl:min-h-0 xl:overflow-y-auto">
        <div className="mb-4 flex items-center justify-between gap-3">
          {setListContext ? (
            <BackLink href={`/setlists/${setListContext.setListId}`}>
              {setListContext.setListTitle}
            </BackLink>
          ) : (
            <BackButton fallbackHref={track.isOwner ? "/annotation" : "/browse"} />
          )}
          <div className="flex shrink-0 items-center gap-2">
            {!setListContext && publicityStatus === "APPROVED" ? (
              <ShareLinkButton
                iconOnly
                path={`/track/${track.id}#song-chart`}
                title={`${track.title} by ${track.artistName} · ChordPH`}
              />
            ) : null}
            <div ref={optionsRef} className="relative shrink-0">
              <button
                ref={optionsTriggerRef}
                type="button"
                aria-label="Track options"
                aria-haspopup="dialog"
                aria-expanded={isOptionsOpen}
                aria-controls={isOptionsOpen ? "track-options" : undefined}
                onClick={() => setIsOptionsOpen((open) => !open)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-[#d9d9d9] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
              >
                <EllipsisIcon />
              </button>
              {isOptionsOpen ? (
                <div
                  ref={optionsPanelRef}
                  id="track-options"
                  role="dialog"
                  aria-label="Track options"
                  tabIndex={-1}
                  className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-[#d9d9d9] bg-white p-1.5 shadow-xl dark:border-[#3a3a3f] dark:bg-[#242427]"
                >
                  {setListContext || track.isOwner ? (
                    <Link
                      href={setListContext
                        ? `/setlists/${setListContext.setListId}/tracks/${setListContext.setListTrackId}/edit`
                        : `/track/${track.id}/annotate`}
                      className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#343438]"
                    >
                      Edit
                    </Link>
                  ) : null}
                  {!setListContext && track.isOwner &&
                  (publicityStatus === "PRIVATE" ||
                    publicityStatus === "REJECTED") ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setIsOptionsOpen(false);
                        handleReviewSubmission();
                      }}
                      className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition hover:bg-[#f2f2f2] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#343438]"
                    >
                      {isPending ? "Submitting…" : "Submit for review"}
                    </button>
                  ) : null}
                  {!setListContext &&
                  track.isOwner &&
                  publicityStatus === "PENDING" ? (
                    <span className="flex w-full items-center px-3 py-2.5 text-left text-[11px] font-bold text-[#8a5a00] dark:text-[#facc15]">
                      Pending admin review
                    </span>
                  ) : null}
                  {!setListContext && !track.isOwner ? (
                    track.isAuthenticated ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setIsOptionsOpen(false);
                          handleCopy();
                        }}
                        className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition hover:bg-[#f2f2f2] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#343438]"
                      >
                        {isPending ? "Saving…" : "Save as personal copy"}
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#343438]"
                      >
                        Sign in to save a copy
                      </Link>
                    )
                  ) : null}
                  {setListContext ? (
                    <CopyArrangementToSetList context={setListContext} setLists={quickAddSetLists} />
                  ) : track.isAuthenticated ? (
                    <QuickAddToSetList setLists={quickAddSetLists} trackId={track.id} />
                  ) : (
                    <Link href="/login" className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#343438]">Copy to setlist</Link>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="border-b border-[#e6e6e6] pb-5 dark:border-[#303034]">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-2xl font-black">
                {track.title}
              </h2>
              <TrackSheetIcon
                isOwner={track.isOwner}
                isSetList={Boolean(setListContext)}
              />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span className="text-[14px] text-[#666] dark:text-[#b4b4bc]">
                {track.artistName}
              </span>
              <TrackMetadataSeparator />
              <span className="font-black text-[#444] dark:text-[#d4d4d8]">
                Key {displayKey}
              </span>
              {track.tempo !== null ? (
                <>
                  <TrackMetadataSeparator />
                  <span className="font-bold text-[#666] dark:text-[#b4b4bc]">
                    {track.tempo} BPM
                  </span>
                </>
              ) : null}
              {track.timeSignature ? (
                <>
                  <TrackMetadataSeparator />
                  <span className="font-bold text-[#666] dark:text-[#b4b4bc]">
                    {track.timeSignature}
                  </span>
                </>
              ) : null}
            </div>
            {setListContext?.arrangementLabel ? (
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#ed1746]">
                {setListContext.arrangementLabel}
              </p>
            ) : null}
          </div>
          <TrackMediaReferences track={track} />
        </div>

        <div className="flex flex-wrap items-center gap-2 py-4">
          <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-[#dedede] bg-white dark:border-[#3a3a3f] dark:bg-[#202023]">
            <button type="button" disabled={isPending || transpose <= -MAX_SETLIST_TRANSPOSE} onClick={() => handleTransposeChange(transpose - 1)} className="flex h-full w-9 items-center justify-center text-[16px] font-black transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]" aria-label="Transpose down one semitone">−</button>
            <span className="min-w-8 text-center text-[12px] font-black tabular-nums">{transpose}</span>
            <button type="button" disabled={isPending || transpose >= MAX_SETLIST_TRANSPOSE} onClick={() => handleTransposeChange(transpose + 1)} className="flex h-full w-9 items-center justify-center text-[16px] font-black transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]" aria-label="Transpose up one semitone">+</button>
          </div>
          <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-[#dedede] bg-white dark:border-[#3a3a3f] dark:bg-[#202023]">
            <button
              type="button"
              disabled={chartFontSize <= MIN_CHART_FONT_SIZE}
              onClick={() =>
                setChartFontSize((size) =>
                  Math.max(MIN_CHART_FONT_SIZE, size - 1),
                )
              }
              aria-label="Decrease chart text size"
              className="flex h-full w-9 items-center justify-center text-[16px] font-black transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]"
            >
              −
            </button>
            <span className="min-w-8 text-center text-[12px] font-black">A</span>
            <button
              type="button"
              disabled={chartFontSize >= MAX_CHART_FONT_SIZE}
              onClick={() =>
                setChartFontSize((size) =>
                  Math.min(MAX_CHART_FONT_SIZE, size + 1),
                )
              }
              aria-label="Increase chart text size"
              className="flex h-full w-9 items-center justify-center text-[16px] font-black transition hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#28282c]"
            >
              +
            </button>
          </div>
          <button
            type="button"
            aria-label={accidentals === "sharps" ? "Sharps. Switch to flats" : "Flats. Switch to sharps"}
            title={accidentals === "sharps" ? "Sharps" : "Flats"}
            onClick={() => setAccidentals((current) => current === "sharps" ? "flats" : "sharps")}
            className="inline-flex size-9 items-center justify-center gap-px rounded-full border border-[#dedede] bg-white text-[15px] font-black leading-none transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#202023]"
          >
            <span className={accidentals === "sharps" ? "" : "opacity-35"}>♯</span>
            <span className={accidentals === "flats" ? "" : "opacity-35"}>♭</span>
          </button>
        </div>

        {usedChords.length ? (
          <TrackChordSection
            chords={usedChords}
            collapsible
            instrument={chordInstrument}
            wrapContent
            onInstrumentChange={setChordInstrument}
            trackPreference={trackPreference}
            onVariationChange={handleVariationChange}
          />
        ) : null}

        {source.trim() ? (
          <div
            id="song-chart"
            className="min-w-0 scroll-mt-4 overflow-x-hidden text-[12px] sm:text-[13px]"
          >
            <SongChart
              fontSize={`${chartFontSize}px`}
              sections={chartSections}
              renderChord={(value) => (
                <ChordLine
                  line={`[${value}]`}
                  chordInstrument={chordInstrument}
                  fitChordToLabel
                  wrapLine
                  trackPreference={trackPreference}
                  onVariationChange={handleVariationChange}
                />
              )}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] px-5 py-16 text-center dark:border-[#3a3a3f]">
            <h3 className="text-[15px] font-bold">No lyrics or chords yet</h3>
            <p className="mt-2 text-[13px] text-[#666] dark:text-[#b4b4bc]">This track is saved and can be completed from the editor.</p>
          </div>
        )}
      </section>

      <aside className="grid content-start gap-4 border-t border-[#e4e4e4] p-4 dark:border-[#303034] xl:min-h-0 xl:overflow-y-auto xl:border-l xl:border-t-0">
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

        {track.notes ? <section className="rounded-2xl border border-[#e4e4e4] bg-white p-5 dark:border-[#303034] dark:bg-[#171719]"><h2 className="text-[14px] font-bold">Private notes</h2><p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-[#555] dark:text-[#c4c4cc]">{track.notes}</p></section> : null}
      </aside>
    </div>
  );
}

function TrackMediaReferences({ track }: { track: AnnotationViewerData }) {
  const [isYouTubePlayerOpen, setIsYouTubePlayerOpen] = useState(false);
  const youtubeVideoId = track.youtubeLink
    ? getYouTubeVideoId(track.youtubeLink)
    : null;
  const hasReferences = Boolean(
    track.audio || track.youtubeLink || track.spotifyLink,
  );

  if (!hasReferences) {
    return track.isOwner ? (
      <Link
        href={`/track/${track.id}/annotate#track-references`}
        className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-[#c9c9c9] bg-[#fafafa] p-3 text-left transition hover:border-[#ed1746] hover:bg-[#fff7f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#48484e] dark:bg-[#1d1d20] dark:hover:border-[#ed1746] dark:hover:bg-[#271217]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#ed1746] shadow-sm dark:bg-[#29292d]">
          <LinkAddIcon />
        </span>
        <span className="min-w-0">
          <span className="block text-[12px] font-black text-[#171717] dark:text-white">
            Add YouTube or Spotify link
          </span>
          <span className="mt-0.5 block text-[10px] text-[#777] dark:text-[#92929a]">
            Add a listening reference for this track.
          </span>
        </span>
      </Link>
    ) : null;
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {track.youtubeLink ? (
          youtubeVideoId ? (
            <button
              type="button"
              aria-expanded={isYouTubePlayerOpen}
              onClick={() => setIsYouTubePlayerOpen((open) => !open)}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
                isYouTubePlayerOpen
                  ? "border-[#ff0000] bg-[#ff0000] text-white"
                  : "border-red-200 bg-red-50 text-red-700 hover:border-[#ff0000] dark:border-red-950 dark:bg-red-950/30 dark:text-red-300"
              }`}
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-[#ff0000] text-white">
                <YouTubeIcon />
              </span>
              {isYouTubePlayerOpen ? "Hide YouTube" : "Play YouTube"}
            </button>
          ) : (
            <MediaExternalLink
              href={track.youtubeLink}
              label="Open YouTube"
              provider="youtube"
              trackTitle={track.title}
            />
          )
        ) : null}
        {track.spotifyLink ? (
          <MediaExternalLink
            href={track.spotifyLink}
            label="Open Spotify"
            provider="spotify"
            trackTitle={track.title}
          />
        ) : null}
        {track.audio ? (
          <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[#dedede] bg-white px-3 text-[11px] font-black text-[#555] dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#d4d4d8]">
            <AudioIcon />
            MP3 attached
          </span>
        ) : null}
      </div>

      {isYouTubePlayerOpen && youtubeVideoId ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-[#dedede] bg-black dark:border-[#3a3a3f]">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}?playsinline=1`}
            title={`${track.title} on YouTube`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video min-h-[200px] w-full"
          />
        </div>
      ) : null}

      {track.audio ? (
        <audio
          controls
          preload="metadata"
          src={track.audio.playbackUrl}
          aria-label={`Audio player for ${track.title}`}
          className="mt-3 w-full"
        />
      ) : null}
    </div>
  );
}

function TrackMetadataSeparator() {
  return (
    <span aria-hidden="true" className="size-1 rounded-full bg-[#c7c7c7] dark:bg-[#52525b]" />
  );
}

function TrackSheetIcon({
  isOwner,
  isSetList,
}: {
  isOwner: boolean;
  isSetList: boolean;
}) {
  const label = isSetList
    ? "Setlist arrangement"
    : isOwner
      ? "Personal chord sheet"
      : "Public chord sheet";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#fff0f3] text-[#ed1746] dark:bg-[#3a111d] dark:text-[#fb7185]"
    >
      {isSetList ? (
        <SetListSheetIcon />
      ) : isOwner ? (
        <PersonalSheetIcon />
      ) : (
        <PublicSheetIcon />
      )}
    </span>
  );
}

function PersonalSheetIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h8l4 4v5" />
      <path d="M14 3v5h4" />
      <path d="M6 3v18h6" />
      <rect x="12" y="14" width="8" height="6" rx="1.5" />
      <path d="M14 14v-1a2 2 0 0 1 4 0v1" />
    </svg>
  );
}

function PublicSheetIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function SetListSheetIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 6h11M9 12h11M9 18h7" />
      <path d="m4 6 .8.8L6.5 5M4 12l.8.8L6.5 11M4 18l.8.8L6.5 17" />
    </svg>
  );
}

function MediaExternalLink({
  href,
  label,
  provider,
  trackTitle,
}: {
  href: string;
  label: string;
  provider: "spotify" | "youtube";
  trackTitle: string;
}) {
  const isYouTube = provider === "youtube";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label} for ${trackTitle}`}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
        isYouTube
          ? "border-red-200 bg-red-50 text-red-700 hover:border-[#ff0000] dark:border-red-950 dark:bg-red-950/30 dark:text-red-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-[#1db954] dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300"
      }`}
    >
      <span
        className={`flex size-5 items-center justify-center rounded-full text-white ${
          isYouTube ? "bg-[#ff0000]" : "bg-[#1db954]"
        }`}
      >
        {isYouTube ? <YouTubeIcon /> : <SpotifyIcon />}
      </span>
      {label}
    </a>
  );
}

function getYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId: string | null = null;

    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com"
    ) {
      const [route, routeId] = url.pathname.split("/").filter(Boolean);
      videoId =
        url.searchParams.get("v") ??
        (["embed", "shorts", "live"].includes(route) ? routeId : null) ??
        null;
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

function YouTubeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-3.5"
    >
      <rect x="2.5" y="6" width="19" height="12" rx="4" fill="currentColor" />
      <path d="m10 9 5 3-5 3V9Z" fill="#ff0000" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-3.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M5.5 9.5c4.4-1.3 9.2-.9 13 1" />
      <path d="M6.3 13c3.7-.9 7.8-.6 11 1" />
      <path d="M7.2 16.4c3-.6 6.3-.3 8.9.8" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4 text-[#ed1746]"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

function LinkAddIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
      <path d="M19 17v4M17 19h4" />
    </svg>
  );
}

function CopyArrangementToSetList({
  context,
  setLists,
}: {
  context: {
    setListId: string;
    setListTrackId: string;
  };
  setLists: QuickAddSetListData[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSetListId, setPendingSetListId] = useState<string | null>(null);
  const [addedSetListIds, setAddedSetListIds] = useState(
    () =>
      new Set(
        setLists
          .filter((setList) => setList.containsMatchingArrangement)
          .map((setList) => setList.id),
      ),
  );
  const [isPending, startTransition] = useTransition();

  function handleCopy(targetSetListId: string): void {
    setPendingSetListId(targetSetListId);
    startTransition(async () => {
      const result = await SetListActions.copyTrackArrangement({
        sourceSetListId: context.setListId,
        sourceSetListTrackId: context.setListTrackId,
        targetSetListId,
      });

      if (!result.ok) {
        showToast({
          title: "Arrangement not copied",
          description: result.error.message,
          tone: "error",
        });
        setPendingSetListId(null);
        return;
      }

      setAddedSetListIds((current) => new Set(current).add(targetSetListId));
      setPendingSetListId(null);
      showToast({ title: "Arrangement copied to setlist", tone: "success" });
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#343438]"
      >
        Copy to setlist
      </button>
      {isOpen ? (
        <SetListPickerSurface
          title="Copy arrangement"
          description="The copied version can be edited independently."
          ariaLabel="Copy arrangement to another setlist"
          onClose={() => setIsOpen(false)}
        >
          <div className="max-h-72 divide-y divide-[#ececec] overflow-y-auto dark:divide-[#38383c]">
            {setLists.map((setList) => {
              const isAdded = addedSetListIds.has(setList.id);
              const isCurrentPending = pendingSetListId === setList.id;

              return (
                <div key={setList.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                    {setList.title}
                  </span>
                  <button
                    type="button"
                    disabled={isPending || isAdded}
                    onClick={() => handleCopy(setList.id)}
                    className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#ed1746] px-3 text-[10px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#777] dark:disabled:bg-[#343438] dark:disabled:text-[#a1a1aa]"
                  >
                    {isCurrentPending ? "Copying…" : isAdded ? "Already added" : "Copy"}
                  </button>
                </div>
              );
            })}
          </div>
        </SetListPickerSurface>
      ) : null}
    </div>
  );
}

function QuickAddToSetList({
  setLists,
  trackId,
}: {
  setLists: QuickAddSetListData[];
  trackId: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSetListId, setPendingSetListId] = useState<string | null>(null);
  const [addedSetListIds, setAddedSetListIds] = useState(
    () =>
      new Set(
        setLists
          .filter((setList) => setList.containsTrack)
          .map((setList) => setList.id),
      ),
  );
  const [isPending, startTransition] = useTransition();

  function handleAdd(setListId: string): void {
    setPendingSetListId(setListId);
    startTransition(async () => {
      const result = await SetListActions.addTrack(setListId, trackId);

      if (!result.ok) {
        showToast({
          title: "Track not added",
          description: result.error.message,
          tone: "error",
        });
        setPendingSetListId(null);
        return;
      }

      setAddedSetListIds((current) => new Set(current).add(setListId));
      setPendingSetListId(null);
      showToast({ title: "Added to setlist", tone: "success" });
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#343438]"
      >
        Copy to setlist
      </button>

      {isOpen ? (
        <SetListPickerSurface
          title="Add to a setlist"
          description="Choose any of your setlists."
          ariaLabel="Choose a setlist"
          onClose={() => setIsOpen(false)}
        >
          {setLists.length ? (
            <div className="max-h-72 divide-y divide-[#ececec] overflow-y-auto dark:divide-[#38383c]">
              {setLists.map((setList) => {
                const isAdded = addedSetListIds.has(setList.id);
                const isCurrentPending = pendingSetListId === setList.id;

                return (
                  <div
                    key={setList.id}
                    className="flex min-w-0 items-center gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold">
                        {setList.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-[#717171] dark:text-[#a1a1aa]">
                        {setList.trackCount} {setList.trackCount === 1 ? "track" : "tracks"}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={isPending || isAdded}
                      onClick={() => handleAdd(setList.id)}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-[#ed1746] px-3 text-[10px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#777] dark:disabled:bg-[#343438] dark:disabled:text-[#a1a1aa]"
                    >
                      {isCurrentPending ? "Adding…" : isAdded ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-6 text-[12px] leading-5 text-[#666] dark:text-[#b4b4bc]">
              You have no setlists yet.
            </p>
          )}
          <div className="border-t border-[#e7e7e7] p-3 dark:border-[#38383c]">
            <Link
              href="/setlists"
              className="inline-flex h-9 w-full items-center justify-center rounded-full border border-[#d9d9d9] px-4 text-[11px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
            >
              Create or manage setlists
            </Link>
          </div>
        </SetListPickerSurface>
      ) : null}
    </div>
  );
}

function SetListPickerSurface({
  ariaLabel,
  children,
  description,
  onClose,
  title,
}: {
  ariaLabel: string;
  children: ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 639px)");
    const previousOverflow = document.body.style.overflow;

    if (mobileQuery.matches) {
      document.body.style.overflow = "hidden";
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-70 flex items-end sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:z-30 sm:block">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close setlist picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 sm:hidden"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="relative max-h-[85dvh] w-full overflow-hidden rounded-t-3xl border-t border-[#dedede] bg-white text-[#111] shadow-[0_-18px_55px_rgba(0,0,0,0.25)] sm:w-[min(320px,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:shadow-[0_20px_55px_rgba(0,0,0,0.2)] dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f5f5f5]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#d4d4d8] sm:hidden dark:bg-[#52525b]" />
        <div className="flex items-start justify-between gap-3 border-b border-[#e7e7e7] px-5 py-4 sm:px-4 sm:py-3 dark:border-[#38383c]">
          <div className="min-w-0">
            <p className="text-[15px] font-black sm:text-[13px]">{title}</p>
            <p className="mt-1 text-[12px] leading-5 text-[#666] sm:mt-0.5 sm:text-[11px] dark:text-[#b4b4bc]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close setlist picker"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f1f1f1] text-xl transition hover:bg-[#e5e5e5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] sm:hidden dark:bg-[#303034] dark:hover:bg-[#3a3a3f]"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ChordLine({
  line,
  chordInstrument,
  fitChordToLabel = false,
  wrapLine = false,
  showVariationLabels = true,
  trackPreference,
  onVariationChange,
}: {
  line: string;
  chordInstrument: TrackChordInstrument;
  fitChordToLabel?: boolean;
  wrapLine?: boolean;
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
  return <div className={wrapLine ? "min-h-6 whitespace-pre-wrap [overflow-wrap:anywhere]" : "min-h-6 whitespace-pre"}>{parts.map((part, index) => {
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
      return <strong key={index} className={`${isChord ? "inline-flex items-center justify-center rounded-sm text-[1em] font-black leading-none text-[#ed1746]" : "inline-flex items-center justify-center rounded-sm text-[1em] font-bold leading-none text-[#666] dark:text-[#b4b4bc]"} ${wrapLine ? "max-w-full break-all" : ""}`} style={{ width: `${part.length}ch` }}>{value}</strong>;
    }

    return (
      <ChordPopover
        key={index}
        constrainWidth={wrapLine}
        content={
          chordInstrument === "piano" && pianoReference ? (
            <PianoChordCard
              key={`${pianoReference.chord.symbol}-${pianoReference.variationIndex}`}
              chord={pianoReference.chord}
              displaySymbol={chordReference.displaySymbol}
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
              displaySymbol={chordReference.displaySymbol}
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
              displaySymbol={chordReference.displaySymbol}
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
          className={`inline-flex items-center justify-center rounded-sm bg-[#e7e7e9] text-[1em] font-black leading-none text-[#111] transition hover:bg-[#ffdce4] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#343438] dark:text-white dark:hover:bg-[#4a1c28] ${wrapLine ? "max-w-full break-all" : ""}`}
          style={fitChordToLabel ? undefined : { width: `${part.length}ch` }}
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
  collapsible = false,
  instrument,
  showVariationLabels = true,
  wrapContent = false,
  onInstrumentChange,
  trackPreference,
  onVariationChange,
}: {
  chords: GuitarChordReference[];
  collapsible?: boolean;
  instrument: TrackChordInstrument;
  showVariationLabels?: boolean;
  wrapContent?: boolean;
  onInstrumentChange: (instrument: TrackChordInstrument) => void;
  trackPreference: TrackPreference;
  onVariationChange: (
    instrument: TrackChordInstrument,
    chordReference: GuitarChordReference,
    variationIndex: number,
  ) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const showContent = !collapsible || isExpanded;
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
          {collapsible ? (
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
            >
              Chords
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`size-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                <path d="m4 7 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : "Chords"}
        </h3>
        {showContent ? (
          <div
            className={`flex gap-5 text-[13px] font-black uppercase ${wrapContent ? "flex-wrap" : "overflow-x-auto"}`}
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
        ) : null}
      </div>
      {showContent ? (
        <div className={`mt-4 flex gap-4 pb-2 ${wrapContent ? "flex-wrap" : "overflow-x-auto"}`}>
          {instrument === "guitar"
            ? chords.map((chordReference) => (
                <div
                  key={chordReference.key}
                  className="w-[108px] shrink-0 [&_article]:min-h-[156px] [&_article]:px-2 [&_article]:pt-2"
                >
                  <ChordCard
                    chord={chordReference.chord}
                    displaySymbol={chordReference.displaySymbol}
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
                    displaySymbol={chords[index].displaySymbol}
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
                    displaySymbol={chords[index].displaySymbol}
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
      ) : null}
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
    return <>{chordReference.displaySymbol}</>;
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
    displaySymbol: parsedChord.symbol,
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

function EllipsisIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}
