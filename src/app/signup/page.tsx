import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign up | ChordPH",
  description: "Create your ChordPH account.",
};

function SignupMark() {
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
        <path d="M12 5v14M5 12h14" />
      </svg>
    </div>
  );
}

export default async function SignupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
          <SignupMark />
          <h1 className="mt-6 text-[30px] font-bold leading-tight tracking-[-0.035em] sm:text-[32px]">
            Create your ChordPH account
          </h1>
          <p className="mt-2 text-[15px] text-[#6f6f6f] dark:text-[#a1a1aa]">
            Sign up to create playlists and upload audio
          </p>
        </header>

        <div className="mt-10 rounded-[18px] border border-[#dedede] bg-white p-8 shadow-[0_2px_5px_rgba(0,0,0,0.035)] dark:border-[#343438] dark:bg-[#171719] dark:shadow-[0_12px_35px_rgba(0,0,0,0.25)] sm:p-9">
          <GoogleSignInButton />

          <div className="my-7 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[#e3e3e3] dark:bg-[#343438]" />
            <span className="text-[11px] font-medium tracking-[0.08em] text-[#858585] dark:text-[#92929b]">
              SECURE SIGN UP
            </span>
            <div className="h-px flex-1 bg-[#e3e3e3] dark:bg-[#343438]" />
          </div>

          <p className="rounded-xl bg-[#f7f7f7] p-4 text-[13px] leading-5 text-[#666] dark:bg-[#222225] dark:text-[#b4b4bc]">
            ChordPH creates your account through Google sign-in. Your Google
            password is never shared with us.
          </p>
        </div>

        <p className="mt-7 text-center text-[13px] text-[#747474] dark:text-[#a1a1aa]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#171717] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#f5f5f5]"
          >
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
