"use client";

import { useState, useSyncExternalStore } from "react";

import * as NotificationActions from "@/actions/notification-actions";
import { SettingsSection } from "@/app/settings/_components/settings-section";
import {
  disableAndroidPush,
  enableAndroidPush,
  getAndroidPushServerState,
  getAndroidPushState,
  subscribeAndroidPush,
} from "@/lib/client/android-push";
import type { PushPreferences } from "@/types/notifications";

type NotificationPreferencesSectionProps = {
  initialPreferences: PushPreferences;
};

const OPTIONS: { key: keyof PushPreferences; label: string; description: string }[] = [
  {
    key: "bandInvites",
    label: "Band invitations",
    description: "Get notified when an owner adds you to a band.",
  },
  {
    key: "newEvents",
    label: "New band events",
    description: "Get notified when a band owner creates an event for your band.",
  },
];

export function NotificationPreferencesSection({ initialPreferences }: NotificationPreferencesSectionProps) {
  const push = useSyncExternalStore(subscribeAndroidPush, getAndroidPushState, getAndroidPushServerState);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingDevice, setIsChangingDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isSupported = push.status !== "unsupported" && push.status !== "unavailable" && push.status !== "checking";

  async function savePreferences(): Promise<void> {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await NotificationActions.savePreferences(preferences);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSaved(true);
    } catch {
      setError("Couldn't save your notification preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function changeDeviceRegistration(): Promise<void> {
    setIsChangingDevice(true);
    try {
      if (push.status === "enabled") {
        await disableAndroidPush();
      } else {
        await enableAndroidPush();
      }
    } finally {
      setIsChangingDevice(false);
    }
  }

  return (
    <SettingsSection title="Notifications" description="Choose which band activity sends a push notification to your Android devices.">
      <div className="space-y-4">
        <div className="rounded-xl border border-[#e2e2e2] bg-white px-4 py-4 dark:border-[#343438] dark:bg-[#1c1c1f]">
          <p className="text-[13px] font-bold text-[#171717] dark:text-white">
            {push.status === "enabled" ? "Notifications enabled on this device" : "Android push notifications"}
          </p>
          <p role="status" className="mt-1 text-[11px] leading-4 text-[#777] dark:text-[#92929a]">
            {push.message ?? (push.status === "enabled"
              ? "Band activity can appear even when the app is closed."
              : push.status === "registering"
                ? "Registering this device…"
                : push.status === "checking"
                  ? "Checking this device…"
                  : "Enable notifications on each Android device where you want to receive them.")}
          </p>
          {isSupported ? (
            <button
              type="button"
              disabled={isChangingDevice || push.status === "registering"}
              onClick={() => void changeDeviceRegistration()}
              className="mt-3 rounded-full bg-[#ed1746] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#cf123b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-wait disabled:opacity-60 dark:bg-[#ed1746] dark:text-white dark:hover:bg-[#ff315d]"
            >
              {push.status === "enabled" ? "Disable on this device" : "Enable on this device"}
            </button>
          ) : null}
        </div>
        <div className="divide-y divide-[#ececec] rounded-xl border border-[#e2e2e2] bg-white px-4 dark:divide-[#343438] dark:border-[#343438] dark:bg-[#1c1c1f]">
          {OPTIONS.map((option) => (
            <label key={option.key} className="flex cursor-pointer items-center gap-4 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-[#171717] dark:text-white">{option.label}</span>
                <span className="mt-1 block text-[11px] leading-4 text-[#777] dark:text-[#92929a]">{option.description}</span>
              </span>
              <input
                type="checkbox"
                checked={preferences[option.key]}
                disabled={isSaving}
                onChange={(event) => {
                  setPreferences({ ...preferences, [option.key]: event.target.checked });
                  setSaved(false);
                }}
                className="peer sr-only"
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#d5d5d5] transition peer-checked:bg-[#ed1746] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#ed1746] peer-disabled:opacity-60 dark:bg-[#4a4a50]">
                <span className={`absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition ${preferences[option.key] ? "translate-x-5" : ""}`} />
              </span>
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void savePreferences()}
          className="rounded-full bg-[#ed1746] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#cf123b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-wait disabled:opacity-60 dark:bg-[#ed1746] dark:text-white dark:hover:bg-[#ff315d]"
        >
          {isSaving ? "Saving…" : "Save notification preferences"}
        </button>
        {saved ? <p role="status" className="text-[11px] text-[#555] dark:text-[#b4b4bc]">Notification preferences saved.</p> : null}
        {error ? <p role="alert" className="text-[11px] text-red-700 dark:text-red-300">{error}</p> : null}
        <p className="text-[11px] leading-4 text-[#777] dark:text-[#92929a]">Preferences apply to all your Android devices. The in-app notification inbox will be added later.</p>
      </div>
    </SettingsSection>
  );
}
