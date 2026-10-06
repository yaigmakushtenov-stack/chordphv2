import type { Metadata } from "next";
import { OfflineLibrary } from "./_components/offline-library";

export const metadata: Metadata = { title: "Offline library | ChordPH" };

export default function OfflinePage() {
  return <OfflineLibrary />;
}
