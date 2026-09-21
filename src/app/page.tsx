import type { Metadata } from "next";
import { headers } from "next/headers";

import { Dashboard } from "@/components/shared/dashboard";
import { DashboardHome } from "@/app/_components/dashboard-home";
import { AppShell } from "@/components/shared/app-shell";
import { auth } from "@/lib/auth";
import { EventService, type EventDetailRecord } from "@/services/event-service";
import { GroupService } from "@/services/group-service";
import { SetListService } from "@/services/setlist-service";
import { TrackService } from "@/services/track-service";
import type {
  DashboardActivityItem,
  DashboardNextEvent,
} from "@/types/dashboard";
import type { DashboardPublicTrackData } from "@/types/track";

export const metadata: Metadata = {
  title: "ChordPH | Guitar chords, tabs, and lyrics",
  description:
    "Explore guitar chords, tabs, and lyrics for OPM favorites and global hits.",
};

const ACTIVITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_LIMIT = 8;

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const [publicTracks, events, setLists, groupMemberships] =
    await Promise.all([
    TrackService.listDashboardPublicTracks().then((tracks) =>
      tracks.flatMap((track): DashboardPublicTrackData[] =>
        track.annotation
          ? [
              {
                createdAt: track.createdAt.toISOString(),
                id: track.id,
                title: track.title,
                artistName: track.artistName,
                key: track.key,
                annotationType: track.annotation.type,
                youtubeLink: track.youtubeLink,
                spotifyLink: track.spotifyLink,
              },
            ]
          : [],
      ),
    ),
    session?.user?.id
      ? EventService.listEventsForUser(session.user.id)
      : Promise.resolve([]),
    session?.user?.id
      ? SetListService.listSetListsForUser(session.user.id)
      : Promise.resolve([]),
    session?.user?.id
      ? GroupService.listGroupsForUser(session.user.id)
      : Promise.resolve([]),
  ]);
  const now = new Date();
  const nextEventSummary = events.find((event) => isUpcomingEvent(event, now));
  const nextEventDetail =
    session?.user?.id && nextEventSummary
      ? await EventService.getEventDetailForUser(
          session.user.id,
          nextEventSummary.id,
        )
      : null;
  const activityItems = buildActivityItems({
    events,
    groupMemberships,
    now,
    setLists,
  });

  return (
    <AppShell mobileDocumentScroll autoHideMobileHeader>
      <Dashboard
        mobileDocumentScroll
        eyebrow="CHORDPH - MADE IN THE PHILIPPINES"
        title="Dashboard"
        description="Resume practice, catch up on band activity, and prepare for what you’re playing next."
      >
        <DashboardHome
          activityItems={activityItems}
          nextEvent={toDashboardNextEvent(nextEventDetail)}
          publicTracks={publicTracks}
        />
      </Dashboard>
    </AppShell>
  );
}

function isUpcomingEvent(
  event: Awaited<ReturnType<typeof EventService.listEventsForUser>>[number],
  now: Date,
): boolean {
  if (event.endDate) {
    return event.endDate.getTime() >= now.getTime();
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return event.startDate.getTime() >= startOfToday.getTime();
}

function toDashboardNextEvent(
  event: EventDetailRecord | null,
): DashboardNextEvent | null {
  if (!event) {
    return null;
  }

  return {
    id: event.id,
    place: event.place,
    playlists: event.eventSetLists.map((playlist) => ({
      bandName: playlist.eventGroupSetLists[0]?.group.name ?? null,
      id: playlist.id,
      orderNumber: playlist.orderNumber,
      title: playlist.setList.title,
      trackCount: playlist.setList._count.tracks,
    })),
    startDate: event.startDate.toISOString(),
    title: event.title,
  };
}

function buildActivityItems({
  events,
  groupMemberships,
  now,
  setLists,
}: {
  events: Awaited<ReturnType<typeof EventService.listEventsForUser>>;
  groupMemberships: Awaited<ReturnType<typeof GroupService.listGroupsForUser>>;
  now: Date;
  setLists: Awaited<ReturnType<typeof SetListService.listSetListsForUser>>;
}): DashboardActivityItem[] {
  const cutoff = now.getTime() - ACTIVITY_WINDOW_MS;
  const items: DashboardActivityItem[] = [
    ...events.map((event) => ({
      href: `/events/${event.id}`,
      id: `event-${event.id}`,
      source: "event" as const,
      timestamp: event.updatedAt.toISOString(),
      title: `${event.title} event updated`,
    })),
    ...setLists.map((setList) => ({
      href: `/setlists/${setList.id}`,
      id: `setlist-${setList.id}`,
      source: "setlist" as const,
      timestamp: setList.updatedAt.toISOString(),
      title: `${setList.title} setlist updated`,
    })),
    ...groupMemberships.map((membership) => ({
      href: `/bands/${membership.group.id}`,
      id: `band-${membership.group.id}`,
      source: "band" as const,
      timestamp: membership.group.updatedAt.toISOString(),
      title: `${membership.group.name} band updated`,
    })),
  ];

  return items
    .filter((item) => new Date(item.timestamp).getTime() >= cutoff)
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() -
        new Date(left.timestamp).getTime(),
    )
    .slice(0, ACTIVITY_LIMIT);
}
