"use client";

export const AUTO_SCROLL_PIXELS_PER_SECOND = 5;
export const AUTO_SCROLL_SPEED_STEP = 0.5;
export const MAX_AUTO_SCROLL_SPEED = 8;

type AutoScrollSpeedControlsProps = {
  speed: number;
  isDark: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  compact?: boolean;
  decreaseLabel?: string;
};

export function AutoScrollSpeedControls({
  speed,
  isDark,
  onDecrease,
  onIncrease,
  compact = false,
  decreaseLabel = "Decrease auto-scroll speed",
}: AutoScrollSpeedControlsProps) {
  return (
    <div
      role="group"
      aria-label="Auto-scroll speed controls"
      className={`inline-flex h-10 shrink-0 items-center overflow-hidden rounded-full border ${
        isDark
          ? "border-[#343740] bg-[#17191f] text-white"
          : "border-[#d8d3c8] bg-white text-[#111]"
      }`}
    >
      <button
        type="button"
        onClick={onDecrease}
        aria-label={decreaseLabel}
        className={`flex h-full w-9 items-center justify-center text-[18px] font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
          isDark ? "hover:bg-[#303036]" : "hover:bg-[#eeeeef]"
        }`}
      >
        -
      </button>
      <span
        role="status"
        aria-label={speed === 0 ? "Auto-scroll off" : `Auto-scroll speed ${speed}`}
        className={`text-center font-black tabular-nums ${
          compact ? "min-w-6 text-[11px]" : "min-w-24 px-2 text-[12px]"
        }`}
      >
        {compact ? speed : speed === 0 ? "Off" : `Speed ${speed}`}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        aria-label="Increase auto-scroll speed"
        className="flex h-full w-9 items-center justify-center bg-[#ed1746] text-[18px] font-black text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
      >
        +
      </button>
    </div>
  );
}
