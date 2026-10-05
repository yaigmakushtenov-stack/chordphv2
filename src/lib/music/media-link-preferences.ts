export type MediaLinkPreferences = {
  enabled: boolean;
  youtube: boolean;
  spotify: boolean;
};

export const MEDIA_LINK_PREFERENCES_COOKIE = "chordph_media_links";

export function parseMediaLinkPreferences(
  value: string | undefined,
): MediaLinkPreferences {
  if (!value || !/^v1:[01]{3}$/.test(value)) {
    return { enabled: true, youtube: true, spotify: true };
  }
  return {
    enabled: value[3] === "1",
    youtube: value[4] === "1",
    spotify: value[5] === "1",
  };
}

export function serializeMediaLinkPreferences(
  preferences: MediaLinkPreferences,
): string {
  return `v1:${Number(preferences.enabled)}${Number(preferences.youtube)}${Number(preferences.spotify)}`;
}
