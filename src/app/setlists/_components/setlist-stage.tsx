"use client";

import { useRouter } from "next/navigation";

import { StageView } from "@/app/events/_components/stage-view";
import type { StagePlaylistData } from "@/types/stage";

export function SetListStage({ playlist, returnHref }: { playlist: StagePlaylistData; returnHref: string }) {
  const router = useRouter();

  return <StageView playlist={playlist} local onExit={() => router.push(returnHref)} />;
}
