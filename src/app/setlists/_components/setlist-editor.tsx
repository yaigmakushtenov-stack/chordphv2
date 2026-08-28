"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import * as SetListActions from "@/actions/setlist-actions";
import { showToast } from "@/components/shared/toast";
import type { SetListDetailData, SetListTrackData } from "@/types/setlist";

type SetListEditorProps = {
  setList: SetListDetailData;
};

export function SetListEditor({ setList }: SetListEditorProps) {
  const router = useRouter();
  const [tracks, setTracks] = useState(setList.tracks);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const tracksRef = useRef(setList.tracks);
  const dragStartTracksRef = useRef<SetListTrackData[] | null>(null);
  const draggedTrackIdRef = useRef<string | null>(null);
  const dragWindowCleanupRef = useRef<(() => void) | null>(null);
  const rowElementsRef = useRef(new Map<string, HTMLLIElement>());
  const previousRowPositionsRef = useRef(new Map<string, number>());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => dragWindowCleanupRef.current?.();
  }, []);

  useLayoutEffect(() => {
    const previousPositions = previousRowPositionsRef.current;

    if (!previousPositions.size) {
      return;
    }

    for (const [trackId, element] of rowElementsRef.current) {
      const previousTop = previousPositions.get(trackId);

      if (previousTop === undefined) {
        continue;
      }

      const distance = previousTop - element.getBoundingClientRect().top;

      if (Math.abs(distance) < 1) {
        continue;
      }

      element.animate(
        [
          { transform: `translateY(${distance}px)` },
          { transform: "translateY(0)" },
        ],
        {
          duration: 180,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    }

    previousPositions.clear();
  }, [tracks]);

  function handleRemoveTrack(setListTrackId: string): void {
    if (!isEditing) {
      return;
    }

    startTransition(async () => {
      const result = await SetListActions.removeTrack(
        setList.id,
        setListTrackId,
      );

      if (!result.ok) {
        showToast({
          title: "Setlist not updated",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      const nextTracks = tracksRef.current.filter(
        (track) => track.id !== setListTrackId,
      );
      tracksRef.current = nextTracks;
      setTracks(nextTracks);
      showToast({ title: "Track removed from setlist", tone: "success" });
      router.refresh();
    });
  }

  function handleDragStart(
    event: ReactPointerEvent<HTMLButtonElement>,
    setListTrackId: string,
  ): void {
    if (!isEditing || isPending || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartTracksRef.current = tracksRef.current;
    draggedTrackIdRef.current = setListTrackId;
    setDraggedTrackId(setListTrackId);
    watchForDragRelease();
  }

  function handleDragMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const activeTrackId = draggedTrackIdRef.current;

    if (!activeTrackId) {
      return;
    }

    event.preventDefault();
    scrollDuringDrag(event.clientY);
    const nextTracks = moveTrackToPointer(
      tracksRef.current,
      activeTrackId,
      event.clientY,
      rowElementsRef.current,
    );

    if (hasSameOrder(tracksRef.current, nextTracks)) {
      return;
    }

    previousRowPositionsRef.current = captureRowPositions(rowElementsRef.current);
    tracksRef.current = nextTracks;
    setTracks(nextTracks);
  }

  function handleDragEnd(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag();
  }

  function finishDrag(): void {
    const activeTrackId = draggedTrackIdRef.current;
    const previousTracks = dragStartTracksRef.current;

    if (!activeTrackId || !previousTracks) {
      return;
    }

    dragWindowCleanupRef.current?.();
    dragWindowCleanupRef.current = null;
    draggedTrackIdRef.current = null;
    dragStartTracksRef.current = null;
    setDraggedTrackId(null);

    if (hasSameOrder(previousTracks, tracksRef.current)) {
      return;
    }

    persistOrder(tracksRef.current, previousTracks);
  }

  function handleDragCancel(): void {
    const previousTracks = dragStartTracksRef.current;

    if (previousTracks) {
      tracksRef.current = previousTracks;
      setTracks(previousTracks);
    }

    dragWindowCleanupRef.current?.();
    dragWindowCleanupRef.current = null;
    draggedTrackIdRef.current = null;
    dragStartTracksRef.current = null;
    setDraggedTrackId(null);
  }

  function watchForDragRelease(): void {
    dragWindowCleanupRef.current?.();

    const handleWindowPointerUp = () => finishDrag();
    const handleWindowPointerCancel = () => handleDragCancel();
    const cleanup = () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };

    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);
    dragWindowCleanupRef.current = cleanup;
  }

  function handleDragKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    setListTrackId: string,
  ): void {
    if (
      !isEditing ||
      isPending ||
      (event.key !== "ArrowUp" && event.key !== "ArrowDown")
    ) {
      return;
    }

    event.preventDefault();
    const previousTracks = tracksRef.current;
    const nextTracks = moveTrackByOffset(
      previousTracks,
      setListTrackId,
      event.key === "ArrowUp" ? -1 : 1,
    );

    if (hasSameOrder(previousTracks, nextTracks)) {
      return;
    }

    previousRowPositionsRef.current = captureRowPositions(rowElementsRef.current);
    tracksRef.current = nextTracks;
    setTracks(nextTracks);
    persistOrder(nextTracks, previousTracks);
  }

  function persistOrder(
    nextTracks: SetListTrackData[],
    previousTracks: SetListTrackData[],
  ): void {
    startTransition(async () => {
      const result = await SetListActions.reorderTracks({
        setListId: setList.id,
        setListTrackIds: nextTracks.map((track) => track.id),
      });

      if (!result.ok) {
        tracksRef.current = previousTracks;
        setTracks(previousTracks);
        showToast({
          title: "Playing order not saved",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      showToast({ title: "Playing order updated", tone: "success" });
      router.refresh();
    });
  }

  function handleEditingToggle(): void {
    if (isEditing) {
      handleDragCancel();
    }

    setIsEditing((current) => !current);
  }

  return (
    <div className="grid">
      <section className="overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white dark:border-[#303034] dark:bg-[#171719]">
        <div className="flex flex-col gap-4 border-b border-[#e4e4e4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#303034]">
          <div>
            <h2 className="text-[15px] font-bold">Playing order</h2>
            <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
              {isEditing
                ? "Drag the handle to arrange tracks, or remove tracks from this setlist."
                : "Tracks play from top to bottom. Choose Edit to change the order."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isEditing ? (
              <span
                aria-live="polite"
                className="inline-flex h-8 items-center rounded-full bg-[#fff0f3] px-3 text-[10px] font-black uppercase tracking-[0.08em] text-[#c90f39] dark:bg-[#3a111d] dark:text-[#fb7185]"
              >
                {isPending
                  ? "Saving…"
                  : draggedTrackId
                    ? "Release to save"
                    : "Editing"}
              </span>
            ) : null}
            <button
              type="button"
              disabled={isPending}
              onClick={handleEditingToggle}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-50 ${
                isEditing
                  ? "bg-[#111] text-white hover:bg-[#2c2c2c] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
                  : "border border-[#d9d9d9] hover:border-[#ed1746] hover:text-[#ed1746] dark:border-[#3a3a3f]"
              }`}
            >
              {isEditing ? <DoneIcon /> : <PencilIcon />}
              {isEditing ? "Done" : "Edit"}
            </button>
          </div>
        </div>
        {tracks.length ? (
          <ol className="divide-y divide-[#e9e9e9] dark:divide-[#303034]">
            {tracks.map((item, index) => (
              <li
                key={item.id}
                ref={(element) => {
                  if (element) {
                    rowElementsRef.current.set(item.id, element);
                  } else {
                    rowElementsRef.current.delete(item.id);
                  }
                }}
                data-setlist-track-id={item.id}
                className={`flex min-w-0 items-center gap-3 px-4 py-4 transition sm:px-5 ${
                  draggedTrackId === item.id
                    ? "relative z-10 bg-[#fff0f3] opacity-75 shadow-lg dark:bg-[#3a111d]"
                    : "hover:bg-[#fafafa] dark:hover:bg-[#1f1f22]"
                }`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f1f1f1] text-[12px] font-black dark:bg-[#28282c]">
                  {index + 1}
                </span>
                {item.trackId ? (
                  <Link
                    href={`/setlists/${setList.id}/tracks/${item.id}`}
                    className="min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
                  >
                    <span className="block truncate text-[15px] font-bold hover:text-[#ed1746]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                      {item.artistName} · Key {item.key} · {item.tuning}
                    </span>
                    {item.arrangementLabel ? (
                      <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[#ed1746]">
                        {item.arrangementLabel}
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                      {item.artistName}
                    </span>
                  </span>
                )}
                <span className="hidden rounded-full bg-[#f1f1f1] px-2.5 py-1 text-[10px] font-bold sm:inline dark:bg-[#28282c]">
                  {item.isOwnerTrack
                    ? "Your track"
                    : item.isPublicTrack
                      ? "Public"
                      : "Unavailable"}
                </span>
                {isEditing ? (
                  <div className="flex shrink-0 gap-1">
                    {item.trackId ? (
                      <Link
                        href={`/setlists/${setList.id}/tracks/${item.id}/edit`}
                        aria-label={`Edit the ${item.title} arrangement`}
                        title="Edit arrangement"
                        className="inline-flex size-9 items-center justify-center rounded-full border border-[#dedede] text-[#777] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:text-[#a1a1aa]"
                      >
                        <PencilIcon />
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      disabled={isPending}
                      onPointerDown={(event) => handleDragStart(event, item.id)}
                      onPointerMove={handleDragMove}
                      onPointerUp={handleDragEnd}
                      onPointerCancel={handleDragCancel}
                      onKeyDown={(event) => handleDragKeyDown(event, item.id)}
                      aria-label={`Arrange ${item.title}. Use arrow keys or drag.`}
                      className="inline-flex size-9 touch-none cursor-grab items-center justify-center rounded-full border border-[#dedede] text-[#777] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#3a3a3f] dark:text-[#a1a1aa]"
                    >
                      <DragHandleIcon />
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemoveTrack(item.id)}
                      className="inline-flex size-9 items-center justify-center rounded-full text-[18px] text-[#777] transition hover:bg-[#fff0f3] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-40 dark:text-[#a1a1aa] dark:hover:bg-[#3a111d]"
                      aria-label={`Remove ${item.title}`}
                    >
                      ×
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-6 py-16 text-center">
            <h2 className="text-[16px] font-bold">This setlist is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
              Browse your private tracks and approved public tracks to build the playing order.
            </p>
            <Link
              href={`/setlists/${setList.id}/tracks`}
              className="mt-5 inline-flex h-10 items-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
            >
              Add tracks
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4"
    >
      <circle cx="8" cy="6" r="1.4" />
      <circle cx="16" cy="6" r="1.4" />
      <circle cx="8" cy="12" r="1.4" />
      <circle cx="16" cy="12" r="1.4" />
      <circle cx="8" cy="18" r="1.4" />
      <circle cx="16" cy="18" r="1.4" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-3.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
      <path d="m14.5 6.5 3 3" />
    </svg>
  );
}

function DoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-3.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function moveTrackToTarget(
  tracks: SetListTrackData[],
  activeTrackId: string,
  targetTrackId: string,
): SetListTrackData[] {
  const activeIndex = tracks.findIndex((track) => track.id === activeTrackId);
  const targetIndex = tracks.findIndex((track) => track.id === targetTrackId);

  if (activeIndex < 0 || targetIndex < 0 || activeIndex === targetIndex) {
    return tracks;
  }

  const nextTracks = [...tracks];
  const [activeTrack] = nextTracks.splice(activeIndex, 1);
  nextTracks.splice(targetIndex, 0, activeTrack);
  return nextTracks;
}

function moveTrackByOffset(
  tracks: SetListTrackData[],
  trackId: string,
  offset: -1 | 1,
): SetListTrackData[] {
  const currentIndex = tracks.findIndex((track) => track.id === trackId);
  const targetIndex = currentIndex + offset;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= tracks.length) {
    return tracks;
  }

  return moveTrackToTarget(tracks, trackId, tracks[targetIndex].id);
}

function moveTrackToPointer(
  tracks: SetListTrackData[],
  activeTrackId: string,
  pointerY: number,
  rowElements: Map<string, HTMLLIElement>,
): SetListTrackData[] {
  const activeTrack = tracks.find((track) => track.id === activeTrackId);

  if (!activeTrack) {
    return tracks;
  }

  const otherTracks = tracks.filter((track) => track.id !== activeTrackId);
  let insertionIndex = otherTracks.length;

  for (let index = 0; index < otherTracks.length; index += 1) {
    const element = rowElements.get(otherTracks[index].id);

    if (!element) {
      continue;
    }

    const bounds = element.getBoundingClientRect();

    if (pointerY < bounds.top + bounds.height / 2) {
      insertionIndex = index;
      break;
    }
  }

  const nextTracks = [...otherTracks];
  nextTracks.splice(insertionIndex, 0, activeTrack);
  return nextTracks;
}

function hasSameOrder(
  left: SetListTrackData[],
  right: SetListTrackData[],
): boolean {
  return (
    left.length === right.length &&
    left.every((track, index) => track.id === right[index]?.id)
  );
}

function scrollDuringDrag(clientY: number): void {
  const container = document.querySelector<HTMLElement>(
    "[data-dashboard-scroll-container]",
  );

  const containerCanScroll =
    container !== null && container.scrollHeight > container.clientHeight + 1;
  const bounds = containerCanScroll
    ? container.getBoundingClientRect()
    : { top: 0, bottom: window.innerHeight, height: window.innerHeight };
  const edgeSize = Math.min(80, bounds.height / 4);
  const scrollTarget = containerCanScroll ? container : window;

  if (clientY < bounds.top + edgeSize) {
    scrollTarget.scrollBy({ top: -16 });
  } else if (clientY > bounds.bottom - edgeSize) {
    scrollTarget.scrollBy({ top: 16 });
  }
}

function captureRowPositions(
  rowElements: Map<string, HTMLLIElement>,
): Map<string, number> {
  for (const element of rowElements.values()) {
    for (const animation of element.getAnimations()) {
      animation.cancel();
    }
  }

  return new Map(
    Array.from(rowElements, ([trackId, element]) => [
      trackId,
      element.getBoundingClientRect().top,
    ]),
  );
}
