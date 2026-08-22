import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Dashboard } from "@/components/shared/dashboard";
import { AppShell } from "@/components/shared/app-shell";
import { AnnotationEditor } from "@/app/track/_components/annotation-editor";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create Annotation | ChordPH",
  description: "Create a private track annotation without uploading audio.",
};

export default async function NewTrackAnnotationPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AppShell focusMode>
      <Dashboard
        eyebrow="NEW TRACK"
        title="Create an annotation"
        description="Complete the guided form at your own pace. The Track and annotation are created together only on the final step."
      >
        <AnnotationEditor
          mode="create"
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
          }}
        />
      </Dashboard>
    </AppShell>
  );
}
