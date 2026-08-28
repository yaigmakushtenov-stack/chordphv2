export type TrackPreference = {
  // Compact persistence-ready shape: c maps chord keys to [guitarVariationIndex, pianoVariationIndex, ukuleleVariationIndex].
  c: Record<string, [number?, number?, number?]>;
};
