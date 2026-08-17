import "server-only";

import { MusicFileStatus, Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { storage } from "@/lib/storage";
import type { SignedUpload } from "@/lib/storage";
import { STORAGE_RULES } from "@/lib/storage/storage-rules";

const MP3_CONTENT_TYPE = "audio/mpeg";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_METADATA_BYTES = 32 * 1024;
const MAX_SEARCH_TEXT_LENGTH = 200;
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;

const musicFileSelect = {
  id: true,
  ownerId: true,
  sourceSha256: true,
  sourceHashVerifiedAt: true,
  objectKey: true,
  storedSha256: true,
  originalFileName: true,
  contentType: true,
  sourceSizeBytes: true,
  storedSizeBytes: true,
  title: true,
  artist: true,
  album: true,
  status: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  uploadedAt: true,
} satisfies Prisma.MusicFileSelect;

const musicFileSearchSelect = {
  id: true,
  originalFileName: true,
  title: true,
  artist: true,
  album: true,
  contentType: true,
  storedSizeBytes: true,
  status: true,
  createdAt: true,
  uploadedAt: true,
} satisfies Prisma.MusicFileSelect;

export type MusicFileRecord = Prisma.MusicFileGetPayload<{
  select: typeof musicFileSelect;
}>;

export type MusicFileSearchResult = Prisma.MusicFileGetPayload<{
  select: typeof musicFileSearchSelect;
}>;

export type PrepareMusicUploadInput = {
  ownerId: string;
  originalFileName: string;
  contentType: string;
  sourceSizeBytes: number;
  sourceSha256: string;
  title?: string;
  artist?: string;
  album?: string;
  metadata?: Prisma.InputJsonObject;
};

export type PrepareMusicUploadResult =
  | {
      outcome: "duplicate";
      file: MusicFileRecord;
    }
  | {
      outcome: "upload";
      file: MusicFileRecord;
      upload: SignedUpload;
    };

export type SearchMusicFilesInput = {
  ownerId: string;
  query?: string;
  cursor?: string;
  limit?: number;
};

export type SearchMusicFilesResult = {
  files: MusicFileSearchResult[];
  nextCursor: string | null;
};

export class MusicFileServiceError extends Error {
  constructor(
    public readonly code: "INVALID_INPUT" | "NOT_FOUND" | "UPLOAD_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "MusicFileServiceError";
  }
}

export async function findMusicFileByHash(
  ownerId: string,
  sourceSha256: string,
): Promise<MusicFileRecord | null> {
  const normalizedOwnerId = requireText(ownerId, "ownerId", 255);
  const normalizedSha256 = normalizeSha256(sourceSha256);

  return prisma.musicFile.findUnique({
    where: {
      ownerId_sourceSha256: {
        ownerId: normalizedOwnerId,
        sourceSha256: normalizedSha256,
      },
    },
    select: musicFileSelect,
  });
}

export async function prepareMusicUpload(
  input: PrepareMusicUploadInput,
): Promise<PrepareMusicUploadResult> {
  const values = validatePrepareInput(input);
  const initialUpload = await storage.createUploadUrl({
    ownerId: values.ownerId,
    folder: "music",
    fileName: values.originalFileName,
    contentType: values.contentType,
    contentLength: values.sourceSizeBytes,
  });

  const file = await prisma.musicFile.upsert({
    where: {
      ownerId_sourceSha256: {
        ownerId: values.ownerId,
        sourceSha256: values.sourceSha256,
      },
    },
    update: {},
    create: {
      ownerId: values.ownerId,
      sourceSha256: values.sourceSha256,
      objectKey: initialUpload.key,
      originalFileName: values.originalFileName,
      contentType: values.contentType,
      sourceSizeBytes: values.sourceSizeBytes,
      title: values.title,
      artist: values.artist,
      album: values.album,
      metadata: values.metadata,
    },
    select: musicFileSelect,
  });

  if (file.objectKey === initialUpload.key) {
    return {
      outcome: "upload",
      file,
      upload: initialUpload,
    };
  }

  if (
    file.status !== MusicFileStatus.PENDING &&
    file.status !== MusicFileStatus.FAILED
  ) {
    return {
      outcome: "duplicate",
      file,
    };
  }

  const resumableFile =
    file.status === MusicFileStatus.FAILED
      ? await prisma.musicFile.update({
          where: { id: file.id },
          data: { status: MusicFileStatus.PENDING },
          select: musicFileSelect,
        })
      : file;
  const upload = await storage.createUploadUrlForKey({
    key: resumableFile.objectKey,
    contentType: resumableFile.contentType,
    contentLength: resumableFile.sourceSizeBytes,
  });

  return {
    outcome: "upload",
    file: resumableFile,
    upload,
  };
}

export async function completeMusicUpload(
  ownerId: string,
  fileId: string,
): Promise<MusicFileRecord> {
  const normalizedOwnerId = requireText(ownerId, "ownerId", 255);
  const normalizedFileId = requireText(fileId, "fileId", 255);
  const file = await prisma.musicFile.findFirst({
    where: {
      id: normalizedFileId,
      ownerId: normalizedOwnerId,
    },
    select: musicFileSelect,
  });

  if (!file) {
    throw new MusicFileServiceError("NOT_FOUND", "Music file not found.");
  }

  if (
    file.status === MusicFileStatus.UPLOADED ||
    file.status === MusicFileStatus.PROCESSING ||
    file.status === MusicFileStatus.READY
  ) {
    return file;
  }

  const object = await storage.getObjectMetadata(file.objectKey);

  if (object.contentLength !== file.sourceSizeBytes) {
    throw new MusicFileServiceError(
      "UPLOAD_MISMATCH",
      "The uploaded object size does not match the prepared upload.",
    );
  }

  if (object.contentType && object.contentType !== file.contentType) {
    throw new MusicFileServiceError(
      "UPLOAD_MISMATCH",
      "The uploaded object type does not match the prepared upload.",
    );
  }

  return prisma.musicFile.update({
    where: { id: file.id },
    data: {
      status: MusicFileStatus.UPLOADED,
      storedSizeBytes: object.contentLength,
      uploadedAt: new Date(),
    },
    select: musicFileSelect,
  });
}

export async function searchMusicFiles(
  input: SearchMusicFilesInput,
): Promise<SearchMusicFilesResult> {
  const ownerId = requireText(input.ownerId, "ownerId", 255);
  const query = normalizeOptionalText(
    input.query,
    "query",
    MAX_SEARCH_TEXT_LENGTH,
  );
  const cursor = normalizeOptionalText(input.cursor, "cursor", 255);
  const limit = normalizeLimit(input.limit);
  const where: Prisma.MusicFileWhereInput = {
    ownerId,
    status: MusicFileStatus.READY,
    ...(query
      ? {
          OR: ["originalFileName", "title", "artist", "album"].map(
            (field) => ({
              [field]: {
                contains: query,
                mode: "insensitive" as const,
              },
            }),
          ),
        }
      : {}),
  };
  const files = await prisma.musicFile.findMany({
    where,
    select: musicFileSearchSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });
  const hasMore = files.length > limit;

  if (hasMore) {
    files.pop();
  }

  return {
    files,
    nextCursor: hasMore ? (files.at(-1)?.id ?? null) : null,
  };
}

function validatePrepareInput(input: PrepareMusicUploadInput) {
  const ownerId = requireText(input.ownerId, "ownerId", 255);
  const originalFileName = requireText(
    input.originalFileName,
    "originalFileName",
    255,
  );

  if (input.contentType !== MP3_CONTENT_TYPE) {
    throw new MusicFileServiceError(
      "INVALID_INPUT",
      "Only MP3 uploads are supported.",
    );
  }

  if (
    !Number.isSafeInteger(input.sourceSizeBytes) ||
    input.sourceSizeBytes < 1 ||
    input.sourceSizeBytes > STORAGE_RULES.music.maxBytes
  ) {
    throw new MusicFileServiceError(
      "INVALID_INPUT",
      `sourceSizeBytes must be between 1 and ${STORAGE_RULES.music.maxBytes}.`,
    );
  }

  return {
    ownerId,
    originalFileName,
    contentType: input.contentType,
    sourceSizeBytes: input.sourceSizeBytes,
    sourceSha256: normalizeSha256(input.sourceSha256),
    title: normalizeOptionalText(input.title, "title", 255),
    artist: normalizeOptionalText(input.artist, "artist", 255),
    album: normalizeOptionalText(input.album, "album", 255),
    metadata: normalizeMetadata(input.metadata),
  };
}

function normalizeSha256(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!SHA256_PATTERN.test(normalized)) {
    throw new MusicFileServiceError(
      "INVALID_INPUT",
      "sourceSha256 must be a 64-character hexadecimal SHA-256 hash.",
    );
  }

  return normalized;
}

function requireText(value: string, field: string, maxLength: number) {
  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    throw new MusicFileServiceError(
      "INVALID_INPUT",
      `${field} must be between 1 and ${maxLength} characters.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | undefined,
  field: string,
  maxLength: number,
) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new MusicFileServiceError(
      "INVALID_INPUT",
      `${field} must not exceed ${maxLength} characters.`,
    );
  }

  return normalized || undefined;
}

function normalizeMetadata(
  metadata: Prisma.InputJsonObject | undefined,
): Prisma.InputJsonObject {
  if (!metadata) {
    return {};
  }

  let serialized: string;

  try {
    serialized = JSON.stringify(metadata);
  } catch {
    throw new MusicFileServiceError(
      "INVALID_INPUT",
      "metadata must be JSON serializable.",
    );
  }

  if (Buffer.byteLength(serialized, "utf8") > MAX_METADATA_BYTES) {
    throw new MusicFileServiceError(
      "INVALID_INPUT",
      `metadata must not exceed ${MAX_METADATA_BYTES} bytes.`,
    );
  }

  return metadata;
}

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined) {
    return DEFAULT_SEARCH_LIMIT;
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_SEARCH_LIMIT) {
    throw new MusicFileServiceError(
      "INVALID_INPUT",
      `limit must be between 1 and ${MAX_SEARCH_LIMIT}.`,
    );
  }

  return limit;
}
