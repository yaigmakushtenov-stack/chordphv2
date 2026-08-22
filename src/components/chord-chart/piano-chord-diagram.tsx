import type { PianoChordVariation } from "@/data/chords";

type PianoChordDiagramProps = {
  symbol: string;
  variation: PianoChordVariation;
  variationLabel?: number | null;
  className?: string;
};

const WHITE_KEYS = [
  { note: "C", position: 0 },
  { note: "D", position: 2 },
  { note: "E", position: 4 },
  { note: "F", position: 5 },
  { note: "G", position: 7 },
  { note: "A", position: 9 },
  { note: "B", position: 11 },
  { note: "C", position: 12 },
  { note: "D", position: 14 },
  { note: "E", position: 16 },
  { note: "F", position: 17 },
  { note: "G", position: 19 },
  { note: "A", position: 21 },
  { note: "B", position: 23 },
] as const;
const BLACK_KEYS = [
  { note: "C#", position: 1, left: 9, markerX: 12.5 },
  { note: "Eb", position: 3, left: 21, markerX: 24.5 },
  { note: "F#", position: 6, left: 45, markerX: 48.5 },
  { note: "Ab", position: 8, left: 57, markerX: 60.5 },
  { note: "Bb", position: 10, left: 69, markerX: 72.5 },
  { note: "C#", position: 13, left: 93, markerX: 96.5 },
  { note: "Eb", position: 15, left: 105, markerX: 108.5 },
  { note: "F#", position: 18, left: 129, markerX: 132.5 },
  { note: "Ab", position: 20, left: 141, markerX: 144.5 },
  { note: "Bb", position: 22, left: 153, markerX: 156.5 },
] as const;

const NOTE_POSITION: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

const WHITE_KEY_WIDTH = 12;
const WHITE_KEY_HEIGHT = 44;
const BLACK_KEY_WIDTH = 7;
const BLACK_KEY_HEIGHT = 29;

export function PianoChordDiagram({
  symbol,
  variation,
  variationLabel = null,
  className,
}: PianoChordDiagramProps) {
  const activePositions = new Set(getActivePositions(variation.notes));

  return (
    <figure
      className={className}
      role="img"
      aria-label={`${symbol} piano chord, ${variation.label}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 186 94"
        className="h-auto w-full max-w-[186px] overflow-visible"
      >
        <text
          x="93"
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
          {WHITE_KEYS.map((key, index) => (
            <rect
              key={`${key.note}-${key.position}`}
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
              key={`${key.note}-${key.position}`}
              x={key.left}
              y="0"
              width={BLACK_KEY_WIDTH}
              height={BLACK_KEY_HEIGHT}
              rx="1.5"
              className="fill-[#222] stroke-[#222] stroke-[1.4] dark:fill-[#111] dark:stroke-[#f5f5f5]"
            />
          ))}
          {WHITE_KEYS.map((key, index) =>
            activePositions.has(key.position) ? (
              <circle
                key={`${key.note}-${key.position}-marker`}
                cx={index * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH / 2}
                cy={WHITE_KEY_HEIGHT - 7}
                r="2.6"
                className="fill-[#222] dark:fill-[#111]"
              />
            ) : null,
          )}
          {BLACK_KEYS.map((key) =>
            activePositions.has(key.position) ? (
              <circle
                key={`${key.note}-${key.position}-marker`}
                cx={key.markerX}
                cy={BLACK_KEY_HEIGHT - 7}
                r="3.2"
                className="fill-white stroke-[#222] stroke-[1.4] dark:fill-[#f5f5f5] dark:stroke-[#111]"
              />
            ) : null,
          )}
        </g>
        <text
          x="93"
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

function getActivePositions(notes: string[]) {
  const positions: number[] = [];
  let previousPosition = -1;

  for (const note of notes) {
    const basePosition = NOTE_POSITION[note];

    if (basePosition === undefined) {
      continue;
    }

    let position = basePosition;

    while (position <= previousPosition) {
      position += 12;
    }

    positions.push(position);
    previousPosition = position;
  }

  return positions.filter((position) => position <= 23);
}
