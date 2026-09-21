export type DashboardActivitySource = "band" | "event" | "setlist";

export type DashboardActivityItem = {
  href: string;
  id: string;
  source: DashboardActivitySource;
  timestamp: string;
  title: string;
};

export type DashboardEventPlaylist = {
  bandName: string | null;
  id: string;
  orderNumber: number;
  title: string;
  trackCount: number;
};

export type DashboardNextEvent = {
  id: string;
  place: string;
  playlists: DashboardEventPlaylist[];
  startDate: string;
  title: string;
};

export type PracticeResumeItem = {
  href: string;
  id: string;
  key: string | null;
  lastOpenedAt: string;
  subtitle: string;
  tempo: number | null;
  title: string;
  type: "setlist" | "track";
};
