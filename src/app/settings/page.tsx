import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ProfilePreferences } from "@/app/settings/_components/profile-preferences";
import { AppShell } from "@/components/shared/app-shell";
import { Dashboard } from "@/components/shared/dashboard";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profile Preferences | ChordPH",
  description: "Manage your ChordPH profile and music preferences.",
};

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AppShell mobileDocumentScroll>
      <Dashboard
        mobileDocumentScroll
        eyebrow="YOUR ACCOUNT"
        title="Profile preferences"
        description="Shape how you appear to bandmates and how ChordPH displays music for you."
      >
        <div className="w-full">
          <ProfilePreferences
            initialDisplayName={session.user.name}
            initialImage={session.user.image ?? null}
          />
        </div>
      </Dashboard>
    </AppShell>
  );
}
