import type { Metadata } from "next";

import { Dashboard } from "@/components/main/dashboard";
import { DashboardHome } from "@/components/main/dashboard-home";
import { AppShell } from "@/components/shared/app-shell";

export const metadata: Metadata = {
  title: "ChordPH | Guitar chords, tabs, and lyrics",
  description:
    "Explore guitar chords, tabs, and lyrics for OPM favorites and global hits.",
};

export default function Home() {
  return (
    <AppShell>
      <Dashboard
        eyebrow="CHORDPH - MADE IN THE PHILIPPINES"
        title="Dashboard"
        description="Browse chords, upload audio, and keep your practice library in one full-width workspace."
      >
        <DashboardHome />
      </Dashboard>
    </AppShell>
  );
}
