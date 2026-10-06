"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DragHandleIcon, useDragReorder } from "@/components/shared/use-drag-reorder";

import * as SetListActions from "@/actions/setlist-actions";
import { showToast } from "@/components/shared/toast";
import type { SetListDetailData, SetListTrackData } from "@/types/setlist";

type SetListEditorProps = {
  setList: SetListDetailData;
  isEditing?: boolean;
};

export function SetListEditor({ setList, isEditing = false }: SetListEditorProps) {
  const router = useRouter();
  const [tracks, setTracks] = useState(setList.tracks);
  const [isPending, startTransition] = useTransition();
  const reorder = useDragReorder({ items: tracks, onChange: setTracks, onCommit: persistOrder, disabled: !isEditing || isPending, scrollSelector: "[data-setlist-edit-scroll]" });

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

      setTracks((current) => current.filter((track) => track.id !== setListTrackId));
      showToast({ title: "Track removed from setlist", tone: "success" });
      router.refresh();
    });
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

  return (
    <div className="grid">
      <section aria-label="Setlist songs" aria-busy={isPending} className="min-w-0">
        {tracks.length ? (
          <ol className="divide-y divide-[#e9e9e9] dark:divide-[#303034]">
            {tracks.map((item, index) => (
              <li
                key={item.id}
                ref={(element) => reorder.bindRow(item.id, element)}
                data-setlist-track-id={item.id}
                className={`flex min-w-0 items-center gap-3 py-4 transition ${
                  reorder.draggedId === item.id
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
                    {item.transposeSemitones !== 0 ? (
                      <span className="mt-1 block truncate text-[10px] font-bold text-[#c90f39] dark:text-[#fb7185]">
                        Transposed {item.transposeSemitones > 0 ? "+" : ""}
                        {item.transposeSemitones} · {item.baseKey} → {item.key}
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
                {isEditing ? (
                  <div className="flex shrink-0 gap-1">
                    {item.trackId ? (
                      <Link
                        href={`/setlists/${setList.id}/tracks/${item.id}/edit`}
                        aria-label={`Edit the ${item.title} arrangement`}
                        title="Edit arrangement"
                        className="inline-flex size-9 items-center justify-center rounded-full border border-[#d9d9d9] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
                      >
                        <PencilIcon />
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      disabled={isPending}
                      onPointerDown={(event) => reorder.start(event, item.id)}
                      onPointerMove={reorder.move}
                      onPointerUp={reorder.end}
                      onPointerCancel={reorder.cancel}
                      onKeyDown={(event) => reorder.keyDown(event, item.id)}
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
          </div>
        )}
      </section>
    </div>
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
