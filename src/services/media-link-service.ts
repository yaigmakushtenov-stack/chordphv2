import "server-only";

import { cookies } from "next/headers";
import {
  MEDIA_LINK_PREFERENCES_COOKIE,
  parseMediaLinkPreferences,
} from "@/lib/music/media-link-preferences";

import type {
  MediaLinkCandidate,
  MediaLinkConfiguration,
  MediaLinkProvider,
  MediaLinkProviderResult,
  MediaLinkSearchInput,
  MediaLinkSearchResult,
} from "@/types/media-link";

const PROVIDER_RESULT_LIMIT = 3;
const REQUEST_TIMEOUT_MS = 8_000;

export interface MediaLinkFinder {
  readonly provider: MediaLinkProvider;
  search(input: MediaLinkSearchInput): Promise<MediaLinkCandidate[]>;
}

type MediaLinkFinderErrorCode =
  | "NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "UNAVAILABLE";

class MediaLinkFinderError extends Error {
  constructor(
    public readonly provider: MediaLinkProvider,
    public readonly code: MediaLinkFinderErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "MediaLinkFinderError";
  }
}

class YouTubeMediaLinkFinder implements MediaLinkFinder {
  readonly provider = "youtube" as const;

  async search(input: MediaLinkSearchInput): Promise<MediaLinkCandidate[]> {
    const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();

    if (!apiKey) {
      throw new MediaLinkFinderError(
        this.provider,
        "NOT_CONFIGURED",
        "YouTube media search is not configured.",
      );
    }

    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", String(PROVIDER_RESULT_LIMIT));
    url.searchParams.set("q", `${input.title} ${input.artistName} official audio`);
    url.searchParams.set("key", apiKey);

    const response = await fetchWithTimeout(url, { cache: "no-store" });

    if (response.status === 403 || response.status === 429) {
      throw new MediaLinkFinderError(
        this.provider,
        "RATE_LIMITED",
        "YouTube media search quota is unavailable.",
      );
    }

    if (!response.ok) {
      throw new MediaLinkFinderError(
        this.provider,
        "UNAVAILABLE",
        "YouTube media search failed.",
      );
    }

    const payload: unknown = await response.json();
    const items = getArrayProperty(payload, "items");

    return items.flatMap((item) => {
      const id = getObjectProperty(item, "id");
      const snippet = getObjectProperty(item, "snippet");
      const videoId = getStringProperty(id, "videoId");
      const title = getStringProperty(snippet, "title");
      const channelTitle = getStringProperty(snippet, "channelTitle");

      if (!videoId || !title) {
        return [];
      }

      return [
        {
          artistName: decodeHtmlEntities(channelTitle || input.artistName),
          provider: this.provider,
          title: decodeHtmlEntities(title),
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        },
      ];
    });
  }
}

type SpotifyToken = {
  accessToken: string;
  expiresAt: number;
};

let spotifyToken: SpotifyToken | null = null;

class SpotifyMediaLinkFinder implements MediaLinkFinder {
  readonly provider = "spotify" as const;

  async search(input: MediaLinkSearchInput): Promise<MediaLinkCandidate[]> {
    const accessToken = await getSpotifyAccessToken();
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set(
      "q",
      `track:${input.title} artist:${input.artistName}`,
    );
    url.searchParams.set("type", "track");
    url.searchParams.set("market", "PH");
    url.searchParams.set("limit", String(PROVIDER_RESULT_LIMIT));

    const response = await fetchWithTimeout(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 429) {
      throw new MediaLinkFinderError(
        this.provider,
        "RATE_LIMITED",
        "Spotify media search is temporarily rate limited.",
      );
    }

    if (!response.ok) {
      throw new MediaLinkFinderError(
        this.provider,
        "UNAVAILABLE",
        "Spotify media search failed.",
      );
    }

    const payload: unknown = await response.json();
    const tracks = getObjectProperty(payload, "tracks");
    const items = getArrayProperty(tracks, "items");

    return items.flatMap((item) => {
      const title = getStringProperty(item, "name");
      const externalUrls = getObjectProperty(item, "external_urls");
      const url = getStringProperty(externalUrls, "spotify");
      const artists = getArrayProperty(item, "artists")
        .map((artist) => getStringProperty(artist, "name"))
        .filter((artistName): artistName is string => Boolean(artistName));

      if (!title || !url) {
        return [];
      }

      return [
        {
          artistName: artists.join(", ") || input.artistName,
          provider: this.provider,
          title,
          url,
        },
      ];
    });
  }
}

const DEFAULT_FINDERS: MediaLinkFinder[] = [
  new YouTubeMediaLinkFinder(),
  new SpotifyMediaLinkFinder(),
];

export async function findMediaLinks(
  input: MediaLinkSearchInput,
  finders: MediaLinkFinder[] = DEFAULT_FINDERS,
): Promise<MediaLinkSearchResult> {
  const cookieStore = await cookies();
  const preferences = parseMediaLinkPreferences(
    cookieStore.get(MEDIA_LINK_PREFERENCES_COOKIE)?.value,
  );
  const results = await Promise.all(
    finders.map((finder): Promise<MediaLinkProviderResult> => {
      if (!preferences.enabled || !preferences[finder.provider]) {
        const label = finder.provider === "youtube" ? "YouTube" : "Spotify";
        return Promise.resolve({
          provider: finder.provider,
          status: "disabled",
          message: `${label} search is turned off in Settings.`,
        });
      }
      return findProviderLinks(finder, input);
    }),
  );

  return {
    spotify:
      results.find((result) => result.provider === "spotify") ??
      unavailableResult("spotify"),
    youtube:
      results.find((result) => result.provider === "youtube") ??
      unavailableResult("youtube"),
  };
}

export function getMediaLinkConfiguration(): MediaLinkConfiguration {
  return {
    youtube: Boolean(process.env.YOUTUBE_DATA_API_KEY?.trim()),
    spotify: Boolean(
      process.env.SPOTIFY_CLIENT_ID?.trim() && process.env.SPOTIFY_CLIENT_SECRET?.trim(),
    ),
  };
}

async function findProviderLinks(
  finder: MediaLinkFinder,
  input: MediaLinkSearchInput,
): Promise<MediaLinkProviderResult> {
  try {
    const candidates = await finder.search(input);

    return candidates.length
      ? { candidates, provider: finder.provider, status: "found" }
      : { provider: finder.provider, status: "not_found" };
  } catch (error: unknown) {
    if (error instanceof MediaLinkFinderError) {
      return unavailableResult(error.provider, error.code);
    }

    return unavailableResult(finder.provider);
  }
}

function unavailableResult(
  provider: MediaLinkProvider,
  code: MediaLinkFinderErrorCode = "UNAVAILABLE",
): MediaLinkProviderResult {
  const label = provider === "youtube" ? "YouTube" : "Spotify";
  const message =
    code === "NOT_CONFIGURED"
      ? `${label} search is not configured yet.`
      : code === "RATE_LIMITED"
        ? `${label} search is temporarily rate limited.`
        : `${label} search is temporarily unavailable.`;

  return { message, provider, status: "unavailable" };
}

async function getSpotifyAccessToken(): Promise<string> {
  if (spotifyToken && spotifyToken.expiresAt > Date.now() + 60_000) {
    return spotifyToken.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new MediaLinkFinderError(
      "spotify",
      "NOT_CONFIGURED",
      "Spotify media search is not configured.",
    );
  }

  const response = await fetchWithTimeout(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    },
  );

  if (response.status === 429) {
    throw new MediaLinkFinderError(
      "spotify",
      "RATE_LIMITED",
      "Spotify token requests are temporarily rate limited.",
    );
  }

  if (!response.ok) {
    throw new MediaLinkFinderError(
      "spotify",
      "UNAVAILABLE",
      "Spotify authentication failed.",
    );
  }

  const payload: unknown = await response.json();
  const accessToken = getStringProperty(payload, "access_token");
  const expiresIn = getNumberProperty(payload, "expires_in");

  if (!accessToken || !expiresIn) {
    throw new MediaLinkFinderError(
      "spotify",
      "UNAVAILABLE",
      "Spotify authentication returned an invalid response.",
    );
  }

  spotifyToken = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1_000,
  };

  return accessToken;
}

async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    throw new Error("Media provider request failed.", { cause: error });
  }
}

function getObjectProperty(
  value: unknown,
  key: string,
): Record<string, unknown> | null {
  if (!isRecord(value) || !isRecord(value[key])) {
    return null;
  }

  return value[key];
}

function getArrayProperty(value: unknown, key: string): unknown[] {
  if (!isRecord(value) || !Array.isArray(value[key])) {
    return [];
  }

  return value[key];
}

function getStringProperty(value: unknown, key: string): string | null {
  if (!isRecord(value) || typeof value[key] !== "string") {
    return null;
  }

  return value[key];
}

function getNumberProperty(value: unknown, key: string): number | null {
  if (!isRecord(value) || typeof value[key] !== "number") {
    return null;
  }

  return value[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export const MediaLinkService = {
  findMediaLinks,
  getMediaLinkConfiguration,
};
