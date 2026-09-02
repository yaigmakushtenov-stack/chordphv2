import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { EventPlaylistEditor } from "@/app/events/_components/event-playlist-editor";
import { AppShell } from "@/components/shared/app-shell";
import { BackLink } from "@/components/shared/back-link";
import { Dashboard } from "@/components/shared/dashboard";
import { auth } from "@/lib/auth";
import {
  EventService,
  type EventDetailRecord,
} from "@/services/event-service";
import { GroupService } from "@/services/group-service";
import {
  SetListService,
  type SetListSummaryRecord,
} from "@/services/setlist-service";
import type {
  EventBandOptionData,
  EventDetailData,
  EventPlaylistOptionData,
} from "@/types/event";

export const metadata: Metadata = {
  title: "Event | ChordPH",
  description: "Manage event setlists and bands.",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { eventId } = await params;
  const [event, setLists, groupMemberships] = await Promise.all([
    EventService.getEventDetailForOwner(session.user.id, eventId),
    SetListService.listSetListsForUser(session.user.id),
    GroupService.listGroupsForUser(session.user.id),
  ]);

  if (!event) {
    notFound();
  }

  const eventData = toEventDetailData(event);
  const playlistOptions = toPlaylistOptions(setLists);
  const bandOptions = groupMemberships.map<EventBandOptionData>(
    (membership) => ({
      id: membership.group.id,
      name: membership.group.name,
    }),
  );

  return (
    <AppShell mobileDocumentScroll>
      <Dashboard
        mobileDocumentScroll
        headerNavigation={<BackLink href="/events">Events</BackLink>}
        eyebrow={`EVENT · ${formatDateTime(event.startDate)}`}
        title={event.title}
        description={
          event.description ||
          `${event.place}${event.locationAddress ? `, ${event.locationAddress}` : ""}`
        }
      >
        <EventPlaylistEditor
          event={eventData}
          playlistOptions={playlistOptions}
          bandOptions={bandOptions}
        />
      </Dashboard>
    </AppShell>
  );
}

function toEventDetailData(event: EventDetailRecord): EventDetailData {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate?.toISOString() ?? null,
    place: event.place,
    locationAddress: event.locationAddress,
    playlists: event.eventSetLists.map((item) => {
      const band = item.eventGroupSetLists[0]?.group ?? null;

      return {
        id: item.id,
        setListId: item.setListId,
        title: item.setList.title,
        description: item.setList.description,
        trackCount: item.setList._count.tracks,
        band: band ? { id: band.id, name: band.name } : null,
        orderNumber: item.orderNumber,
      };
    }),
  };
}

function toPlaylistOptions(
  setLists: SetListSummaryRecord[],
): EventPlaylistOptionData[] {
  return setLists.map((setList) => ({
    id: setList.id,
    title: setList.title,
    trackCount: setList._count.tracks,
  }));
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
