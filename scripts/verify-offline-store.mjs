import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

let stores = { account: new Map(), downloads: new Map() };
const clone = (value) => structuredClone(value);
const database = {
  close() {},
  transaction(names, mode) {
    const working = clone(stores);
    let pending = 0;
    let finished = false;
    const transaction = {
      error: null,
      abort() {
        if (finished) return;
        finished = true;
        queueMicrotask(() => transaction.onabort?.());
      },
      objectStore(name) {
        function request(operation) {
          const result = {};
          pending++;
          queueMicrotask(() => {
            if (finished) return;
            result.result = clone(operation());
            result.onsuccess?.();
            pending--;
            queueMicrotask(() => {
              if (finished || pending) return;
              finished = true;
              if (mode === "readwrite") stores = working;
              transaction.oncomplete?.();
            });
          });
          return result;
        }
        return {
          get: (key) => request(() => working[name].get(key)),
          getAll: () => request(() => [...working[name].values()]),
          put: (value, key) => request(() => { working[name].set(key ?? value.id, clone(value)); }),
          delete: (key) => request(() => { working[name].delete(key); }),
          clear: () => request(() => { working[name].clear(); }),
        };
      },
    };
    return transaction;
  },
};
const source = await readFile("src/lib/client/offline-store.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const api = {};
vm.runInNewContext(compiled.outputText, {
  exports: api, Date, Map, Set, Error, Event, console,
  indexedDB: { open() { const result = { result: database }; queueMicrotask(() => result.onsuccess?.()); return result; } },
  window: { dispatchEvent() {}, localStorage: { setItem() {} } },
});

function download(id, savedAt) {
  return {
    id, kind: "setlist", href: `/setlists/${id}`, title: id, subtitle: "", updatedAt: savedAt, savedAt,
    songs: [{ id: "first", chart: { title: "Private first", lyricsAndChords: "[A]Original" } }, { id: "second", chart: null }],
  };
}
await api.setOfflineAccount("account-a");
await api.saveOfflineDownload("account-a", download("older", "2026-10-01"));
await api.saveOfflineDownload("account-a", download("newer", "2026-10-02"));
let state = await api.readOfflineState();
assert.deepEqual(Array.from(state.downloads, (item) => item.id), ["newer", "older"]);
await api.saveOfflineEdits("account-a", state.downloads, [...state.downloads].reverse(), true);
state = await api.readOfflineState();
assert.deepEqual(Array.from(state.downloads, (item) => item.id), ["older", "newer"]);
const original = clone(state.downloads[0]);
await api.saveOfflineEdits("account-a", [original], [{ ...original, title: "Reused offline", songs: [...original.songs].reverse() }], false);
state = await api.readOfflineState();
assert.equal(state.downloads[0].title, "Reused offline");
assert.equal(state.downloads[0].songs[0].id, "second");
assert.equal(state.downloads[0].songs[1].chart.lyricsAndChords, "[A]Original");
assert.ok(state.downloads[0].editedAt);
assert.equal(state.downloads[0].savedAt, original.savedAt);
await assert.rejects(api.saveOfflineEdits("account-a", [original], [original], false));
const beforeInvalid = JSON.stringify([...stores.downloads.values()]);
await assert.rejects(api.saveOfflineEdits("account-a", state.downloads, [{ ...state.downloads[0], songs: [{ id: "injected", chart: null }] }], true));
assert.equal(JSON.stringify([...stores.downloads.values()]), beforeInvalid);
const beforeNewDownload = clone(state.downloads);
await api.saveOfflineDownload("account-a", download("arrived-in-another-tab", "2026-10-04"));
await assert.rejects(api.saveOfflineEdits("account-a", beforeNewDownload, [], true));
assert.equal((await api.readOfflineState()).downloads.length, 3);
await api.removeOfflineDownload("arrived-in-another-tab");
await api.saveOfflineEdits("account-a", state.downloads, [state.downloads[0]], true);
state = await api.readOfflineState();
assert.equal(state.downloads.length, 1);
await api.saveOfflineEdits("account-a", state.downloads, [{ ...state.downloads[0], songs: [state.downloads[0].songs[1]] }], false);
state = await api.readOfflineState();
assert.equal(state.downloads[0].songs.length, 1);
const stale = clone(state.downloads);
await api.removeOfflineDownload(stale[0].id);
await assert.rejects(api.saveOfflineEdits("account-a", stale, stale, false));
assert.equal((await api.readOfflineState()).downloads.length, 0);
await api.saveOfflineDownload("account-a", download("private", "2026-10-03"));
state = await api.readOfflineState();
await api.setOfflineAccount("account-b");
await assert.rejects(api.saveOfflineEdits("account-a", state.downloads, state.downloads, true));
assert.equal((await api.readOfflineState()).downloads.length, 0);
assert.equal(stores.account.get("order"), undefined);
console.log("Offline storage checks passed: persisted names/order, song removal, unchanged charts, conflicts, deletion and account-switch guards.");
