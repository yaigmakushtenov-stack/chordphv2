import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import {
  createReadyMusicFileDownloadUrl,
  MusicFileServiceError,
} from "@/lib/music";

type PlayRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: PlayRouteContext,
): Promise<Response> {
  const { fileId } = await context.params;
  let downloadUrl: string | null;

  try {
    downloadUrl = await createReadyMusicFileDownloadUrl(fileId);
  } catch (error: unknown) {
    if (
      error instanceof MusicFileServiceError &&
      error.code === "INVALID_INPUT"
    ) {
      notFound();
    }

    console.error("Failed to create music playback URL", { fileId, error });

    return Response.json({ error: "Playback is unavailable" }, { status: 503 });
  }

  if (!downloadUrl) {
    notFound();
  }

  return NextResponse.redirect(downloadUrl);
}
