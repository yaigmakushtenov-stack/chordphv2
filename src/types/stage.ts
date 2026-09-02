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
