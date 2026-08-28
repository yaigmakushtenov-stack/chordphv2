export const MUSICAL_KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
] as const;

export const TRACK_TUNINGS = [
  "Standard",
  "Half-Step Down", 
  "Perfect Fourth Tuning",
  "A Tuning",
  "B Tuning",
  "C Tuning",
  "C# Tuning",
  "D Tuning",
  "Drop A",
  "Drop Bb",
  "Drop B",
  "Drop C",
  "Drop Db",
  "Drop D",
  "Open C",
  "Open D",
  "Open E",
  "Open G",
  "Celtic",
] as const;

export const TRACK_JOIN_PHRASES = [
  ",",
  "&",
  "and",
  "with",
  "feat.",
  "featuring",
  "x",
] as const;

export const TRACK_TAGS = [
  "Filipino",
  "English",
  "Cebuano",
  "Ilocano",
  "Hiligaynon",
  "Multilingual",
  "Instrumental",
  "Praise",
  "Worship",
  "Gospel",
  "Hymn",
  "Prayer",
  "Communion",
  "Thanksgiving",
  "Christmas",
  "Easter",
  "Wedding",
  "Memorial",
  "Youth",
  "Kids",
  "Rock",
  "Pop",
  "Acoustic",
  "Ballad",
  "Folk",
  "Indie",
  "R&B",
  "Reggae",
  "Country",
  "Jazz",
  "Alternative",
  "Contemporary Worship",
  "OPM",
  "Upbeat",
  "Reflective",
  "Joyful",
  "Inspirational",
  "Solemn",
] as const;

export const MAX_TRACK_TAGS = 8;

export type TrackTag = (typeof TRACK_TAGS)[number];

export const TRACK_TAG_GROUPS: ReadonlyArray<{
  label: string;
  tags: readonly TrackTag[];
}> = [
  {
    label: "Language",
    tags: [
      "Filipino",
      "English",
      "Cebuano",
      "Ilocano",
      "Hiligaynon",
      "Multilingual",
      "Instrumental",
    ],
  },
  {
    label: "Worship and occasion",
    tags: [
      "Praise",
      "Worship",
      "Gospel",
      "Hymn",
      "Prayer",
      "Communion",
      "Thanksgiving",
      "Christmas",
      "Easter",
      "Wedding",
      "Memorial",
      "Youth",
      "Kids",
    ],
  },
  {
    label: "Style",
    tags: [
      "Rock",
      "Pop",
      "Acoustic",
      "Ballad",
      "Folk",
      "Indie",
      "R&B",
      "Reggae",
      "Country",
      "Jazz",
      "Alternative",
      "Contemporary Worship",
      "OPM",
    ],
  },
  {
    label: "Mood",
    tags: ["Upbeat", "Reflective", "Joyful", "Inspirational", "Solemn"],
  },
];

export type MusicalKey = (typeof MUSICAL_KEYS)[number];
export type TrackTuning = (typeof TRACK_TUNINGS)[number];
export type TrackJoinPhrase = (typeof TRACK_JOIN_PHRASES)[number];
