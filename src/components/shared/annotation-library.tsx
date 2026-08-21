import Link from "next/link";

import type { PersonalTrackListItem } from "@/lib/music/personal-track";

type AnnotationLibraryProps = {
  items: PersonalTrackListItem[];
};

export function AnnotationLibrary({ items }: AnnotationLibraryProps) {
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
          </div>
          <div className="divide-y divide-[#e9e9e9] dark:divide-[#303034]">
            {items.map((item) => (
              <article key={item.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-[#fafafa] sm:flex-row sm:items-center dark:hover:bg-[#1f1f22]">
                <Link href={`/track/${item.id}`} className="min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed1746]">
                  <h3 className="truncate text-[15px] font-bold hover:text-[#ed1746]">{item.title}</h3>
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
                  <Link href={`/track/${item.id}/annotate`} className="inline-flex h-9 items-center justify-center rounded-full border border-[#d9d9d9] px-4 text-[11px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]">Edit</Link>
                </div>
              </article>
            ))}
          </div>
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
