import type {
  Barre,
  ChordDefinition,
  ChordVariation,
  FingerValue,
  FretValue,
} from "./types";

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

type VariationTemplate = {
  id: string;
  sourceRoot: NoteName;
  frets: FretValue[];
  fingers?: Array<FingerValue | null>;
  barres?: Barre[];
};

type QualityTemplate = {
  quality: string;
  aliases?: string[];
  variations: VariationTemplate[];
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

const QUALITY_TEMPLATES: QualityTemplate[] = [
  {
    quality: "",
    aliases: ["major", "maj"],
    variations: [
      {
        id: "c-shape",
        sourceRoot: "C",
        frets: [0, 0, 0, 3],
        fingers: [null, null, null, 3],
      },
      {
        id: "f-shape",
        sourceRoot: "F",
        frets: [2, 0, 1, 0],
        fingers: [2, null, 1, null],
      },
      {
        id: "g-shape",
        sourceRoot: "G",
        frets: [0, 2, 3, 2],
        fingers: [null, 1, 3, 2],
      },
      {
        id: "a-shape",
        sourceRoot: "A",
        frets: [2, 1, 0, 0],
        fingers: [2, 1, null, null],
      },
    ],
  },
  {
    quality: "m",
    aliases: ["minor", "min"],
    variations: [
      {
        id: "a-minor-shape",
        sourceRoot: "A",
        frets: [2, 0, 0, 0],
        fingers: [2, null, null, null],
      },
      {
        id: "d-minor-shape",
        sourceRoot: "D",
        frets: [2, 2, 1, 0],
        fingers: [2, 3, 1, null],
      },
      {
        id: "g-minor-shape",
        sourceRoot: "G",
        frets: [0, 2, 3, 1],
        fingers: [null, 2, 3, 1],
      },
    ],
  },
  {
    quality: "5",
    aliases: ["power", "power chord", "no3"],
    variations: [
      {
        id: "c5-shape",
        sourceRoot: "C",
        frets: [0, 0, 3, 3],
        fingers: [null, null, 1, 2],
      },
      {
        id: "g5-shape",
        sourceRoot: "G",
        frets: [0, 2, 3, "x"],
        fingers: [null, 1, 2, null],
      },
    ],
  },
  {
    quality: "7",
    aliases: ["dominant7", "dom7"],
    variations: [
      {
        id: "c7-shape",
        sourceRoot: "C",
        frets: [0, 0, 0, 1],
        fingers: [null, null, null, 1],
      },
      {
        id: "g7-shape",
        sourceRoot: "G",
        frets: [0, 2, 1, 2],
        fingers: [null, 2, 1, 3],
      },
      {
        id: "a7-shape",
        sourceRoot: "A",
        frets: [0, 1, 0, 0],
        fingers: [null, 1, null, null],
      },
      {
        id: "e7-shape",
        sourceRoot: "E",
        frets: [1, 2, 0, 2],
        fingers: [1, 2, null, 3],
      },
    ],
  },
  {
    quality: "maj7",
    aliases: ["major7"],
    variations: [
      {
        id: "c-maj7-shape",
        sourceRoot: "C",
        frets: [0, 0, 0, 2],
        fingers: [null, null, null, 2],
      },
      {
        id: "a-maj7-shape",
        sourceRoot: "A",
        frets: [1, 1, 0, 0],
        fingers: [1, 2, null, null],
      },
      {
        id: "g-maj7-shape",
        sourceRoot: "G",
        frets: [0, 2, 2, 2],
        fingers: [null, 1, 2, 3],
      },
    ],
  },
  {
    quality: "m7",
    aliases: ["minor7", "min7"],
    variations: [
      {
        id: "a-minor7-shape",
        sourceRoot: "A",
        frets: [0, 0, 0, 0],
      },
      {
        id: "d-minor7-shape",
        sourceRoot: "D",
        frets: [2, 2, 1, 3],
        fingers: [2, 3, 1, 4],
      },
      {
        id: "g-minor7-shape",
        sourceRoot: "G",
        frets: [0, 2, 1, 1],
        fingers: [null, 2, 1, 1],
        barres: [{ fret: 1, fromString: 2, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    quality: "sus2",
    aliases: ["suspended2"],
    variations: [
      {
        id: "c-sus2-shape",
        sourceRoot: "C",
        frets: [0, 2, 3, 3],
        fingers: [null, 1, 2, 3],
      },
      {
        id: "d-sus2-shape",
        sourceRoot: "D",
        frets: [2, 2, 0, 0],
        fingers: [1, 2, null, null],
      },
    ],
  },
  {
    quality: "sus4",
    aliases: ["suspended4"],
    variations: [
      {
        id: "c-sus4-shape",
        sourceRoot: "C",
        frets: [0, 0, 1, 3],
        fingers: [null, null, 1, 3],
      },
      {
        id: "g-sus4-shape",
        sourceRoot: "G",
        frets: [0, 2, 3, 3],
        fingers: [null, 1, 2, 3],
      },
    ],
  },
  {
    quality: "6",
    aliases: ["major6"],
    variations: [
      {
        id: "c6-shape",
        sourceRoot: "C",
        frets: [0, 0, 0, 0],
      },
      {
        id: "a6-shape",
        sourceRoot: "A",
        frets: [2, 4, 2, 4],
        fingers: [1, 3, 2, 4],
      },
    ],
  },
  {
    quality: "m6",
    aliases: ["minor6"],
    variations: [
      {
        id: "c-minor6-shape",
        sourceRoot: "C",
        frets: [0, 3, 3, 0],
        fingers: [null, 2, 3, null],
      },
    ],
  },
  {
    quality: "9",
    aliases: ["dominant9"],
    variations: [
      {
        id: "c9-shape",
        sourceRoot: "C",
        frets: [0, 2, 0, 1],
        fingers: [null, 2, null, 1],
      },
      {
        id: "g9-shape",
        sourceRoot: "G",
        frets: [2, 2, 1, 2],
        fingers: [2, 3, 1, 4],
      },
    ],
  },
  {
    quality: "m9",
    aliases: ["minor9", "min9"],
    variations: [
      {
        id: "a-minor9-shape",
        sourceRoot: "A",
        frets: [2, 4, 3, 2],
        fingers: [1, 4, 3, 2],
      },
      {
        id: "d-minor9-shape",
        sourceRoot: "D",
        frets: [2, 2, 3, 3],
        fingers: [1, 2, 3, 4],
      },
    ],
  },
  {
    quality: "add9",
    aliases: ["add2"],
    variations: [
      {
        id: "c-add9-shape",
        sourceRoot: "C",
        frets: [0, 2, 0, 3],
        fingers: [null, 1, null, 3],
      },
      {
        id: "f-add9-shape",
        sourceRoot: "F",
        frets: [0, 0, 1, 0],
        fingers: [null, null, 1, null],
      },
    ],
  },
  {
    quality: "dim",
    aliases: ["diminished"],
    variations: [
      {
        id: "c-dim-shape",
        sourceRoot: "C",
        frets: [2, 3, 2, 3],
        fingers: [1, 3, 2, 4],
      },
    ],
  },
  {
    quality: "dim7",
    aliases: ["diminished7"],
    variations: [
      {
        id: "c-dim7-shape",
        sourceRoot: "C",
        frets: [2, 3, 2, 3],
        fingers: [1, 3, 2, 4],
      },
    ],
  },
  {
    quality: "aug",
    aliases: ["+", "augmented"],
    variations: [
      {
        id: "c-aug-shape",
        sourceRoot: "C",
        frets: [1, 0, 0, 3],
        fingers: [1, null, null, 3],
      },
    ],
  },
];

export const UKELELE_CHORDS: ChordDefinition[] = ROOTS.flatMap((root) =>
  QUALITY_TEMPLATES.map((template) => createChord(root, template)),
).sort(compareChords);

function createChord(
  root: NoteName,
  template: QualityTemplate,
): ChordDefinition {
  const symbol = `${root}${template.quality}`;
  const variations = template.variations.map((variation) =>
    transposeVariation(symbol, root, variation),
  );

  return {
    symbol,
    root,
    quality: template.quality,
    aliases: template.aliases,
    variations: sortVariations(uniqueVariations(variations)),
  };
}

function transposeVariation(
  symbol: string,
  targetRoot: NoteName,
  template: VariationTemplate,
): ChordVariation {
  const semitones =
    (NOTE_INDEX[targetRoot] - NOTE_INDEX[template.sourceRoot] + 12) % 12;
  const frets = template.frets.map((fret) =>
    typeof fret === "number" && fret > 0 ? fret + semitones : fret,
  );
  const shiftedBarres = template.barres?.map((barre) => ({
    ...barre,
    fret: barre.fret + semitones,
  }));
  const baseFret = getBaseFret(frets);

  return {
    id: `${slugify(symbol)}-${template.id}`,
    ...(baseFret > 1 ? { baseFret } : {}),
    frets,
    ...(template.fingers ? { fingers: template.fingers } : {}),
    ...(shiftedBarres ? { barres: shiftedBarres } : {}),
  };
}

function getBaseFret(frets: FretValue[]) {
  const frettedValues = frets.filter(
    (fret): fret is number => typeof fret === "number" && fret > 0,
  );
  const minimumFret = Math.min(...frettedValues);

  return Number.isFinite(minimumFret) ? minimumFret : 1;
}

function uniqueVariations(variations: ChordVariation[]) {
  const seen = new Set<string>();

  return variations.filter((variation) => {
    const key = variation.frets.join("-");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortVariations(variations: ChordVariation[]) {
  return [...variations].sort((first, second) => {
    const fretDifference = getBaseFret(first.frets) - getBaseFret(second.frets);

    if (fretDifference !== 0) {
      return fretDifference;
    }

    return mutedStringCount(first.frets) - mutedStringCount(second.frets);
  });
}

function mutedStringCount(frets: FretValue[]) {
  return frets.filter((fret) => fret === "x").length;
}

function compareChords(first: ChordDefinition, second: ChordDefinition) {
  const firstRootIndex = ROOTS.indexOf(first.root as NoteName);
  const secondRootIndex = ROOTS.indexOf(second.root as NoteName);

  if (firstRootIndex !== secondRootIndex) {
    return firstRootIndex - secondRootIndex;
  }

  return qualityRank(first) - qualityRank(second);
}

function qualityRank(chord: ChordDefinition) {
  return QUALITY_TEMPLATES.findIndex(
    (template) => template.quality === chord.quality,
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replaceAll("#", "sharp")
    .replaceAll("/", "-")
    .replaceAll("+", "aug")
    .replaceAll(/[^a-z0-9-]/g, "");
}
