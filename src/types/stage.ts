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
  currentUser: {
    canLead: boolean;
    id: string;
    role: "OWNER" | "MODERATOR" | "MEMBER" | null;
  };
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

export type StageSyncConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "unavailable";

export type StageSyncMode = "synced" | "unsynced";

export type StageSyncLockState = "free" | "locked";

export type StageTrackTransposes = Record<string, number>;

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

export type StageSyncPresenceData = {
  canLead: boolean;
  role: "OWNER" | "MODERATOR" | "MEMBER" | null;
  synced: boolean;
  userId: string;
};

export type StageSyncEventBase = {
  sender: {
    canPublish: boolean;
    clientId: string;
    connectionId: string;
    role: "OWNER" | "MODERATOR" | "MEMBER" | null;
    userId: string;
  };
  sequence: number;
  sentAt: number;
};

export type StageSyncSnapshot = StageSyncEventBase & {
  position: StageRuntimePosition | null;
  speed: number;
  trackTransposes: StageTrackTransposes;
  type: "snapshot";
};

export type StageSyncEvent =
  | StageSyncSnapshot
  | (StageSyncEventBase & {
      mode: "jump" | "scroll-end";
      position: StageRuntimePosition | null;
      speed: number;
      type: "viewport";
    })
  | (StageSyncEventBase & {
      position: StageRuntimePosition | null;
      speed: number;
      type: "speed";
    })
  | (StageSyncEventBase & {
      setListTrackId: string;
      transpose: number;
      type: "track-transpose";
    });
