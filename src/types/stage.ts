export type StageTrackData = {
  id: string;
  setListTrackId: string;
  title: string;
  artistName: string;
  key: string;
  capo: number | null;
  tempo: number | null;
  timeSignature: string;
  tuning: string;
  lyricsAndChords: string;
  orderNumber: number;
  isAvailable: boolean;
};

export type StagePlaylistData = {
  id: string;
  eventId: string;
  eventTitle: string;
  setListId: string;
  setListTitle: string;
  band: {
    id: string;
    name: string;
  } | null;
  tracks: StageTrackData[];
};

export type StageTheme = "dark" | "light";

export type StageDisplayMode = "default" | "vocals";

export type StagePlaybackStatus = "paused" | "playing";

export type StageRuntimePosition = {
  lineId: string | null;
  lineIndex: number | null;
  lineNumber: number | null;
  lineOffsetFromViewportTopPx: number | null;
  sectionId: string;
  sectionNumber: number;
  sectionProgressRatio: number;
  sectionTitle: string;
  sectionTopOffsetPx: number;
  setListTrackId: string;
  trackId: string;
  trackTitle: string;
  viewportHeight: number;
};

export type StageRuntimeState = {
  appearance: {
    accidentals: "flats" | "sharps";
    displayMode: StageDisplayMode;
    theme: StageTheme;
    transpose: number;
  };
  channel: {
    bandId: string | null;
    eventId: string;
    eventSetListId: string;
    setListId: string;
  };
  playback: {
    scrollSpeed: number;
    status: StagePlaybackStatus;
  };
  position: StageRuntimePosition | null;
  updatedAt: number;
};
