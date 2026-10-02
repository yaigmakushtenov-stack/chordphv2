import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  sessionOptions: {
    refetchInterval: 15 * 60,
    refetchOnWindowFocus: true,
    refetchWhenOffline: false,
  },
});
