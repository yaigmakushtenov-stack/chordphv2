import type { TrackJoinPhrase } from "@/lib/music/track-options";

export type TrackAdditionalArtistInput = {
  artistName: string;
  joinPhrase: TrackJoinPhrase;
};

export type SaveTrackDetailsActionInput = {
  trackId: string;
  title: string;
  artistName: string;
  key: string;
  capo: number | null;
  tempo: number | null;
  timeSignature: string;
  tuning: string;
  youtubeLink: string;
  spotifyLink: string;
  tags: string[];
  additionalArtists: TrackAdditionalArtistInput[];
};

export type SaveTrackAnnotationActionInput = {
  trackId: string;
  lyricsAndChords: string;
  notes: string;
};

export type SavedTrackData = {
  updatedAt: string;
};

export type CreateTrackAnnotationActionInput = Omit<
  SaveTrackDetailsActionInput,
  "trackId"
> &
  Omit<SaveTrackAnnotationActionInput, "trackId"> & {
    musicFileId: string | null;
  };

export type CreatedTrackAnnotationData = {
  trackId: string;
};

export type AnnotationEditorData = {
  trackId: string | null;
  title: string;
  artistName: string;
  key: string;
  capo: number | null;
  tempo: number | null;
  timeSignature: string;
  tuning: string;
  youtubeLink: string;
  spotifyLink: string;
  tags: string[];
  additionalArtists: TrackAdditionalArtistInput[];
  lyricsAndChords: string;
  notes: string;
  audio: {
    playbackUrl: string;
    originalFileName: string;
    durationSeconds: number | null;
  } | null;
  detailsUpdatedAt: string | null;
  annotationUpdatedAt: string | null;
};

export type AnnotationViewerData = {
  id: string;
  title: string;
  artistName: string;
  key: string;
  tuning: string;
  capo: number | null;
  tempo: number | null;
  timeSignature: string;
  tags: string[];
  lyricsAndChords: string;
  notes: string;
  youtubeLink: string | null;
  spotifyLink: string | null;
  audio: { playbackUrl: string; originalFileName: string } | null;
  updatedAt: string;
  isOwner: boolean;
  isAuthenticated: boolean;
  publicityStatus: "PRIVATE" | "PENDING" | "REJECTED" | "APPROVED";
};

export type PersonalTrackListItem = {
  id: string;
  title: string;
  artistName: string;
  key: string;
  tuning: string;
  tags: string[];
  hasAudio: boolean;
  updatedAt: string;
};
