import Link from "next/link";

type EventLibraryItem = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  place: string;
  locationAddress: string | null;
  setListCount: number;
};

type EventLibraryProps = {
  items: EventLibraryItem[];
};

export function EventLibrary({ items }: EventLibraryProps) {
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold">Your events</h2>
          <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
            {items.length} {items.length === 1 ? "event" : "events"}
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#ed1746] px-4 text-[11px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
        >
          <span aria-hidden="true" className="text-base font-medium leading-none">
            +
          </span>
          New
        </Link>
      </div>

      {items.length ? (
        <section aria-label="Your events">
          <div className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9] dark:divide-[#303034] dark:border-[#303034]">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/events/${item.id}`}
                className="flex flex-col gap-3 px-2 py-4 transition hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] sm:flex-row sm:items-center sm:px-3 dark:hover:bg-[#1f1f22]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold hover:text-[#ed1746]">
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                    {formatDateTime(item.startDate)} at {item.place}
                  </span>
                  {item.locationAddress ? (
                    <span className="mt-1 block truncate text-[12px] text-[#777] dark:text-[#a1a1aa]">
                      {item.locationAddress}
                    </span>
                  ) : null}
                </span>
                <span className="w-fit rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">
                  {item.setListCount}{" "}
                  {item.setListCount === 1 ? "setlist" : "setlists"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-[#d9d9d9] bg-white px-6 py-16 text-center dark:border-[#3a3a3f] dark:bg-[#171719]">
          <h2 className="text-[16px] font-bold">No events yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
            Create an event for rehearsals, services, gigs, or any setlist plan
            you want to organize.
          </p>
        </section>
      )}
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
