"use client";

import { useRef, useState, type ReactNode } from "react";

export function SwipeRow({ children, actions, enabled }: { children: ReactNode; actions: ReactNode; enabled: boolean }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  return <div className="min-w-0" style={{ touchAction: "pan-y" }} onTouchStart={(event) => {
    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
  }} onTouchEnd={(event) => {
    const touch = event.changedTouches[0];
    if (window.matchMedia("(pointer: coarse)").matches && enabled && start.current && Math.abs(touch.clientY - start.current.y) < 40) {
      if (touch.clientX - start.current.x < -50) setRevealed(true);
      if (touch.clientX - start.current.x > 50) setRevealed(false);
    }
    start.current = null;
  }}>
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      {enabled ? <button type="button" aria-label="Show row actions" aria-expanded={revealed} onClick={() => setRevealed(!revealed)} className="size-9 shrink-0 rounded-full text-zinc-600 focus-visible:outline-2 focus-visible:outline-[#ed1746] [@media(pointer:fine)]:hidden dark:text-zinc-300">•••</button> : null}
      {enabled ? <div className={`${revealed ? "flex" : "hidden"} shrink-0 items-center gap-1 [@media(pointer:fine)]:flex`}>{actions}</div> : null}
    </div>
  </div>;
}
