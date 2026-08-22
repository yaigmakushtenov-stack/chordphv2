import type { ChordDefinition } from "./types";

export const GUITAR_CHORDS: ChordDefinition[] = [
  {
    symbol: "G",
    root: "G",
    quality: "",
    variations: [
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
      {
        id: "g-barre-355433",
        baseFret: 3,
        frets: [3, 5, 5, 4, 3, 3],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 3, fromString: 6, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    symbol: "Em",
    root: "E",
    quality: "m",
    variations: [
      {
        id: "em-open-022000",
        frets: [0, 2, 2, 0, 0, 0],
        fingers: [null, 1, 2, null, null, null],
      },
      {
        id: "em-barre-779987",
        baseFret: 7,
        frets: [7, 7, 9, 9, 8, 7],
        fingers: [1, 1, 3, 4, 2, 1],
        barres: [{ fret: 7, fromString: 6, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    symbol: "C",
    root: "C",
    quality: "",
    variations: [
      {
        id: "c-open-x32010",
        frets: ["x", 3, 2, 0, 1, 0],
        fingers: [null, 3, 2, null, 1, null],
      },
      {
        id: "c-barre-x35553",
        baseFret: 3,
        frets: ["x", 3, 5, 5, 5, 3],
        fingers: [null, 1, 3, 3, 3, 1],
        barres: [{ fret: 3, fromString: 5, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    symbol: "D",
    root: "D",
    quality: "",
    variations: [
      {
        id: "d-open-xx0232",
        frets: ["x", "x", 0, 2, 3, 2],
        fingers: [null, null, null, 1, 3, 2],
      },
      {
        id: "d-barre-x57775",
        baseFret: 5,
        frets: ["x", 5, 7, 7, 7, 5],
        fingers: [null, 1, 3, 3, 3, 1],
        barres: [{ fret: 5, fromString: 5, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    symbol: "D/F#",
    root: "D",
    quality: "",
    bass: "F#",
    variations: [
      {
        id: "d-fsharp-2x0232",
        frets: [2, "x", 0, 2, 3, 2],
        fingers: [1, null, null, 2, 4, 3],
      },
    ],
  },
  {
    symbol: "G/B",
    root: "G",
    quality: "",
    bass: "B",
    variations: [
      {
        id: "g-b-x20003",
        frets: ["x", 2, 0, 0, 0, 3],
        fingers: [null, 1, null, null, null, 2],
      },
    ],
  },
  {
    symbol: "Dsus4",
    root: "D",
    quality: "sus4",
    variations: [
      {
        id: "dsus4-open-xx0233",
        frets: ["x", "x", 0, 2, 3, 3],
        fingers: [null, null, null, 1, 3, 4],
      },
      {
        id: "dsus4-barre-x57785",
        baseFret: 5,
        frets: ["x", 5, 7, 7, 8, 5],
        fingers: [null, 1, 3, 3, 4, 1],
        barres: [{ fret: 5, fromString: 5, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    symbol: "A",
    root: "A",
    quality: "",
    variations: [
      {
        id: "a-open-x02220",
        frets: ["x", 0, 2, 2, 2, 0],
        fingers: [null, null, 1, 2, 3, null],
      },
      {
        id: "a-barre-577655",
        baseFret: 5,
        frets: [5, 7, 7, 6, 5, 5],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 5, fromString: 6, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    symbol: "Am",
    root: "A",
    quality: "m",
    variations: [
      {
        id: "am-open-x02210",
        frets: ["x", 0, 2, 2, 1, 0],
        fingers: [null, null, 2, 3, 1, null],
      },
      {
        id: "am-barre-577555",
        baseFret: 5,
        frets: [5, 7, 7, 5, 5, 5],
        fingers: [1, 3, 4, 1, 1, 1],
        barres: [{ fret: 5, fromString: 6, toString: 1, finger: 1 }],
      },
    ],
  },
  {
    symbol: "E",
    root: "E",
    quality: "",
    variations: [
      {
        id: "e-open-022100",
        frets: [0, 2, 2, 1, 0, 0],
        fingers: [null, 2, 3, 1, null, null],
      },
    ],
  },
  {
    symbol: "F",
    root: "F",
    quality: "",
    variations: [
      {
        id: "f-barre-133211",
        frets: [1, 3, 3, 2, 1, 1],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 1, fromString: 6, toString: 1, finger: 1 }],
      },
    ],
  },
];
