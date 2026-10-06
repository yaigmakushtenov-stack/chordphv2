let preparation: Promise<void> | undefined;

export class OfflineSetupError extends Error {}

export async function prepareOfflineReader(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    throw new OfflineSetupError("Use the deployed app or a local production preview to save offline downloads.");
  }
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("indexedDB" in window)) {
    throw new OfflineSetupError("Offline downloads need a supported browser on HTTPS or localhost.");
  }
  if (!preparation) {
    preparation = prepare().catch((error: unknown) => {
      preparation = undefined;
      throw error;
    });
  }
  return preparation;
}

async function prepare(): Promise<void> {
  const registration = await navigator.serviceWorker.register("/offline-worker.js", { updateViaCache: "none" });
  const worker = registration.active ?? registration.installing ?? registration.waiting;
  if (!worker) throw new Error("Offline reader could not be installed. Try again.");
  if (worker.state !== "activated") {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => { cleanup(); reject(new Error("Offline setup timed out. Try again.")); }, 20_000);
      function cleanup(): void { window.clearTimeout(timeout); worker?.removeEventListener("statechange", changed); }
      function changed(): void {
        if (worker?.state === "activated") { cleanup(); resolve(); }
        else if (worker?.state === "redundant") { cleanup(); reject(new Error("Offline setup failed. Try again.")); }
      }
      worker.addEventListener("statechange", changed);
      changed();
    });
  }
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => { channel.port1.close(); reject(new Error("Offline setup timed out. Check your connection and retry.")); }, 45_000);
    channel.port1.onmessage = (event: MessageEvent<{ ok?: boolean }>) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      if (event.data?.ok) resolve();
      else reject(new Error("Couldn't download the offline reader. Check your connection and retry."));
    };
    worker.postMessage({ type: "PREPARE_OFFLINE" }, [channel.port2]);
  });
}
