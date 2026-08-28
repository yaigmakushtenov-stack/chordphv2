"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.37l-3.25-2.54c-.9.61-2.05.97-3.38.97-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}

export function GoogleSignInButton() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSignIn() {
    setIsPending(true);
    setError(undefined);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/login?error=oauth",
    });

    if (result.error) {
      setError("We couldn't start Google sign-in. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isPending}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-[#d9d9d9] bg-white px-4 text-sm font-semibold text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[#bcbcbc] hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] active:translate-y-px disabled:cursor-wait disabled:opacity-65 dark:border-[#414146] dark:bg-[#222225] dark:text-[#f5f5f5] dark:hover:border-[#5b5b62] dark:hover:bg-[#29292d] dark:focus-visible:outline-white"
      >
        <GoogleMark />
        {isPending ? "Connecting to Google…" : "Continue with Google"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
