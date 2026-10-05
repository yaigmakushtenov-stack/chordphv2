"use client";

import { useState } from "react";

import { SettingsSection } from "@/app/settings/_components/settings-section";
import {
  saveMediaLinkPreferences,
  useMediaLinkPreferences,
} from "@/lib/client/use-media-link-preferences";
import type { MediaLinkPreferences } from "@/lib/music/media-link-preferences";
import type { MediaLinkConfiguration } from "@/types/media-link";

export function MediaLinkPreferencesSection({ configuration }: {
  configuration: MediaLinkConfiguration;
}) {
  const preferences = useMediaLinkPreferences();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  function update(next: MediaLinkPreferences): void {
    const saved = saveMediaLinkPreferences(next);
    setSaveFailed(!saved);
    setSaveMessage(saved
      ? "Saved for this browser."
      : "Your browser blocked saving. Allow cookies for ChordPH and try again.");
  }

  return (
    <div id="auto-find-links" className="scroll-mt-6">
      <SettingsSection
        title="Auto Find links"
        description="Find YouTube and Spotify matches using a song title and artist. Your choices apply to this browser."
      >
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-[13px] font-bold text-[#171717] dark:text-white">
            Enable Auto Find
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(event) => update({ ...preferences, enabled: event.target.checked })}
              className="size-4 shrink-0 accent-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
            />
          </label>
          <fieldset disabled={!preferences.enabled} className="space-y-2 disabled:opacity-60">
            <legend className="mb-2 text-[11px] font-bold text-[#717171] dark:text-[#a1a1aa]">Search providers</legend>
            {(["youtube", "spotify"] as const).map((provider) => (
              <label
                key={provider}
                className="flex items-center gap-3 rounded-xl border border-[#dedede] bg-white px-3 py-3 text-[12px] text-[#171717] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ed1746] dark:border-[#39393d] dark:bg-[#1c1c1f] dark:text-white"
              >
                <input
                  type="checkbox"
                  checked={preferences[provider]}
                  onChange={(event) => update({ ...preferences, [provider]: event.target.checked })}
                  className="size-4 shrink-0 accent-[#ed1746]"
                />
                <span className="flex-1 font-bold">{provider === "youtube" ? "YouTube" : "Spotify"}</span>
                <span className="text-[11px] text-[#717171] dark:text-[#a1a1aa]">{configuration[provider] ? "Configured" : "Not set up"}</span>
              </label>
            ))}
          </fieldset>
          {preferences.enabled && !preferences.youtube && !preferences.spotify ? (
            <p className="text-[12px] text-[#7f1730] dark:text-[#fda4af]">Choose at least one provider to use Auto Find.</p>
          ) : null}
          <p className="text-[12px] leading-5 text-[#717171] dark:text-[#a1a1aa]">
            The app owner sets up each provider once. You don’t need an API key or a Spotify login.
            “Configured” means setup details are present; a search confirms whether the service is working.
          </p>
          {!configuration.youtube || !configuration.spotify ? (
            <p className="text-[12px] leading-5 text-[#717171] dark:text-[#a1a1aa]">
              If a provider says “Not set up,” ask the app owner to enable it. You can still paste links manually.
            </p>
          ) : null}
          <p className="text-[12px] leading-5 text-[#717171] dark:text-[#a1a1aa]">
            To use it, open a chord chart’s editor, enter the song title and artist, then choose
            Auto-find links under Track references. Review a match before saving.
          </p>
          {saveMessage ? (
            <p
              role={saveFailed ? "alert" : "status"}
              className={`text-[12px] ${saveFailed ? "text-red-700 dark:text-red-300" : "text-[#555] dark:text-[#d4d4d8]"}`}
            >
              {saveMessage}
            </p>
          ) : null}
        </div>
      </SettingsSection>
    </div>
  );
}
