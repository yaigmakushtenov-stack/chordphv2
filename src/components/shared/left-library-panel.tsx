import Link from "next/link";

import type { PersonalTrackListItem } from "@/lib/music/personal-track";

type LeftLibraryPanelProps = {
  isAuthenticated: boolean;
  initialItems: PersonalTrackListItem[];
};

function LibraryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5v14M10 5v14M15 7l4 12" />
    </svg>
  );
}

export function LeftLibraryPanel({ isAuthenticated, initialItems }: LeftLibraryPanelProps) {
  const items = initialItems.slice(0, 6);

  return (
    <aside className="min-h-[220px] rounded-xl bg-white p-4 dark:bg-[#121214] lg:min-h-0">
      <div className="flex items-center gap-2 text-[15px] font-bold">
        <LibraryIcon />
        Your Library
      </div>
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
              <Link href="/track/new/annotate" aria-label="Create annotation" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ed1746] text-[20px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]">
                +
              </Link>
            ) : null}
          </div>
          {items.length ? (
            <div className="mt-4 grid gap-1">
              {items.map((item) => (
                <div key={item.id} className="group flex min-w-0 items-center gap-2 rounded-lg px-2 py-2.5 transition hover:bg-white dark:hover:bg-[#28282c]">
                  <Link href={`/track/${item.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold group-hover:text-[#ed1746]">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-[#666] dark:text-[#b4b4bc]">{item.artistName} · Key {item.key}</span>
                  </Link>
                  <Link href={`/track/${item.id}/annotate`} className="shrink-0 rounded-full border border-[#d9d9d9] px-2 py-1 text-[10px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]">Edit</Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[13px] leading-5 text-[#5f5f5f] dark:text-[#b4b4bc]">Your saved lyrics and chord annotations will appear here, even without an MP3.</p>
          )}
          {isAuthenticated ? (
            <Link href={items.length ? "/annotation" : "/track/new/annotate"} className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-full border border-[#dedede] px-4 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]">
              {items.length ? "Open full library" : "Create annotation"}
            </Link>
          ) : (
            <Link href="/login" className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-full bg-[#111] px-4 text-[12px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]">Log in</Link>
          )}
        </section>
      </div>
    </aside>
  );
}
