"use client";

import { useEffect, useRef, useState } from "react";

export function OfflineOptions({ label, onEdit, onClear }: { label: string; onEdit: () => void; onClear?: () => void }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus({ preventScroll: true });
    function outside(event: PointerEvent): void {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent): void {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  function select(action: () => void): void { setOpen(false); trigger.current?.focus(); action(); }
  const itemClass = "flex min-h-10 w-full items-center rounded-lg px-3 text-left text-[12px] font-bold transition hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#303034]";

  return <div ref={container} className="relative shrink-0">
    <button ref={trigger} type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex size-9 items-center justify-center rounded-full border border-[#d9d9d9] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
    </button>
    {open ? <div ref={panel} role="dialog" aria-label={label} tabIndex={-1} className="slide-up-panel absolute right-0 top-full z-40 mt-2 w-44 rounded-xl border border-[#d9d9d9] bg-white p-1.5 shadow-xl dark:border-[#3a3a3f] dark:bg-[#242427]">
      <button type="button" onClick={() => select(onEdit)} className={itemClass}>Edit</button>
      {onClear ? <button type="button" onClick={() => select(onClear)} className={`${itemClass} text-[#c90f39] dark:text-[#fb7185]`}>Clear downloads</button> : null}
    </div> : null}
  </div>;
}
