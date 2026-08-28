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
        id: "e-shape",
        sourceRoot: "F",
        frets: [1, 3, 3, 2, 1, 1],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 1, fromString: 6, toString: 1, finger: 1 }],
      },
      {
        id: "a-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 3, 3, 1],
        fingers: [null, 1, 3, 3, 3, 1],
        barres: [{ fret: 1, fromString: 5, toString: 1, finger: 1 }],
      },
      {
        id: "d-shape",
        sourceRoot: "E",
        frets: ["x", "x", 2, 4, 5, 4],
        fingers: [null, null, 1, 2, 4, 3],
      },
    ],
  },
  {
    quality: "m",
    aliases: ["minor", "min"],
    variations: [
      {
        id: "e-minor-shape",
        sourceRoot: "F",
        frets: [1, 3, 3, 1, 1, 1],
        fingers: [1, 3, 4, 1, 1, 1],
        barres: [{ fret: 1, fromString: 6, toString: 1, finger: 1 }],
      },
      {
        id: "a-minor-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 3, 2, 1],
        fingers: [null, 1, 3, 4, 2, 1],
        barres: [{ fret: 1, fromString: 5, toString: 1, finger: 1 }],
      },
      {
        id: "d-minor-shape",
        sourceRoot: "E",
        frets: ["x", "x", 2, 4, 5, 3],
        fingers: [null, null, 1, 3, 4, 2],
      },
    ],
  },
  {
    quality: "5",
    aliases: ["power", "power chord", "no3"],
    variations: [
      {
        id: "e5-shape",
        sourceRoot: "F",
        frets: [1, 3, 3, "x", "x", "x"],
        fingers: [1, 3, 4, null, null, null],
      },
      {
        id: "a5-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 3, "x", "x"],
        fingers: [null, 1, 3, 4, null, null],
      },
      {
        id: "d5-shape",
        sourceRoot: "E",
        frets: ["x", "x", 2, 4, 5, "x"],
        fingers: [null, null, 1, 3, 4, null],
      },
    ],
  },
  {
    quality: "7",
    aliases: ["dominant7", "dom7"],
    variations: [
      {
        id: "e7-shape",
        sourceRoot: "F",
        frets: [1, 3, 1, 2, 1, 1],
        fingers: [1, 3, 1, 2, 1, 1],
        barres: [{ fret: 1, fromString: 6, toString: 1, finger: 1 }],
      },
      {
        id: "a7-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 1, 3, 1],
        fingers: [null, 1, 3, 1, 4, 1],
        barres: [{ fret: 1, fromString: 5, toString: 1, finger: 1 }],
      },
      {
        id: "c7-shape",
        sourceRoot: "C",
        frets: ["x", 3, 5, 3, 5, 3],
        fingers: [null, 1, 3, 1, 4, 1],
        barres: [{ fret: 3, fromString: 5, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    quality: "maj7",
    aliases: ["major7"],
    variations: [
      {
        id: "e-maj7-shape",
        sourceRoot: "F",
        frets: [1, 3, 2, 2, 1, 1],
        fingers: [1, 4, 2, 3, 1, 1],
        barres: [{ fret: 1, fromString: 6, toString: 1, finger: 1 }],
      },
      {
        id: "a-maj7-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 2, 3, 1],
        fingers: [null, 1, 3, 2, 4, 1],
        barres: [{ fret: 1, fromString: 5, toString: 1, finger: 1 }],
      },
      {
        id: "c-maj7-shape",
        sourceRoot: "C",
        frets: ["x", 3, 5, 4, 5, 3],
        fingers: [null, 1, 3, 2, 4, 1],
        barres: [{ fret: 3, fromString: 5, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    quality: "m7",
    aliases: ["minor7", "min7"],
    variations: [
      {
        id: "e-minor7-shape",
        sourceRoot: "F",
        frets: [1, 3, 1, 1, 1, 1],
        fingers: [1, 3, 1, 1, 1, 1],
        barres: [{ fret: 1, fromString: 6, toString: 1, finger: 1 }],
      },
      {
        id: "a-minor7-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 1, 2, 1],
        fingers: [null, 1, 3, 1, 2, 1],
        barres: [{ fret: 1, fromString: 5, toString: 1, finger: 1 }],
      },
      {
        id: "d-minor7-shape",
        sourceRoot: "E",
        frets: ["x", "x", 2, 4, 3, 3],
        fingers: [null, null, 1, 4, 2, 3],
      },
    ],
  },
  {
    quality: "sus2",
    aliases: ["suspended2"],
    variations: [
      {
        id: "a-sus2-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 3, 1, 1],
        fingers: [null, 1, 3, 4, 1, 1],
        barres: [{ fret: 1, fromString: 5, toString: 1, finger: 1 }],
      },
      {
        id: "d-sus2-shape",
        sourceRoot: "E",
        frets: ["x", "x", 2, 4, 5, 2],
        fingers: [null, null, 1, 3, 4, 1],
        barres: [{ fret: 2, fromString: 4, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    quality: "sus4",
    aliases: ["suspended4"],
    variations: [
      {
        id: "e-sus4-shape",
        sourceRoot: "F",
        frets: [1, 3, 3, 3, 1, 1],
        fingers: [1, 2, 3, 4, 1, 1],
        barres: [{ fret: 1, fromString: 6, toString: 1, finger: 1 }],
      },
      {
        id: "a-sus4-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 3, 4, 1],
        fingers: [null, 1, 2, 3, 4, 1],
        barres: [{ fret: 1, fromString: 5, toString: 1, finger: 1 }],
      },
      {
        id: "d-sus4-shape",
        sourceRoot: "E",
        frets: ["x", "x", 2, 4, 5, 5],
        fingers: [null, null, 1, 2, 3, 4],
      },
    ],
  },
  {
    quality: "6",
    aliases: ["major6"],
    variations: [
      {
        id: "e6-shape",
        sourceRoot: "F",
        frets: [1, 3, 3, 2, 3, 1],
        fingers: [1, 2, 3, 1, 4, 1],
        barres: [{ fret: 1, fromString: 6, toString: 1, finger: 1 }],
      },
      {
        id: "a6-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 3, 3, 3],
        fingers: [null, 1, 2, 3, 4, 4],
      },
    ],
  },
  {
    quality: "m6",
    aliases: ["minor6"],
    variations: [
      {
        id: "a-minor6-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 3, 2, 3],
        fingers: [null, 1, 3, 3, 2, 4],
      },
      {
        id: "d-minor6-shape",
        sourceRoot: "E",
        frets: ["x", "x", 2, 4, 3, 4],
        fingers: [null, null, 1, 3, 2, 4],
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
        frets: ["x", 3, 2, 3, 3, 3],
        fingers: [null, 2, 1, 3, 3, 3],
      },
    ],
  },
  {
    quality: "m9",
    aliases: ["minor9", "min9"],
    variations: [
      {
        id: "a-minor9-shape",
        sourceRoot: "Bb",
        frets: ["x", 1, 3, 1, 1, 1],
        fingers: [null, 1, 3, 1, 1, 1],
        barres: [{ fret: 1, fromString: 5, toString: 1, finger: 1 }],
      },
      {
        id: "c-minor9-shape",
        sourceRoot: "C",
        frets: ["x", 3, 1, 3, 3, 3],
        fingers: [null, 2, 1, 3, 3, 3],
      },
    ],
  },
  {
    quality: "add9",
    aliases: ["add2"],
    variations: [
      {
        id: "a-add9-shape",
        sourceRoot: "B",
        frets: ["x", 2, 4, 4, 2, 2],
        fingers: [null, 1, 3, 4, 1, 1],
        barres: [{ fret: 2, fromString: 5, toString: 1, finger: 1 }],
      },
      {
        id: "e-add9-shape",
        sourceRoot: "F",
        frets: [1, 3, 3, 2, 1, 3],
        fingers: [1, 3, 4, 2, 1, 4],
        barres: [{ fret: 1, fromString: 6, toString: 2, finger: 1 }],
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
        frets: ["x", 3, 4, 5, 4, "x"],
        fingers: [null, 1, 2, 4, 3, null],
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
        frets: ["x", 3, 4, 2, 4, "x"],
        fingers: [null, 2, 3, 1, 4, null],
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
        frets: ["x", 3, 2, 1, 1, "x"],
        fingers: [null, 4, 3, 1, 2, null],
      },
    ],
  },
];

const CURATED_OPEN_VARIATIONS: Record<string, ChordVariation[]> = {
  A: [
    {
      id: "a-open-x02220",
      frets: ["x", 0, 2, 2, 2, 0],
      fingers: [null, null, 1, 2, 3, null],
    },
  ],
  Am: [
    {
      id: "am-open-x02210",
      frets: ["x", 0, 2, 2, 1, 0],
      fingers: [null, null, 2, 3, 1, null],
    },
  ],
  A7: [
    {
      id: "a7-open-x02020",
      frets: ["x", 0, 2, 0, 2, 0],
      fingers: [null, null, 1, null, 2, null],
    },
  ],
  Am7: [
    {
      id: "am7-open-x02010",
      frets: ["x", 0, 2, 0, 1, 0],
      fingers: [null, null, 2, null, 1, null],
    },
  ],
  Amaj7: [
    {
      id: "amaj7-open-x02120",
      frets: ["x", 0, 2, 1, 2, 0],
      fingers: [null, null, 2, 1, 3, null],
    },
  ],
  Asus2: [
    {
      id: "asus2-open-x02200",
      frets: ["x", 0, 2, 2, 0, 0],
      fingers: [null, null, 1, 2, null, null],
    },
  ],
  Asus4: [
    {
      id: "asus4-open-x02230",
      frets: ["x", 0, 2, 2, 3, 0],
      fingers: [null, null, 1, 2, 3, null],
    },
  ],
  B7: [
    {
      id: "b7-open-x21202",
      frets: ["x", 2, 1, 2, 0, 2],
      fingers: [null, 2, 1, 3, null, 4],
    },
  ],
  C: [
    {
      id: "c-open-x32010",
      frets: ["x", 3, 2, 0, 1, 0],
      fingers: [null, 3, 2, null, 1, null],
    },
  ],
  C7: [
    {
      id: "c7-open-x32310",
      frets: ["x", 3, 2, 3, 1, 0],
      fingers: [null, 3, 2, 4, 1, null],
    },
  ],
  Cmaj7: [
    {
      id: "cmaj7-open-x32000",
      frets: ["x", 3, 2, 0, 0, 0],
      fingers: [null, 2, 1, null, null, null],
    },
  ],
  Cadd9: [
    {
      id: "cadd9-open-x32033",
      frets: ["x", 3, 2, 0, 3, 3],
      fingers: [null, 3, 2, null, 4, 4],
    },
  ],
  D: [
    {
      id: "d-open-xx0232",
      frets: ["x", "x", 0, 2, 3, 2],
      fingers: [null, null, null, 1, 3, 2],
    },
  ],
  Dm: [
    {
      id: "dm-open-xx0231",
      frets: ["x", "x", 0, 2, 3, 1],
      fingers: [null, null, null, 2, 3, 1],
    },
  ],
  D7: [
    {
      id: "d7-open-xx0212",
      frets: ["x", "x", 0, 2, 1, 2],
      fingers: [null, null, null, 2, 1, 3],
    },
  ],
  Dmaj7: [
    {
      id: "dmaj7-open-xx0222",
      frets: ["x", "x", 0, 2, 2, 2],
      fingers: [null, null, null, 1, 1, 1],
      barres: [{ fret: 2, fromString: 3, toString: 1, finger: 1 }],
    },
  ],
  Dsus2: [
    {
      id: "dsus2-open-xx0230",
      frets: ["x", "x", 0, 2, 3, 0],
      fingers: [null, null, null, 1, 2, null],
    },
  ],
  Dsus4: [
    {
      id: "dsus4-open-xx0233",
      frets: ["x", "x", 0, 2, 3, 3],
      fingers: [null, null, null, 1, 3, 4],
    },
  ],
  Ddim: [
    {
      id: "ddim-open-xx0101",
      frets: ["x", "x", 0, 1, 0, 1],
      fingers: [null, null, null, 1, null, 2],
    },
  ],
  Ddim7: [
    {
      id: "ddim7-open-xx0101",
      frets: ["x", "x", 0, 1, 0, 1],
      fingers: [null, null, null, 1, null, 2],
    },
  ],
  Daug: [
    {
      id: "daug-open-xx0332",
      frets: ["x", "x", 0, 3, 3, 2],
      fingers: [null, null, null, 3, 4, 1],
    },
  ],
  E: [
    {
      id: "e-open-022100",
      frets: [0, 2, 2, 1, 0, 0],
      fingers: [null, 2, 3, 1, null, null],
    },
  ],
  Em: [
    {
      id: "em-open-022000",
      frets: [0, 2, 2, 0, 0, 0],
      fingers: [null, 1, 2, null, null, null],
    },
  ],
  E7: [
    {
      id: "e7-open-020100",
      frets: [0, 2, 0, 1, 0, 0],
      fingers: [null, 2, null, 1, null, null],
    },
  ],
  Em7: [
    {
      id: "em7-open-022030",
      frets: [0, 2, 2, 0, 3, 0],
      fingers: [null, 1, 2, null, 3, null],
    },
  ],
  Emaj7: [
    {
      id: "emaj7-open-021100",
      frets: [0, 2, 1, 1, 0, 0],
      fingers: [null, 3, 1, 2, null, null],
    },
  ],
  Esus4: [
    {
      id: "esus4-open-022200",
      frets: [0, 2, 2, 2, 0, 0],
      fingers: [null, 1, 2, 3, null, null],
    },
  ],
  F: [
    {
      id: "f-small-barre-xx3211",
      frets: ["x", "x", 3, 2, 1, 1],
      fingers: [null, null, 3, 2, 1, 1],
      barres: [{ fret: 1, fromString: 2, toString: 1, finger: 1 }],
    },
  ],
  Fmaj7: [
    {
      id: "fmaj7-open-xx3210",
      frets: ["x", "x", 3, 2, 1, 0],
      fingers: [null, null, 3, 2, 1, null],
    },
  ],
  G: [
    {
      id: "g-open-320003",
      frets: [3, 2, 0, 0, 0, 3],
      fingers: [2, 1, null, null, null, 3],
    },
    {
      id: "g-open-320033",
      frets: [3, 2, 0, 0, 3, 3],
      fingers: [2, 1, null, null, 3, 4],
    },
  ],
  G7: [
    {
      id: "g7-open-320001",
      frets: [3, 2, 0, 0, 0, 1],
      fingers: [3, 2, null, null, null, 1],
    },
  ],
  Gmaj7: [
    {
      id: "gmaj7-open-320002",
      frets: [3, 2, 0, 0, 0, 2],
      fingers: [3, 1, null, null, null, 2],
    },
  ],
  Gsus4: [
    {
      id: "gsus4-open-330013",
      frets: [3, 3, 0, 0, 1, 3],
      fingers: [2, 3, null, null, 1, 4],
    },
  ],
};

const SLASH_CHORDS: ChordDefinition[] = [
  slashChord("D/F#", "D", "", "F#", [
    {
      id: "d-fsharp-2x0232",
      frets: [2, "x", 0, 2, 3, 2],
      fingers: [1, null, null, 2, 4, 3],
    },
  ]),
  slashChord("G/B", "G", "", "B", [
    {
      id: "g-b-x20003",
      frets: ["x", 2, 0, 0, 0, 3],
      fingers: [null, 1, null, null, null, 2],
    },
  ]),
  slashChord("C/E", "C", "", "E", [
    {
      id: "c-e-032010",
      frets: [0, 3, 2, 0, 1, 0],
      fingers: [null, 3, 2, null, 1, null],
    },
  ]),
  slashChord("F/A", "F", "", "A", [
    {
      id: "f-a-x03211",
      frets: ["x", 0, 3, 2, 1, 1],
      fingers: [null, null, 3, 2, 1, 1],
      barres: [{ fret: 1, fromString: 2, toString: 1, finger: 1 }],
    },
  ]),
  slashChord("Am/G", "A", "m", "G", [
    {
      id: "am-g-302210",
      frets: [3, 0, 2, 2, 1, 0],
      fingers: [3, null, 2, 4, 1, null],
    },
  ]),
];

export const GUITAR_CHORDS: ChordDefinition[] = [
  ...ROOTS.flatMap((root) =>
    QUALITY_TEMPLATES.map((template) => createChord(root, template)),
  ),
  ...SLASH_CHORDS,
].sort(compareChords);

function createChord(
  root: NoteName,
  template: QualityTemplate,
): ChordDefinition {
  const symbol = `${root}${template.quality}`;
  const curatedVariations = CURATED_OPEN_VARIATIONS[symbol] ?? [];
  const movableVariations = template.variations.map((variation) =>
    transposeVariation(symbol, root, variation),
  );

  return {
    symbol,
    root,
    quality: template.quality,
    aliases: template.aliases,
    variations: sortVariations(
      uniqueVariations([...curatedVariations, ...movableVariations]),
    ),
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

function slashChord(
  symbol: string,
  root: NoteName,
  quality: string,
  bass: NoteName,
  variations: ChordVariation[],
): ChordDefinition {
  return {
    symbol,
    root,
    quality,
    bass,
    variations,
  };
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
  if (chord.bass) {
    return 100;
  }

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
