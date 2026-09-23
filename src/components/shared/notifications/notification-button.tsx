"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { NotificationItemData } from "@/components/shared/notifications/notification-item";
import { NotificationPopover } from "@/components/shared/notifications/notification-popover";

type NotificationButtonProps = {
  items?: NotificationItemData[];
};

export function NotificationButton({ items = [] }: NotificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();
  const unreadCount = items.filter((item) => !item.isRead).length;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        className="relative flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#dedede] bg-white text-[#555] transition hover:border-[#bdbdbd] hover:bg-[#f5f5f5] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#36363a] dark:bg-[#19191b] dark:text-[#d4d4d8] dark:hover:border-[#55555b] dark:hover:bg-[#242427] dark:hover:text-white"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="size-[18px]"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full border-2 border-[#f4f4f4] bg-[#ed1746] px-1 text-[9px] font-black leading-[14px] text-white dark:border-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <NotificationPopover
          id={popoverId}
          items={items}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </div>
  );
}
