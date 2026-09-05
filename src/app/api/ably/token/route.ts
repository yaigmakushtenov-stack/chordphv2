import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { realtime } from "@/lib/realtime";
import { createStageChannelName } from "@/lib/realtime/stage-channel";
import { EventService } from "@/services/event-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  const setListId = url.searchParams.get("setListId");
  const bandId = url.searchParams.get("bandId");

  if (!eventId || !setListId || !bandId) {
    return Response.json({ error: "Invalid realtime scope" }, { status: 400 });
  }

  try {
    const access = await EventService.getStageAccessForUser({
      userId: session.user.id,
      eventId,
      setListId,
      bandId,
    });

    if (!access) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const channelName = createStageChannelName({ eventId, setListId, bandId });
    const channelCapability: ("presence" | "publish" | "subscribe")[] =
      access.canLead
      ? ["publish", "subscribe", "presence"]
      : ["subscribe", "presence"];
    const tokenRequest = await realtime.createTokenRequest({
      capability: {
        [channelName]: channelCapability,
      },
      clientId: `user:${session.user.id}`,
    });

    return Response.json(tokenRequest, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to create an Ably token request", error);

    return Response.json(
      { error: "Realtime service is not configured" },
      { status: 503 },
    );
  }
}
