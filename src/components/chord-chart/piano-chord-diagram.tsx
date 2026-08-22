import type { PianoChordVariation } from "@/data/chords";

type PianoChordDiagramProps = {
  symbol: string;
  variation: PianoChordVariation;
  variationLabel?: number | null;
  className?: string;
};

const WHITE_KEYS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const BLACK_KEYS = [
  { note: "C#", left: 11, markerX: 15 },
  { note: "Eb", left: 25, markerX: 29 },
  { note: "F#", left: 53, markerX: 57 },
  { note: "Ab", left: 67, markerX: 71 },
  { note: "Bb", left: 81, markerX: 85 },
] as const;

const WHITE_KEY_WIDTH = 14;
const WHITE_KEY_HEIGHT = 44;
const BLACK_KEY_WIDTH = 8;
const BLACK_KEY_HEIGHT = 29;

export function PianoChordDiagram({
  symbol,
  variation,
  variationLabel = null,
  className,
}: PianoChordDiagramProps) {
  const activeNotes = new Set(variation.notes);

  return (
    <figure
      className={className}
      role="img"
      aria-label={`${symbol} piano chord, ${variation.label}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 116 94"
        className="h-auto w-full max-w-[116px] overflow-visible"
      >
        <text
          x="58"
          y="18"
          textAnchor="middle"
          className="fill-[#222] text-[18px] font-black dark:fill-[#f5f5f5]"
        >
          {symbol}
          {variationLabel ? (
            <tspan dy="-7" className="text-[9px]">
              {variationLabel}
            </tspan>
          ) : null}
        </text>
        <g transform="translate(9 32)">
          {WHITE_KEYS.map((note, index) => (
            <rect
              key={note}
              x={index * WHITE_KEY_WIDTH}
              y="0"
              width={WHITE_KEY_WIDTH}
              height={WHITE_KEY_HEIGHT}
              rx="2"
              className="fill-white stroke-[#222] stroke-[1.8] dark:fill-[#f5f5f5] dark:stroke-[#f5f5f5]"
            />
          ))}
          {BLACK_KEYS.map((key) => (
            <rect
              key={key.note}
              x={key.left}
              y="0"
              width={BLACK_KEY_WIDTH}
              height={BLACK_KEY_HEIGHT}
              rx="1.5"
              className="fill-[#222] stroke-[#222] stroke-[1.4] dark:fill-[#111] dark:stroke-[#f5f5f5]"
            />
          ))}
          {WHITE_KEYS.map((note, index) =>
            activeNotes.has(note) ? (
              <circle
                key={`${note}-marker`}
                cx={index * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH / 2}
                cy={WHITE_KEY_HEIGHT - 7}
                r="2.6"
                className="fill-[#222] dark:fill-[#111]"
              />
            ) : null,
          )}
          {BLACK_KEYS.map((key) =>
            activeNotes.has(key.note) ? (
              <circle
                key={`${key.note}-marker`}
                cx={key.markerX}
                cy={BLACK_KEY_HEIGHT - 7}
                r="3.2"
                className="fill-white stroke-[#222] stroke-[1.4] dark:fill-[#f5f5f5] dark:stroke-[#111]"
              />
            ) : null,
          )}
        </g>
        <text
          x="58"
          y="88"
          textAnchor="middle"
          className="fill-[#666] text-[10px] font-bold dark:fill-[#b4b4bc]"
        >
          {variation.notes.join(" ")}
        </text>
      </svg>
    </figure>
  );
}
