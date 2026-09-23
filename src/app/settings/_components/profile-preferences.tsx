"use client";

import { useState } from "react";

import { AppearanceSection } from "@/app/settings/_components/appearance-section";
import { MusicPreferencesSection } from "@/app/settings/_components/music-preferences-section";
import { NotificationPreferencesSection } from "@/app/settings/_components/notification-preferences-section";
import type {
  AccidentalPreference,
  ChartTextSize,
  DefaultInstrument,
  NotificationPreferences,
} from "@/app/settings/_components/preference-types";
import { ProfileSection } from "@/app/settings/_components/profile-section";

type ProfilePreferencesProps = {
  initialDisplayName: string;
  initialImage: string | null;
};

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  bandInvites: true,
  bandUpdates: true,
  eventReminders: true,
  eventUpdates: true,
};

export function ProfilePreferences({
  initialDisplayName,
  initialImage,
}: ProfilePreferencesProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [image, setImage] = useState(initialImage);
  const [defaultInstrument, setDefaultInstrument] =
    useState<DefaultInstrument>("GUITAR");
  const [accidentalPreference, setAccidentalPreference] =
    useState<AccidentalPreference>("sharps");
  const [chartTextSize, setChartTextSize] =
    useState<ChartTextSize>("comfortable");
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  return (
    <div>
      <div className="mb-7 flex items-start gap-3 rounded-xl border border-[#f1c9d2] bg-[#fff7f8] px-4 py-3 dark:border-[#5c2532] dark:bg-[#271217]">
        <span aria-hidden="true" className="mt-0.5 text-[#ed1746]">
          ●
        </span>
        <div>
          <p className="text-[12px] font-bold text-[#7f1730] dark:text-[#fda4af]">
            Preview mode
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#8a5060] dark:text-[#d3a4ae]">
            Theme changes apply now. Other preferences remain on this screen until account sync is added.
          </p>
        </div>
      </div>

      <ProfileSection
        displayName={displayName}
        image={image}
        onDisplayNameChange={setDisplayName}
        onImageChange={setImage}
      />
      <MusicPreferencesSection
        accidentalPreference={accidentalPreference}
        defaultInstrument={defaultInstrument}
        onAccidentalPreferenceChange={setAccidentalPreference}
        onDefaultInstrumentChange={setDefaultInstrument}
      />
      <AppearanceSection
        chartTextSize={chartTextSize}
        onChartTextSizeChange={setChartTextSize}
      />
      <NotificationPreferencesSection
        notifications={notifications}
        onChange={setNotifications}
      />
    </div>
  );
}
