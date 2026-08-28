import Link from "next/link";

import { SetListDetailsDrawer } from "@/app/setlists/_components/setlist-details-drawer";
import type { SetListSummaryData } from "@/types/setlist";

type SetListLibraryProps = {
  items: SetListSummaryData[];
};

export function SetListLibrary({ items }: SetListLibraryProps) {
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold">Your setlists</h2>
          <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
            {items.length} {items.length === 1 ? "setlist" : "setlists"}
          </p>
        </div>
        <SetListDetailsDrawer mode="create" />
      </div>

      {items.length ? (
        <section aria-label="Your setlists">
          <div className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9] dark:divide-[#303034] dark:border-[#303034]">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/setlists/${item.id}`}
                className="flex flex-col gap-3 px-2 py-4 transition hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] sm:flex-row sm:items-center sm:px-3 dark:hover:bg-[#1f1f22]"
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
                  {item.trackCount} {item.trackCount === 1 ? "track" : "tracks"}
                </span>
              </Link>
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
