"use client";

import type { ChartTextSize } from "@/app/settings/_components/preference-types";
import {
  fieldLabelClassName,
  SettingsSection,
} from "@/app/settings/_components/settings-section";
import { useAppTheme } from "@/providers/theme-provider";

type AppearanceSectionProps = {
  chartTextSize: ChartTextSize;
  onChartTextSizeChange: (size: ChartTextSize) => void;
};

const THEME_OPTIONS = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

const TEXT_SIZE_OPTIONS: { label: string; value: ChartTextSize }[] = [
  { label: "Compact", value: "compact" },
  { label: "Comfortable", value: "comfortable" },
  { label: "Large", value: "large" },
];

export function AppearanceSection({
  chartTextSize,
  onChartTextSizeChange,
}: AppearanceSectionProps) {
  const { theme, setTheme } = useAppTheme();

  return (
    <SettingsSection
      title="Appearance"
      description="Tune the interface and chart text for the room you are playing in."
    >
      <div className="space-y-5">
        <fieldset>
          <legend className={fieldLabelClassName}>Theme</legend>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                checked={theme === option.value}
                label={option.label}
                onChange={() => setTheme(option.value)}
                name="theme"
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={fieldLabelClassName}>Chart text size</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TEXT_SIZE_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                checked={chartTextSize === option.value}
                label={option.label}
                onChange={() => onChartTextSizeChange(option.value)}
                name="chart-text-size"
              />
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-[#e2e2e2] bg-[#f8f8f8] p-4 dark:border-[#343438] dark:bg-[#18181a]">
            <p
              className={`font-mono font-bold leading-relaxed text-[#171717] dark:text-white ${
                chartTextSize === "compact"
                  ? "text-[12px]"
                  : chartTextSize === "large"
                    ? "text-[17px]"
                    : "text-[14px]"
              }`}
            >
              <span className="text-[#ed1746]">G</span> Amazing grace, how sweet the sound
            </p>
          </div>
        </fieldset>
      </div>
    </SettingsSection>
  );
}

function ChoiceButton({
  checked,
  label,
  name,
  onChange,
}: {
  checked: boolean;
  label: string;
  name: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-[12px] font-bold transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ed1746] ${
        checked
          ? "border-[#ed1746] bg-[#ed1746] text-white"
          : "border-[#dedede] bg-white text-[#555] hover:border-[#bebebe] hover:text-[#111] dark:border-[#39393d] dark:bg-[#1c1c1f] dark:text-[#b4b4bc] dark:hover:border-[#55555b] dark:hover:text-white"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}
