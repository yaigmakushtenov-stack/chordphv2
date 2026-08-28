import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { SetListEditor } from "@/app/setlists/_components/setlist-editor";
import { SetListDetailsDrawer } from "@/app/setlists/_components/setlist-details-drawer";
import { AppShell } from "@/components/shared/app-shell";
import { BackLink } from "@/components/shared/back-link";
import { Dashboard } from "@/components/shared/dashboard";
import { auth } from "@/lib/auth";
import { parseSetListTrackArrangement } from "@/lib/setlists/setlist-track-settings";
import { SetListService } from "@/services/setlist-service";
import type { SetListDetailData } from "@/types/setlist";

export const metadata: Metadata = {
  title: "Edit Setlist | ChordPH",
  description: "Organize tracks in a ChordPH setlist.",
};

export default async function SetListPage({
  params,
}: {
  params: Promise<{ setListId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { setListId } = await params;
  const setList = await SetListService.getSetListForOwner(
    session.user.id,
    setListId,
  );

  if (!setList) {
    notFound();
  }

  const data: SetListDetailData = {
    id: setList.id,
    title: setList.title,
    description: setList.description,
    updatedAt: setList.updatedAt.toISOString(),
    tracks: setList.tracks.map((item) => {
      const arrangement = parseSetListTrackArrangement(item.settings);
      const isOwnerTrack = item.track.ownerId === session.user.id;
      const isPublicTrack =
        item.track.visibilityStatus === "PUBLIC" &&
        item.track.publicityStatus === "APPROVED";
      const isViewable = isOwnerTrack || isPublicTrack;

      return {
        id: item.id,
        trackId: isViewable ? item.track.id : null,
        title: isViewable ? item.track.title : "Unavailable track",
        artistName: isViewable
          ? item.track.artistName
          : "This track is no longer public",
        key: isViewable ? (arrangement?.key ?? item.track.key) : "—",
        tuning: isViewable ? (arrangement?.tuning ?? item.track.tuning) : "—",
        arrangementLabel: isViewable ? (arrangement?.label || null) : null,
        isOwnerTrack,
        isPublicTrack,
        orderNumber: item.orderNumber,
      };
    }),
  };

  return (
    <AppShell documentScroll>
      <Dashboard
        documentScroll
        actions={
          <>
            <SetListDetailsDrawer
              mode="edit"
              setList={{
                id: data.id,
                title: data.title,
                description: data.description,
              }}
            />
            <Link
              href={`/setlists/${data.id}/tracks`}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
            >
              + Add tracks
            </Link>
          </>
        }
        headerNavigation={
          <BackLink href="/setlists">All setlists</BackLink>
        }
        eyebrow={`SETLIST · ${data.tracks.length} ${
          data.tracks.length === 1 ? "TRACK" : "TRACKS"
        }`}
        title={data.title}
        description={
          data.description ||
          "An ordered track list for practice, rehearsal, or performance."
        }
      >
        <SetListEditor setList={data} />
      </Dashboard>
    </AppShell>
  );
}
