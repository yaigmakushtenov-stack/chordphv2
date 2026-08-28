import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SetListLibrary } from "@/app/setlists/_components/setlist-library";
import { AppShell } from "@/components/shared/app-shell";
import { Dashboard } from "@/components/shared/dashboard";
import { auth } from "@/lib/auth";
import {
  SetListService,
  type SetListSummaryRecord,
} from "@/services/setlist-service";
import type { SetListSummaryData } from "@/types/setlist";

export const metadata: Metadata = {
  title: "Your Setlists | ChordPH",
  description: "Create and organize track setlists for practice and performance.",
};

export default async function SetListsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const setLists = (
    await SetListService.listSetListsForUser(session.user.id)
  ).map(toSetListSummaryData);

  return (
    <AppShell mobileDocumentScroll>
      <Dashboard
        mobileDocumentScroll
        eyebrow="YOUR SETLISTS"
        title="Plan what you’ll play"
        description="Build ordered lists from your own tracks and approved public tracks shared by other ChordPH users."
      >
        <SetListLibrary items={setLists} />
      </Dashboard>
    </AppShell>
  );
}

function toSetListSummaryData(
  setList: SetListSummaryRecord,
): SetListSummaryData {
  return {
    id: setList.id,
    title: setList.title,
    description: setList.description,
    trackCount: setList._count.tracks,
    updatedAt: setList.updatedAt.toISOString(),
  };
}
