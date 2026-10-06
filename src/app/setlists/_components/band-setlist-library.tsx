"use client";

import Link from "next/link";
import { useId, useState } from "react";

import type { BandSetListSummaryRecord } from "@/services/setlist-service";

type BandSetListLibraryProps = {
  items: BandSetListSummaryRecord[];
};

export function BandSetListLibrary({ items }: BandSetListLibraryProps) {
  const listId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleItems = isExpanded ? items : items.slice(0, 3);
  return (
    <section className="grid gap-5" aria-labelledby="band-setlists-heading">
      <div>
        <h2 id="band-setlists-heading" className="text-[15px] font-bold">
          Band Setlists
        </h2>
        <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
          Setlists assigned to your bands through events.
        </p>
      </div>
      {items.length ? (
        <div>
        <div id={listId} className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9] dark:divide-[#303034] dark:border-[#303034]">
          {visibleItems.map((item) => (
            <Link
              key={item.id}
              href={`/setlists/bands/${item.id}`}
              className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-4 transition hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] sm:px-5 dark:hover:bg-[#1f1f22]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold hover:text-[#ed1746]">
                  {item.setList.title}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                  {item.group.name} · {item.event.title}
                </span>
              </span>
                <span className="shrink-0 rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">
                  {item.setList._count.tracks}{" "}
                  {item.setList._count.tracks === 1 ? "track" : "tracks"}
                </span>
            </Link>
          ))}
        </div>
        {items.length > 3 ? (
          <button type="button" aria-expanded={isExpanded} aria-controls={listId} aria-label={isExpanded ? "Show less band setlists" : `Show more band setlists (${items.length - 3} more)`} onClick={() => setIsExpanded((current) => !current)} className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[#d9d9d9] px-4 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]">
            {isExpanded ? "Show less" : `Show more (${items.length - 3})`}
          </button>
        ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#d9d9d9] bg-white px-6 py-12 text-center dark:border-[#3a3a3f] dark:bg-[#171719]">
          <h3 className="text-[16px] font-bold">No band setlists yet</h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
            Setlists appear here when a band you have joined is assigned to an event setlist.
          </p>
        </div>
      )}
    </section>
  );
}
