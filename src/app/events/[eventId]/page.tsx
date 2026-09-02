import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { BackLink } from "@/components/shared/back-link";
import { Dashboard } from "@/components/shared/dashboard";
import { auth } from "@/lib/auth";
import { EventService } from "@/services/event-service";

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
  const event = await EventService.getEventForOwner(session.user.id, eventId);

  if (!event) {
    notFound();
  }

  return (
    <AppShell mobileDocumentScroll>
      <Dashboard
        mobileDocumentScroll
        headerNavigation={<BackLink href="/events">Events</BackLink>}
        eyebrow={`EVENT · ${formatDateTime(event.startDate)}`}
        title={event.title}
        description={event.description || `${event.place}${event.locationAddress ? `, ${event.locationAddress}` : ""}`}
      >
        <section className="rounded-2xl border border-dashed border-[#d9d9d9] bg-white px-6 py-16 text-center dark:border-[#3a3a3f] dark:bg-[#171719]">
          <h2 className="text-[16px] font-bold">Setlists and bands coming next</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
            This event is ready for the next workflow: adding owned setlists and
            attaching bands under them.
          </p>
        </section>
      </Dashboard>
    </AppShell>
  );
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
