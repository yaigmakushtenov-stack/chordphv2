"use client";

import type {
  AccidentalPreference,
  DefaultInstrument,
} from "@/app/settings/_components/preference-types";
import {
  fieldLabelClassName,
  inputClassName,
  SettingsSection,
} from "@/app/settings/_components/settings-section";

type MusicPreferencesSectionProps = {
  accidentalPreference: AccidentalPreference;
  defaultInstrument: DefaultInstrument;
  onAccidentalPreferenceChange: (preference: AccidentalPreference) => void;
  onDefaultInstrumentChange: (instrument: DefaultInstrument) => void;
};

const INSTRUMENT_OPTIONS: { label: string; value: DefaultInstrument }[] = [
  { label: "Guitar", value: "GUITAR" },
  { label: "Drums", value: "DRUMS" },
  { label: "Vocals", value: "VOCALS" },
  { label: "Keys", value: "KEYS" },
  { label: "Bass", value: "BASS" },
];

export function MusicPreferencesSection({
  accidentalPreference,
  defaultInstrument,
  onAccidentalPreferenceChange,
  onDefaultInstrumentChange,
}: MusicPreferencesSectionProps) {
  return (
    <SettingsSection
      title="Music preferences"
      description="Set useful defaults for charts, rehearsals, and new band memberships."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="default-instrument" className={fieldLabelClassName}>
            Default instrument
          </label>
          <select
            id="default-instrument"
            value={defaultInstrument}
            onChange={(event) =>
              onDefaultInstrumentChange(event.target.value as DefaultInstrument)
            }
            className={`${inputClassName} cursor-pointer`}
          >
            {INSTRUMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[11px] leading-4 text-[#777] dark:text-[#92929a]">
            Individual bands can still use a different instrument.
          </p>
        </div>

        <fieldset>
          <legend className={fieldLabelClassName}>Chord notation</legend>
          <div className="grid grid-cols-2 gap-2">
            <NotationOption
              checked={accidentalPreference === "sharps"}
              label="Sharps"
              example="F♯ · C♯"
              onChange={() => onAccidentalPreferenceChange("sharps")}
            />
            <NotationOption
              checked={accidentalPreference === "flats"}
              label="Flats"
              example="G♭ · D♭"
              onChange={() => onAccidentalPreferenceChange("flats")}
            />
          </div>
        </fieldset>
      </div>
    </SettingsSection>
  );
}

function NotationOption({
  checked,
  example,
  label,
  onChange,
}: {
  checked: boolean;
  example: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-xl border p-3 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ed1746] ${
        checked
          ? "border-[#ed1746] bg-[#fff4f6] dark:bg-[#351018]"
          : "border-[#dedede] bg-white hover:border-[#bebebe] dark:border-[#39393d] dark:bg-[#1c1c1f] dark:hover:border-[#55555b]"
      }`}
    >
      <input
        type="radio"
        name="accidental-preference"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-black text-[#171717] dark:text-white">
          {label}
        </span>
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${checked ? "bg-[#ed1746]" : "bg-[#d4d4d4] dark:bg-[#52525b]"}`}
        />
      </span>
      <span className="mt-1.5 block font-mono text-[11px] text-[#717171] dark:text-[#a1a1aa]">
        {example}
      </span>
    </label>
  );
}
