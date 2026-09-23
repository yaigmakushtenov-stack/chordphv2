"use client";

import { showToast } from "@/components/shared/toast";

type ShareLinkButtonProps = {
  iconOnly?: boolean;
  label?: string;
  path: string;
  title: string;
};

export function ShareLinkButton({
  iconOnly = true,
  label = "Share",
  path,
  title,
}: ShareLinkButtonProps) {
  async function handleShare(): Promise<void> {
    const url = new URL(path, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast({
        title: "Link copied",
        description: "The direct link is ready to share.",
        tone: "success",
      });
    } catch {
      showToast({
        title: "Unable to copy the link",
        description: "Copy the address from your browser instead.",
        tone: "error",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      className={`inline-flex h-9 items-center justify-center rounded-full border border-[#d9d9d9] text-[11px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] ${
        iconOnly ? "w-9" : "gap-1.5 px-3.5"
      }`}
    >
      <ShareIcon large={iconOnly} />
      {iconOnly ? null : label}
    </button>
  );
}

function ShareIcon({ large = false }: { large?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={large ? "size-4" : "size-3.5"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.3 10.9 7.4-4.6M8.3 13.1l7.4 4.6" />
    </svg>
  );
}
