"use client";

import type { ReactNode } from "react";

import { ChordCard } from "@/components/chord-chart/chord-card";
import type { ChordDefinition } from "@/data/chords";

type ChordPopoverProps = {
  chord: ChordDefinition;
  initialVariationIndex?: number;
  children: ReactNode;
};

export function ChordPopover({
  chord,
  initialVariationIndex = 0,
  children,
}: ChordPopoverProps) {
  return (
    <span className="group/chord relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 hidden -translate-x-1/2 group-focus-within/chord:block group-hover/chord:block">
        <span className="pointer-events-auto block">
          <ChordCard
            key={`${chord.symbol}-${initialVariationIndex}`}
            chord={chord}
            compact
            initialVariationIndex={initialVariationIndex}
          />
        </span>
      </span>
    </span>
  );
}
