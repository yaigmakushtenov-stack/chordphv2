"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import * as EventActions from "@/actions/event-actions";
import * as GroupActions from "@/actions/group-actions";
import { showToast } from "@/components/shared/toast";

type NameDetailsDrawerProps = {
  entity: "band" | "event";
  id: string;
  name: string;
};

export function NameDetailsDrawer(props: NameDetailsDrawerProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(props.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const label = props.entity === "band" ? "band" : "event";

  const closeDrawer = useCallback((): void => {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setName(props.name);
    setIsConfirmingDelete(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [isPending, props.name]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nameInputRef.current?.focus();

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
    setName(props.name);
    setIsConfirmingDelete(false);
    setIsOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    startTransition(async () => {
      const result =
        props.entity === "band"
          ? await GroupActions.saveDetails({ groupId: props.id, name })
          : await EventActions.saveDetails({ eventId: props.id, title: name });

      if (!result.ok) {
        showToast({
          title: `${capitalize(label)} name not saved`,
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setIsOpen(false);
      showToast({ title: `${capitalize(label)} name saved`, tone: "success" });
      router.refresh();
    });
  }

  function handleDelete(): void {
    startTransition(async () => {
      const result =
        props.entity === "band"
          ? await GroupActions.deleteGroup(props.id)
          : await EventActions.deleteEvent(props.id);

      if (!result.ok) {
        showToast({
          title: `${capitalize(label)} not deleted`,
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setIsOpen(false);
      showToast({ title: `${capitalize(label)} deleted`, tone: "success" });
      router.push(props.entity === "band" ? "/bands" : "/events");
    });
  }

  const drawerTitleId = `${props.entity}-${props.id}-details-drawer-title`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Edit ${label} details`}
        title={`Edit ${label} details`}
        onClick={openDrawer}
        className="inline-flex size-9 items-center justify-center rounded-full border border-[#d9d9d9] transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
      >
        <PencilIcon />
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
          aria-label={`Close edit ${label} drawer`}
          onClick={closeDrawer}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={drawerTitleId}
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
                {label.toUpperCase()} DETAILS
              </p>
              <h2 id={drawerTitleId} className="mt-1 text-[22px] font-black">
                Edit {label}
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
              {capitalize(label)} name
              <input
                ref={nameInputRef}
                required
                maxLength={props.entity === "band" ? 100 : 120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
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
                disabled={isPending || !name.trim()}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#ed1746] px-6 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isPending ? "Saving…" : "Save details"}
              </button>
            </div>
          </form>

          <div className="border-t border-[#ececec] p-5 dark:border-[#303034] sm:p-6">
            {isConfirmingDelete ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/35"
              >
                <h3 className="text-[14px] font-black text-red-700 dark:text-red-300">
                  Delete this {label}?
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-red-700/85 dark:text-red-300/85">
                  {props.entity === "band"
                    ? "This cannot be undone. Memberships and event assignments for this band will also be deleted."
                    : "This cannot be undone. Its playlist and band assignments will also be deleted; the original setlists remain available."}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIsConfirmingDelete(false)}
                    className="inline-flex h-10 items-center rounded-full border border-red-200 px-4 text-[11px] font-bold text-red-700 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/60"
                  >
                    Keep {label}
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
                Delete {label}
              </button>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
