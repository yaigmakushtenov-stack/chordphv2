export type OfflineChart = {
  id: string;
  href: string;
  title: string;
  artistName: string;
  key: string;
  transpose: number;
  tuning: string;
  capo: number | null;
  tempo: number | null;
  timeSignature: string;
  lyricsAndChords: string;
  notes: string;
};

export type OfflineDownload = {
  id: string;
  kind: "chart" | "setlist";
  href: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  savedAt: string;
  editedAt?: string;
  songs: { id: string; chart: OfflineChart | null }[];
};

export type OfflineSetListRequest = { kind: "personal" | "band"; id: string };
