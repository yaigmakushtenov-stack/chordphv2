import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as ReactJsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const root = process.cwd();

async function loadModule(file, modules) {
  const source = await readFile(path.join(root, file), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Date, Map,
    require(name) {
      if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
      return modules[name];
    },
  }, { filename: file });
  return exports;
}

function matches(record, where) {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return expected.some((branch) => matches(record, branch));
    if (expected && typeof expected === "object") {
      if ("some" in expected) return record[key].some((item) => matches(item, expected.some));
      return matches(record[key], expected);
    }
    return record[key] === expected;
  });
}

const track = (ownerId, title, visibilityStatus = "PRIVATE") => ({
  ownerId, title, artistName: "Artist", visibilityStatus, publicityStatus: "APPROVED", key: "A", tuning: "Standard",
  capo: 2, tempo: 120, timeSignature: "4/4", annotation: { lyricsAndChords: `[A]${title}`, notes: `${ownerId} private notes` },
});
const arrangement = {
  version: 1, label: "Sunday", key: "D", tuning: "Standard", capo: null, tempo: null,
  timeSignature: "6/8", lyricsAndChords: "[D]Custom bridge", notes: "Arranger notes",
};
const setList = {
  id: "list-a", ownerId: "owner-a", title: "Sunday", description: "Service", updatedAt: new Date(),
  eventGroupSetLists: [{ id: "assignment-a", group: { memberships: [
    { userId: "member-c", status: "ACCEPTED" }, { userId: "invited-d", status: "INVITED" },
  ] } }],
  tracks: [{ id: "first" }, { id: "second" }, { id: "third" }],
};
const entries = [
  { id: "first", setListId: setList.id, setList, settings: { transposeSemitones: 3, arrangement }, track: track("owner-a", "Own private") },
  { id: "second", setListId: setList.id, setList, settings: {}, track: track("owner-b", "Public", "PUBLIC") },
  { id: "third", setListId: setList.id, setList, settings: { arrangement: { ...arrangement, notes: "Other private arrangement" } }, track: track("owner-b", "Unshared secret") },
];
let reads = 0;
const service = await loadModule("src/services/offline-service.ts", {
  "server-only": {},
  "@/generated/prisma/client": {
    GroupMembershipStatus: { ACCEPTED: "ACCEPTED" }, PublicityStatus: { APPROVED: "APPROVED" }, VisibilityStatus: { PUBLIC: "PUBLIC" },
  },
  "@/lib/prisma": { default: {
    setList: { async findFirst({ where }) { reads++; return matches(setList, where) ? setList : null; } },
    setListTrack: { async findMany({ where }) { reads++; return entries.filter((item) => matches(item, where)); } },
  } },
  "@/lib/setlists/setlist-track-settings": {
    parseSetListTrackArrangement: (settings) => settings.arrangement ?? null,
    parseSetListTrackTranspose: (settings) => settings.transposeSemitones ?? 0,
  },
});
const personal = await service.getOfflineSetList("owner-a", { kind: "personal", id: "list-a" });
assert.equal(reads, 2);
assert.equal(personal.songs.map((song) => song.id).join(","), "first,second,third");
assert.equal(personal.songs[0].chart.lyricsAndChords, arrangement.lyricsAndChords);
assert.equal(personal.songs[0].chart.key, "D");
assert.equal(personal.songs[0].chart.transpose, 3);
assert.equal(personal.songs[0].chart.capo, null);
assert.equal(personal.songs[0].chart.tempo, null);
assert.equal(personal.songs[1].chart.notes, "");
assert.equal(personal.songs[2].chart, null);
assert.ok(!JSON.stringify(personal).includes("Unshared secret"));
assert.ok(!JSON.stringify(personal).includes("owner-b private notes"));
assert.equal(await service.getOfflineSetList("owner-b", { kind: "personal", id: "list-a" }), null);
assert.equal(await service.getOfflineSetList("invited-d", { kind: "band", id: "assignment-a" }), null);
assert.equal(await service.getOfflineSetList("owner-b", { kind: "band", id: "assignment-a" }), null);
const band = await service.getOfflineSetList("member-c", { kind: "band", id: "assignment-a" });
assert.equal(band.songs[0].chart.notes, "");
assert.equal(band.songs[0].chart.href, "/setlists/bands/assignment-a/tracks/first");
assert.equal(band.songs[2].chart, null);

const stage = await loadModule("src/lib/client/offline-stage.ts", {});
const playlist = stage.createOfflineStagePlaylist(personal);
assert.equal(playlist.band, null);
assert.equal(playlist.currentUser.canLead, false);
assert.equal(playlist.tracks.map((item) => item.setListTrackId).join(","), "first,second,third");
assert.equal(playlist.tracks[0].key, "D");
assert.equal(playlist.tracks[0].transposeSemitones, 3);
assert.equal(playlist.tracks[0].lyricsAndChords, arrangement.lyricsAndChords);
assert.equal(playlist.tracks[2].isAvailable, false);
assert.equal(playlist.tracks[2].lyricsAndChords, "");

const normalization = await loadModule("src/data/chords/normalize.ts", {});
const chordPro = await loadModule("src/lib/chords/chord-pro.ts", { "@/data/chords": normalization });
const songSections = await loadModule("src/lib/chords/song-sections.ts", { "@/lib/chords/chord-pro": chordPro });
const chartRenderer = await loadModule("src/components/shared/chords/song-chart.tsx", {
  react: React, "react/jsx-runtime": ReactJsx,
  "@/lib/chords/chord-pro": chordPro, "@/lib/chords/song-sections": songSections,
});
const lyricSource = "[Intro]\n[C] [G/B]\n\n[Verse]\n[C]Hello [Am7]world\n\nD       G\nKeep every lyric\n[Bridge]\n[F#m] [Bm]\nFinal words (C#m)\nA/E B/D# Hallelujah\nA mighty fortress\n(C#m)\nN.C.";
let renderedChords = [];
const lyricSections = chartRenderer.parseSongChartSource(lyricSource);
const chartMarkup = (lyricsOnly) => renderToStaticMarkup(React.createElement(chartRenderer.SongChart, {
  sections: lyricSections, lyricsOnly,
  renderChord: (value) => { renderedChords.push(value); return React.createElement("button", {}, value); },
}));
const instrumentalHtml = chartMarkup(false);
assert.ok(renderedChords.includes("Am7"));
assert.ok(renderedChords.includes("G/B"));
renderedChords = [];
const vocalHtml = chartMarkup(true);
assert.equal(renderedChords.length, 0);
assert.ok(vocalHtml.includes("Hello"));
assert.ok(vocalHtml.includes("world"));
assert.ok(vocalHtml.includes("Keep"));
assert.ok(vocalHtml.includes("every"));
assert.ok(vocalHtml.includes("lyric"));
assert.ok(vocalHtml.includes("Final"));
assert.ok(!vocalHtml.includes("Am7"));
assert.ok(!vocalHtml.includes("G/B"));
assert.ok(!vocalHtml.includes("C#m"));
assert.ok(!vocalHtml.includes("N.C."));
assert.ok(!vocalHtml.includes("A/E"));
assert.ok(!vocalHtml.includes("B/D#"));
assert.ok(vocalHtml.includes("Hallelujah"));
assert.ok(vocalHtml.includes(">A</span>"));
assert.ok(!vocalHtml.includes("pt-[1.5em]"));
assert.equal(chartMarkup(false), instrumentalHtml);

let syncInput;
const stageView = await loadModule("src/app/events/_components/stage-view.tsx", {
  react: React,
  "react/jsx-runtime": ReactJsx,
  "next/link": { default: ({ href, children }) => React.createElement("a", { href }, children) },
  "@/components/shared/chart-playback-toolbar": { ChartPlaybackToolbar: () => React.createElement("div", { "aria-label": "Chart playback toolbar" }), ChartTransposeControls: () => null, ChartViewSelect: () => null },
  "@/components/shared/theme-toggle": { MoonIcon: () => null, SunIcon: () => null },
  "@/components/shared/chords/chord-card": { ChordCard: () => null },
  "@/components/shared/chords/piano-chord-card": { PianoChordCard: () => null },
  "@/components/shared/chords/song-chart": { SongChart: ({ sections }) => React.createElement("div", {}, sections.flatMap((section) => section.lines.map((line) => line.text)).join("\n")) },
  "@/components/shared/auto-scroll-speed-controls": { AUTO_SCROLL_PIXELS_PER_SECOND: 10, AUTO_SCROLL_SPEED_STEP: 1, MAX_AUTO_SCROLL_SPEED: 10, AutoScrollSpeedControls: () => null },
  "@/data/chords": { GUITAR_CHORDS: [], PIANO_CHORDS: [], UKELELE_CHORDS: [], normalizeChordSymbol: (symbol) => symbol },
  "@/lib/chords/chord-pro": { transposeChord: (key) => key, transposeChordPro: (source) => source, splitVariationSuffix: (symbol) => ({ symbol, variationNumber: null }) },
  "@/lib/client/stage-sync": { useStageSync: (input) => { syncInput = input; return { isSyncAvailable: false, status: "unavailable", publishViewport: () => {}, publishSpeed: () => {} }; } },
  "@/lib/client/stage-runtime-store": { publishStageRuntimeState: () => {} },
});
const stageHtml = renderToStaticMarkup(React.createElement(stageView.StageView, {
  playlist: { ...playlist, band: { id: "live-band", name: "Band" }, currentUser: { id: "owner-a", canLead: true, role: "OWNER" } },
  offline: true, onExit: () => {},
}));
assert.equal(syncInput.bandId, null);
assert.equal(syncInput.canPublish, false);
assert.equal(syncInput.syncMode, "unsynced");
assert.ok(stageHtml.includes("Custom bridge"));
assert.ok(stageHtml.includes("Public"));
assert.ok(stageHtml.includes('aria-label="Close stage"'));
assert.ok(!stageHtml.includes('aria-label="Link stage"'));
assert.ok(!stageHtml.includes(">Sync</button>"));

const soloHtml = renderToStaticMarkup(React.createElement(stageView.StageView, {
  playlist: { ...playlist, band: { id: "live-band", name: "Band" }, currentUser: { id: "owner-a", canLead: true, role: "OWNER" } },
  local: true, onExit: () => {},
}));
assert.equal(syncInput.bandId, null);
assert.equal(syncInput.canPublish, false);
assert.equal(syncInput.syncMode, "unsynced");
assert.ok(!soloHtml.includes("Solo"));
assert.ok(soloHtml.includes('aria-label="Chart playback toolbar"'));
assert.ok(soloHtml.includes('aria-label="Toggle color theme"'));
assert.ok(!soloHtml.includes("Fullscreen"));
assert.ok(soloHtml.includes("Custom bridge"));
renderToStaticMarkup(React.createElement(stageView.StageView, {
  playlist: { ...playlist, band: { id: "live-band", name: "Band" }, currentUser: { id: "owner-a", canLead: true, role: "OWNER" } },
}));
assert.equal(syncInput.bandId, "live-band");
assert.equal(syncInput.canPublish, true);
assert.equal(syncInput.syncMode, "synced");

let session = null;
let actionCalls = 0;
const action = await loadModule("src/actions/offline-actions.ts", {
  "next/headers": { headers: async () => ({}) },
  "@/lib/auth": { auth: { api: { getSession: async () => session } } },
  "@/lib/actions": {
    actionFailure: (code, message) => ({ ok: false, error: { code, message } }),
    actionSuccess: (data) => ({ ok: true, data }),
  },
  "@/services/offline-service": { getOfflineSetList: async (...args) => { actionCalls++; return service.getOfflineSetList(...args); } },
});
assert.equal((await action.downloadSetList({ kind: "personal", id: "list-a" })).error.code, "UNAUTHENTICATED");
assert.equal(actionCalls, 0);
session = { user: { id: "owner-a" } };
for (const input of [null, {}, { kind: "other", id: "list-a" }, { kind: "personal", id: "../list-a" }, { kind: "personal", id: 123 }]) {
  assert.equal((await action.downloadSetList(input)).error.code, "VALIDATION_ERROR");
}
assert.equal(actionCalls, 0);
assert.equal((await action.downloadSetList({ kind: "personal", id: "list-a", userId: "owner-b" })).data.accountId, "owner-a");
session = { user: { id: "owner-b" } };
assert.equal((await action.downloadSetList({ kind: "personal", id: "list-a" })).error.code, "NOT_FOUND");

const origin = "https://offline-test.invalid";
const cacheData = new Map();
const events = new Map();
let disconnected = false;
let serverStatus = 200;
let storageBlocked = false;
const cache = {
  async put(key, response) { cacheData.set(new URL(typeof key === "string" ? key : key.url, origin).href, response.clone()); },
  async match(key) { return cacheData.get(new URL(typeof key === "string" ? key : key.url, origin).href)?.clone(); },
};
const html = await readFile(path.join(root, ".next/server/app/offline.html"), "utf8");
const worker = await readFile(path.join(root, "public/offline-worker.js"), "utf8");
vm.runInNewContext(worker, {
  self: { location: { origin }, addEventListener: (name, callback) => events.set(name, callback), skipWaiting: async () => {}, clients: { claim: async () => {} } },
  caches: { open: async () => { if (storageBlocked) throw new Error("Storage blocked"); return cache; }, keys: async () => ["chordph-reader-v9"], delete: async () => true },
  URL, Response, AbortController, setTimeout, clearTimeout,
  fetch: async (request) => {
    if (disconnected) throw new TypeError("Network disconnected");
    const url = new URL(typeof request === "string" ? request : request.url, origin);
    if (url.pathname === "/offline") return new Response(html, { headers: { "content-type": "text/html" } });
    if (url.pathname.startsWith("/_next/static/")) {
      const body = await readFile(path.join(root, ".next", url.pathname.replace("/_next/", "")));
      return new Response(body);
    }
    return new Response("Private server response", { status: serverStatus });
  },
});
let preparation;
let acknowledged;
events.get("install")({ waitUntil: (promise) => { preparation = promise; } });
await preparation;
assert.ok(cacheData.has(`${origin}/offline`));
events.get("message")({ data: { type: "PREPARE_OFFLINE" }, ports: [{ postMessage: (value) => { acknowledged = value; } }], waitUntil: (promise) => { preparation = promise; } });
await preparation;
assert.equal(acknowledged.ok, true);
assert.ok(cacheData.has(`${origin}/offline`));
assert.ok([...cacheData.keys()].some((key) => key.endsWith(".woff2")));
assert.ok([...cacheData.keys()].every((key) => key === `${origin}/offline` || key.startsWith(`${origin}/_next/static/`)));

function request(url, method = "GET", mode = "navigate") {
  let response;
  events.get("fetch")({ request: { url: `${origin}${url}`, method, mode }, respondWith: (promise) => { response = promise; } });
  return response;
}
const countBefore = cacheData.size;
await request("/track/private-track");
assert.equal(cacheData.size, countBefore);
assert.equal(request("/api/auth/get-session"), undefined);
assert.equal(request("/track/private-track", "POST"), undefined);
assert.equal(request("/music/files/audio/play"), undefined);
serverStatus = 503;
assert.equal((await request("/setlists/list-a")).status, 302);
disconnected = true;
const redirected = await request("/track/saved-track");
assert.equal(redirected.headers.get("location"), `${origin}/offline?from=%2Ftrack%2Fsaved-track`);
assert.equal((await request("/offline?download=chart%3Aexample")).status, 200);
const asset = [...cacheData.keys()].find((key) => key.endsWith(".js"));
assert.equal((await request(new URL(asset).pathname, "GET", "cors")).status, 200);
disconnected = false;
serverStatus = 200;
storageBlocked = true;
assert.equal((await request("/track/private-track")).status, 200);
assert.equal((await request(new URL(asset).pathname, "GET", "cors")).status, 200);
console.log("Offline checks passed: access rules, arrangement snapshots, local medley data, action validation, reader installation/assets, navigation fallback, and uncached auth/actions/audio.");
