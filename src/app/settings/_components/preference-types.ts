export type AccidentalPreference = "sharps" | "flats";

export type ChartTextSize = "compact" | "comfortable" | "large";

export type DefaultInstrument =
  | "GUITAR"
  | "DRUMS"
  | "VOCALS"
  | "KEYS"
  | "BASS";

export type NotificationPreferences = {
  bandInvites: boolean;
  bandUpdates: boolean;
  eventReminders: boolean;
  eventUpdates: boolean;
};
