"use client";

import Link from "next/link";
import { useState } from "react";

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
      <section className="flex flex-col gap-3 rounded-2xl border border-[#e4e4e4] bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#303034] dark:bg-[#171719]">
        <div>
          <h2 className="text-[15px] font-bold">Personal annotations</h2>
          <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">Every saved track appears here. Adding an MP3 is optional.</p>
        </div>
        <Link href="/track/new/annotate" className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">Create annotation</Link>
      </section>

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
              <article key={item.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-[#fafafa] sm:flex-row sm:items-center dark:hover:bg-[#1f1f22]">
                <Link href={`/track/${item.id}`} className="min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed1746]">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-[15px] font-bold hover:text-[#ed1746]">{item.title}</h3>
                    <StatusBadge tone="owner">Your track</StatusBadge>
                    <PublicationBadge item={item} />
                  </div>
                  <p className="mt-1 truncate text-[13px] text-[#666] dark:text-[#b4b4bc]">{item.artistName}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="rounded-full bg-[#f1f1f1] px-2.5 py-1 dark:bg-[#28282c]">Key {item.key}</span>
                    <span className="rounded-full bg-[#f1f1f1] px-2.5 py-1 dark:bg-[#28282c]">{item.tuning}</span>
                    <span className="rounded-full bg-[#f1f1f1] px-2.5 py-1 dark:bg-[#28282c]">{item.hasAudio ? "MP3 attached" : "No MP3"}</span>
                    {item.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#fff0f3] px-2.5 py-1 text-[#c90f39] dark:bg-[#3a111d] dark:text-[#fb7185]">{tag}</span>)}
                  </div>
                </Link>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/track/${item.id}`} className="inline-flex h-9 items-center justify-center rounded-full bg-[#111] px-4 text-[11px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]">View</Link>
                  <Link href={`/track/${item.id}/annotate`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#d9d9d9] px-3.5 text-[11px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"><EditPencilIcon />Edit</Link>
                </div>
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

function PublicationBadge({ item }: { item: PersonalTrackListItem }) {
  if (isApprovedPublic(item)) {
    return <StatusBadge tone="public">Approved public</StatusBadge>;
  }

  if (item.publicityStatus === "PENDING") {
    return <StatusBadge tone="pending">Pending review</StatusBadge>;
  }

  if (item.publicityStatus === "REJECTED") {
    return <StatusBadge tone="rejected">Changes needed</StatusBadge>;
  }

  return <StatusBadge tone="private">Unpublished</StatusBadge>;
}

function StatusBadge({ children, tone }: { children: string; tone: "owner" | "public" | "pending" | "rejected" | "private" }) {
  const toneClassName = {
    owner: "bg-[#fff0f3] text-[#c90f39] dark:bg-[#3a111d] dark:text-[#fb7185]",
    public: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    rejected: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    private: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  }[tone];

  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${toneClassName}`}>{children}</span>;
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

function EditPencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
      <path d="m14.5 6.5 3 3" />
    </svg>
  );
}
