import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ChordPH | Guitar chords, tabs, and lyrics",
  description:
    "Explore guitar chords, tabs, and lyrics for OPM favorites and global hits.",
};

export default function Home() {
  return <LandingPage />;
}
