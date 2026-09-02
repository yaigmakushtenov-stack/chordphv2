import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { BandCreateForm } from "@/app/bands/_components/band-create-form";
import { AppShell } from "@/components/shared/app-shell";
import { Dashboard } from "@/components/shared/dashboard";
import { BackLink } from "@/components/shared/back-link";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create Band | ChordPH",
  description: "Create a band for shared events and stage sessions.",
};

export default async function NewBandPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AppShell mobileDocumentScroll>
      <Dashboard
        mobileDocumentScroll
        headerNavigation={<BackLink href="/bands">Bands</BackLink>}
        eyebrow="NEW BAND"
        title="Create a band"
        description="Give the band a clear name. You can add members later from the band detail page."
      >
        <BandCreateForm />
      </Dashboard>
    </AppShell>
  );
}
