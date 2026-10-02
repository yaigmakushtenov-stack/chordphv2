import Link from "next/link";

import type { BandSetListSummaryRecord } from "@/services/setlist-service";

type BandSetListLibraryProps = {
  items: BandSetListSummaryRecord[];
};

export function BandSetListLibrary({ items }: BandSetListLibraryProps) {
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/setlists/bands/${item.id}`}
              className="group flex min-w-0 flex-col gap-4 rounded-2xl border border-[#e3e3e3] bg-white p-5 text-[#171719] transition hover:border-[#ed1746] hover:bg-[#fff7f9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#343438] dark:bg-[#1c1c1f] dark:text-[#f4f4f5] dark:hover:border-[#ed1746] dark:hover:bg-[#262025]"
            >
              <span className="w-fit max-w-full break-words rounded-full bg-[#ed1746]/10 px-3 py-1.5 text-[11px] font-bold text-[#c61039] dark:bg-[#ed1746]/15 dark:text-[#ff7492]">
                {item.group.name}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[15px] font-bold">
                  {item.setList.title}
                </span>
                <span className="mt-1 block break-words text-[12px] text-[#666] dark:text-[#b4b4bc]">
                  Event · {item.event.title}
                </span>
              </span>
              <span className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ededed] pt-3 dark:border-[#343438]">
                <span className="rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">
                  {item.setList._count.tracks}{" "}
                  {item.setList._count.tracks === 1 ? "track" : "tracks"}
                </span>
                <span className="text-[12px] font-bold text-[#c61039] group-hover:underline dark:text-[#ff7492]">
                  Open setlist <span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>
          ))}
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
