import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { SetListEditor } from "@/app/setlists/_components/setlist-editor";
import { SetListDetailsDrawer } from "@/app/setlists/_components/setlist-details-drawer";
import { AppShell } from "@/components/shared/app-shell";
import { BackLink } from "@/components/shared/back-link";
import { Dashboard } from "@/components/shared/dashboard";
import { PracticeResumeTracker } from "@/components/shared/practice-resume-tracker";
import { ShareLinkButton } from "@/components/shared/share-link-button";
import { SetListOptions } from "@/app/setlists/_components/setlist-options";
import { auth } from "@/lib/auth";
import {
  getTransposedSetListKey,
  parseSetListTrackArrangement,
  parseSetListTrackTranspose,
} from "@/lib/setlists/setlist-track-settings";
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
      const transposeSemitones = parseSetListTrackTranspose(item.settings);
      const baseKey = arrangement?.key ?? item.track.key;
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
        key: isViewable
          ? getTransposedSetListKey(baseKey, transposeSemitones)
          : "—",
        baseKey: isViewable ? baseKey : "—",
        transposeSemitones: isViewable ? transposeSemitones : 0,
        tuning: isViewable ? (arrangement?.tuning ?? item.track.tuning) : "—",
        arrangementLabel: isViewable ? (arrangement?.label || null) : null,
        isSetListCopy: item.track.visibilityStatus === "SETLIST_ONLY",
        isOwnerTrack,
        isPublicTrack,
        orderNumber: item.orderNumber,
      };
    }),
  };

  return (
    <AppShell documentScroll>
      <PracticeResumeTracker
        item={{
          href: `/setlists/${data.id}`,
          id: data.id,
          key: data.tracks.find((track) => track.trackId)?.key ?? null,
          subtitle: `${data.tracks.length} ${data.tracks.length === 1 ? "track" : "tracks"}`,
          tempo: null,
          title: data.title,
          type: "setlist",
        }}
      />
      <Dashboard
        documentScroll
        headerNavigation={
          <div className="flex items-center justify-between gap-3">
            <BackLink href="/setlists">All setlists</BackLink>
            <div className="flex items-center gap-2">
              <ShareLinkButton
                path={`/setlists/${data.id}`}
                title={`${data.title} · ChordPH`}
              />
              <SetListDetailsDrawer
                mode="edit"
                setList={data}
              />
              <SetListOptions request={{ kind: "personal", id: data.id }} />
            </div>
          </div>
        }
        title={data.title}
        compactTitle
        titleAction={
          data.tracks.some((track) => track.trackId) ? (
            <Link href={`/setlists/${data.id}/stage`} aria-label={`Open ${data.title} in stage view`} title="Stage view · Medley" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ed1746] text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M8 4v16l13-8Z" /></svg>
            </Link>
          ) : null
        }
      >
        <SetListEditor key={`${data.updatedAt}:${data.tracks.map((track) => track.id).join(",")}`} setList={data} />
        <Link href={`/setlists/${data.id}/tracks`} className="ml-12 mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">
          + Add tracks
        </Link>
      </Dashboard>
    </AppShell>
  );
}
