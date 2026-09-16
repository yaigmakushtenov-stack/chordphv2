import {
  ChordLine,
  TrackChordSection,
  getUsedGuitarChords,
} from "@/app/track/_components/annotation-viewer";
import { SongChart, parseSongChartSource } from "@/components/shared/chords/song-chart";

type ChordLineProps = Parameters<typeof ChordLine>[0];

type PairedChordPreviewProps = Pick<
  ChordLineProps,
  "chordInstrument" | "trackPreference" | "onVariationChange"
> & {
  chords: ReturnType<typeof getUsedGuitarChords>;
  onInstrumentChange: Parameters<typeof TrackChordSection>[0]["onInstrumentChange"];
  source: string;
};

export function PairedChordPreview({
  source,
  chords,
  chordInstrument,
  onInstrumentChange,
  trackPreference,
  onVariationChange,
}: PairedChordPreviewProps) {
  if (!source.trim()) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-[#d9d9d9] px-4 py-14 text-center text-[13px] text-[#777] dark:border-[#3a3a3f] dark:text-[#a1a1aa]">
        Your formatted lyrics and chords will appear here.
      </div>
    );
  }

  return (
    <div className="mt-5 max-h-[60vh] min-w-0 overflow-x-hidden overflow-y-auto rounded-xl bg-[#fafafa] p-4 font-mono text-[13px] leading-6 dark:bg-[#202023]">
      {chords.length ? (
        <TrackChordSection
          chords={chords}
          instrument={chordInstrument}
          showVariationLabels={false}
          wrapContent
          onInstrumentChange={onInstrumentChange}
          trackPreference={trackPreference}
          onVariationChange={onVariationChange}
        />
      ) : null}
      <SongChart
        sections={parseSongChartSource(source)}
        renderChord={(value) => (
          <ChordLine
            line={`[${value}]`}
            chordInstrument={chordInstrument}
            fitChordToLabel
            wrapLine
            showVariationLabels={false}
            trackPreference={trackPreference}
            onVariationChange={onVariationChange}
          />
        )}
      />
    </div>
  );
}
