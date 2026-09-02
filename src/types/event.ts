export type EventPlaylistData = {
  id: string;
  setListId: string;
  title: string;
  description: string | null;
  trackCount: number;
  band: {
    id: string;
    name: string;
  } | null;
  orderNumber: number;
};

export type EventDetailData = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  place: string;
  locationAddress: string | null;
  playlists: EventPlaylistData[];
};

export type EventPlaylistOptionData = {
  id: string;
  title: string;
  trackCount: number;
};

export type EventBandOptionData = {
  id: string;
  name: string;
};
