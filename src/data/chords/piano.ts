import type { PianoChordDefinition } from "./types";

type NoteName =
  | "C"
  | "C#"
  | "D"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "Ab"
  | "A"
  | "Bb"
  | "B";

type PianoQualityTemplate = {
  quality: string;
  aliases?: string[];
  intervals: number[];
};

const ROOTS: NoteName[] = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const NOTE_NAMES: NoteName[] = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const NOTE_INDEX: Record<NoteName, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

const QUALITY_TEMPLATES: PianoQualityTemplate[] = [
  { quality: "", aliases: ["major", "maj"], intervals: [0, 4, 7] },
  { quality: "m", aliases: ["minor", "min"], intervals: [0, 3, 7] },
  { quality: "5", aliases: ["power", "power chord", "no3"], intervals: [0, 7] },
  { quality: "7", aliases: ["dominant7", "dom7"], intervals: [0, 4, 7, 10] },
  { quality: "maj7", aliases: ["major7"], intervals: [0, 4, 7, 11] },
  { quality: "m7", aliases: ["minor7", "min7"], intervals: [0, 3, 7, 10] },
  { quality: "sus2", aliases: ["suspended2"], intervals: [0, 2, 7] },
  { quality: "sus4", aliases: ["suspended4"], intervals: [0, 5, 7] },
  { quality: "6", aliases: ["major6"], intervals: [0, 4, 7, 9] },
  { quality: "m6", aliases: ["minor6"], intervals: [0, 3, 7, 9] },
  { quality: "9", aliases: ["dominant9"], intervals: [0, 4, 7, 10, 14] },
  { quality: "m9", aliases: ["minor9", "min9"], intervals: [0, 3, 7, 10, 14] },
  { quality: "add9", aliases: ["add2"], intervals: [0, 4, 7, 14] },
  { quality: "dim", aliases: ["diminished"], intervals: [0, 3, 6] },
  { quality: "dim7", aliases: ["diminished7"], intervals: [0, 3, 6, 9] },
  { quality: "aug", aliases: ["+", "augmented"], intervals: [0, 4, 8] },
];

export const PIANO_CHORDS: PianoChordDefinition[] = ROOTS.flatMap((root) =>
  QUALITY_TEMPLATES.map((template) => createPianoChord(root, template)),
);

function createPianoChord(
  root: NoteName,
  template: PianoQualityTemplate,
): PianoChordDefinition {
  const symbol = `${root}${template.quality}`;
  const notes = template.intervals.map((interval) =>
    noteFromSemitone(NOTE_INDEX[root] + interval),
  );

  return {
    symbol,
    root,
    quality: template.quality,
    aliases: template.aliases,
    variations: createInversions(symbol, notes),
  };
}

function createInversions(symbol: string, notes: NoteName[]) {
  return notes.map((_, index) => ({
    id: `${slugify(symbol)}-${index === 0 ? "root" : `inversion-${index}`}`,
    symbol: index === 0 ? symbol : `${symbol}/${notes[index]}`,
    label: index === 0 ? "Root" : `Inversion #${index}`,
    notes: [...notes.slice(index), ...notes.slice(0, index)],
  }));
}

function noteFromSemitone(semitone: number): NoteName {
  return NOTE_NAMES[((semitone % 12) + 12) % 12];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replaceAll("#", "sharp")
    .replaceAll("+", "aug")
    .replaceAll(/[^a-z0-9-]/g, "");
}
