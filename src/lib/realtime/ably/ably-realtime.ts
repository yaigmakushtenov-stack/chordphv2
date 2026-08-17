import "server-only";

import * as Ably from "ably";

import type {
  CreateRealtimeTokenInput,
  RealtimeProvider,
  RealtimeTokenRequest,
} from "../realtime-provider";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export class AblyRealtime implements RealtimeProvider {
  private client: Ably.Rest | undefined;

  async createTokenRequest(
    input: CreateRealtimeTokenInput,
  ): Promise<RealtimeTokenRequest> {
    return this.getClient().auth.createTokenRequest({
      clientId: input.clientId,
      ttl: TOKEN_TTL_MS,
      capability: {
        "chordph:*": ["publish", "subscribe", "presence"],
      },
    });
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    const key = process.env.ABLY_API_KEY?.trim();

    if (!key) {
      throw new Error("Missing required environment variable: ABLY_API_KEY");
    }

    this.client = new Ably.Rest({ key });

    return this.client;
  }
}
