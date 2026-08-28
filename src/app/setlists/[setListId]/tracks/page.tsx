import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { SetListTrackBrowser } from "@/app/setlists/_components/setlist-track-browser";
import { AppShell } from "@/components/shared/app-shell";
import { auth } from "@/lib/auth";
import { SetListService } from "@/services/setlist-service";

export const metadata: Metadata = {
  title: "Add Tracks to Setlist | ChordPH",
  description: "Search private and public tracks to add to a setlist.",
};

export default async function BrowseSetListTracksPage({
  params,
  searchParams,
}: {
  params: Promise<{ setListId: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [{ setListId }, queryValues] = await Promise.all([params, searchParams]);
  const query = getSearchQuery(queryValues.q);
  const result = await SetListService.searchTracksForSetList(
    session.user.id,
    setListId,
    query,
  );

  if (!result) {
    notFound();
  }

  return (
    <AppShell>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white text-[#111] shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:bg-[#121214] dark:text-[#f5f5f5]">
        <SetListTrackBrowser
          initialQuery={query}
          setListId={result.setList.id}
          setListTitle={result.setList.title}
          tracks={result.tracks}
        />
      </section>
    </AppShell>
  );
}

function getSearchQuery(value: string | string[] | undefined): string {
  const query = Array.isArray(value) ? value[0] : value;
  return query?.trim().slice(0, 100) ?? "";
}
