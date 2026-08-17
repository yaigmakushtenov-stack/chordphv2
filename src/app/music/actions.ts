"use server";

import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions";
import {
  completeMusicUpload,
  findMusicFileByHash,
  MusicFileServiceError,
  prepareMusicUpload,
  type MusicFileRecord,
  type PrepareMusicUploadInput,
} from "@/lib/music";

export type PrepareMusicUploadActionInput = {
  originalFileName: string;
  contentType: string;
  sourceSizeBytes: number;
  sourceSha256: string;
  storedSizeBytes: number;
  storedSha256: string;
  title?: string;
  artist?: string;
  album?: string;
};

export type CompleteMusicUploadActionInput = {
  fileId: string;
};

export type FindMusicFileByHashActionInput = {
  sourceSha256: string;
};

export type MusicUploadFileData = {
  id: string;
  originalFileName: string;
  contentType: string;
  sourceSizeBytes: number;
  storedSizeBytes: number | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  status: MusicFileRecord["status"];
};

type PrepareMusicUploadActionData =
  | {
      outcome: "duplicate";
      file: MusicUploadFileData;
    }
  | {
      outcome: "upload";
      file: MusicUploadFileData;
      upload: {
        url: string;
        expiresIn: number;
        headers: Record<string, string>;
      };
    };

export async function findMusicFileByHashAction(
  input: FindMusicFileByHashActionInput,
): Promise<ActionResult<MusicUploadFileData | null>> {
  const session = await getSession();

  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to check music files.");
  }

  if (!isRecord(input) || typeof input.sourceSha256 !== "string") {
    return actionFailure("VALIDATION_ERROR", "The source hash is invalid.");
  }

  try {
    const file = await findMusicFileByHash(
      session.user.id,
      input.sourceSha256,
    );

    return actionSuccess(file ? toMusicUploadFileData(file) : null);
  } catch (error: unknown) {
    return handleMusicFileServiceError(error);
  }
}

export async function prepareMusicUploadAction(
  input: PrepareMusicUploadActionInput,
): Promise<ActionResult<PrepareMusicUploadActionData>> {
  const session = await getSession();

  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to upload music.");
  }

  const parsedInput = parsePrepareInput(input);

  if (!parsedInput) {
    return actionFailure(
      "VALIDATION_ERROR",
      "The upload details are invalid.",
    );
  }

  try {
    const result = await prepareMusicUpload({
      ...parsedInput,
      ownerId: session.user.id,
    });
    const file = toMusicUploadFileData(result.file);

    if (result.outcome === "duplicate") {
      return actionSuccess({ outcome: "duplicate", file });
    }

    return actionSuccess({
      outcome: "upload",
      file,
      upload: {
        url: result.upload.uploadUrl,
        expiresIn: result.upload.expiresIn,
        headers: result.upload.headers,
      },
    });
  } catch (error: unknown) {
    return handleMusicFileServiceError(error);
  }
}

export async function completeMusicUploadAction(
  input: CompleteMusicUploadActionInput,
): Promise<ActionResult<MusicUploadFileData>> {
  const session = await getSession();

  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to complete the upload.");
  }

  if (!isRecord(input) || typeof input.fileId !== "string") {
    return actionFailure("VALIDATION_ERROR", "The file identifier is invalid.");
  }

  try {
    const file = await completeMusicUpload(session.user.id, input.fileId);

    return actionSuccess(toMusicUploadFileData(file));
  } catch (error: unknown) {
    return handleMusicFileServiceError(error);
  }
}

async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

function parsePrepareInput(
  input: PrepareMusicUploadActionInput,
): Omit<PrepareMusicUploadInput, "ownerId"> | null {
  if (!isRecord(input)) {
    return null;
  }

  const requiredStrings = [
    input.originalFileName,
    input.contentType,
    input.sourceSha256,
    input.storedSha256,
  ];
  const optionalStrings = [input.title, input.artist, input.album];

  if (
    requiredStrings.some((value) => typeof value !== "string") ||
    optionalStrings.some(
      (value) => value !== undefined && typeof value !== "string",
    ) ||
    typeof input.sourceSizeBytes !== "number" ||
    typeof input.storedSizeBytes !== "number"
  ) {
    return null;
  }

  return {
    originalFileName: input.originalFileName,
    contentType: input.contentType,
    sourceSizeBytes: input.sourceSizeBytes,
    sourceSha256: input.sourceSha256,
    storedSizeBytes: input.storedSizeBytes,
    storedSha256: input.storedSha256,
    title: input.title,
    artist: input.artist,
    album: input.album,
  };
}

function handleMusicFileServiceError<T>(error: unknown): ActionResult<T> {
  if (!(error instanceof MusicFileServiceError)) {
    throw error;
  }

  switch (error.code) {
    case "INVALID_INPUT":
      return actionFailure("VALIDATION_ERROR", error.message);
    case "NOT_FOUND":
      return actionFailure("NOT_FOUND", "Music file not found.");
    case "UPLOAD_CONFLICT":
      return actionFailure("CONFLICT", error.message);
    case "UPLOAD_MISMATCH":
      return actionFailure(
        "CONFLICT",
        "The uploaded file does not match the prepared upload.",
      );
  }
}

function toMusicUploadFileData(file: MusicFileRecord): MusicUploadFileData {
  return {
    id: file.id,
    originalFileName: file.originalFileName,
    contentType: file.contentType,
    sourceSizeBytes: file.sourceSizeBytes,
    storedSizeBytes: file.storedSizeBytes,
    title: file.title,
    artist: file.artist,
    album: file.album,
    status: file.status,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
