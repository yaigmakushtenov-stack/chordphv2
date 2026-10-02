import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SetListLibrary } from "@/app/setlists/_components/setlist-library";
import { BandSetListLibrary } from "@/app/setlists/_components/band-setlist-library";
import { AppShell } from "@/components/shared/app-shell";
import { Dashboard } from "@/components/shared/dashboard";
import { auth } from "@/lib/auth";
import {
  SetListService,
  type SetListSummaryRecord,
} from "@/services/setlist-service";
import type { SetListSummaryData } from "@/types/setlist";

export const metadata: Metadata = {
  title: "Setlists | ChordPH",
  description: "Create and organize track setlists for practice and performance.",
};

export default async function SetListsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [personalSetLists, bandSetLists] = await Promise.all([
    SetListService.listSetListsForUser(session.user.id),
    SetListService.listBandSetListsForUser(session.user.id),
  ]);
  const setLists = personalSetLists.map(toSetListSummaryData);

  return (
    <AppShell mobileDocumentScroll>
      <Dashboard
        mobileDocumentScroll
        eyebrow="SETLISTS"
        title="Plan what you’ll play"
        description="Organize your own setlists and find the setlists assigned to your bands."
      >
        <div className="grid gap-10">
          <SetListLibrary items={setLists} />
          <BandSetListLibrary items={bandSetLists} />
        </div>
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
