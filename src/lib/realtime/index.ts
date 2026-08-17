import "server-only";

import { AblyRealtime } from "./ably/ably-realtime";
import type { RealtimeProvider } from "./realtime-provider";

export const realtime: RealtimeProvider = new AblyRealtime();

export type {
  CreateRealtimeTokenInput,
  RealtimeProvider,
  RealtimeTokenRequest,
} from "./realtime-provider";
