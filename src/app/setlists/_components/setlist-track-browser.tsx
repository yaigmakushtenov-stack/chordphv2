import { TrackBrowser } from "@/components/shared/track-browser";
import type { SetListBrowseTrackData } from "@/types/setlist";

type SetListTrackBrowserProps = {
  initialQuery: string;
  setListId: string;
  setListTitle: string;
  tracks: SetListBrowseTrackData[];
};

export function SetListTrackBrowser({
  initialQuery,
  setListId,
  setListTitle,
  tracks,
}: SetListTrackBrowserProps) {
  return (
    <TrackBrowser
      initialQuery={initialQuery}
      isAuthenticated
      setList={{ id: setListId, title: setListTitle }}
      tracks={tracks}
    />
  );
}
