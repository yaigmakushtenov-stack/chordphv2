import Link from "next/link";

export function SongNavigation({ previous, next }: { previous?: { href: string; title: string }; next?: { href: string; title: string } }) {
  const style = "flex size-8 shrink-0 items-center justify-center rounded-full border border-current/20 hover:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-[#ed1746]";
  return <nav aria-label="Setlist song navigation" className="flex shrink-0 gap-1">
    {previous ? <Link href={previous.href} title={`Previous: ${previous.title}`} aria-label={`Previous song: ${previous.title}`} className={style}>&larr;</Link> : <span aria-disabled="true" aria-label="No previous song" className={`${style} opacity-30`}>&larr;</span>}
    {next ? <Link href={next.href} title={`Next: ${next.title}`} aria-label={`Next song: ${next.title}`} className={style}>&rarr;</Link> : <span aria-disabled="true" aria-label="No next song" className={`${style} opacity-30`}>&rarr;</span>}
  </nav>;
}
