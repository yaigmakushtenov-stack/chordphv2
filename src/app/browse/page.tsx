import type { Metadata } from "next";
import { headers } from "next/headers";

import { AppShell } from "@/components/shared/app-shell";
import { TrackBrowser } from "@/components/shared/track-browser";
import { auth } from "@/lib/auth";
import { TrackService } from "@/services/track-service";
import type { TrackBrowseItemData } from "@/types/track";

export const metadata: Metadata = {
  title: "Browse Tracks | ChordPH",
  description: "Search public ChordPH tracks and your personal chord sheets.",
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const [session, queryValues] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    searchParams,
  ]);
  const viewerId = session?.user?.id ?? null;
  const query = getSearchQuery(queryValues.q);
  const records = await TrackService.searchViewableTracks(viewerId, query);
  const tracks: TrackBrowseItemData[] = records.map((track) => ({
    id: track.id,
    title: track.title,
    artistName: track.artistName,
    key: track.key,
    tuning: track.tuning,
    isOwnerTrack: track.ownerId === viewerId,
  }));

  return (
    <AppShell>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white text-[#111] shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:bg-[#121214] dark:text-[#f5f5f5]">
        <TrackBrowser
          initialQuery={query}
          isAuthenticated={Boolean(viewerId)}
          tracks={tracks}
        />
      </section>
    </AppShell>
  );
}

function getSearchQuery(value: string | string[] | undefined): string {
  const query = Array.isArray(value) ? value[0] : value;
  return query?.trim().slice(0, 100) ?? "";
}
