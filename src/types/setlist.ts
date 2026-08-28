import type { TrackBrowseItemData } from "@/types/track";

export type SetListSummaryData = {
  id: string;
  title: string;
  description: string | null;
  trackCount: number;
  updatedAt: string;
};

export type QuickAddSetListData = {
  id: string;
  title: string;
  trackCount: number;
  containsTrack: boolean;
  containsMatchingArrangement: boolean;
};

export type SetListTrackData = {
  id: string;
  trackId: string | null;
  title: string;
  artistName: string;
  key: string;
  tuning: string;
  arrangementLabel: string | null;
  isOwnerTrack: boolean;
  isPublicTrack: boolean;
  orderNumber: number;
};

export type SetListTrackArrangement = {
  version: 1;
  label: string;
  key: string;
  tuning: string;
  capo: number | null;
  tempo: number | null;
  timeSignature: string;
  lyricsAndChords: string;
  notes: string;
};

export type SaveSetListTrackArrangementInput = {
  setListId: string;
  setListTrackId: string;
  arrangement: SetListTrackArrangement;
};

export type CopySetListTrackArrangementInput = {
  sourceSetListId: string;
  sourceSetListTrackId: string;
  targetSetListId: string;
};

export type SetListBrowseTrackData = TrackBrowseItemData & {
  isInSetList: boolean;
};

export type SetListDetailData = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  tracks: SetListTrackData[];
};

export type SetListDetailsInput = {
  title: string;
  description: string;
};

export type UpdateSetListDetailsInput = SetListDetailsInput & {
  setListId: string;
};

export type MoveSetListTrackInput = {
  setListId: string;
  setListTrackId: string;
  direction: "up" | "down";
};

export type ReorderSetListTracksInput = {
  setListId: string;
  setListTrackIds: string[];
};
