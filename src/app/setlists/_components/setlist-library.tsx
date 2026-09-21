"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SetListDetailsDrawer } from "@/app/setlists/_components/setlist-details-drawer";
import type { SetListSummaryData } from "@/types/setlist";

type SetListLibraryProps = {
  items: SetListSummaryData[];
};

export function SetListLibrary({ items }: SetListLibraryProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [sortMode, setSortMode] = useState<"recent" | "az" | "za">("recent");
  const menuRef = useRef<HTMLDivElement>(null);
  const sortedItems = useMemo(() => {
    const nextItems = [...items];

    if (sortMode === "az") {
      return nextItems.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (sortMode === "za") {
      return nextItems.sort((a, b) => b.title.localeCompare(a.title));
    }

    return nextItems.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [items, sortMode]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold">Your setlists</h2>
          <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
            {items.length} {items.length === 1 ? "setlist" : "setlists"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SetListDetailsDrawer mode="create" />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Manage and sort setlists"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
              className="flex size-9 items-center justify-center rounded-full border border-[#d9d9d9] text-[#555] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:text-[#d4d4d8]"
            >
              <span aria-hidden="true" className="text-[20px] leading-none">
                ⋮
              </span>
            </button>
            {isMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-[#dedede] bg-white p-1.5 shadow-[0_14px_35px_rgba(0,0,0,0.16)] dark:border-[#3a3a3f] dark:bg-[#202023]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsManaging((current) => !current);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] font-bold transition hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#2a2a2e]"
                >
                  Edit or delete
                  <span className="text-[#ed1746]">{isManaging ? "On" : "Off"}</span>
                </button>
                <div className="my-1 border-t border-[#e8e8e8] dark:border-[#343438]" />
                <p className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#777] dark:text-[#a1a1aa]">
                  Sort order
                </p>
                {([
                  ["recent", "Recently updated"],
                  ["az", "Name A–Z"],
                  ["za", "Name Z–A"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sortMode === value}
                    onClick={() => {
                      setSortMode(value);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] transition hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#2a2a2e]"
                  >
                    {label}
                    {sortMode === value ? (
                      <span className="font-black text-[#ed1746]">✓</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {items.length ? (
        <section aria-label="Your setlists">
          <div className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9] dark:divide-[#303034] dark:border-[#303034]">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-2 py-2 sm:px-3"
              >
                <Link
                  href={`/setlists/${item.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg px-1 py-2 transition hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] sm:flex-row sm:items-center sm:px-2 dark:hover:bg-[#1f1f22]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold hover:text-[#ed1746]">
                      {item.title}
                    </span>
                    <span className="mt-1 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                      {item.description || "No description"}
                    </span>
                  </span>
                  <span className="w-fit rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">
                    {item.trackCount}{" "}
                    {item.trackCount === 1 ? "track" : "tracks"}
                  </span>
                </Link>
                {isManaging ? (
                  <SetListDetailsDrawer mode="edit" setList={item} />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-[#d9d9d9] bg-white px-6 py-16 text-center dark:border-[#3a3a3f] dark:bg-[#171719]">
          <h2 className="text-[16px] font-bold">No setlists yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
            Create your first setlist, then add tracks and arrange the playing order.
          </p>
        </section>
      )}
    </div>
  );
}
