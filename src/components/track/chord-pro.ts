export type AccidentalPreference = "sharps" | "flats";

const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
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

const CHORD_PATTERN = /^([A-G])([#b]?)([^/\s]*)(?:\/([A-G])([#b]?))?$/;
export type ChordLineFormatResult = {
  formattedSource: string;
  convertedChordCount: number;
  convertedLineCount: number;
};

export function formatPlainChordLines(source: string): ChordLineFormatResult {
  let convertedChordCount = 0;
  let convertedLineCount = 0;
  const formattedSource = source
    .split("\n")
    .map((line) => {
      if (!isPlainChordLine(line)) {
        return line;
      }

      convertedLineCount += 1;

      return line.replace(/\S+/g, (chord) => {
        convertedChordCount += 1;
        return `[${removeInvisibleCharacters(chord)}]`;
      });
    })
    .join("\n");

  return {
    formattedSource,
    convertedChordCount,
    convertedLineCount,
  };
}

export function transposeChordPro(
  source: string,
  semitones: number,
  preference: AccidentalPreference,
): string {
  return source.replace(/\[([^\]\r\n]+)\]/g, (match, value: string) => {
    const transposed = transposeChord(value.trim(), semitones, preference);
    return transposed ? `[${transposed}]` : match;
  });
}

export function transposeChord(
  chord: string,
  semitones: number,
  preference: AccidentalPreference,
): string | null {
  const match = CHORD_PATTERN.exec(chord);

  if (!match) {
    return null;
  }

  const [, root, accidental, quality, bassRoot, bassAccidental] = match;
  const transposedRoot = transposeNote(`${root}${accidental}`, semitones, preference);

  if (!transposedRoot) {
    return null;
  }

  if (!bassRoot) {
    return `${transposedRoot}${quality}`;
  }

  const transposedBass = transposeNote(
    `${bassRoot}${bassAccidental}`,
    semitones,
    preference,
  );

  return transposedBass ? `${transposedRoot}${quality}/${transposedBass}` : null;
}

function isPlainChordLine(line: string): boolean {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.includes("[") || trimmedLine.includes("]")) {
    return false;
  }

  const tokens = trimmedLine.split(/\s+/);
  return tokens.every((token) =>
    Boolean(transposeChord(removeInvisibleCharacters(token), 0, "sharps")),
  );
}

function removeInvisibleCharacters(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function transposeNote(
  note: string,
  semitones: number,
  preference: AccidentalPreference,
): string | null {
  const noteIndex = NOTE_INDEX[note];

  if (noteIndex === undefined) {
    return null;
  }

  const normalizedIndex = (noteIndex + semitones % 12 + 12) % 12;
  return (preference === "flats" ? FLAT_NOTES : SHARP_NOTES)[normalizedIndex];
}
