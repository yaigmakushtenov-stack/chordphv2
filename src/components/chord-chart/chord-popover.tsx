"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function handleBlur(event: FocusEvent<HTMLSpanElement>) {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setIsOpen(false);
  }

  function openPopover() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsOpen(true);
  }

  function scheduleClose() {
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 300);
  }

  function handlePointerDown(event: PointerEvent<HTMLSpanElement>) {
    if ((event.target as HTMLElement).closest("[data-chord-popover-panel]")) {
      return;
    }

    setIsOpen((currentValue) => !currentValue);
  }

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onBlur={handleBlur}
      onMouseEnter={openPopover}
      onMouseLeave={scheduleClose}
      onPointerDown={handlePointerDown}
    >
      {children}
      {isOpen ? (
        <span
          data-chord-popover-panel
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
          className="absolute bottom-full left-1/2 z-[80] block -translate-x-1/2 pb-3"
        >
          <ChordCard
            key={`${chord.symbol}-${initialVariationIndex}`}
            chord={chord}
            compact
            initialVariationIndex={initialVariationIndex}
          />
        </span>
      ) : null}
    </span>
  );
}
