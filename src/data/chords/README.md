# Chord Data

Chord definitions are stored as compact data and rendered by components outside this directory.

## Guitar Format

Guitar `frets` arrays are ordered from the lowest string to the highest string:

```ts
[E, A, D, G, B, e]
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

## Guitar Coverage

The guitar library combines:

- Curated open-position chords for common beginner shapes.
- Curated slash chords for common song-sheet inversions.
- Movable templates for common chord qualities across all 12 roots.

Current generated qualities:

- Major
- Minor
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
