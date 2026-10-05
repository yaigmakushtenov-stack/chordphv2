import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import {
  MusicFileServiceError,
  MusicService,
  MusicWaveformServiceError,
} from "@/services/music-service";

type PlayRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(
  request: Request,
  context: PlayRouteContext,
): Promise<Response> {
  const { fileId } = await context.params;
  if (new URL(request.url).searchParams.get("waveform") === "1") {
    const session = await auth.api.getSession({ headers: request.headers });
    let audio: Awaited<ReturnType<typeof MusicService.loadReadyMusicWaveformAudio>>;
    try {
      audio = await MusicService.loadReadyMusicWaveformAudio(
        fileId,
        session?.user?.id ?? null,
        request.signal,
      );
    } catch (error: unknown) {
      if (error instanceof MusicFileServiceError && error.code === "INVALID_INPUT") {
        notFound();
      }
      if (!(error instanceof MusicWaveformServiceError)) throw error;
      console.error("Music waveform audio unavailable", { fileId });
      return Response.json({ error: "Waveform audio is unavailable" }, { status: 503 });
    }
    if (!audio) notFound();
    return new Response(audio.body, {
      headers: {
        "Content-Type": audio.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  let downloadUrl: string | null;

  try {
    downloadUrl = await MusicService.createReadyMusicFileDownloadUrl(fileId);
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
