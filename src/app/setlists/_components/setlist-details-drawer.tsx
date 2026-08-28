"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import * as SetListActions from "@/actions/setlist-actions";
import { showToast } from "@/components/shared/toast";

type SetListDetailsDrawerProps =
  | { mode: "create" }
  | {
      mode: "edit";
      setList: {
        id: string;
        title: string;
        description: string | null;
      };
    };

export function SetListDetailsDrawer(props: SetListDetailsDrawerProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const initialTitle = props.mode === "edit" ? props.setList.title : "";
  const initialDescription =
    props.mode === "edit" ? (props.setList.description ?? "") : "";
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const closeDrawer = useCallback((): void => {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setTitle(initialTitle);
    setDescription(initialDescription);
    setIsConfirmingDelete(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [initialDescription, initialTitle, isPending]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        closeDrawer();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDrawer, isOpen]);

  function openDrawer(): void {
    setTitle(initialTitle);
    setDescription(initialDescription);
    setIsConfirmingDelete(false);
    setIsOpen(true);
  }

  function handleDelete(): void {
    if (props.mode !== "edit") {
      return;
    }

    startTransition(async () => {
      const result = await SetListActions.deleteSetList(props.setList.id);

      if (!result.ok) {
        showToast({
          title: "Setlist not deleted",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setIsOpen(false);
      showToast({ title: "Setlist deleted", tone: "success" });
      router.push("/setlists");
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    startTransition(async () => {
      if (props.mode === "create") {
        const result = await SetListActions.createNew({ title, description });

        if (!result.ok) {
          showToast({
            title: "Setlist not created",
            description: result.error.message,
            tone: "error",
          });
          return;
        }

        showToast({ title: "Setlist created", tone: "success" });
        router.push(`/setlists/${result.data.setListId}`);
        return;
      }

      const result = await SetListActions.saveDetails({
        setListId: props.setList.id,
        title,
        description,
      });

      if (!result.ok) {
        showToast({
          title: "Setlist details not saved",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setIsOpen(false);
      showToast({ title: "Setlist details saved", tone: "success" });
      router.refresh();
    });
  }

  const isEditMode = props.mode === "edit";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={isEditMode ? "Edit setlist details" : "Create setlist"}
        title={isEditMode ? "Edit setlist details" : undefined}
        onClick={openDrawer}
        className={
          isEditMode
            ? "inline-flex size-10 items-center justify-center rounded-full border border-[#d9d9d9] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
            : "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#ed1746] px-4 text-[11px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746]"
        }
      >
        {isEditMode ? (
          <PencilIcon />
        ) : (
          <>
            <span aria-hidden="true" className="text-base font-medium leading-none">
              +
            </span>
            New
          </>
        )}
      </button>

      <div
        className={`fixed inset-0 z-60 transition ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Close ${isEditMode ? "edit" : "create"} setlist drawer`}
          onClick={closeDrawer}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="setlist-details-drawer-title"
          inert={!isOpen}
          className={`absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-[#dedede] bg-white text-[#111] shadow-2xl transition-transform duration-200 ease-out sm:inset-y-0 sm:left-auto sm:w-[min(92vw,440px)] sm:max-h-none sm:rounded-none sm:rounded-l-3xl sm:border-l sm:border-t-0 dark:border-[#343438] dark:bg-[#171719] dark:text-[#f5f5f5] ${
            isOpen
              ? "translate-y-0 sm:translate-x-0"
              : "translate-y-full sm:translate-x-full sm:translate-y-0"
          }`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[#ececec] px-5 py-5 dark:border-[#303034] sm:px-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#ed1746]">
                {isEditMode ? "SETLIST DETAILS" : "NEW SETLIST"}
              </p>
              <h2 id="setlist-details-drawer-title" className="mt-1 text-[22px] font-black">
                {isEditMode ? "Edit setlist" : "Create a setlist"}
              </h2>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={closeDrawer}
              aria-label="Close drawer"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f1f1f1] text-xl transition hover:bg-[#e5e5e5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:bg-[#28282c] dark:hover:bg-[#343438]"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5 p-5 sm:p-6">
            <label className="grid gap-1.5 text-[12px] font-bold">
              Setlist name
              <input
                ref={titleInputRef}
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Friday night set"
                className="h-12 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
              />
            </label>
            <label className="grid gap-1.5 text-[12px] font-bold">
              Description
              <textarea
                maxLength={1000}
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional notes about the set"
                className="resize-y rounded-xl border border-[#d9d9d9] bg-white px-3 py-3 text-[14px] font-medium leading-5 outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-[#ececec] pt-5 dark:border-[#303034]">
              <button
                type="button"
                disabled={isPending}
                onClick={closeDrawer}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#d9d9d9] px-5 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:border-[#3a3a3f]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !title.trim()}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#ed1746] px-6 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isPending
                  ? isEditMode
                    ? "Saving…"
                    : "Creating…"
                  : isEditMode
                    ? "Save details"
                    : "Create setlist"}
              </button>
            </div>
          </form>
          {isEditMode ? (
            <div className="border-t border-[#ececec] p-5 dark:border-[#303034] sm:p-6">
              {isConfirmingDelete ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/35"
                >
                  <h3 className="text-[14px] font-black text-red-700 dark:text-red-300">
                    Delete this setlist?
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-red-700/85 dark:text-red-300/85">
                    This cannot be undone. The setlist and its playing order will be
                    deleted, but the original tracks will remain available.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setIsConfirmingDelete(false)}
                      className="inline-flex h-10 items-center rounded-full border border-red-200 px-4 text-[11px] font-bold text-red-700 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/60"
                    >
                      Keep setlist
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleDelete}
                      className="inline-flex h-10 items-center rounded-full bg-red-600 px-4 text-[11px] font-bold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-55"
                    >
                      {isPending ? "Deleting…" : "Delete permanently"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-[12px] font-bold text-red-600 transition hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete setlist
                </button>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
      <path d="m14.5 6.5 3 3" />
    </svg>
  );
}
