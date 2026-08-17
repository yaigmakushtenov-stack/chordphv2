"use client";

import { useTheme } from "next-themes";

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" />
    </svg>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { setTheme } = useTheme();

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      title="Toggle color theme"
      onClick={toggleTheme}
      className={`flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#dedede] bg-white text-[#555] transition hover:border-[#bdbdbd] hover:bg-[#f5f5f5] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:border-[#36363a] dark:bg-[#19191b] dark:text-[#d4d4d8] dark:hover:border-[#55555b] dark:hover:bg-[#242427] dark:hover:text-white dark:focus-visible:outline-white ${className}`}
    >
      <span className="dark:hidden"><MoonIcon /></span>
      <span className="hidden dark:block"><SunIcon /></span>
    </button>
  );
}
