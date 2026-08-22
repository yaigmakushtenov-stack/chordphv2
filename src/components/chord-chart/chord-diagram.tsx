import type { ChordVariation } from "@/data/chords";

type ChordDiagramProps = {
  symbol: string;
  variation: ChordVariation;
  className?: string;
};

const STRING_COUNT = 6;
const FRET_COUNT = 5;
const WIDTH = 96;
const HEIGHT = 132;
const GRID_LEFT = 18;
const GRID_TOP = 34;
const GRID_WIDTH = 60;
const GRID_HEIGHT = 72;
const STRING_GAP = GRID_WIDTH / (STRING_COUNT - 1);
const FRET_GAP = GRID_HEIGHT / FRET_COUNT;
const DOT_RADIUS = 5.3;

export function ChordDiagram({
  symbol,
  variation,
  className,
}: ChordDiagramProps) {
  const baseFret = variation.baseFret ?? 1;

  return (
    <figure
      className={className}
      aria-label={`${symbol} guitar chord diagram`}
    >
      <svg
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full max-w-[96px] overflow-visible"
      >
        <title>{symbol} guitar chord diagram</title>
        <text
          x={WIDTH / 2}
          y="16"
          textAnchor="middle"
          className="fill-[#222] text-[18px] font-black dark:fill-[#f5f5f5]"
        >
          {symbol}
        </text>

        {variation.frets.map((fret, index) => {
          const stringNumber = STRING_COUNT - index;
          const x = stringX(stringNumber);

          if (fret === "x") {
            return (
              <text
                key={`${variation.id}-muted-${stringNumber}`}
                x={x}
                y="29"
                textAnchor="middle"
                className="fill-[#555] text-[12px] font-medium dark:fill-[#a1a1aa]"
              >
                x
              </text>
            );
          }

          return null;
        })}

        {baseFret > 1 ? (
          <text
            x={GRID_LEFT + GRID_WIDTH + 8}
            y={GRID_TOP + 12}
            className="fill-[#222] text-[13px] font-bold dark:fill-[#f5f5f5]"
          >
            {baseFret}fr
          </text>
        ) : null}

        {Array.from({ length: STRING_COUNT }, (_, index) => {
          const x = GRID_LEFT + index * STRING_GAP;

          return (
            <line
              key={`${variation.id}-string-${index}`}
              x1={x}
              y1={GRID_TOP}
              x2={x}
              y2={GRID_TOP + GRID_HEIGHT}
              className="stroke-[#222] stroke-[1.8] dark:stroke-[#f5f5f5]"
            />
          );
        })}

        {Array.from({ length: FRET_COUNT + 1 }, (_, index) => {
          const y = GRID_TOP + index * FRET_GAP;
          const isNut = index === 0 && baseFret === 1;

          return (
            <line
              key={`${variation.id}-fret-${index}`}
              x1={GRID_LEFT}
              y1={y}
              x2={GRID_LEFT + GRID_WIDTH}
              y2={y}
              className={
                isNut
                  ? "stroke-[#222] stroke-[3.8] dark:stroke-[#f5f5f5]"
                  : "stroke-[#8b8b8b] stroke-[1.3] dark:stroke-[#777]"
              }
            />
          );
        })}

        {variation.barres?.map((barre) => {
          const fromX = stringX(barre.fromString);
          const toX = stringX(barre.toString);
          const y = fretY(barre.fret, baseFret);

          return (
            <line
              key={`${variation.id}-barre-${barre.fret}-${barre.fromString}-${barre.toString}`}
              x1={fromX}
              y1={y}
              x2={toX}
              y2={y}
              strokeLinecap="round"
              className="stroke-[#222] stroke-[7] dark:stroke-[#f5f5f5]"
            />
          );
        })}

        {variation.frets.map((fret, index) => {
          if (typeof fret !== "number" || fret <= 0) {
            return null;
          }

          const stringNumber = STRING_COUNT - index;
          const coveredByBarre = variation.barres?.some(
            (barre) =>
              barre.fret === fret &&
              stringNumber <= Math.max(barre.fromString, barre.toString) &&
              stringNumber >= Math.min(barre.fromString, barre.toString),
          );

          if (coveredByBarre) {
            return null;
          }

          return (
            <circle
              key={`${variation.id}-dot-${stringNumber}`}
              cx={stringX(stringNumber)}
              cy={fretY(fret, baseFret)}
              r={DOT_RADIUS}
              className="fill-[#222] dark:fill-[#f5f5f5]"
            />
          );
        })}

        {variation.fingers?.map((finger, index) => {
          const fret = variation.frets[index];

          if (!finger || typeof fret !== "number" || fret <= 0) {
            return null;
          }

          const stringNumber = STRING_COUNT - index;

          return (
            <text
              key={`${variation.id}-finger-${stringNumber}`}
              x={stringX(stringNumber)}
              y={GRID_TOP + GRID_HEIGHT + 16}
              textAnchor="middle"
              className="fill-[#222] text-[13px] font-medium dark:fill-[#f5f5f5]"
            >
              {finger}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}

function stringX(stringNumber: number) {
  return GRID_LEFT + (STRING_COUNT - stringNumber) * STRING_GAP;
}

function fretY(fret: number, baseFret: number) {
  return GRID_TOP + (fret - baseFret) * FRET_GAP + FRET_GAP / 2;
}
