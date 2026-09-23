"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { PersonalTrackListItem } from "@/types/track";

type AnnotationLibraryProps = {
  items: PersonalTrackListItem[];
};

type LibraryFilter = "all" | "public" | "unpublished" | "pending";

export function AnnotationLibrary({ items }: AnnotationLibraryProps) {
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>("all");
  const visibleItems = items.filter((item) => {
    if (activeFilter === "public") {
      return isApprovedPublic(item);
    }

    if (activeFilter === "pending") {
      return item.publicityStatus === "PENDING";
    }

    if (activeFilter === "unpublished") {
      return !isApprovedPublic(item) && item.publicityStatus !== "PENDING";
    }

    return true;
  });

  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <Link href="/track/new/annotate" className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] sm:w-auto">Create annotation</Link>
      </div>

      {items.length ? (
        <section className="overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white dark:border-[#303034] dark:bg-[#171719]">
          <div className="border-b border-[#e4e4e4] px-5 py-4 dark:border-[#303034]">
            <h2 className="text-[15px] font-bold">Your tracks</h2>
            <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">{items.length} {items.length === 1 ? "annotation" : "annotations"}</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5" aria-label="Track status filters">
              <LibraryFilterButton active={activeFilter === "all"} label="All" onClick={() => setActiveFilter("all")} />
              <LibraryFilterButton active={activeFilter === "public"} label="Approved public" onClick={() => setActiveFilter("public")} />
              <LibraryFilterButton active={activeFilter === "unpublished"} label="Unpublished" onClick={() => setActiveFilter("unpublished")} />
              <LibraryFilterButton active={activeFilter === "pending"} label="Pending review" onClick={() => setActiveFilter("pending")} />
            </div>
          </div>
          {visibleItems.length ? (
            <div className="divide-y divide-[#e9e9e9] dark:divide-[#303034]">
              {visibleItems.map((item) => (
              <article key={item.id} className="min-w-0 px-5 py-4 transition hover:bg-[#fafafa] dark:hover:bg-[#1f1f22]">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/track/${item.id}`}
                      className="min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed1746]"
                    >
                      <h3 className="truncate text-[15px] font-bold transition hover:text-[#ed1746]">
                        {item.title}
                      </h3>
                    </Link>
                    <PublicationStatusIcon item={item} />
                  </div>
                  <p className="mt-1 truncate text-[13px] text-[#666] dark:text-[#b4b4bc]">{item.artistName}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="rounded-full bg-[#f1f1f1] px-2.5 py-1 dark:bg-[#28282c]">Key {item.key}</span>
                    <span className="rounded-full bg-[#f1f1f1] px-2.5 py-1 dark:bg-[#28282c]">{item.tuning}</span>
                    <span className="rounded-full bg-[#f1f1f1] px-2.5 py-1 dark:bg-[#28282c]">{item.hasAudio ? "MP3 attached" : "No MP3"}</span>
                  </div>
                  {item.tags.length ? (
                    <div className="mt-2 flex min-w-0 gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="shrink-0 rounded-full bg-[#fff0f3] px-2.5 py-1 text-[#c90f39] dark:bg-[#3a111d] dark:text-[#fb7185]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
              </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <h3 className="text-[14px] font-bold">No tracks in this status</h3>
              <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">Choose another filter to see your tracks.</p>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-[#d9d9d9] bg-white px-6 py-16 text-center dark:border-[#3a3a3f] dark:bg-[#171719]">
          <h2 className="text-[16px] font-bold">No annotations yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">Create lyrics and chords for your first personal track. You can save it with or without an audio file.</p>
          <Link href="/track/new/annotate" className="mt-5 inline-flex h-10 items-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">Create annotation</Link>
        </section>
      )}
    </div>
  );
}

function isApprovedPublic(item: PersonalTrackListItem): boolean {
  return item.visibilityStatus === "PUBLIC" && item.publicityStatus === "APPROVED";
}

function PublicationStatusIcon({ item }: { item: PersonalTrackListItem }) {
  if (isApprovedPublic(item)) {
    return (
      <StatusIcon label="Approved public" tone="public">
        <GlobeIcon />
      </StatusIcon>
    );
  }

  if (item.publicityStatus === "PENDING") {
    return (
      <StatusIcon label="Pending review" tone="pending">
        <ClockIcon />
      </StatusIcon>
    );
  }

  if (item.publicityStatus === "REJECTED") {
    return (
      <StatusIcon label="Changes needed" tone="rejected">
        <WarningIcon />
      </StatusIcon>
    );
  }

  return (
    <StatusIcon label="Unpublished" tone="private">
      <LockIcon />
    </StatusIcon>
  );
}

function StatusIcon({
  children,
  label,
  tone,
}: {
  children: ReactNode;
  label: string;
  tone: "public" | "pending" | "rejected" | "private";
}) {
  const toneClassName = {
    public: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    rejected: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    private: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  }[tone];

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${toneClassName}`}
    >
      {children}
    </span>
  );
}

function LibraryFilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={active
        ? "h-8 shrink-0 rounded-full bg-[#111] px-4 text-[11px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111]"
        : "h-8 shrink-0 rounded-full bg-[#ededed] px-4 text-[11px] font-bold text-[#444] transition hover:bg-[#dedede] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#29292d] dark:text-[#e4e4e7] dark:hover:bg-[#35353a]"}
    >
      {label}
    </button>
  );
}

function GlobeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.5L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
