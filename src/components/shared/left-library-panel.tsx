"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { PersonalTrackListItem } from "@/lib/music/personal-track";

type LeftLibraryPanelProps = {
  isAuthenticated: boolean;
  initialItems: PersonalTrackListItem[];
};

function LibraryIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 5v14M10 5v14M15 7l4 12" />
    </svg>
  );
}

export function LeftLibraryPanel({
  isAuthenticated,
  initialItems,
}: LeftLibraryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function closeSheet() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <aside className="hidden min-h-0 rounded-xl bg-white p-4 dark:bg-[#121214] lg:block">
        <LibraryHeading />
        <LibraryContent
          initialItems={initialItems}
          isAuthenticated={isAuthenticated}
        />
      </aside>

      <div className="lg:hidden">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-library-sheet"
          onClick={() => setIsOpen(true)}
          className="flex h-12 w-full items-center gap-3 rounded-xl border border-[#e4e4e4] bg-white px-4 text-left transition hover:border-[#cfcfcf] hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#252529] dark:bg-[#121214] dark:hover:border-[#3a3a3f] dark:hover:bg-[#18181b]"
        >
          <LibraryIcon />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold">Your Library</span>
            <span className="block text-[11px] text-[#666] dark:text-[#a1a1aa]">
              {initialItems.length} {initialItems.length === 1 ? "annotation" : "annotations"}
            </span>
          </span>
          <span aria-hidden="true" className="text-lg text-[#777] dark:text-[#a1a1aa]">
            ›
          </span>
        </button>

        <div
          className={`fixed inset-0 z-50 transition ${
            isOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-hidden={!isOpen}
        >
          <button
            type="button"
            tabIndex={isOpen ? 0 : -1}
            aria-label="Close library"
            onClick={closeSheet}
            className={`absolute inset-0 bg-black/65 transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <aside
            id="mobile-library-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-library-title"
            inert={!isOpen}
            className={`absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col border-r border-[#e4e4e4] bg-white shadow-2xl transition-transform duration-200 ease-out dark:border-[#303034] dark:bg-[#121214] ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#e8e8e8] px-4 py-4 dark:border-[#29292d]">
              <div id="mobile-library-title">
                <LibraryHeading />
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeSheet}
                aria-label="Close library"
                className="flex size-10 items-center justify-center rounded-full bg-[#f1f1f1] text-xl font-medium transition hover:bg-[#e5e5e5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#242428] dark:hover:bg-[#303034]"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <LibraryContent
                initialItems={initialItems}
                isAuthenticated={isAuthenticated}
                onNavigate={closeSheet}
              />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function LibraryHeading() {
  return (
    <div className="flex items-center gap-2 text-[15px] font-bold">
      <LibraryIcon />
      Your Library
    </div>
  );
}

function LibraryContent({
  initialItems,
  isAuthenticated,
  onNavigate,
}: LeftLibraryPanelProps & { onNavigate?: () => void }) {
  const items = initialItems.slice(0, 6);

  return (
    <div className="mt-6 grid gap-3">
      <section className="rounded-xl bg-[#f4f4f4] p-4 dark:bg-[#1f1f1f]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-bold">Your annotations</h2>
            <p className="mt-1 text-[12px] text-[#666] dark:text-[#b4b4bc]">
              {initialItems.length} {initialItems.length === 1 ? "track" : "tracks"}
            </p>
          </div>
          {isAuthenticated ? (
            <Link
              href="/track/new/annotate"
              aria-label="Create annotation"
              onClick={onNavigate}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ed1746] text-[20px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
            >
              +
            </Link>
          ) : null}
        </div>

        {items.length ? (
          <div className="mt-4 grid gap-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex min-w-0 items-center gap-2 rounded-lg px-2 py-2.5 transition hover:bg-white dark:hover:bg-[#28282c]"
              >
                <Link
                  href={`/track/${item.id}`}
                  onClick={onNavigate}
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate text-[13px] font-bold group-hover:text-[#ed1746]">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[#666] dark:text-[#b4b4bc]">
                    {item.artistName} · Key {item.key}
                  </span>
                </Link>
                <Link
                  href={`/track/${item.id}/annotate`}
                  onClick={onNavigate}
                  className="shrink-0 rounded-full border border-[#d9d9d9] px-2 py-1 text-[10px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[13px] leading-5 text-[#5f5f5f] dark:text-[#b4b4bc]">
            Your saved lyrics and chord annotations will appear here, even without an MP3.
          </p>
        )}

        {isAuthenticated ? (
          <Link
            href={items.length ? "/annotation" : "/track/new/annotate"}
            onClick={onNavigate}
            className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-full border border-[#dedede] px-4 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
          >
            {items.length ? "Open full library" : "Create annotation"}
          </Link>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-full bg-[#111] px-4 text-[12px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
          >
            Log in
          </Link>
        )}
      </section>
    </div>
  );
}
