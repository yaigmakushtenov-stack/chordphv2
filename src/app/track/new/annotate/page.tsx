import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Dashboard } from "@/components/shared/dashboard";
import { AppShell } from "@/components/shared/app-shell";
import { AnnotationEditor } from "@/app/track/_components/annotation-editor";
import { BackButton } from "@/components/shared/back-button";
import { auth } from "@/lib/auth";
import { TrackService } from "@/services/track-service";

export const metadata: Metadata = {
  title: "Create a Chord Chart/Tab | ChordPH",
  description: "Create a private chord chart or tab without uploading audio.",
};

export default async function NewTrackAnnotationPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const artistNames = await TrackService.listArtistNames();

  return (
    <AppShell documentScroll focusMode>
      <Dashboard
        documentScroll
        headerNavigation={<BackButton fallbackHref="/annotation" />}
        eyebrow="NEW TRACK"
        title="Create a chord chart/tab"
        description="Complete the guided form at your own pace. The track and chord chart/tab are created together only on the final step."
      >
        <AnnotationEditor
          mode="create"
          initialArtistNames={artistNames}
          initialData={{
            trackId: null,
            title: "",
            artistName: "",
            key: "",
            capo: null,
            tempo: null,
            timeSignature: "",
            tuning: "",
            youtubeLink: "",
            spotifyLink: "",
            tags: [],
            additionalArtists: [],
            lyricsAndChords: "",
            notes: "",
            audio: null,
            detailsUpdatedAt: null,
            annotationUpdatedAt: null,
            canPublishDirectly: false,
          }}
        />
      </Dashboard>
    </AppShell>
  );
}
