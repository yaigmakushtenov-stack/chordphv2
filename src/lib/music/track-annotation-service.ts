import "server-only";

import { MusicFileStatus, Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const MUSICAL_KEYS = new Set([
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
]);

const trackAnnotationSelect = {
  id: true,
  originalKey: true,
  capo: true,
  tempo: true,
  timeSignature: true,
  tuning: true,
  lyricsAndChords: true,
  notes: true,
  formatVersion: true,
  updatedAt: true,
} satisfies Prisma.TrackAnnotationSelect;

const annotationTrackSelect = {
  id: true,
  originalFileName: true,
  title: true,
  artist: true,
  album: true,
  contentType: true,
  sourceSizeBytes: true,
  storedSizeBytes: true,
  metadata: true,
  createdAt: true,
  uploadedAt: true,
  annotation: {
    select: trackAnnotationSelect,
  },
} satisfies Prisma.MusicFileSelect;

export type AnnotationTrack = Prisma.MusicFileGetPayload<{
  select: typeof annotationTrackSelect;
}>;

export type SaveTrackAnnotationInput = {
  ownerId: string;
  trackId: string;
  title: string;
  artist: string | null;
  album: string | null;
  originalKey: string | null;
  capo: number | null;
  tempo: number | null;
  timeSignature: string | null;
  tuning: string | null;
  lyricsAndChords: string;
  notes: string;
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

export async function getAnnotationTrack(
  ownerId: string,
  trackId: string,
): Promise<AnnotationTrack | null> {
  const normalizedOwnerId = requireText(ownerId, "ownerId", 255);
  const normalizedTrackId = requireText(trackId, "trackId", 255);

  return prisma.musicFile.findFirst({
    where: {
      id: normalizedTrackId,
      ownerId: normalizedOwnerId,
      status: MusicFileStatus.READY,
    },
    select: annotationTrackSelect,
  });
}

export async function saveTrackAnnotation(
  input: SaveTrackAnnotationInput,
): Promise<AnnotationTrack> {
  const values = validateSaveInput(input);

  return prisma.$transaction(async (transaction) => {
    const track = await transaction.musicFile.findFirst({
      where: {
        id: values.trackId,
        ownerId: values.ownerId,
        status: MusicFileStatus.READY,
      },
      select: { id: true },
    });

    if (!track) {
      throw new TrackAnnotationServiceError("NOT_FOUND", "Track not found.");
    }

    await transaction.musicFile.update({
      where: { id: track.id },
      data: {
        title: values.title,
        artist: values.artist,
        album: values.album,
      },
      select: { id: true },
    });

    await transaction.trackAnnotation.upsert({
      where: { musicFileId: track.id },
      create: {
        musicFileId: track.id,
        originalKey: values.originalKey,
        capo: values.capo,
        tempo: values.tempo,
        timeSignature: values.timeSignature,
        tuning: values.tuning,
        lyricsAndChords: values.lyricsAndChords,
        notes: values.notes,
      },
      update: {
        originalKey: values.originalKey,
        capo: values.capo,
        tempo: values.tempo,
        timeSignature: values.timeSignature,
        tuning: values.tuning,
        lyricsAndChords: values.lyricsAndChords,
        notes: values.notes,
      },
      select: { id: true },
    });

    const updatedTrack = await transaction.musicFile.findUnique({
      where: { id: track.id },
      select: annotationTrackSelect,
    });

    if (!updatedTrack) {
      throw new Error("Updated annotation track could not be loaded.");
    }

    return updatedTrack;
  });
}

function validateSaveInput(input: SaveTrackAnnotationInput) {
  const ownerId = requireText(input.ownerId, "ownerId", 255);
  const trackId = requireText(input.trackId, "trackId", 255);
  const title = requireText(input.title, "title", 200);
  const artist = optionalText(input.artist, "artist", 200);
  const album = optionalText(input.album, "album", 200);
  const originalKey = optionalText(input.originalKey, "originalKey", 8);
  const timeSignature = optionalText(input.timeSignature, "timeSignature", 16);
  const tuning = optionalText(input.tuning, "tuning", 80);
  const lyricsAndChords = boundedText(
    input.lyricsAndChords,
    "lyricsAndChords",
    100_000,
  );
  const notes = boundedText(input.notes, "notes", 20_000);

  if (originalKey !== null && !MUSICAL_KEYS.has(originalKey)) {
    throw new TrackAnnotationServiceError(
      "INVALID_INPUT",
      "Original key is invalid.",
    );
  }

  if (input.capo !== null && (!Number.isInteger(input.capo) || input.capo < 0 || input.capo > 12)) {
    throw new TrackAnnotationServiceError("INVALID_INPUT", "Capo must be between 0 and 12.");
  }

  if (input.tempo !== null && (!Number.isInteger(input.tempo) || input.tempo < 20 || input.tempo > 400)) {
    throw new TrackAnnotationServiceError("INVALID_INPUT", "Tempo must be between 20 and 400 BPM.");
  }

  return {
    ownerId,
    trackId,
    title,
    artist,
    album,
    originalKey,
    capo: input.capo,
    tempo: input.tempo,
    timeSignature,
    tuning,
    lyricsAndChords,
    notes,
  };
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
