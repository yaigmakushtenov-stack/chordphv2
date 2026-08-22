import type { Metadata } from "next";

import { ChordChart } from "@/components/chord-chart/chord-chart";
import { Dashboard } from "@/components/main/dashboard";
import { AppShell } from "@/components/shared/app-shell";

export const metadata: Metadata = {
  title: "Chord Chart | ChordPH",
  description: "Browse reusable guitar chord diagrams and variations.",
};

export default function ChordChartPage() {
  return (
    <AppShell>
      <Dashboard
        eyebrow="CHORD LIBRARY"
        title="Chord Chart"
        description="Browse chord shapes by instrument and switch through alternate fingerings."
      >
        <ChordChart />
      </Dashboard>
    </AppShell>
  );
}
