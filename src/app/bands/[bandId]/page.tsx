import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import {
  BandDetail,
  type BandDetailData,
} from "@/app/bands/_components/band-detail";
import { AppShell } from "@/components/shared/app-shell";
import { BackLink } from "@/components/shared/back-link";
import { Dashboard } from "@/components/shared/dashboard";
import { GroupMembershipPageGuard } from "@/components/shared/membership-page-guard";
import { auth } from "@/lib/auth";
import {
  GroupService,
  type GroupDetailRecord,
} from "@/services/group-service";

export const metadata: Metadata = {
  title: "Band | ChordPH",
  description: "Manage band members and event setlists.",
};

export default async function BandDetailPage({
  params,
}: {
  params: Promise<{ bandId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { bandId } = await params;
  const band = await GroupService.getGroupDetailForUser(
    session.user.id,
    bandId,
  );

  if (!band) {
    notFound();
  }

  const currentMembership = band.memberships.find(
    (membership) => membership.user.id === session.user.id,
  );
  const bandData = toBandDetailData(band, session.user.id);

  return (
    <GroupMembershipPageGuard membership={currentMembership}>
      <AppShell mobileDocumentScroll>
        <Dashboard
          mobileDocumentScroll
          headerNavigation={<BackLink href="/bands">Bands</BackLink>}
          eyebrow="BAND"
          title={band.name}
          description="Manage the players in this band and review the event setlists assigned to them."
        >
          <BandDetail band={bandData} />
        </Dashboard>
      </AppShell>
    </GroupMembershipPageGuard>
  );
}

function toBandDetailData(
  band: GroupDetailRecord,
  currentUserId: string,
): BandDetailData {
  const currentMembership = band.memberships.find(
    (membership) => membership.user.id === currentUserId,
  );

  return {
    currentUserRole: currentMembership?.role ?? null,
    events: band.eventGroupSetLists.map((assignment) => ({
      eventId: assignment.event.id,
      eventSetListId: assignment.eventSetList.id,
      id: assignment.id,
      place: assignment.event.place,
      setListId: assignment.setList.id,
      setListTitle: assignment.setList.title,
      startDate: assignment.event.startDate.toISOString(),
      title: assignment.event.title,
    })),
    id: band.id,
    members: band.memberships.map((membership) => ({
      email: membership.user.email,
      id: membership.user.id,
      image: membership.user.image,
      instrument: membership.instrument,
      name: membership.user.name,
      role: membership.role,
      status: membership.status,
    })),
    name: band.name,
  };
}
