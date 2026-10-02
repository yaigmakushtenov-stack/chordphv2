export type MediaLinkProvider = "spotify" | "youtube";

export type MediaLinkSearchInput = {
  artistName: string;
  title: string;
};

export type MediaLinkCandidate = {
  artistName: string;
  provider: MediaLinkProvider;
  title: string;
  url: string;
};

export type MediaLinkProviderResult =
  | {
      candidates: MediaLinkCandidate[];
      provider: MediaLinkProvider;
      status: "found";
    }
  | {
      provider: MediaLinkProvider;
      status: "not_found";
    }
  | {
      message: string;
      provider: MediaLinkProvider;
      status: "unavailable";
    };

export type MediaLinkSearchResult = {
  spotify: MediaLinkProviderResult;
  youtube: MediaLinkProviderResult;
};
