import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { MusicFileServiceError, uploadPreparedMusicFile } from "@/lib/music";

export const runtime = "nodejs";

type UploadRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function PUT(
  request: Request,
  context: UploadRouteContext,
): Promise<Response> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : Number.NaN;

  if (!Number.isSafeInteger(contentLength)) {
    return Response.json({ error: "Invalid content length" }, { status: 411 });
  }

  let body: Uint8Array;

  try {
    body = new Uint8Array(await request.arrayBuffer());
  } catch (error: unknown) {
    console.error("Failed to read music upload request body", {
      fileId,
      error,
    });

    return Response.json({ error: "Invalid upload body" }, { status: 400 });
  }

  try {
    await uploadPreparedMusicFile({
      ownerId: session.user.id,
      fileId,
      contentType,
      contentLength,
      body,
    });

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof MusicFileServiceError) {
      return Response.json(
        { error: mapMusicUploadError(error) },
        { status: mapMusicUploadStatus(error) },
      );
    }

    console.error("Failed to upload prepared music file", {
      fileId,
      error,
    });

    return Response.json({ error: "Upload failed" }, { status: 503 });
  }
}

function mapMusicUploadError(error: MusicFileServiceError): string {
  switch (error.code) {
    case "INVALID_INPUT":
      return "The upload request is invalid.";
    case "NOT_FOUND":
      return "Music file not found.";
    case "UPLOAD_CONFLICT":
      return "This music file is not waiting for an upload.";
    case "UPLOAD_MISMATCH":
      return "The upload does not match the prepared file.";
  }
}

function mapMusicUploadStatus(error: MusicFileServiceError): number {
  switch (error.code) {
    case "INVALID_INPUT":
    case "UPLOAD_MISMATCH":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "UPLOAD_CONFLICT":
      return 409;
  }
}
