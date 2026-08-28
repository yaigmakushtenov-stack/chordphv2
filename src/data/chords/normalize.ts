const NOTE_INDEX: Record<string, number> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

const CANONICAL_NOTES = [
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
] as const;

const QUALITY_EQUIVALENTS: Record<string, string> = {
  "": "",
  M: "",
  maj: "",
  major: "",
  m: "m",
  min: "m",
  minor: "m",
  "5": "5",
  "7": "7",
  dom7: "7",
  dominant7: "7",
  M7: "maj7",
  Maj7: "maj7",
  maj7: "maj7",
  ma7: "maj7",
  major7: "maj7",
  m7: "m7",
  min7: "m7",
  minor7: "m7",
  "-7": "m7",
  sus2: "sus2",
  suspended2: "sus2",
  sus4: "sus4",
  suspended4: "sus4",
  "6": "6",
  M6: "6",
  major6: "6",
  m6: "m6",
  min6: "m6",
  minor6: "m6",
  "9": "9",
  dom9: "9",
  dominant9: "9",
  m9: "m9",
  min9: "m9",
  minor9: "m9",
  add2: "add9",
  add9: "add9",
  dim: "dim",
  diminished: "dim",
  dim7: "dim7",
  diminished7: "dim7",
  aug: "aug",
  augmented: "aug",
  "+": "aug",
};

const CHORD_PATTERN = /^([A-Ga-g])([#b]?)([^/\s]*)(?:\/([A-Ga-g])([#b]?))?$/;

export function normalizeChordSymbol(symbol: string): string | null {
  const match = CHORD_PATTERN.exec(symbol.trim());

  if (!match) {
    return null;
  }

  const [, root, accidental, quality, bassRoot, bassAccidental] = match;
  const normalizedRoot = normalizeNote(`${root.toUpperCase()}${accidental}`);
  const normalizedQuality = normalizeQuality(quality);

  if (!normalizedRoot || normalizedQuality === null) {
    return null;
  }

  if (!bassRoot) {
    return `${normalizedRoot}${normalizedQuality}`;
  }

  const normalizedBass = normalizeNote(
    `${bassRoot.toUpperCase()}${bassAccidental}`,
  );

  return normalizedBass
    ? `${normalizedRoot}${normalizedQuality}/${normalizedBass}`
    : null;
}

function normalizeNote(note: string): string | null {
  const noteIndex = NOTE_INDEX[note];

  if (noteIndex === undefined) {
    return null;
  }

  return CANONICAL_NOTES[noteIndex];
}

function normalizeQuality(quality: string): string | null {
  return (
    QUALITY_EQUIVALENTS[quality] ??
    QUALITY_EQUIVALENTS[quality.toLowerCase()] ??
    null
  );
}
