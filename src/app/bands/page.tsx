import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { BandLibrary } from "@/app/bands/_components/band-library";
import { AppShell } from "@/components/shared/app-shell";
import { auth } from "@/lib/auth";
import {
  GroupService,
  type GroupMembershipRecord,
} from "@/services/group-service";

export const metadata: Metadata = {
  title: "Your Bands | ChordPH",
  description: "Create and manage bands for events and synced stage sessions.",
};

export default async function BandsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const bands = (await GroupService.listGroupsForUser(session.user.id)).map(
    toBandLibraryItem,
  );

  return (
    <AppShell mobileDocumentScroll>
      <BandLibrary items={bands} />
    </AppShell>
  );
}

function toBandLibraryItem(membership: GroupMembershipRecord) {
  return {
    id: membership.group.id,
    name: membership.group.name,
    role: membership.role,
    updatedAt: membership.group.updatedAt.toISOString(),
  };
}
