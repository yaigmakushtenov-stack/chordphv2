"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as SetListActions from "@/actions/setlist-actions";
import { SongChart, type SongChartSection } from "@/components/shared/chords/song-chart";
import { showToast } from "@/components/shared/toast";
import type { SectionOperation } from "@/lib/chords/song-sections";

type SectionDrag = {
  id: string;
  original: string[];
  order: string[];
  preview: HTMLElement;
  offsetX: number;
  offsetY: number;
  scrollParent: HTMLElement | null;
  cleanup: () => void;
};

type SetListSectionChartProps = {
  sections: SongChartSection[];
  rawSource: string;
  setListId: string;
  setListTrackId: string;
  fontSize: string;
  renderChord: (value: string) => ReactNode;
};

export function SetListSectionChart({ sections, rawSource, setListId, setListTrackId, fontSize, renderChord }: SetListSectionChartProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const savingRef = useRef(false);
  const sectionElements = useRef(new Map<string, HTMLElement>());
  const dragRef = useRef<SectionDrag | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [deleteSelection, setDeleteSelection] = useState<{ section: SongChartSection; source: string } | null>(null);
  const [canDrop, setCanDrop] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const currentChart = useMemo(() => ({ source: rawSource, sections }), [rawSource, sections]);
  const [optimisticChart, updateOptimisticChart] = useOptimistic(
    currentChart,
    (current, update: { expectedSource: string; operation: SectionOperation }) =>
      current.source === update.expectedSource
        ? { ...current, sections: applyOptimisticSectionChange(current.sections, update.operation) ?? current.sections }
        : current,
  );
  const visibleSections = optimisticChart.sections;
  const displayedSections = draggedId && order
    ? order.flatMap((id, index) => {
        const section = visibleSections.find((item) => item.id === id);
        return section ? [{ ...section, number: index + 1 }] : [];
      })
    : visibleSections.map((section, index) => ({ ...section, number: index + 1 }));

  function save(operation: SectionOperation): void {
    if (savingRef.current) return;
    const nextSections = applyOptimisticSectionChange(sections, operation);
    if (!nextSections) return;
    savingRef.current = true;
    startTransition(async () => {
      updateOptimisticChart({ expectedSource: rawSource, operation });
      try {
        const result = await SetListActions.changeTrackSections({ setListId, setListTrackId, expectedSource: rawSource, operation });
        if (!result.ok) {
          showToast({ title: "Arrangement not saved", description: result.error.message, tone: "error" });
          if (result.error.code === "CONFLICT") router.refresh();
          return;
        }
        showToast({ title: operation.type === "duplicate" ? "Section duplicated" : operation.type === "delete" ? "Section deleted" : "Section order saved", tone: "success" });
      } finally {
        savingRef.current = false;
        setOrder(null);
      }
    });
  }

  useEffect(() => () => dragRef.current?.cleanup(), []);

  function isValidDrop(clientX: number, clientY: number, drag: SectionDrag): boolean {
    const bounds = chartRef.current?.getBoundingClientRect();
    const viewport = drag.scrollParent?.getBoundingClientRect();
    return Boolean(bounds && clientX >= bounds.left && clientX <= bounds.right &&
      clientY >= Math.max(bounds.top, viewport?.top ?? 0, 0) &&
      clientY <= Math.min(bounds.bottom, viewport?.bottom ?? window.innerHeight, window.innerHeight));
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, id: string): void {
    if (savingRef.current || dragRef.current || event.button !== 0) return;
    const element = sectionElements.current.get(id);
    if (!element) return;
    event.preventDefault();
    const bounds = element.getBoundingClientRect();
    const preview = document.createElement("div");
    preview.className = "pointer-events-none fixed left-0 top-0 z-[100] rounded-xl bg-white font-mono leading-[1.5] opacity-95 shadow-2xl ring-2 ring-[#ed1746]/60 dark:bg-[#121214]";
    preview.setAttribute("aria-hidden", "true");
    preview.inert = true;
    preview.style.width = `${bounds.width}px`;
    preview.style.fontSize = fontSize;
    preview.style.transform = `translate3d(${bounds.left}px, ${bounds.top}px, 0)`;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    preview.appendChild(clone);
    document.body.appendChild(preview);

    let scrollParent = element.parentElement;
    while (scrollParent && (
      scrollParent.scrollHeight <= scrollParent.clientHeight ||
      !/auto|scroll/.test(window.getComputedStyle(scrollParent).overflowY)
    )) scrollParent = scrollParent.parentElement;
    const original = sections.map((section) => section.id);
    const pointerId = event.pointerId;
    const onMove = (pointer: globalThis.PointerEvent) => {
      if (pointer.pointerId === pointerId) moveDrag(pointer);
    };
    const onUp = (pointer: globalThis.PointerEvent) => {
      if (pointer.pointerId === pointerId) finishDrag(pointer);
    };
    const onCancel = (pointer: globalThis.PointerEvent) => {
      if (pointer.pointerId === pointerId) cancelDrag();
    };
    const onEscape = (keyboard: KeyboardEvent) => {
      if (keyboard.key === "Escape") { keyboard.preventDefault(); cancelDrag(); }
    };
    const onBlur = () => cancelDrag();
    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    const cleanup = () => {
      preview.remove();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("blur", onBlur);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelection;
    };
    dragRef.current = { id, original, order: original, preview, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top, scrollParent, cleanup };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onEscape);
    window.addEventListener("blur", onBlur);
    setDraggedId(id);
    setCanDrop(true);
    setOrder(original);
  }

  function moveDrag(event: globalThis.PointerEvent): void {
    const drag = dragRef.current;
    if (!drag) return;
    event.preventDefault();
    drag.preview.style.transform = `translate3d(${event.clientX - drag.offsetX}px, ${event.clientY - drag.offsetY}px, 0)`;
    const valid = isValidDrop(event.clientX, event.clientY, drag);
    setCanDrop(valid);
    drag.preview.style.opacity = valid ? "0.95" : "0.6";
    if (!valid) return;

    const placeholder = sectionElements.current.get(drag.id)?.getBoundingClientRect();
    if (!placeholder || event.clientY < placeholder.top || event.clientY > placeholder.bottom) {
      const remaining = drag.order.filter((id) => id !== drag.id);
      const destination = remaining.findIndex((id) => {
        const bounds = sectionElements.current.get(id)?.getBoundingClientRect();
        return bounds && event.clientY < bounds.top + bounds.height / 2;
      });
      const nextOrder = [...remaining];
      nextOrder.splice(destination === -1 ? remaining.length : destination, 0, drag.id);
      if (nextOrder.some((id, index) => id !== drag.order[index])) {
        drag.order = nextOrder;
        setOrder(nextOrder);
      }
    }
    if (drag.scrollParent) {
      const bounds = drag.scrollParent.getBoundingClientRect();
      if (event.clientY < bounds.top + 64) drag.scrollParent.scrollTop -= 16;
      if (event.clientY > bounds.bottom - 64) drag.scrollParent.scrollTop += 16;
    }
  }

  function finishDrag(event: globalThis.PointerEvent): void {
    const drag = dragRef.current;
    if (!drag) return;
    const valid = isValidDrop(event.clientX, event.clientY, drag);
    dragRef.current = null;
    drag.cleanup();
    setDraggedId(null);
    setCanDrop(false);
    const destination = drag.order.indexOf(drag.id);
    const previous = drag.original.indexOf(drag.id);
    if (!valid || destination === previous) {
      setOrder(null);
      return;
    }
    save({ type: "move", sectionIndex: sectionIndex(drag.id), targetIndex: sectionIndex(drag.original[destination]) });
  }

  function cancelDrag(): void {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    drag.cleanup();
    setDraggedId(null);
    setCanDrop(false);
    setOrder(null);
  }

  return (
    <>
      <p role="status" className="sr-only">{isPending ? "Saving arrangement" : "Drag a section handle or use its arrow keys to reorder sections."}</p>
      {deleteSelection && (
        <DeleteSectionDialog
          section={deleteSelection.section}
          onClose={() => setDeleteSelection(null)}
          onConfirm={() => {
            setDeleteSelection(null);
            if (deleteSelection.source !== rawSource) {
              showToast({ title: "Arrangement changed", description: "Review the updated sections before deleting.", tone: "error" });
              return;
            }
            save({ type: "delete", sectionIndex: sectionIndex(deleteSelection.section.id) });
          }}
        />
      )}
      <div ref={chartRef}>
        {displayedSections.length === 0 && <p className="py-6 text-sm text-[#666] dark:text-[#a1a1aa]">No lyrics or chords yet.</p>}
        <SongChart
          sectionPlaceholderId={canDrop ? draggedId ?? undefined : undefined}
          fontSize={fontSize}
          sections={displayedSections}
          renderChord={renderChord}
          onSectionElement={(id, element) => {
            if (element) sectionElements.current.set(id, element);
            else sectionElements.current.delete(id);
          }}
          renderSectionControls={(section) => (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isPending || Boolean(order)}
                aria-label={`Delete ${section.title} section ${section.number}`}
                title="Delete section"
                onClick={() => setDeleteSelection({ section, source: rawSource })}
                className={controlClassName}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>
              </button>
              <button
                type="button"
                disabled={isPending || Boolean(order)}
                aria-label={`Duplicate ${section.title} section ${section.number}`}
                title="Duplicate section"
                onClick={() => save({ type: "duplicate", sectionIndex: sectionIndex(section.id) })}
                className={controlClassName}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
              </button>
              <button
                type="button"
                disabled={isPending}
                aria-label={`Move ${section.title} section ${section.number}. Drag or use up and down arrow keys.`}
                aria-pressed={draggedId === section.id}
                title="Drag to reorder; use arrow keys to move"
                onPointerDown={(event) => startDrag(event, section.id)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") { cancelDrag(); return; }
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                  event.preventDefault();
                  if (dragRef.current) return;
                  const index = sections.findIndex((item) => item.id === section.id);
                  const target = sections[index + (event.key === "ArrowUp" ? -1 : 1)];
                  if (target) save({ type: "move", sectionIndex: sectionIndex(section.id), targetIndex: sectionIndex(target.id) });
                }}
                className={`${controlClassName} touch-none cursor-grab active:cursor-grabbing`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4">{[6,12,18].flatMap((y) => [9,15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}</svg>
              </button>
            </div>
          )}
        />
      </div>
    </>
  );
}

function applyOptimisticSectionChange(
  sections: SongChartSection[],
  operation: SectionOperation,
): SongChartSection[] | null {
  const index = sections.findIndex((section) => sectionIndex(section.id) === operation.sectionIndex);
  if (index === -1) return null;
  const result = [...sections];
  const section = sections[index];
  if (operation.type === "duplicate") {
    result.splice(index + 1, 0, {
      ...section,
      id: `duplicate-${section.id}`,
      showTitle: true,
      lines: section.lines.map((line) => ({ ...line, id: `duplicate-${line.id}` })),
    });
  } else if (operation.type === "delete") {
    result.splice(index, 1);
  } else {
    const destination = sections.findIndex((item) => sectionIndex(item.id) === operation.targetIndex);
    if (destination === -1) return null;
    result.splice(index, 1);
    result.splice(destination, 0, section);
  }
  return result.map((item, position) => ({
    ...item,
    number: position + 1,
    showTitle: position > 0 && item.showTitle === false ? true : item.showTitle,
  }));
}

function sectionIndex(id: string): number {
  return Number(id.slice("section-".length));
}

const controlClassName = "inline-flex size-8 items-center justify-center rounded-full border border-[#dedede] bg-white text-[#555] transition hover:border-[#ed1746] hover:bg-[#fff0f3] hover:text-[#ed1746] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#d4d4d8] dark:hover:border-[#ed1746] dark:hover:bg-[#3a111d] dark:hover:text-[#fb7185]";

function DeleteSectionDialog({ section, onClose, onConfirm }: {
  section: SongChartSection;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-section-title"
      aria-describedby="delete-section-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-[#dedede] bg-white p-5 text-[#18181b] shadow-2xl backdrop:bg-black/60 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#f4f4f5]"
    >
      <h2 id="delete-section-title" className="text-lg font-semibold">Delete section {section.number}: {section.title}?</h2>
      <p id="delete-section-description" className="mt-2 text-sm text-[#666] dark:text-[#a1a1aa]">This removes the section and its lyrics and chords from this setlist arrangement. The original track stays unchanged.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full border border-[#dedede] px-4 py-2 text-sm font-semibold hover:bg-[#f4f4f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:hover:bg-[#303034]">Cancel</button>
        <button type="button" onClick={onConfirm} className="rounded-full bg-[#ed1746] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d91440] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#fa2857]">Delete section</button>
      </div>
    </dialog>
  );
}
