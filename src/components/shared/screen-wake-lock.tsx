"use client";

import { useEffect, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

type NativeScreenWakeLockPlugin = {
  acquire(options: { id: string }): Promise<void>;
  release(options: { id: string }): Promise<void>;
};

const NativeScreenWakeLock = registerPlugin<NativeScreenWakeLockPlugin>("ScreenWakeLock");

export function ScreenWakeLock() {
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    let disposed = false;
    let pending = false;
    let lock: WakeLockSentinel | null = null;

    function reportUnavailable(): void {
      if (!disposed && document.visibilityState === "visible") {
        setIsUnavailable(true);
      }
    }

    if (Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("ScreenWakeLock")) {
      const id = crypto.randomUUID();
      const acquisition = NativeScreenWakeLock.acquire({ id }).then(() => {
        if (!disposed) setIsUnavailable(false);
        return true;
      }, () => {
        reportUnavailable();
        return false;
      });

      return () => {
        disposed = true;
        void acquisition.then((acquired) => {
          if (acquired) return NativeScreenWakeLock.release({ id });
        })
          .catch((error: unknown) => {
            console.warn("Native screen wake lock release failed", {
              name: error instanceof Error ? error.name : "UnknownError",
            });
          });
      };
    }

    async function releaseLock(sentinel: WakeLockSentinel): Promise<void> {
      try {
        await sentinel.release();
      } catch (error: unknown) {
        console.warn("Screen wake lock release failed", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }

    async function acquireLock(): Promise<void> {
      if (disposed || pending || lock || document.visibilityState !== "visible") {
        return;
      }
      if (!window.isSecureContext || !("wakeLock" in navigator)) {
        reportUnavailable();
        return;
      }

      pending = true;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (disposed || document.visibilityState !== "visible") {
          await releaseLock(sentinel);
          return;
        }

        lock = sentinel;
        setIsUnavailable(false);
        sentinel.addEventListener("release", () => {
          if (lock === sentinel) {
            lock = null;
            reportUnavailable();
          }
        }, { once: true });
      } catch {
        reportUnavailable();
      } finally {
        pending = false;
      }
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") {
        void acquireLock();
      } else if (lock) {
        const sentinel = lock;
        lock = null;
        void releaseLock(sentinel);
      }
    }

    void acquireLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (lock) {
        const sentinel = lock;
        lock = null;
        void releaseLock(sentinel);
      }
    };
  }, []);

  return isUnavailable ? (
    <p role="status" className="fixed left-3 top-3 z-50 max-w-[calc(100vw-1.5rem)] rounded-full border border-[#dedede] bg-white px-3 py-2 text-[11px] text-[#555] shadow-sm dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-[#d4d4d8]">
      Keep-awake unavailable. Your screen may sleep.
    </p>
  ) : null;
}
