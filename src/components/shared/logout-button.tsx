"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

type LogoutButtonProps = {
  variant?: "header" | "menu";
};

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path d="m15 16 4-4-4-4M19 12H9" />
    </svg>
  );
}

export function LogoutButton({ variant = "header" }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handleLogout() {
    setIsPending(true);
    setError(undefined);

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
        onError: () => {
          setError("Logout failed. Please try again.");
          setIsPending(false);
        },
      },
    });
  }

  const buttonClassName =
    variant === "menu"
      ? "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-bold text-[#c90f39] transition hover:bg-[#fff0f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-wait disabled:opacity-60 dark:text-[#fb7185] dark:hover:bg-[#3a111d]"
      : "flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-medium text-[#696969] transition hover:bg-[#f5f5f5] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-wait disabled:opacity-60 dark:text-[#b4b4bc] dark:hover:bg-[#242427] dark:hover:text-white dark:focus-visible:outline-white";

  return (
    <div className={variant === "menu" ? "relative w-full" : "relative"}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className={buttonClassName}
      >
        <LogoutIcon />
        <span className={variant === "header" ? "hidden sm:inline" : undefined}>
          {isPending ? "Logging out…" : "Log out"}
        </span>
      </button>
      {error ? (
        <p
          role="alert"
          className={
            variant === "menu"
              ? "mt-2 rounded-lg border border-red-200 bg-white p-2 text-xs text-red-700 shadow-lg dark:border-red-900 dark:bg-[#19191b] dark:text-red-300"
              : "absolute right-0 top-11 w-52 rounded-lg border border-red-200 bg-white p-2 text-xs text-red-700 shadow-lg dark:border-red-900 dark:bg-[#19191b] dark:text-red-300"
          }
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
