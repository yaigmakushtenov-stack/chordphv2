import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Dashboard } from "@/components/main/dashboard";
import { AnnotationLibrary } from "@/components/shared/annotation-library";
import { AppShell } from "@/components/shared/app-shell";
import { auth } from "@/lib/auth";
import {
  TrackService,
  type PersonalTrackRecord,
} from "@/services/track-service";
import type { PersonalTrackListItem } from "@/types/track";

export const metadata: Metadata = {
  title: "Your Annotations | ChordPH",
  description: "View and edit your personal ChordPH track annotations.",
};

export default async function AnnotationLibraryPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const items = (await TrackService.listPersonalAnnotationTracks(session.user.id)).map(
    toPersonalTrackListItem,
  );

  return (
    <AppShell initialLibraryItems={items}>
      <Dashboard
        eyebrow="YOUR ANNOTATIONS"
        title="Personal annotations"
        description="Open your saved chord sheets for practice or return to the editor whenever you need to make changes."
      >
        <AnnotationLibrary items={items} />
      </Dashboard>
    </AppShell>
  );
}

function toPersonalTrackListItem(
  track: PersonalTrackRecord,
): PersonalTrackListItem {
  return {
    id: track.id,
    title: track.title,
    artistName: track.artistName,
    key: track.key,
    tuning: track.tuning,
    tags: track.tags,
    hasAudio: Boolean(track.musicFileId),
    updatedAt: track.updatedAt.toISOString(),
  };
}
