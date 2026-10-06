import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { SetListStage } from "@/app/setlists/_components/setlist-stage";
import { ScreenWakeLock } from "@/components/shared/screen-wake-lock";
import { auth } from "@/lib/auth";
import { createOfflineStagePlaylist } from "@/lib/client/offline-stage";
import { getOfflineSetList } from "@/services/offline-service";

export const metadata: Metadata = {
  title: "Setlist Stage | ChordPH",
  description: "Play a setlist in a continuous medley view.",
};

export default async function SetListStagePage({ params }: { params: Promise<{ setListId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const { setListId } = await params;
  const setList = await getOfflineSetList(session.user.id, { kind: "personal", id: setListId });
  if (!setList) notFound();

  const playlist = createOfflineStagePlaylist(setList);
  playlist.id = `setlist:${setListId}`;
  playlist.setListId = setListId;
  playlist.eventTitle = "Setlist medley";

  return (
    <>
      <ScreenWakeLock />
      <SetListStage playlist={playlist} returnHref={`/setlists/${setListId}`} />
    </>
  );
}
