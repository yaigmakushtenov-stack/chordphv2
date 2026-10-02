import { timingSafeEqual } from "node:crypto";

import { dispatchPendingNotifications } from "@/services/notification-service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization) {
    return new Response(null, { status: 401 });
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return new Response(null, { status: 401 });
  }
  const result = await dispatchPendingNotifications();
  return Response.json(result, {
    status: result.configured ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
