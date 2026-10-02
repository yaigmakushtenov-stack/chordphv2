import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { BackLink } from "@/components/shared/back-link";
import { Dashboard } from "@/components/shared/dashboard";
import { auth } from "@/lib/auth";
import { getTransposedSetListKey, parseSetListTrackArrangement, parseSetListTrackTranspose } from "@/lib/setlists/setlist-track-settings";
import { canViewStageTrack } from "@/services/event-service";
import { SetListService } from "@/services/setlist-service";

export const metadata: Metadata = { title: "Band Setlist | ChordPH" };

export default async function BandSetListPage({ params }: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const { assignmentId } = await params;
  const assignment = await SetListService.getBandSetListForUser(session.user.id, assignmentId);
  if (!assignment) notFound();

  const { setList } = assignment;
  return (
    <AppShell documentScroll>
      <Dashboard
        documentScroll
        headerNavigation={<BackLink href="/setlists">All setlists</BackLink>}
        eyebrow={`BAND SETLIST · ${assignment.group.name}`}
        title={setList.title}
        description={`${assignment.event.title}${setList.description ? ` · ${setList.description}` : ""}`}
      >
        <section aria-label="Setlist tracks" className="grid gap-4">
          <h2 className="text-[15px] font-bold">Tracks · {setList.tracks.length}</h2>
          {setList.tracks.length ? (
            <ol className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9] dark:divide-[#303034] dark:border-[#303034]">
              {setList.tracks.map((item, index) => {
                const available = canViewStageTrack(setList.ownerId, item.track);
                const arrangement = parseSetListTrackArrangement(item.settings);
                const content = (
                  <>
                    <span className="w-6 shrink-0 text-[12px] text-[#717171] dark:text-[#a1a1aa]">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[15px] font-bold">{available ? item.track.title : "Unavailable track"}</span>
                      <span className="mt-1 block break-words text-[12px] text-[#666] dark:text-[#b4b4bc]">{available ? item.track.artistName : "This track is no longer shared"}</span>
                    </span>
                    {available ? <span className="shrink-0 text-[12px] font-bold">{getTransposedSetListKey(arrangement?.key ?? item.track.key, parseSetListTrackTranspose(item.settings))} <span aria-hidden="true">→</span></span> : null}
                  </>
                );
                return (
                  <li key={item.id}>
                    {available ? (
                      <Link href={`/setlists/bands/${assignmentId}/tracks/${item.id}`} className="flex items-center gap-3 rounded-lg px-3 py-4 transition hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] dark:hover:bg-[#1f1f22]">{content}</Link>
                    ) : <div className="flex items-center gap-3 px-3 py-4">{content}</div>}
                  </li>
                );
              })}
            </ol>
          ) : <p className="text-[13px] text-[#666] dark:text-[#b4b4bc]">No tracks have been added to this setlist yet.</p>}
        </section>
      </Dashboard>
    </AppShell>
  );
}
