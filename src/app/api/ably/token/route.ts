import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { realtime } from "@/lib/realtime";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tokenRequest = await realtime.createTokenRequest({
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
