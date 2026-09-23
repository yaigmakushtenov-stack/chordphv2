"use client";

import type { NotificationPreferences } from "@/app/settings/_components/preference-types";
import { SettingsSection } from "@/app/settings/_components/settings-section";

type NotificationPreferencesSectionProps = {
  notifications: NotificationPreferences;
  onChange: (notifications: NotificationPreferences) => void;
};

const NOTIFICATION_OPTIONS: {
  description: string;
  key: keyof NotificationPreferences;
  label: string;
}[] = [
  {
    key: "eventReminders",
    label: "Event reminders",
    description: "Get a reminder before rehearsals, gigs, and services.",
  },
  {
    key: "eventUpdates",
    label: "Event updates",
    description: "Know when an event schedule or setlist changes.",
  },
  {
    key: "bandInvites",
    label: "Band invitations",
    description: "Get notified when someone invites you to a band.",
  },
  {
    key: "bandUpdates",
    label: "Band updates",
    description: "Receive important membership and role updates.",
  },
];

export function NotificationPreferencesSection({
  notifications,
  onChange,
}: NotificationPreferencesSectionProps) {
  return (
    <SettingsSection
      title="Notifications"
      description="Choose which event and band activity should get your attention."
    >
      <div className="divide-y divide-[#ececec] rounded-xl border border-[#e2e2e2] bg-white px-4 dark:divide-[#343438] dark:border-[#343438] dark:bg-[#1c1c1f]">
        {NOTIFICATION_OPTIONS.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-center gap-4 py-4"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-[#171717] dark:text-white">
                {option.label}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-[#777] dark:text-[#92929a]">
                {option.description}
              </span>
            </span>
            <input
              type="checkbox"
              checked={notifications[option.key]}
              onChange={(event) =>
                onChange({
                  ...notifications,
                  [option.key]: event.target.checked,
                })
              }
              className="peer sr-only"
            />
            <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#d5d5d5] transition peer-checked:bg-[#ed1746] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#ed1746] dark:bg-[#4a4a50]">
              <span
                className={`absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition ${
                  notifications[option.key] ? "translate-x-5" : ""
                }`}
              />
            </span>
          </label>
        ))}
      </div>
    </SettingsSection>
  );
}
