"use client";

import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";

type InstallAppButtonProps = {
  className?: string;
  onDownload?: () => void;
  variant?: "button" | "menu";
};

function subscribeToPlatform(): () => void {
  return () => undefined;
}

function getNativePlatformSnapshot(): boolean {
  return Capacitor.isNativePlatform();
}

function getServerSnapshot(): boolean {
  return false;
}

export function InstallAppButton({
  className = "",
  onDownload,
  variant = "button",
}: InstallAppButtonProps) {
  const isNativeApp = useSyncExternalStore(
    subscribeToPlatform,
    getNativePlatformSnapshot,
    getServerSnapshot,
  );

  if (isNativeApp) {
    return null;
  }

  const styles = variant === "menu"
    ? "flex min-w-0 items-center gap-3 rounded-xl border border-[#e4e4e4] bg-white px-2 py-2 text-[#111] transition hover:bg-[#f5f5f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#303034] dark:bg-[#121214] dark:text-[#f5f5f5] dark:hover:bg-[#1f1f22]"
    : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#ed1746] bg-[#ed1746] px-5 py-2.5 text-[13px] font-bold text-white transition hover:border-[#cf123b] hover:bg-[#cf123b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#ed1746] dark:bg-[#ed1746] dark:text-white dark:hover:border-[#ff315d] dark:hover:bg-[#ff315d]";

  return (
    <a
      href="/downloads/chordph.apk"
      download="ChordPH.apk"
      aria-label="Install Android app — download ChordPH APK"
      onClick={onDownload}
      className={`${styles} ${className}`}
    >
      <span className={variant === "menu" ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0f3] text-[#c90f39] dark:bg-[#3a111d] dark:text-[#fb7185]" : "shrink-0"}>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="size-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold">Install Android app</span>
        {variant === "menu" ? (
          <span className="mt-0.5 block text-[10px] text-[#777] dark:text-[#a1a1aa]">Download APK</span>
        ) : null}
      </span>
    </a>
  );
}
