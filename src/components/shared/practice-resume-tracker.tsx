"use client";

import { useEffect } from "react";

import { savePracticeResume } from "@/lib/client/practice-resume-store";
import type { PracticeResumeItem } from "@/types/dashboard";

export function PracticeResumeTracker({
  item,
}: {
  item: Omit<PracticeResumeItem, "lastOpenedAt">;
}) {
  useEffect(() => {
    savePracticeResume({
      ...item,
      lastOpenedAt: new Date().toISOString(),
    });
  }, [item]);

  return null;
}
