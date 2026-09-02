import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EventCreateForm } from "@/app/events/_components/event-create-form";
import { AppShell } from "@/components/shared/app-shell";
import { BackLink } from "@/components/shared/back-link";
import { Dashboard } from "@/components/shared/dashboard";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create Event | ChordPH",
  description: "Create a scheduled event for setlists and bands.",
};

export default async function NewEventPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AppShell mobileDocumentScroll>
      <Dashboard
        mobileDocumentScroll
        headerNavigation={<BackLink href="/events">Events</BackLink>}
        eyebrow="NEW EVENT"
        title="Create an event"
        description="Set the date, time, and location. Setlists and bands can be attached from the event detail page later."
      >
        <EventCreateForm />
      </Dashboard>
    </AppShell>
  );
}
