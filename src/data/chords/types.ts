export type Instrument = "guitar" | "ukelele" | "piano";

export type FretValue = number | "x";

export type FingerValue = 1 | 2 | 3 | 4 | "T";

export type Barre = {
  fret: number;
  fromString: number;
  toString: number;
  finger?: FingerValue;
};

export type ChordVariation = {
  id: string;
  baseFret?: number;
  frets: FretValue[];
  fingers?: Array<FingerValue | null>;
  barres?: Barre[];
};

export type ChordDefinition = {
  symbol: string;
  root: string;
  quality: string;
  bass?: string;
  aliases?: string[];
  variations: ChordVariation[];
};
