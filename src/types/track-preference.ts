export type TrackPreference = {
  // Compact persistence-ready shape: c maps chord keys to [guitarVariationIndex, pianoVariationIndex].
  c: Record<string, [number?, number?]>;
};
