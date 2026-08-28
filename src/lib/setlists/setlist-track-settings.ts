import { MUSICAL_KEYS, TRACK_TUNINGS } from "@/lib/music/track-options";
import type { SetListTrackArrangement } from "@/types/setlist";

const MAX_LABEL_LENGTH = 80;
const MAX_TIME_SIGNATURE_LENGTH = 16;
const MAX_LYRICS_LENGTH = 100_000;
const MAX_NOTES_LENGTH = 20_000;

export function parseSetListTrackArrangement(
  settings: unknown,
): SetListTrackArrangement | null {
  if (!isRecord(settings) || !isRecord(settings.arrangement)) {
    return null;
  }

  const value = settings.arrangement;

  if (
    value.version !== 1 ||
    !isBoundedString(value.label, MAX_LABEL_LENGTH) ||
    !isMusicalKey(value.key) ||
    !isTrackTuning(value.tuning) ||
    !isNullableInteger(value.capo, 0, 12) ||
    !isNullableInteger(value.tempo, 20, 400) ||
    !isBoundedString(value.timeSignature, MAX_TIME_SIGNATURE_LENGTH) ||
    !isBoundedString(value.lyricsAndChords, MAX_LYRICS_LENGTH) ||
    !isBoundedString(value.notes, MAX_NOTES_LENGTH)
  ) {
    return null;
  }

  return {
    version: 1,
    label: value.label.trim(),
    key: value.key,
    tuning: value.tuning,
    capo: value.capo,
    tempo: value.tempo,
    timeSignature: value.timeSignature.trim(),
    lyricsAndChords: value.lyricsAndChords,
    notes: value.notes,
  };
}

export function mergeSetListTrackArrangement(
  settings: unknown,
  arrangement: SetListTrackArrangement,
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    arrangement,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isNullableInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= minimum &&
      value <= maximum)
  );
}

function isMusicalKey(value: unknown): value is string {
  return typeof value === "string" && MUSICAL_KEYS.some((key) => key === value);
}

function isTrackTuning(value: unknown): value is string {
  return typeof value === "string" && TRACK_TUNINGS.some((tuning) => tuning === value);
}
