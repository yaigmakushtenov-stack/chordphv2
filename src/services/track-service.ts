import "server-only";

import {
  MusicFileStatus,
  Prisma,
  PublicityStatus,
  TrackAnnotationType,
  VisibilityStatus,
} from "@/generated/prisma/client";
import {
  MUSICAL_KEYS,
  MAX_TRACK_TAGS,
  TRACK_JOIN_PHRASES,
  TRACK_TAGS,
  TRACK_TUNINGS,
  type TrackJoinPhrase,
} from "@/lib/music/track-options";
import prisma from "@/lib/prisma";

export type TemporaryTrackArtist = {
  artistName: string;
  joinPhrase: TrackJoinPhrase;
};

const MUSICAL_KEY_SET = new Set<string>(MUSICAL_KEYS);
const TRACK_TUNING_SET = new Set<string>(TRACK_TUNINGS);
const TRACK_TAG_SET = new Set<string>(TRACK_TAGS);

const trackAnnotationSelect = {
  id: true,
  lyricsAndChords: true,
  type: true,
  notes: true,
  formatVersion: true,
  updatedAt: true,
} satisfies Prisma.TrackAnnotationSelect;

const annotationTrackSelect = {
  id: true,
  ownerId: true,
  title: true,
  artistName: true,
  key: true,
  capo: true,
  tempo: true,
  timeSignature: true,
  tuning: true,
  youtubeLink: true,
  spotifyLink: true,
  tags: true,
  metadata: true,
  visibilityStatus: true,
  publicityStatus: true,
  updatedAt: true,
  musicFile: {
    select: {
      id: true,
      originalFileName: true,
      metadata: true,
    },
  },
  annotation: {
    select: trackAnnotationSelect,
  },
} satisfies Prisma.TrackSelect;

const personalTrackSelect = {
  id: true,
  title: true,
  artistName: true,
  key: true,
  tuning: true,
  tags: true,
  updatedAt: true,
  musicFileId: true,
} satisfies Prisma.TrackSelect;

const copySourceTrackSelect = {
  id: true,
  title: true,
  artistName: true,
  key: true,
  capo: true,
  tempo: true,
  timeSignature: true,
  tuning: true,
  youtubeLink: true,
  spotifyLink: true,
  tags: true,
  metadata: true,
  annotation: {
    select: {
      type: true,
      lyricsAndChords: true,
      formatVersion: true,
    },
  },
} satisfies Prisma.TrackSelect;

export type AnnotationTrack = Prisma.TrackGetPayload<{
  select: typeof annotationTrackSelect;
}>;

export type PersonalTrackRecord = Prisma.TrackGetPayload<{
  select: typeof personalTrackSelect;
}>;

export type SaveTrackDetailsInput = {
  ownerId: string;
  trackId: string;
  title: string;
  artistName: string;
  key: string | null;
  capo: number | null;
  tempo: number | null;
  timeSignature: string | null;
  tuning: string | null;
  youtubeLink: string | null;
  spotifyLink: string | null;
  tags: string[];
  additionalArtists: TemporaryTrackArtist[];
};

export type SaveTrackAnnotationInput = {
  ownerId: string;
  trackId: string;
  lyricsAndChords: string;
  notes: string;
};

export type CreateTrackWithAnnotationInput = Omit<
  SaveTrackDetailsInput,
  "trackId"
> &
  Omit<SaveTrackAnnotationInput, "ownerId" | "trackId"> & {
    musicFileId: string | null;
  };

export class TrackAnnotationServiceError extends Error {
  constructor(
    public readonly code: "INVALID_INPUT" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "TrackAnnotationServiceError";
  }
}

export async function createTrackWithAnnotation(
  input: CreateTrackWithAnnotationInput,
): Promise<AnnotationTrack> {
  const ownerId = requireText(input.ownerId, "ownerId", 255);
  const musicFileId = optionalText(input.musicFileId, "musicFileId", 255);
  const details = validateTrackDetailsValues(input);
  const annotation = validateAnnotationValues(input);

  return prisma.$transaction(async (transaction) => {
    if (musicFileId) {
      const musicFile = await transaction.musicFile.findFirst({
        where: {
          id: musicFileId,
          ownerId,
          status: MusicFileStatus.READY,
          track: { is: null },
        },
        select: { id: true },
      });

      if (!musicFile) {
        throw new TrackAnnotationServiceError(
          "INVALID_INPUT",
          "The selected audio file is unavailable or already attached.",
        );
      }
    }

    return transaction.track.create({
      data: {
        ownerId,
        musicFileId,
        title: details.title,
        artistName: details.artistName,
        key: details.key,
        capo: details.capo,
        tempo: details.tempo,
        timeSignature: details.timeSignature,
        tuning: details.tuning,
        youtubeLink: details.youtubeLink,
        spotifyLink: details.spotifyLink,
        tags: details.tags,
        metadata: {
          additionalArtists: details.additionalArtists,
        },
        visibilityStatus: VisibilityStatus.PRIVATE,
        annotation: {
          create: {
            type: TrackAnnotationType.CHORDS,
            lyricsAndChords: annotation.lyricsAndChords,
            notes: annotation.notes,
          },
        },
      },
      select: annotationTrackSelect,
    });
  });
}

export async function getAnnotationTrack(
  ownerId: string,
  trackId: string,
): Promise<AnnotationTrack | null> {
  return prisma.track.findFirst({
    where: {
      id: requireText(trackId, "trackId", 255),
      ownerId: requireText(ownerId, "ownerId", 255),
    },
    select: annotationTrackSelect,
  });
}

export async function getViewableAnnotationTrack(
  trackId: string,
  viewerId: string | null,
): Promise<AnnotationTrack | null> {
  const visibilityWhere: Prisma.TrackWhereInput = viewerId
    ? {
        OR: [
          { ownerId: requireText(viewerId, "viewerId", 255) },
          {
            visibilityStatus: VisibilityStatus.PUBLIC,
            publicityStatus: PublicityStatus.APPROVED,
          },
        ],
      }
    : {
        visibilityStatus: VisibilityStatus.PUBLIC,
        publicityStatus: PublicityStatus.APPROVED,
      };

  return prisma.track.findFirst({
    where: {
      id: requireText(trackId, "trackId", 255),
      annotation: { isNot: null },
      ...visibilityWhere,
    },
    select: annotationTrackSelect,
  });
}

export async function listPersonalAnnotationTracks(
  ownerId: string,
): Promise<PersonalTrackRecord[]> {
  return prisma.track.findMany({
    where: {
      ownerId: requireText(ownerId, "ownerId", 255),
      annotation: { isNot: null },
    },
    select: personalTrackSelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
  });
}

export async function submitTrackForPublicReview(
  ownerId: string,
  trackId: string,
): Promise<AnnotationTrack> {
  const normalizedOwnerId = requireText(ownerId, "ownerId", 255);
  const normalizedTrackId = requireText(trackId, "trackId", 255);
  const result = await prisma.track.updateMany({
    where: {
      id: normalizedTrackId,
      ownerId: normalizedOwnerId,
      visibilityStatus: VisibilityStatus.PRIVATE,
      publicityStatus: {
        in: [PublicityStatus.PRIVATE, PublicityStatus.REJECTED],
      },
      annotation: { isNot: null },
    },
    data: { publicityStatus: PublicityStatus.PENDING },
  });

  if (result.count === 0) {
    throw new TrackAnnotationServiceError(
      "INVALID_INPUT",
      "This annotation cannot be submitted for review.",
    );
  }

  const track = await prisma.track.findUnique({
    where: { id: normalizedTrackId },
    select: annotationTrackSelect,
  });

  if (!track) {
    throw new Error("Submitted annotation track could not be loaded.");
  }

  return track;
}

export async function copyPublicTrackToPersonalLibrary(
  ownerId: string,
  sourceTrackId: string,
): Promise<AnnotationTrack> {
  const normalizedOwnerId = requireText(ownerId, "ownerId", 255);
  const normalizedSourceTrackId = requireText(
    sourceTrackId,
    "sourceTrackId",
    255,
  );

  return prisma.$transaction(async (transaction) => {
    const source = await transaction.track.findFirst({
      where: {
        id: normalizedSourceTrackId,
        ownerId: { not: normalizedOwnerId },
        visibilityStatus: VisibilityStatus.PUBLIC,
        publicityStatus: PublicityStatus.APPROVED,
        annotation: { isNot: null },
      },
      select: copySourceTrackSelect,
    });

    if (!source?.annotation) {
      throw new TrackAnnotationServiceError(
        "NOT_FOUND",
        "Public annotation not found.",
      );
    }

    return transaction.track.create({
      data: {
        ownerId: normalizedOwnerId,
        title: source.title,
        artistName: source.artistName,
        key: source.key,
        capo: source.capo,
        tempo: source.tempo,
        timeSignature: source.timeSignature,
        tuning: source.tuning,
        youtubeLink: source.youtubeLink,
        spotifyLink: source.spotifyLink,
        tags: source.tags,
        visibilityStatus: VisibilityStatus.PRIVATE,
        metadata: {
          additionalArtists: getTemporaryTrackArtists(source.metadata),
          copiedFromTrackId: source.id,
        },
        annotation: {
          create: {
            type: source.annotation.type,
            lyricsAndChords: source.annotation.lyricsAndChords,
            notes: "",
            formatVersion: source.annotation.formatVersion,
          },
        },
      },
      select: annotationTrackSelect,
    });
  });
}

export async function saveTrackDetails(
  input: SaveTrackDetailsInput,
): Promise<AnnotationTrack> {
  const values = validateTrackDetails(input);

  return prisma.$transaction(async (transaction) => {
    const currentTrack = await transaction.track.findFirst({
      where: {
        id: values.trackId,
        ownerId: values.ownerId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!currentTrack) {
      throw new TrackAnnotationServiceError("NOT_FOUND", "Track not found.");
    }

    const metadata = toMetadataObject(currentTrack.metadata);

    return transaction.track.update({
      where: { id: currentTrack.id },
      data: {
        title: values.title,
        artistName: values.artistName,
        key: values.key,
        capo: values.capo,
        tempo: values.tempo,
        timeSignature: values.timeSignature,
        tuning: values.tuning,
        youtubeLink: values.youtubeLink,
        spotifyLink: values.spotifyLink,
        tags: values.tags,
        metadata: {
          ...metadata,
          additionalArtists: values.additionalArtists,
        },
      },
      select: annotationTrackSelect,
    });
  });
}

export async function saveTrackAnnotation(
  input: SaveTrackAnnotationInput,
): Promise<AnnotationTrack> {
  const ownerId = requireText(input.ownerId, "ownerId", 255);
  const trackId = requireText(input.trackId, "trackId", 255);
  const values = validateAnnotationValues(input);

  return prisma.$transaction(async (transaction) => {
    const track = await transaction.track.findFirst({
      where: { id: trackId, ownerId },
      select: { id: true },
    });

    if (!track) {
      throw new TrackAnnotationServiceError("NOT_FOUND", "Track not found.");
    }

    await transaction.trackAnnotation.upsert({
      where: { trackId: track.id },
      create: {
        trackId: track.id,
        type: TrackAnnotationType.CHORDS,
        lyricsAndChords: values.lyricsAndChords,
        notes: values.notes,
      },
      update: {
        lyricsAndChords: values.lyricsAndChords,
        notes: values.notes,
      },
      select: { id: true },
    });

    const updatedTrack = await transaction.track.findUnique({
      where: { id: track.id },
      select: annotationTrackSelect,
    });

    if (!updatedTrack) {
      throw new Error("Updated annotation track could not be loaded.");
    }

    return updatedTrack;
  });
}

export function getTemporaryTrackArtists(
  metadata: Prisma.JsonValue,
): TemporaryTrackArtist[] {
  if (!isRecord(metadata) || !Array.isArray(metadata.additionalArtists)) {
    return [];
  }

  return metadata.additionalArtists.flatMap((value) => {
    if (
      !isRecord(value) ||
      typeof value.artistName !== "string" ||
      !isTrackJoinPhrase(value.joinPhrase)
    ) {
      return [];
    }

    return [{ artistName: value.artistName, joinPhrase: value.joinPhrase }];
  });
}

function validateTrackDetails(input: SaveTrackDetailsInput) {
  const ownerId = requireText(input.ownerId, "ownerId", 255);
  const trackId = requireText(input.trackId, "trackId", 255);
  const values = validateTrackDetailsValues(input);

  return { ownerId, trackId, ...values };
}

function validateTrackDetailsValues(
  input: Omit<SaveTrackDetailsInput, "ownerId" | "trackId">,
) {
  const title = requireText(input.title, "title", 200);
  const artistName = requireText(input.artistName, "artistName", 200);
  const key = requireText(input.key, "key", 8);
  const timeSignature = optionalText(input.timeSignature, "timeSignature", 16);
  const tuning = requireText(input.tuning, "tuning", 80);
  const youtubeLink = optionalUrl(input.youtubeLink, "youtubeLink");
  const spotifyLink = optionalUrl(input.spotifyLink, "spotifyLink");
  const tags = validateTrackTags(input.tags);

  if (!MUSICAL_KEY_SET.has(key)) {
    throw new TrackAnnotationServiceError("INVALID_INPUT", "Key is invalid.");
  }

  if (!TRACK_TUNING_SET.has(tuning)) {
    throw new TrackAnnotationServiceError(
      "INVALID_INPUT",
      "Tuning is invalid.",
    );
  }

  if (
    input.capo !== null &&
    (!Number.isInteger(input.capo) || input.capo < 0 || input.capo > 12)
  ) {
    throw new TrackAnnotationServiceError(
      "INVALID_INPUT",
      "Capo must be between 0 and 12.",
    );
  }

  if (
    input.tempo !== null &&
    (!Number.isInteger(input.tempo) || input.tempo < 20 || input.tempo > 400)
  ) {
    throw new TrackAnnotationServiceError(
      "INVALID_INPUT",
      "Tempo must be between 20 and 400 BPM.",
    );
  }

  if (!Array.isArray(input.additionalArtists) || input.additionalArtists.length > 10) {
    throw new TrackAnnotationServiceError(
      "INVALID_INPUT",
      "A track can have up to 10 additional artists.",
    );
  }

  const additionalArtists = input.additionalArtists.map((artist) => {
    if (!isRecord(artist)) {
      throw new TrackAnnotationServiceError(
        "INVALID_INPUT",
        "Additional artist is invalid.",
      );
    }

    return {
      artistName: requireText(artist.artistName, "additionalArtistName", 200),
      joinPhrase: requireJoinPhrase(artist.joinPhrase),
    };
  });
  const normalizedNames = new Set([artistName.toLowerCase()]);

  for (const artist of additionalArtists) {
    const normalizedName = artist.artistName.toLowerCase();

    if (normalizedNames.has(normalizedName)) {
      throw new TrackAnnotationServiceError(
        "INVALID_INPUT",
        "Each artist name must be unique.",
      );
    }

    normalizedNames.add(normalizedName);
  }

  return {
    title,
    artistName,
    key,
    capo: input.capo,
    tempo: input.tempo,
    timeSignature,
    tuning,
    youtubeLink,
    spotifyLink,
    tags,
    additionalArtists,
  };
}

function validateTrackTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_TRACK_TAGS) {
    throw new TrackAnnotationServiceError(
      "INVALID_INPUT",
      `Select up to ${MAX_TRACK_TAGS} track tags.`,
    );
  }

  const tags = value.map((tag) => {
    if (typeof tag !== "string" || !TRACK_TAG_SET.has(tag)) {
      throw new TrackAnnotationServiceError(
        "INVALID_INPUT",
        "A selected track tag is invalid.",
      );
    }

    return tag;
  });

  if (new Set(tags).size !== tags.length) {
    throw new TrackAnnotationServiceError(
      "INVALID_INPUT",
      "Track tags must be unique.",
    );
  }

  return tags;
}

function validateAnnotationValues(
  input: Pick<SaveTrackAnnotationInput, "lyricsAndChords" | "notes">,
) {
  return {
    lyricsAndChords: boundedText(
      input.lyricsAndChords,
      "lyricsAndChords",
      100_000,
    ),
    notes: boundedText(input.notes, "notes", 20_000),
  };
}

function requireJoinPhrase(value: unknown): TrackJoinPhrase {
  if (!isTrackJoinPhrase(value)) {
    throw new TrackAnnotationServiceError(
      "INVALID_INPUT",
      "Join phrase is invalid.",
    );
  }

  return value;
}

function isTrackJoinPhrase(value: unknown): value is TrackJoinPhrase {
  return TRACK_JOIN_PHRASES.some((phrase) => phrase === value);
}

function optionalUrl(value: unknown, field: string): string | null {
  const normalized = optionalText(value, field, 500);

  if (normalized === null) {
    return null;
  }

  try {
    const url = new URL(normalized);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Unsupported URL protocol.");
    }
  } catch {
    throw new TrackAnnotationServiceError("INVALID_INPUT", `${field} is invalid.`);
  }

  return normalized;
}

function requireText(value: unknown, field: string, maxLength: number): string {
  const normalized = boundedText(value, field, maxLength).trim();

  if (!normalized) {
    throw new TrackAnnotationServiceError("INVALID_INPUT", `${field} is required.`);
  }

  return normalized;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = boundedText(value, field, maxLength).trim();
  return normalized || null;
}

function boundedText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.length > maxLength) {
    throw new TrackAnnotationServiceError("INVALID_INPUT", `${field} is invalid.`);
  }

  return value;
}

function toMetadataObject(metadata: Prisma.JsonValue): Prisma.InputJsonObject {
  if (!isRecord(metadata)) {
    return {};
  }

  return metadata as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const TrackService = {
  copyPublicTrackToPersonalLibrary,
  createTrackWithAnnotation,
  getAnnotationTrack,
  getTemporaryTrackArtists,
  getViewableAnnotationTrack,
  listPersonalAnnotationTracks,
  saveTrackAnnotation,
  saveTrackDetails,
  submitTrackForPublicReview,
};
