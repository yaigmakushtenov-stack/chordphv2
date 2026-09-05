import Link from "next/link";

import type { GroupRole } from "@/generated/prisma/client";

type BandLibraryItem = {
  id: string;
  name: string;
  role: GroupRole;
  updatedAt: string;
};

type BandLibraryProps = {
  items: BandLibraryItem[];
};

export function BandLibrary({ items }: BandLibraryProps) {
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold">Your bands</h2>
          <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
            {items.length} {items.length === 1 ? "band" : "bands"}
          </p>
        </div>
        <Link
          href="/bands/new"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#ed1746] px-4 text-[11px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
        >
          <span aria-hidden="true" className="text-base font-medium leading-none">
            +
          </span>
          New
        </Link>
      </div>

      {items.length ? (
        <section aria-label="Your bands">
          <div className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9] dark:divide-[#303034] dark:border-[#303034]">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/bands/${item.id}`}
                className="flex flex-col gap-3 px-2 py-4 transition hover:bg-[#f7f7f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] sm:flex-row sm:items-center sm:px-3 dark:hover:bg-[#202023]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">
                    {item.name}
                  </span>
                  <span className="mt-1 block text-[12px] text-[#666] dark:text-[#b4b4bc]">
                    Updated {formatDate(item.updatedAt)}
                  </span>
                </span>
                <span className="w-fit rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">
                  {formatRole(item.role)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-[#d9d9d9] bg-white px-6 py-16 text-center dark:border-[#3a3a3f] dark:bg-[#171719]">
          <h2 className="text-[16px] font-bold">No bands yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
            Create a band to start organizing players for events and synced stage
            sessions.
          </p>
        </section>
      )}
    </div>
  );
}

function formatRole(role: GroupRole): string {
  return role.toLowerCase().replace(/^\w/, (value) => value.toUpperCase());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
