import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import {
  AppMenuProvider,
  LeftLibraryPanel,
  MobileMenuButton,
} from "@/components/shared/app-shell/left-library-panel";
import { StickyMusicPlayer } from "@/components/shared/app-shell/sticky-music-player";
import { ToastProvider } from "@/components/shared/toast";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { auth } from "@/lib/auth";

type AppShellProps = {
  children: ReactNode;
  documentScroll?: boolean;
  focusMode?: boolean;
  mobileDocumentScroll?: boolean;
};

type AppShellUser = {
  email: string;
  name: string;
};

function MusicLogoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-6"
    >
      <path d="M17 3.8a1 1 0 0 0-1.2-.98l-8 1.6A1 1 0 0 0 7 5.4v9.26A3.48 3.48 0 0 0 5.5 14.3C3.56 14.3 2 15.57 2 17.15S3.56 20 5.5 20 9 18.73 9 17.15V9.02l6-1.2v5.24a3.48 3.48 0 0 0-1.5-.34c-1.94 0-3.5 1.27-3.5 2.85s1.56 2.85 3.5 2.85 3.5-1.27 3.5-2.85V3.8Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function PixelAvatar({ email, name }: AppShellUser) {
  const hash = hashText(email);
  const primaryColor = `hsl(${hash % 360} 78% 46%)`;
  const secondaryColor = `hsl(${(hash * 7) % 360} 68% 62%)`;
  const cells = Array.from({ length: 25 }, (_, index) => {
    const row = Math.floor(index / 5);
    const column = index % 5;
    const mirroredColumn = column > 2 ? 4 - column : column;
    const bitIndex = row * 3 + mirroredColumn;

    return (hash >> bitIndex) & 1;
  });

  return (
    <span
      aria-label={`${name} profile`}
      title={name}
      className="grid size-11 shrink-0 grid-cols-5 overflow-hidden rounded-full border border-[#dedede] bg-white dark:border-[#36363a] dark:bg-[#19191b]"
    >
      {cells.map((active, index) => (
        <span
          key={`${email}-${index}`}
          aria-hidden="true"
          style={{
            backgroundColor: active ? primaryColor : secondaryColor,
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </span>
  );
}

export async function AppShell({
  children,
  documentScroll = false,
  focusMode = false,
  mobileDocumentScroll = false,
}: AppShellProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user =
    session?.user?.email && session.user.name
      ? {
          email: session.user.email,
          name: session.user.name,
        }
      : null;

  return (
    <AppMenuProvider>
      <div
        className={
          documentScroll
            ? "flex min-h-dvh flex-col bg-[#f4f4f4] text-[#111] dark:bg-black dark:text-[#f5f5f5]"
            : mobileDocumentScroll
            ? "flex min-h-dvh flex-col bg-[#f4f4f4] text-[#111] lg:h-dvh lg:overflow-hidden dark:bg-black dark:text-[#f5f5f5]"
            : "flex h-dvh flex-col overflow-hidden bg-[#f4f4f4] text-[#111] dark:bg-black dark:text-[#f5f5f5]"
        }
      >
        <ToastProvider />
        <header className="shrink-0 border-b border-[#e5e5e5] bg-white px-3 py-2 dark:border-[#151515] dark:bg-black">
        <div className="flex flex-col gap-2">
          <div className="flex min-h-14 min-w-0 items-center gap-2">
            <MobileMenuButton />
            <Link
              href="/"
              aria-label="ChordPH home"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#111] text-[#ed1746] transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#111] dark:text-[#ed1746] dark:hover:bg-[#1f1f1f]"
            >
              <MusicLogoIcon />
            </Link>
            <form action="/browse" className="hidden min-w-0 flex-1 md:block md:max-w-[620px]">
              <label className="flex h-11 min-w-0 items-center gap-3 rounded-full border border-[#dedede] bg-white px-4 text-[#696969] transition focus-within:border-[#b8b8b8] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(237,23,70,0.08)] dark:border-[#2a2a2a] dark:bg-[#1f1f1f] dark:text-[#b4b4bc] dark:focus-within:border-[#494949] dark:focus-within:bg-[#252525]">
                <span className="sr-only">Search tracks</span>
                <SearchIcon />
                <input
                  type="search"
                  name="q"
                  maxLength={100}
                  placeholder="What do you want to play?"
                  className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[#171717] outline-none placeholder:text-[#777] dark:text-[#f5f5f5] dark:placeholder:text-[#a1a1aa]"
                />
              </label>
            </form>
            <nav
              aria-label="Account navigation"
              className="ml-auto flex min-w-0 items-center justify-end gap-2"
            >
              <Link
                href="/"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#ed1746] px-5 text-[13px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#ed1746] dark:hover:bg-[#d90f3b]"
              >
                <DownloadIcon />
                Install App
              </Link>
              {user ? (
                <PixelAvatar email={user.email} name={user.name} />
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-bold text-[#5f5f5f] transition hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#b4b4bc] dark:hover:text-white"
                  >
                    Sign up
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center rounded-full bg-[#111] px-5 text-[13px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
                  >
                    Log in
                  </Link>
                </>
              )}
              <ThemeToggle className="size-10" />
            </nav>
          </div>
        </div>
        </header>

        <div
          className={
            documentScroll
              ? focusMode
                ? "flex flex-1 p-2"
                : "grid flex-1 gap-2 p-2 lg:grid-cols-[minmax(220px,280px)_1fr]"
              : focusMode
              ? "flex min-h-0 flex-1 p-2"
              : mobileDocumentScroll
                ? "grid flex-1 gap-2 p-2 lg:min-h-0 lg:grid-cols-[minmax(220px,280px)_1fr]"
                : "grid min-h-0 flex-1 gap-2 p-2 lg:grid-cols-[minmax(220px,280px)_1fr]"
          }
        >
          <LeftLibraryPanel
            isAuthenticated={Boolean(user)}
            showDesktop={!focusMode}
          />
          <main
            className={
              documentScroll
                ? "flex min-w-0 flex-1"
                : mobileDocumentScroll
                ? "flex min-w-0 flex-1 lg:h-full lg:min-h-0"
                : "flex h-full min-h-0 min-w-0 flex-1"
            }
          >
            {children}
          </main>
        </div>

        {!focusMode ? <StickyMusicPlayer /> : null}
      </div>
    </AppMenuProvider>
  );
}

function hashText(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash << 5) - hash + character.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash);
}
