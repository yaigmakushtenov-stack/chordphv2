import type { OfflineDownload } from "@/types/offline";
import type { StagePlaylistData } from "@/types/stage";

export function createOfflineStagePlaylist(download: OfflineDownload): StagePlaylistData {
  return {
    id: `offline:${download.id}`,
    currentUser: { id: "offline", canLead: false, role: null },
    eventId: "offline",
    eventTitle: "Offline medley",
    setListId: download.id,
    setListTitle: download.title,
    band: null,
    tracks: download.songs.map((song, index) => ({
      id: song.chart?.id ?? song.id,
      setListTrackId: song.id,
      title: song.chart?.title ?? "Unavailable song",
      artistName: song.chart?.artistName ?? "",
      key: song.chart?.key ?? "",
      transposeSemitones: song.chart?.transpose ?? 0,
      capo: song.chart?.capo ?? null,
      tempo: song.chart?.tempo ?? null,
      timeSignature: song.chart?.timeSignature ?? "",
      tuning: song.chart?.tuning ?? "",
      lyricsAndChords: song.chart?.lyricsAndChords ?? "",
      orderNumber: index,
      isAvailable: song.chart !== null,
    })),
  };
}
