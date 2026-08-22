# Chord Data

Chord definitions are stored as compact data and rendered by components outside this directory.

## Guitar Format

Fretted instrument `frets` arrays are ordered from the lowest displayed string
to the highest displayed string.

Guitar uses six values:

```ts
[E, A, D, G, B, e]
```

Ukulele uses four values in standard GCEA tuning:

```ts
[G, C, E, A]
```

Use these values:

- `0` means the string is played open.
- `"x"` means the string is muted.
- Positive numbers are actual fret numbers.
- `baseFret` defaults to `1` when omitted.
- `fingers` mirrors the `frets` array and uses `1`, `2`, `3`, `4`, `"T"`, or `null`.
- `barres` use guitar string numbers: `6` is low E and `1` is high e.

Example:

```ts
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
  ],
}
```

Do not put display concerns in these files. Pixel sizes, colors, hover behavior, labels, and layout belong in components.

## Guitar And Ukulele Coverage

The guitar library combines:

- Curated open-position chords for common beginner shapes.
- Curated slash chords for common song-sheet inversions.
- Movable templates for common chord qualities across all 12 roots.

Current generated qualities:

- Major
- Minor
- Power chords
- Dominant 7
- Major 7
- Minor 7
- Sus2
- Sus4
- Major 6
- Minor 6
- Dominant 9
- Minor 9
- Add9
- Diminished
- Diminished 7
- Augmented

Movable templates should not contain open strings. If a useful open-position shape exists, add it to the curated open variations for that exact chord symbol instead of relying on transposition.

The ukulele library uses compact common-shape templates for standard GCEA
tuning and generates all 12 roots for the supported qualities.

## Chord Equivalence

Annotation chord input is normalized before lookup so equivalent spellings share
one canonical data symbol across guitar, ukulele, and piano.

Examples:

```ts
EM7 -> Emaj7
Emajor7 -> Emaj7
Emin7 -> Em7
D#maj7 -> Ebmaj7
Aadd2 -> Aadd9
```

Each instrument keeps its own variation preference slot. Selecting a guitar
variation does not change ukulele or piano variation choices.

## Piano Format

Piano chord variations are stored as note names instead of fret positions:

```ts
{
  symbol: "C",
  root: "C",
  quality: "",
  variations: [
    {
      id: "c-root",
      label: "Root",
      notes: ["C", "E", "G"],
    },
    {
      id: "c-inversion-1",
      label: "Inversion #1",
      notes: ["E", "G", "C"],
    },
  ],
}
```

The piano library uses the same 12 roots and common qualities as the guitar library. Variations are generated as root position plus inversions for the notes in each chord formula.
