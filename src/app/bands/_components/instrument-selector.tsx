"use client";

import { useEffect, useRef, useState } from "react";

import type { GroupInstrument } from "@/generated/prisma/client";

export const GROUP_INSTRUMENT_OPTIONS: {
  label: string;
  value: GroupInstrument;
}[] = [
  { label: "Guitar", value: "GUITAR" },
  { label: "Drums", value: "DRUMS" },
  { label: "Vocals", value: "VOCALS" },
  { label: "Keys", value: "KEYS" },
  { label: "Bass", value: "BASS" },
];

type InstrumentSelectorProps = {
  disabled?: boolean;
  onChange: (value: GroupInstrument | "") => void;
  value: GroupInstrument | "";
};

export function InstrumentSelector({
  disabled = false,
  onChange,
  value,
}: InstrumentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption =
    GROUP_INSTRUMENT_OPTIONS.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-10 w-full min-w-[150px] items-center justify-between gap-3 rounded-full border border-[#d9d9d9] bg-white px-4 text-left text-[12px] font-bold text-[#111] outline-none transition hover:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-55 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-white"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{selectedOption?.label ?? "Instrument"}</span>
        <span aria-hidden="true" className="text-[10px]">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 w-full min-w-[190px] overflow-hidden rounded-xl border border-[#e4e4e4] bg-white py-1 shadow-xl dark:border-[#303034] dark:bg-[#171719]">
          <div role="listbox" aria-label="Instrument">
            {GROUP_INSTRUMENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex h-10 w-full items-center justify-between px-4 text-left text-[12px] font-bold transition hover:bg-[#fff0f3] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#3a111d] ${
                  option.value === value
                    ? "text-[#ed1746]"
                    : "text-[#111] dark:text-white"
                }`}
              >
                {option.label}
                {option.value === value ? (
                  <span aria-hidden="true" className="text-[#ed1746]">
                    ✓
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function formatGroupInstrument(instrument: GroupInstrument): string {
  return (
    GROUP_INSTRUMENT_OPTIONS.find((option) => option.value === instrument)
      ?.label ?? instrument
  );
}
