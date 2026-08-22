import type { ChordVariation } from "@/data/chords";

type ChordDiagramProps = {
  symbol: string;
  variation: ChordVariation;
  instrumentLabel?: string;
  variationLabel?: number | null;
  className?: string;
};

const FRET_COUNT = 5;
const WIDTH = 104;
const HEIGHT = 126;
const GRID_LEFT = 18;
const GRID_TOP = 34;
const GRID_WIDTH = 52;
const GRID_HEIGHT = 64;
const FRET_GAP = GRID_HEIGHT / FRET_COUNT;
const DOT_RADIUS = 4.8;

export function ChordDiagram({
  symbol,
  variation,
  instrumentLabel = "guitar",
  variationLabel = null,
  className,
}: ChordDiagramProps) {
  const baseFret = variation.baseFret ?? 1;
  const stringCount = variation.frets.length;
  const stringGap = GRID_WIDTH / Math.max(1, stringCount - 1);
  const getStringX = (stringNumber: number) =>
    GRID_LEFT + (stringCount - stringNumber) * stringGap;

  return (
    <figure
      className={className}
      role="img"
      aria-label={`${symbol} ${instrumentLabel} chord diagram`}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full max-w-[86px] overflow-visible"
      >
        <text
          x={WIDTH / 2}
          y="16"
          textAnchor="middle"
          className="fill-[#222] text-[20px] font-black dark:fill-[#f5f5f5]"
        >
          {symbol}
          {variationLabel ? (
            <tspan dy="-7" className="text-[9px]">
              {variationLabel}
            </tspan>
          ) : null}
        </text>

        {variation.frets.map((fret, index) => {
          const stringNumber = stringCount - index;
          const x = getStringX(stringNumber);

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
            className="fill-[#222] text-[12px] font-bold dark:fill-[#f5f5f5]"
          >
            {baseFret}fr
          </text>
        ) : null}

        {Array.from({ length: stringCount }, (_, index) => {
          const x = GRID_LEFT + index * stringGap;

          return (
            <line
              key={`${variation.id}-string-${index}`}
              x1={x}
              y1={GRID_TOP}
              x2={x}
              y2={GRID_TOP + GRID_HEIGHT}
              className="stroke-[#222] stroke-[1.7] dark:stroke-[#f5f5f5]"
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
                  : "stroke-[#8b8b8b] stroke-[1.2] dark:stroke-[#777]"
              }
            />
          );
        })}

        {variation.barres?.map((barre) => {
          const fromX = getStringX(barre.fromString);
          const toX = getStringX(barre.toString);
          const y = fretY(barre.fret, baseFret);

          return (
            <line
              key={`${variation.id}-barre-${barre.fret}-${barre.fromString}-${barre.toString}`}
              x1={fromX}
              y1={y}
              x2={toX}
              y2={y}
              strokeLinecap="round"
              className="stroke-[#222] stroke-[6] dark:stroke-[#f5f5f5]"
            />
          );
        })}

        {variation.frets.map((fret, index) => {
          if (typeof fret !== "number" || fret <= 0) {
            return null;
          }

          const stringNumber = stringCount - index;
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
              cx={getStringX(stringNumber)}
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

          const stringNumber = stringCount - index;

          return (
            <text
              key={`${variation.id}-finger-${stringNumber}`}
              x={getStringX(stringNumber)}
              y={GRID_TOP + GRID_HEIGHT + 16}
              textAnchor="middle"
              className="fill-[#222] text-[12px] font-medium dark:fill-[#f5f5f5]"
            >
              {finger}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}

function fretY(fret: number, baseFret: number) {
  return GRID_TOP + (fret - baseFret) * FRET_GAP + FRET_GAP / 2;
}
