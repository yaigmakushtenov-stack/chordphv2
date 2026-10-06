"use client";

import { useEffect, useRef, useState } from "react";
import { SaveSetListOffline } from "@/components/shared/offline/save-setlist-offline";
import type { OfflineSetListRequest } from "@/types/offline";

export function SetListOptions({ request }: { request: OfflineSetListRequest }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function close(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function outside(event: PointerEvent): void {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent): void {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div ref={containerRef} className="relative shrink-0">
    <button ref={triggerRef} type="button" aria-label="Setlist options" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex size-9 items-center justify-center rounded-full border border-[#d9d9d9] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
    </button>
    {open ? <div ref={panelRef} role="dialog" aria-label="Setlist options" tabIndex={-1} className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-[#d9d9d9] bg-white p-1.5 shadow-xl dark:border-[#3a3a3f] dark:bg-[#242427]">
      <SaveSetListOffline request={request} onSaved={close} />
    </div> : null}
  </div>;
}
