"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function ScrollExit({ href }: { href: string }) {
  const [visible, setVisible] = useState(false);
  const previous = useRef(new WeakMap<EventTarget, number>());
  useEffect(() => {
    function scroll(event: Event): void {
      const target = event.target;
      if (!target) return;
      const top = target instanceof Document ? window.scrollY : target instanceof HTMLElement ? target.scrollTop : 0;
      const last = previous.current.get(target) ?? 0;
      if (Math.abs(top - last) < 4) return;
      setVisible(top > 100 && top < last);
      previous.current.set(target, top);
    }
    document.addEventListener("scroll", scroll, true);
    return () => document.removeEventListener("scroll", scroll, true);
  }, []);
  return visible ? <Link href={href} aria-label="Exit setlist view" className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-900 shadow-lg focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"><span aria-hidden="true">&times;</span> Exit setlist</Link> : null;
}
