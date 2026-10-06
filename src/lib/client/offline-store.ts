import type { OfflineDownload } from "@/types/offline";

const DATABASE = "chordph-offline-v1";
export const OFFLINE_CHANGE_EVENT = "chordph:offline-change";

type OfflineState = { accountId: string | null; downloads: OfflineDownload[] };

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("downloads", { keyPath: "id" });
      request.result.createObjectStore("account");
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other ChordPH tabs and try again."));
  });
}

function announceChange(): void {
  window.dispatchEvent(new Event(OFFLINE_CHANGE_EVENT));
  try {
    window.localStorage.setItem(OFFLINE_CHANGE_EVENT, `${Date.now()}:${Math.random()}`);
  } catch {
    console.warn("Offline storage changed; other tabs could not be notified.");
  }
}

export async function readOfflineState(): Promise<OfflineState> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(["account", "downloads"], "readonly");
      const account = transaction.objectStore("account").get("active");
      const downloads = transaction.objectStore("downloads").getAll();
      const order = transaction.objectStore("account").get("order");
      transaction.oncomplete = () => resolve({
        accountId: typeof account.result === "string" ? account.result : null,
        downloads: (downloads.result as OfflineDownload[]).sort((a, b) => {
          const ids: string[] = Array.isArray(order.result) ? order.result : [];
          const left = ids.indexOf(a.id);
          const right = ids.indexOf(b.id);
          if (left === -1 && right === -1) return b.savedAt.localeCompare(a.savedAt);
          if (left === -1) return -1;
          if (right === -1) return 1;
          return left - right;
        }),
      });
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function setOfflineAccount(accountId: string | null): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["account", "downloads"], "readwrite");
      const account = transaction.objectStore("account");
      const request = account.get("active");
      request.onsuccess = () => {
        if (request.result !== accountId) {
          transaction.objectStore("downloads").clear();
          account.delete("order");
        }
        account.put(accountId, "active");
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
  announceChange();
}

export async function saveOfflineDownload(accountId: string, download: OfflineDownload): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["account", "downloads"], "readwrite");
      const request = transaction.objectStore("account").get("active");
      request.onsuccess = () => {
        if (request.result !== accountId) {
          transaction.abort();
          return;
        }
        transaction.objectStore("downloads").put(download);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("Your account changed. Reload before saving."));
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
  announceChange();
}

export async function removeOfflineDownload(id?: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("downloads", "readwrite");
      const store = transaction.objectStore("downloads");
      if (id) store.delete(id);
      else store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
  announceChange();
}

export async function saveOfflineEdits(accountId: string, originals: OfflineDownload[], edits: OfflineDownload[], wholeLibrary: boolean): Promise<void> {
  const originalIds = new Set(originals.map((download) => download.id));
  if (new Set(edits.map((download) => download.id)).size !== edits.length || edits.some((download) => !originalIds.has(download.id) || !download.title.trim() || download.title.trim().length > 120)) {
    throw new Error("Choose valid offline downloads and names.");
  }
  for (const edit of edits) {
    const original = originals.find((download) => download.id === edit.id)!;
    const songs = new Map(original.songs.map((song) => [song.id, JSON.stringify(song)]));
    if (new Set(edit.songs.map((song) => song.id)).size !== edit.songs.length || edit.songs.some((song) => songs.get(song.id) !== JSON.stringify(song))) {
      throw new Error("Only saved songs can be rearranged or removed.");
    }
  }
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["account", "downloads"], "readwrite");
      const account = transaction.objectStore("account");
      const store = transaction.objectStore("downloads");
      let failure: Error | null = null;
      function abort(message: string): void { failure = new Error(message); transaction.abort(); }
      const active = account.get("active");
      active.onsuccess = () => {
        if (active.result !== accountId) { abort("Your account changed. Reload before editing downloads."); return; }
        const current = store.getAll();
        current.onsuccess = () => {
          const downloads = current.result as OfflineDownload[];
          const byId = new Map(downloads.map((download) => [download.id, download]));
          if ((wholeLibrary && downloads.length !== originals.length) || originals.some((download) => JSON.stringify(byId.get(download.id)) !== JSON.stringify(download))) {
            abort("Downloads changed in another tab. Reopen Edit and try again.");
            return;
          }
          const editedIds = new Set(edits.map((download) => download.id));
          for (const original of originals) if (!editedIds.has(original.id)) store.delete(original.id);
          for (const edit of edits) {
            const original = byId.get(edit.id)!;
            const changed = edit.title.trim() !== original.title || JSON.stringify(edit.songs) !== JSON.stringify(original.songs);
            store.put({ ...original, title: edit.title.trim(), songs: edit.songs, ...(changed ? { editedAt: new Date().toISOString() } : {}) });
          }
          if (wholeLibrary) account.put(edits.map((download) => download.id), "order");
        };
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(failure ?? transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { database.close(); }
  announceChange();
}
