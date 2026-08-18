"use client";

import { useEffect, useSyncExternalStore } from "react";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastMessage = ToastInput & {
  id: string;
  tone: ToastTone;
};

type Listener = () => void;

const TOAST_TIMEOUT_MS = 4200;
const EMPTY_TOASTS: ToastMessage[] = [];
const listeners = new Set<Listener>();
let toasts: ToastMessage[] = [];

export function showToast(input: ToastInput): void {
  const toast: ToastMessage = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    tone: input.tone ?? "info",
  };

  toasts = [toast, ...toasts].slice(0, 4);
  notify();
}

export function ToastProvider() {
  const currentToasts = useToasts();

  useEffect(() => {
    if (!currentToasts.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      dismissToast(currentToasts.at(-1)?.id ?? "");
    }, TOAST_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [currentToasts]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed right-3 top-3 z-50 grid w-[min(360px,calc(100vw-1.5rem))] gap-2 sm:right-5 sm:top-5"
    >
      {currentToasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#e4e4e4] bg-white p-4 text-[#111] shadow-[0_18px_50px_rgba(0,0,0,0.16)] dark:border-[#303034] dark:bg-[#18181b] dark:text-[#f5f5f5]">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 size-2.5 shrink-0 rounded-full ${getToneClassName(
            toast.tone,
          )}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[18px] leading-none text-[#666] transition hover:bg-[#f3f3f3] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#b4b4bc] dark:hover:bg-[#28282c] dark:hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function useToasts(): ToastMessage[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function dismissToast(id: string): void {
  if (!id) {
    return;
  }

  toasts = toasts.filter((toast) => toast.id !== id);
  notify();
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): ToastMessage[] {
  return toasts;
}

function getServerSnapshot(): ToastMessage[] {
  return EMPTY_TOASTS;
}

function getToneClassName(tone: ToastTone): string {
  switch (tone) {
    case "success":
      return "bg-[#16a34a]";
    case "error":
      return "bg-[#ed1746]";
    case "info":
      return "bg-[#4f8cff]";
  }
}
