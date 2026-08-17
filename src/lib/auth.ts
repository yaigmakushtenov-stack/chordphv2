import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

import prisma from "@/lib/prisma";

export const auth = betterAuth({
  appName: "ChordPH",
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    modelName: "BetterAuthUser",
  },
  session: {
    modelName: "BetterAuthSession",
  },
  account: {
    modelName: "BetterAuthAccount",
  },
  verification: {
    modelName: "BetterAuthVerification",
  },
  socialProviders: {
    google: {
      clientId: (process.env.GOOGLE_CLIENT_ID ||
        process.env.AUTH_GOOGLE_ID) as string,
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET ||
        process.env.AUTH_GOOGLE_SECRET) as string,
    },
  },
});
