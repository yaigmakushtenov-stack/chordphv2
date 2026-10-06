import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EventLibrary } from "@/app/events/_components/event-library";
import { AppShell } from "@/components/shared/app-shell";
import { ServerRefreshPulse } from "@/components/shared/server-refresh-pulse";
import { auth } from "@/lib/auth";
import {
  EventService,
  type EventSummaryRecord,
} from "@/services/event-service";

export const metadata: Metadata = {
  title: "Your Events | ChordPH",
  description: "Schedule events and prepare set lists for bands.",
};

export default async function EventsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const events = (await EventService.listEventsForUser(session.user.id)).map(
    (event) => toEventLibraryItem(event, session.user.id),
  );

  return (
    <AppShell mobileDocumentScroll>
      <ServerRefreshPulse />
      <EventLibrary items={events} />
    </AppShell>
  );
}

function toEventLibraryItem(event: EventSummaryRecord, userId: string) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startDate: event.startDate.toISOString(),
    timezone: event.timezone,
    place: event.place,
    locationAddress: event.locationAddress,
    setListCount: event._count.eventSetLists,
    isOwner: event.ownerId === userId,
  };
}
