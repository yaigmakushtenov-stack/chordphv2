"use client";

import { useState } from "react";

import { ChordDiagram } from "@/components/chord-chart/chord-diagram";
import type { ChordDefinition } from "@/data/chords";

type ChordCardProps = {
  chord: ChordDefinition;
  compact?: boolean;
  initialVariationIndex?: number;
  selectedVariationIndex?: number;
  onVariationIndexChange?: (variationIndex: number) => void;
  variationLabel?: number | null;
  unframed?: boolean;
};

export function ChordCard({
  chord,
  compact = false,
  initialVariationIndex = 0,
  selectedVariationIndex,
  onVariationIndexChange,
  variationLabel = null,
  unframed = false,
}: ChordCardProps) {
  const [variationIndex, setVariationIndex] = useState(() =>
    clampVariationIndex(initialVariationIndex, chord.variations.length),
  );
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(
    null,
  );
  const activeVariationIndex = clampVariationIndex(
    selectedVariationIndex ?? variationIndex,
    chord.variations.length,
  );
  const variation =
    chord.variations[activeVariationIndex] ?? chord.variations[0];
  const hasVariations = chord.variations.length > 1;

  function showPreviousVariation() {
    setSlideDirection("right");
    setActiveVariationIndex(
      activeVariationIndex === 0
        ? chord.variations.length - 1
        : activeVariationIndex - 1,
    );
  }

  function showNextVariation() {
    setSlideDirection("left");
    setActiveVariationIndex(
      activeVariationIndex === chord.variations.length - 1
        ? 0
        : activeVariationIndex + 1,
    );
  }

  function setActiveVariationIndex(nextVariationIndex: number) {
    setVariationIndex(nextVariationIndex);
    onVariationIndexChange?.(nextVariationIndex);
  }

  return (
    <article
      className={`group flex flex-col items-center text-[#222] transition dark:text-[#f5f5f5] ${
        unframed
          ? "bg-transparent"
          : "border border-transparent bg-white focus-within:border-[#d8d8d8] hover:border-[#d8d8d8] dark:bg-[#121214] dark:focus-within:border-[#36363a] dark:hover:border-[#36363a]"
      } ${
        compact && !unframed
          ? "w-[164px] rounded-md shadow-[0_12px_35px_rgba(0,0,0,0.22)] [&_figure_svg]:max-w-[78px]"
          : compact
            ? "w-[164px] [&_figure_svg]:max-w-[78px]"
          : "min-h-[190px] rounded-xl px-4 pb-3 pt-4"
      }`}
    >
      <div className="overflow-hidden">
        <div
          key={variation.id}
          className={
            slideDirection === "left"
              ? "animate-[chord-slide-left_180ms_ease-out]"
              : slideDirection === "right"
                ? "animate-[chord-slide-right_180ms_ease-out]"
                : ""
          }
        >
          <ChordDiagram
            symbol={chord.symbol}
            variation={variation}
            variationLabel={variationLabel}
            className={compact ? "mt-2" : ""}
          />
        </div>
      </div>

      <div
        className={`flex w-full items-center justify-center border-t border-[#eeeeee] text-[#8a8a8a] transition dark:border-[#29292c] dark:text-[#a1a1aa] ${
          unframed
            ? "mt-1 h-9 border-transparent opacity-100"
            : compact
            ? "mt-1 h-11 opacity-100"
            : "mt-auto h-11 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
        }`}
      >
        {hasVariations ? (
          <>
            <button
              type="button"
              onClick={showPreviousVariation}
              aria-label={`Show previous ${chord.symbol} variation`}
              className="flex size-9 items-center justify-center rounded-full transition hover:bg-[#f2f2f2] hover:text-[#222] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#242427] dark:hover:text-white"
            >
              <ChevronLeftIcon />
            </button>
            <span className="min-w-20 text-center text-[14px] font-medium">
              {activeVariationIndex + 1}/{chord.variations.length}
            </span>
            <button
              type="button"
              onClick={showNextVariation}
              aria-label={`Show next ${chord.symbol} variation`}
              className="flex size-9 items-center justify-center rounded-full transition hover:bg-[#f2f2f2] hover:text-[#222] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#242427] dark:hover:text-white"
            >
              <ChevronRightIcon />
            </button>
          </>
        ) : (
          <span className="text-[13px] font-medium">1/1</span>
        )}
      </div>
    </article>
  );
}

function clampVariationIndex(index: number, variationCount: number) {
  if (!Number.isInteger(index) || variationCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), variationCount - 1);
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
