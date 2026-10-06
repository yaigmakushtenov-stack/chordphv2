"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useLayoutEffect, useRef, useState } from "react";

type ReorderItem = { id: string };
type ReorderControls = {
  draggedId: string | null;
  bindRow: (id: string, element: HTMLLIElement | null) => void;
  start: (event: PointerEvent<HTMLButtonElement>, id: string) => void;
  move: (event: PointerEvent<HTMLButtonElement>) => void;
  end: (event: PointerEvent<HTMLButtonElement>) => void;
  cancel: () => void;
  keyDown: (event: KeyboardEvent<HTMLButtonElement>, id: string) => void;
};

export function useDragReorder<T extends ReorderItem>({ items, onChange, onCommit, disabled, scrollSelector }: {
  items: T[];
  onChange: (items: T[]) => void;
  onCommit?: (items: T[], previous: T[]) => void;
  disabled: boolean;
  scrollSelector: string;
}): ReorderControls {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const current = useRef(items);
  const original = useRef<T[] | null>(null);
  const activeId = useRef<string | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const elements = useRef(new Map<string, HTMLLIElement>());
  const positions = useRef(new Map<string, number>());
  const callbacks = useRef({ onChange, onCommit });
  useEffect(() => { current.current = items; callbacks.current = { onChange, onCommit }; }, [items, onChange, onCommit]);
  useEffect(() => () => cleanup.current?.(), []);

  useLayoutEffect(() => {
    for (const [id, element] of elements.current) {
      const previousTop = positions.current.get(id);
      if (previousTop === undefined) continue;
      const distance = previousTop - element.getBoundingClientRect().top;
      if (Math.abs(distance) >= 1) element.animate([{ transform: `translateY(${distance}px)` }, { transform: "translateY(0)" }], { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
    positions.current.clear();
  }, [items]);

  function update(next: T[]): void {
    for (const [id, element] of elements.current) {
      for (const animation of element.getAnimations()) animation.cancel();
      positions.current.set(id, element.getBoundingClientRect().top);
    }
    current.current = next;
    callbacks.current.onChange(next);
  }

  function clear(): void {
    cleanup.current?.();
    cleanup.current = null;
    original.current = null;
    activeId.current = null;
    setDraggedId(null);
  }

  function cancel(): void {
    if (original.current) update(original.current);
    clear();
  }

  function finish(): void {
    const previous = original.current;
    if (!previous) return;
    clear();
    if (!sameOrder(previous, current.current)) callbacks.current.onCommit?.(current.current, previous);
  }

  return {
    draggedId,
    bindRow(id, element) { if (element) elements.current.set(id, element); else elements.current.delete(id); },
    start(event, id) {
      if (disabled || event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      original.current = current.current;
      activeId.current = id;
      setDraggedId(id);
      cleanup.current?.();
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", cancel);
      cleanup.current = () => { window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", cancel); };
    },
    move(event) {
      if (!activeId.current) return;
      event.preventDefault();
      const container = event.currentTarget.closest<HTMLElement>(scrollSelector) ?? document.querySelector<HTMLElement>("[data-dashboard-scroll-container]");
      const scrollable = container && container.scrollHeight > container.clientHeight + 1;
      const bounds = scrollable ? container.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, height: window.innerHeight };
      const edge = Math.min(80, bounds.height / 4);
      const scrollTarget = scrollable ? container : window;
      if (event.clientY < bounds.top + edge) scrollTarget.scrollBy({ top: -16 });
      else if (event.clientY > bounds.bottom - edge) scrollTarget.scrollBy({ top: 16 });
      const item = current.current.find((row) => row.id === activeId.current);
      if (!item) return;
      const next = current.current.filter((row) => row.id !== activeId.current);
      let index = next.findIndex((row) => {
        const box = elements.current.get(row.id)?.getBoundingClientRect();
        return box && event.clientY < box.top + box.height / 2;
      });
      if (index === -1) index = next.length;
      next.splice(index, 0, item);
      if (!sameOrder(current.current, next)) update(next);
    },
    end(event) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      finish();
    },
    cancel,
    keyDown(event, id) {
      if (disabled || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      event.preventDefault();
      const previous = current.current;
      const index = previous.findIndex((row) => row.id === id);
      const target = index + (event.key === "ArrowUp" ? -1 : 1);
      if (index < 0 || target < 0 || target >= previous.length) return;
      const next = [...previous];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      update(next);
      callbacks.current.onCommit?.(next, previous);
    },
  };
}

function sameOrder(left: ReorderItem[], right: ReorderItem[]): boolean {
  return left.length === right.length && left.every((item, index) => item.id === right[index]?.id);
}

export function DragHandleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4"><circle cx="8" cy="6" r="1.4" /><circle cx="16" cy="6" r="1.4" /><circle cx="8" cy="12" r="1.4" /><circle cx="16" cy="12" r="1.4" /><circle cx="8" cy="18" r="1.4" /><circle cx="16" cy="18" r="1.4" /></svg>;
}
