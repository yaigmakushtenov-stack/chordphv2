export type MusicFileListItemData = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  originalFileName: string;
  contentType: string;
  sourceSizeBytes: number;
  storedSizeBytes: number | null;
  durationSeconds: number | null;
  playbackUrl: string;
  createdAt: string;
  uploadedAt: string | null;
};
