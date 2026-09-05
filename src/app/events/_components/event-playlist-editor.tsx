"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import * as EventActions from "@/actions/event-actions";
import { showToast } from "@/components/shared/toast";
import type {
  EventBandOptionData,
  EventDetailData,
  EventPlaylistData,
  EventPlaylistOptionData,
} from "@/types/event";

type EventPlaylistEditorProps = {
  canManage: boolean;
  event: EventDetailData;
  playlistOptions: EventPlaylistOptionData[];
  bandOptions: EventBandOptionData[];
};

export function EventPlaylistEditor({
  canManage,
  event,
  playlistOptions,
  bandOptions,
}: EventPlaylistEditorProps) {
  const router = useRouter();
  const [playlists, setPlaylists] = useState(event.playlists);
  const [selectedSetListId, setSelectedSetListId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [draggedPlaylistId, setDraggedPlaylistId] = useState<string | null>(null);
  const playlistsRef = useRef(event.playlists);
  const dragStartPlaylistsRef = useRef<EventPlaylistData[] | null>(null);
  const draggedPlaylistIdRef = useRef<string | null>(null);
  const dragWindowCleanupRef = useRef<(() => void) | null>(null);
  const rowElementsRef = useRef(new Map<string, HTMLLIElement>());
  const previousRowPositionsRef = useRef(new Map<string, number>());
  const [isPending, startTransition] = useTransition();

  const availablePlaylistOptions = useMemo(() => {
    const eventSetListIds = new Set(playlists.map((item) => item.setListId));
    return playlistOptions.filter((option) => !eventSetListIds.has(option.id));
  }, [playlistOptions, playlists]);

  useEffect(() => {
    return () => dragWindowCleanupRef.current?.();
  }, []);

  useEffect(() => {
    if (draggedPlaylistIdRef.current) {
      return;
    }

    playlistsRef.current = event.playlists;
    setPlaylists(event.playlists);
  }, [event.playlists]);

  useLayoutEffect(() => {
    const previousPositions = previousRowPositionsRef.current;

    if (!previousPositions.size) {
      return;
    }

    for (const [playlistId, element] of rowElementsRef.current) {
      const previousTop = previousPositions.get(playlistId);

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
  }, [playlists]);

  function handleAddPlaylist(): void {
    if (!canManage) {
      return;
    }

    if (!selectedSetListId) {
      return;
    }

    startTransition(async () => {
      const result = await EventActions.addSetList(event.id, selectedSetListId);

      if (!result.ok) {
        showToast({
          title: "Playlist not added",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setSelectedSetListId("");
      showToast({ title: "Playlist added to event", tone: "success" });
      router.refresh();
    });
  }

  function handleRemovePlaylist(eventSetListId: string): void {
    if (!canManage || !isEditing) {
      return;
    }

    startTransition(async () => {
      const result = await EventActions.removeSetList(event.id, eventSetListId);

      if (!result.ok) {
        showToast({
          title: "Playlist not removed",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      const nextPlaylists = playlistsRef.current.filter(
        (playlist) => playlist.id !== eventSetListId,
      );
      playlistsRef.current = nextPlaylists;
      setPlaylists(nextPlaylists);
      showToast({ title: "Playlist removed from event", tone: "success" });
      router.refresh();
    });
  }

  function handleBandChange(
    eventSetListId: string,
    changeEvent: ChangeEvent<HTMLSelectElement>,
  ): void {
    if (!canManage) {
      return;
    }

    const groupId = changeEvent.target.value || null;
    const previousPlaylists = playlistsRef.current;
    const selectedBand =
      groupId === null
        ? null
        : bandOptions.find((band) => band.id === groupId) ?? null;
    const nextPlaylists = previousPlaylists.map((playlist) =>
      playlist.id === eventSetListId
        ? {
            ...playlist,
            band: selectedBand
              ? { id: selectedBand.id, name: selectedBand.name }
              : null,
          }
        : playlist,
    );

    playlistsRef.current = nextPlaylists;
    setPlaylists(nextPlaylists);

    startTransition(async () => {
      const result = await EventActions.assignSetListGroup({
        eventId: event.id,
        eventSetListId,
        groupId,
      });

      if (!result.ok) {
        playlistsRef.current = previousPlaylists;
        setPlaylists(previousPlaylists);
        showToast({
          title: "Band not updated",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      showToast({
        title: groupId ? "Band linked to playlist" : "Band removed from playlist",
        tone: "success",
      });
      router.refresh();
    });
  }

  function handleDragStart(
    pointerEvent: ReactPointerEvent<HTMLButtonElement>,
    eventSetListId: string,
  ): void {
    if (!canManage || !isEditing || isPending || pointerEvent.button !== 0) {
      return;
    }

    pointerEvent.preventDefault();
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    dragStartPlaylistsRef.current = playlistsRef.current;
    draggedPlaylistIdRef.current = eventSetListId;
    setDraggedPlaylistId(eventSetListId);
    watchForDragRelease();
  }

  function handleDragMove(
    pointerEvent: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const activePlaylistId = draggedPlaylistIdRef.current;

    if (!activePlaylistId) {
      return;
    }

    pointerEvent.preventDefault();
    scrollDuringDrag(pointerEvent.clientY);
    const nextPlaylists = movePlaylistToPointer(
      playlistsRef.current,
      activePlaylistId,
      pointerEvent.clientY,
      rowElementsRef.current,
    );

    if (hasSameOrder(playlistsRef.current, nextPlaylists)) {
      return;
    }

    previousRowPositionsRef.current = captureRowPositions(rowElementsRef.current);
    playlistsRef.current = nextPlaylists;
    setPlaylists(nextPlaylists);
  }

  function handleDragEnd(
    pointerEvent: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }

    finishDrag();
  }

  function finishDrag(): void {
    const activePlaylistId = draggedPlaylistIdRef.current;
    const previousPlaylists = dragStartPlaylistsRef.current;

    if (!activePlaylistId || !previousPlaylists) {
      return;
    }

    dragWindowCleanupRef.current?.();
    dragWindowCleanupRef.current = null;
    draggedPlaylistIdRef.current = null;
    dragStartPlaylistsRef.current = null;
    setDraggedPlaylistId(null);

    if (hasSameOrder(previousPlaylists, playlistsRef.current)) {
      return;
    }

    persistOrder(playlistsRef.current, previousPlaylists);
  }

  function handleDragCancel(): void {
    const previousPlaylists = dragStartPlaylistsRef.current;

    if (previousPlaylists) {
      playlistsRef.current = previousPlaylists;
      setPlaylists(previousPlaylists);
    }

    dragWindowCleanupRef.current?.();
    dragWindowCleanupRef.current = null;
    draggedPlaylistIdRef.current = null;
    dragStartPlaylistsRef.current = null;
    setDraggedPlaylistId(null);
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
    keyboardEvent: ReactKeyboardEvent<HTMLButtonElement>,
    eventSetListId: string,
  ): void {
    if (
      !canManage ||
      !isEditing ||
      isPending ||
      (keyboardEvent.key !== "ArrowUp" && keyboardEvent.key !== "ArrowDown")
    ) {
      return;
    }

    keyboardEvent.preventDefault();
    const previousPlaylists = playlistsRef.current;
    const nextPlaylists = movePlaylistByOffset(
      previousPlaylists,
      eventSetListId,
      keyboardEvent.key === "ArrowUp" ? -1 : 1,
    );

    if (hasSameOrder(previousPlaylists, nextPlaylists)) {
      return;
    }

    previousRowPositionsRef.current = captureRowPositions(rowElementsRef.current);
    playlistsRef.current = nextPlaylists;
    setPlaylists(nextPlaylists);
    persistOrder(nextPlaylists, previousPlaylists);
  }

  function persistOrder(
    nextPlaylists: EventPlaylistData[],
    previousPlaylists: EventPlaylistData[],
  ): void {
    startTransition(async () => {
      const result = await EventActions.reorderSetLists({
        eventId: event.id,
        eventSetListIds: nextPlaylists.map((playlist) => playlist.id),
      });

      if (!result.ok) {
        playlistsRef.current = previousPlaylists;
        setPlaylists(previousPlaylists);
        showToast({
          title: "Playlist order not saved",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      showToast({ title: "Playlist order updated", tone: "success" });
      router.refresh();
    });
  }

  function handleEditingToggle(): void {
    if (isEditing) {
      handleDragCancel();
    }

    setIsEditing((current) => (canManage ? !current : current));
  }

  return (
    <div className="grid gap-5">
      {canManage ? (
        <section className="grid gap-3 rounded-2xl border border-[#e4e4e4] bg-white p-4 dark:border-[#303034] dark:bg-[#171719] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="grid gap-1.5 text-[12px] font-bold">
            Add playlist
            <select
              value={selectedSetListId}
              onChange={(selectEvent) =>
                setSelectedSetListId(selectEvent.target.value)
              }
              disabled={isPending || availablePlaylistOptions.length === 0}
              className="h-11 min-w-0 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[13px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 disabled:cursor-not-allowed disabled:opacity-55 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
            >
              <option value="">
                {availablePlaylistOptions.length
                  ? "Choose a playlist"
                  : "No playlists available"}
              </option>
              {availablePlaylistOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title} · {option.trackCount}{" "}
                  {option.trackCount === 1 ? "track" : "tracks"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={isPending || !selectedSetListId}
            onClick={handleAddPlaylist}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-55"
          >
            + Add playlist
          </button>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white dark:border-[#303034] dark:bg-[#171719]">
        <div className="flex flex-col gap-4 border-b border-[#e4e4e4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#303034]">
          <div>
            <h2 className="text-[15px] font-bold">Event playlists</h2>
            <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
              {isEditing
                ? "Drag the handle to arrange playlists, assign bands, or remove playlists from this event."
                : canManage
                  ? "Playlists run from top to bottom. Choose Edit to change the plan."
                  : "Playlists assigned to your band are available for stage mode."}
            </p>
          </div>
          {canManage ? (
            <div className="flex shrink-0 items-center gap-2">
            {isEditing ? (
              <span
                aria-live="polite"
                className="inline-flex h-8 items-center rounded-full bg-[#fff0f3] px-3 text-[10px] font-black uppercase tracking-[0.08em] text-[#c90f39] dark:bg-[#3a111d] dark:text-[#fb7185]"
              >
                {isPending
                  ? "Saving..."
                  : draggedPlaylistId
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
          ) : null}
        </div>

        {playlists.length ? (
          <ol className="divide-y divide-[#e9e9e9] dark:divide-[#303034]">
            {playlists.map((playlist, index) => (
              <li
                key={playlist.id}
                ref={(element) => {
                  if (element) {
                    rowElementsRef.current.set(playlist.id, element);
                  } else {
                    rowElementsRef.current.delete(playlist.id);
                  }
                }}
                className={`grid min-w-0 gap-3 px-4 py-4 transition sm:grid-cols-[auto_minmax(0,1fr)_minmax(180px,260px)_auto] sm:items-center sm:px-5 ${
                  draggedPlaylistId === playlist.id
                    ? "relative z-10 bg-[#fff0f3] opacity-75 shadow-lg dark:bg-[#3a111d]"
                    : "hover:bg-[#fafafa] dark:hover:bg-[#1f1f22]"
                }`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f1f1f1] text-[12px] font-black dark:bg-[#28282c]">
                  {index + 1}
                </span>
                {canManage ? (
                  <Link
                    href={`/setlists/${playlist.setListId}`}
                    className="min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
                  >
                    <span className="block truncate text-[15px] font-bold hover:text-[#ed1746]">
                      {playlist.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                      {playlist.description || "No description"} ·{" "}
                      {playlist.trackCount}{" "}
                      {playlist.trackCount === 1 ? "track" : "tracks"}
                    </span>
                  </Link>
                ) : (
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold">
                      {playlist.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                      {playlist.description || "No description"} ·{" "}
                      {playlist.trackCount}{" "}
                      {playlist.trackCount === 1 ? "track" : "tracks"}
                    </span>
                  </span>
                )}
                {canManage ? (
                  <label className="grid gap-1 text-[11px] font-bold text-[#666] dark:text-[#b4b4bc]">
                    Band
                    <select
                      value={playlist.band?.id ?? ""}
                      onChange={(selectEvent) =>
                        handleBandChange(playlist.id, selectEvent)
                      }
                      disabled={isPending}
                      className="h-9 min-w-0 rounded-full border border-[#d9d9d9] bg-white px-3 text-[12px] font-bold text-[#111] outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 disabled:cursor-not-allowed disabled:opacity-55 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-white dark:focus:border-[#ed1746]"
                    >
                      <option value="">No band</option>
                      {bandOptions.map((band) => (
                        <option key={band.id} value={band.id}>
                          {band.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <span className="w-fit rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">
                    {playlist.band?.name ?? "No band"}
                  </span>
                )}
                {isEditing ? (
                  <div className="flex shrink-0 gap-1">
                    <Link
                      href={`/events/${event.id}/playlists/${playlist.id}/stage`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#ed1746] px-3 text-[11px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
                    >
                      Stage
                    </Link>
                    <button
                      type="button"
                      disabled={isPending}
                      onPointerDown={(pointerEvent) =>
                        handleDragStart(pointerEvent, playlist.id)
                      }
                      onPointerMove={handleDragMove}
                      onPointerUp={handleDragEnd}
                      onPointerCancel={handleDragCancel}
                      onKeyDown={(keyboardEvent) =>
                        handleDragKeyDown(keyboardEvent, playlist.id)
                      }
                      aria-label={`Arrange ${playlist.title}. Use arrow keys or drag.`}
                      className="inline-flex size-9 touch-none cursor-grab items-center justify-center rounded-full border border-[#dedede] text-[#777] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#3a3a3f] dark:text-[#a1a1aa]"
                    >
                      <DragHandleIcon />
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemovePlaylist(playlist.id)}
                      className="inline-flex size-9 items-center justify-center rounded-full text-[18px] text-[#777] transition hover:bg-[#fff0f3] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-40 dark:text-[#a1a1aa] dark:hover:bg-[#3a111d]"
                      aria-label={`Remove ${playlist.title}`}
                    >
                      x
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    {canManage ? (
                      <span className="w-fit rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">
                        {playlist.band?.name ?? "No band"}
                      </span>
                    ) : null}
                    <Link
                      href={`/events/${event.id}/playlists/${playlist.id}/stage`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#ed1746] px-3 text-[11px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
                    >
                      Stage
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-6 py-16 text-center">
            <h2 className="text-[16px] font-bold">No playlists yet</h2>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
              Add a playlist to this event, then link a band when one is ready.
            </p>
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

function movePlaylistToTarget(
  playlists: EventPlaylistData[],
  activePlaylistId: string,
  targetPlaylistId: string,
): EventPlaylistData[] {
  const activeIndex = playlists.findIndex(
    (playlist) => playlist.id === activePlaylistId,
  );
  const targetIndex = playlists.findIndex(
    (playlist) => playlist.id === targetPlaylistId,
  );

  if (activeIndex < 0 || targetIndex < 0 || activeIndex === targetIndex) {
    return playlists;
  }

  const nextPlaylists = [...playlists];
  const [activePlaylist] = nextPlaylists.splice(activeIndex, 1);
  nextPlaylists.splice(targetIndex, 0, activePlaylist);
  return nextPlaylists;
}

function movePlaylistByOffset(
  playlists: EventPlaylistData[],
  playlistId: string,
  offset: -1 | 1,
): EventPlaylistData[] {
  const currentIndex = playlists.findIndex(
    (playlist) => playlist.id === playlistId,
  );
  const targetIndex = currentIndex + offset;

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= playlists.length
  ) {
    return playlists;
  }

  return movePlaylistToTarget(
    playlists,
    playlistId,
    playlists[targetIndex].id,
  );
}

function movePlaylistToPointer(
  playlists: EventPlaylistData[],
  activePlaylistId: string,
  pointerY: number,
  rowElements: Map<string, HTMLLIElement>,
): EventPlaylistData[] {
  const activePlaylist = playlists.find(
    (playlist) => playlist.id === activePlaylistId,
  );

  if (!activePlaylist) {
    return playlists;
  }

  const otherPlaylists = playlists.filter(
    (playlist) => playlist.id !== activePlaylistId,
  );
  let insertionIndex = otherPlaylists.length;

  for (let index = 0; index < otherPlaylists.length; index += 1) {
    const element = rowElements.get(otherPlaylists[index].id);

    if (!element) {
      continue;
    }

    const bounds = element.getBoundingClientRect();

    if (pointerY < bounds.top + bounds.height / 2) {
      insertionIndex = index;
      break;
    }
  }

  const nextPlaylists = [...otherPlaylists];
  nextPlaylists.splice(insertionIndex, 0, activePlaylist);
  return nextPlaylists;
}

function hasSameOrder(
  left: EventPlaylistData[],
  right: EventPlaylistData[],
): boolean {
  return (
    left.length === right.length &&
    left.every((playlist, index) => playlist.id === right[index]?.id)
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
    Array.from(rowElements, ([playlistId, element]) => [
      playlistId,
      element.getBoundingClientRect().top,
    ]),
  );
}
