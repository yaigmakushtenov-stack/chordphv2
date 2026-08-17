import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Log in | ChordPH",
  description: "Log in to your ChordPH account.",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function LoginMark() {
  return (
    <div
      aria-hidden="true"
      className="flex size-14 items-center justify-center rounded-2xl bg-[#171717] text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] dark:bg-white dark:text-[#171717] dark:shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4" />
        <path d="m10 8 4 4-4 4" />
        <path d="M14 12H4" />
      </svg>
    </div>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    searchParams,
  ]);

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#fcfcfc] px-5 py-14 text-[#171717] transition-colors dark:bg-[#0d0d0e] dark:text-[#f5f5f5]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.035),transparent_68%)] dark:bg-[radial-gradient(circle_at_top,rgba(237,23,70,0.10),transparent_68%)]"
      />
      <ThemeToggle className="absolute right-5 top-5 z-10" />

      <section className="relative w-full max-w-[448px]">
        <header className="flex flex-col items-center text-center">
          <LoginMark />
          <h1 className="mt-6 text-[30px] font-bold leading-tight tracking-[-0.035em] sm:text-[32px]">
            Welcome back to ChordPH
          </h1>
          <p className="mt-2 text-[15px] text-[#6f6f6f] dark:text-[#a1a1aa]">
            Log in to continue making music
          </p>
        </header>

        <div className="mt-10 rounded-[18px] border border-[#dedede] bg-white p-8 shadow-[0_2px_5px_rgba(0,0,0,0.035)] dark:border-[#343438] dark:bg-[#171719] dark:shadow-[0_12px_35px_rgba(0,0,0,0.25)] sm:p-9">
          {params.error ? (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              We couldn&apos;t complete your login. Please try again.
            </div>
          ) : null}

          <GoogleSignInButton />

          <div className="my-7 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[#e3e3e3] dark:bg-[#343438]" />
            <span className="text-[11px] font-medium tracking-[0.08em] text-[#858585] dark:text-[#92929b]">
              SECURE SIGN IN
            </span>
            <div className="h-px flex-1 bg-[#e3e3e3] dark:bg-[#343438]" />
          </div>

          <div className="flex gap-3 rounded-xl bg-[#f7f7f7] p-4 dark:bg-[#222225]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="mt-0.5 size-5 shrink-0 text-[#666] dark:text-[#b4b4bc]"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <p className="text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
              ChordPH uses Google to verify your identity. Your Google password is
              never shared with us.
            </p>
          </div>
        </div>

        <p className="mt-7 text-center text-[13px] text-[#747474] dark:text-[#a1a1aa]">
          New to ChordPH?{" "}
          <span className="font-semibold text-[#171717] dark:text-[#f5f5f5]">
            Your account is created automatically.
          </span>
        </p>
      </section>
    </main>
  );
}
