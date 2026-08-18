"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useId, useState } from "react";

type LoginPromptTooltipProps = {
  label: string;
  title: string;
  message: string;
  children: ReactNode;
  className: string;
  align?: "start" | "end";
};

export function LoginPromptTooltip({
  label,
  title,
  message,
  children,
  className,
  align = "start",
}: LoginPromptTooltipProps) {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const panelClassName =
    align === "end"
      ? "absolute right-0 top-full z-30 mt-3 w-[min(320px,calc(100vw-2rem))] rounded-xl bg-[#ed1746] p-4 text-left text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] dark:bg-[#d90f3b]"
      : "absolute left-0 top-full z-30 mt-3 w-[min(320px,calc(100vw-2rem))] rounded-xl bg-[#ed1746] p-4 text-left text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] dark:bg-[#d90f3b]";
  const arrowClassName =
    align === "end"
      ? "absolute -top-2 right-6 size-4 rotate-45 bg-[#ed1746] dark:bg-[#d90f3b]"
      : "absolute -top-2 left-6 size-4 rotate-45 bg-[#ed1746] dark:bg-[#d90f3b]";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        className={className}
      >
        {children}
      </button>
      {isOpen ? (
        <span
          id={tooltipId}
          role="dialog"
          className={panelClassName}
        >
          <span
            aria-hidden="true"
            className={arrowClassName}
          />
          <span className="block text-[16px] font-bold">{title}</span>
          <span className="mt-2 block text-[14px] leading-5">{message}</span>
          <span className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-9 rounded-full px-3 text-[13px] font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Not now
            </button>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-[13px] font-bold text-[#111] transition hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Log in
            </Link>
          </span>
        </span>
      ) : null}
    </span>
  );
}
