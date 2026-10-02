import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const enums = {
  GroupRole: { OWNER: "OWNER", MODERATOR: "MODERATOR", MEMBER: "MEMBER" },
  GroupMembershipStatus: { ACCEPTED: "ACCEPTED", PENDING: "PENDING" },
  NotificationType: { BAND_ADDED: "BAND_ADDED", BAND_EVENT_CREATED: "BAND_EVENT_CREATED" },
  PushDeliveryStatus: { PENDING: "PENDING", SENT: "SENT", FAILED: "FAILED", CANCELLED: "CANCELLED" },
  Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } },
};

function loadSource(path, dependencies) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const testModule = { exports: {} };
  const load = (name) => {
    if (name === "server-only") return {};
    if (name === "@/generated/prisma/client") return enums;
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name.startsWith("@/")) throw new Error(`Missing test dependency: ${name}`);
    return require(name);
  };
  new Function("require", "module", "exports", outputText)(load, testModule, testModule.exports);
  return testModule.exports;
}

function eventFixture(role, status = "ACCEPTED") {
  const queued = [];
  const membershipQueries = [];
  const transaction = {
    groupMembership: {
      findUnique: async (query) => {
        membershipQueries.push(query);
        return { role, status, group: { name: "The Band" } };
      },
      findMany: async (query) => {
        assert.equal(query.where.status, "ACCEPTED");
        assert.equal(query.where.userId.not, "creator");
        return [{ userId: "member" }];
      },
    },
    event: { create: async ({ data }) => ({ id: "event-1", ...data }) },
  };
  const service = loadSource("src/services/event-service.ts", {
    "@/lib/prisma": { $transaction: async (callback) => callback(transaction) },
    "@/services/notification-service": { queueNotifications: async (client, input) => {
      assert.equal(client, transaction);
      queued.push(input);
    } },
  });
  const input = {
    ownerId: "creator", groupId: "band-1", title: "Rehearsal",
    startDate: new Date("2026-10-10T10:00:00Z"), place: "Studio",
    role: "OWNER",
  };
  return { service, input, queued, membershipQueries };
}

test("owner-created band events queue notifications for the other accepted members", async () => {
  const { service, input, queued, membershipQueries } = eventFixture("OWNER");
  await service.createEvent(input);
  assert.equal(queued.length, 1);
  assert.deepEqual(queued[0].userIds, ["member"]);
  assert.equal(queued[0].groupId, "band-1");
  assert.equal(queued[0].type, "BAND_EVENT_CREATED");
  assert.equal(queued[0].href, "/events/event-1");
  assert.equal(membershipQueries[0].where.groupId_userId.userId, "creator");
});

test("member and moderator event creators cannot trigger owner notifications through client input", async () => {
  for (const role of ["MEMBER", "MODERATOR"]) {
    const { service, input, queued } = eventFixture(role);
    await service.createEvent(input);
    assert.equal(queued.length, 0);
  }
});

test("personal events do not notify a band", async () => {
  const { service, input, queued } = eventFixture("OWNER");
  delete input.groupId;
  await service.createEvent(input);
  assert.equal(queued.length, 0);
});

test("pending memberships cannot create band events", async () => {
  const { service, input, queued } = eventFixture("OWNER", "PENDING");
  await assert.rejects(service.createEvent(input), { code: "FORBIDDEN" });
  assert.equal(queued.length, 0);
});

test("band additions preserve accepted membership and queue only the added user's notification", async () => {
  const queued = [];
  let createdMembership;
  const transaction = {
    groupMembership: {
      findUnique: async ({ where }) => where.groupId_userId.userId === "owner"
        ? { role: "OWNER", status: "ACCEPTED", group: { name: "The Band" } } : null,
      create: async ({ data }) => { createdMembership = data; },
    },
    betterAuthUser: { findUnique: async () => ({ id: "invitee" }) },
  };
  const service = loadSource("src/services/group-service.ts", {
    "@/lib/prisma": { $transaction: async (callback) => callback(transaction) },
    "@/lib/groups/permissions": {
      GroupPermission: { INVITE_MEMBERS: "INVITE_MEMBERS" },
      hasGroupPermission: (role) => role === "OWNER",
    },
    "@/services/notification-service": { queueNotifications: async (client, input) => {
      assert.equal(client, transaction);
      queued.push(input);
    } },
  });
  await service.addGroupMember({ groupId: "band-1", invitedById: "owner", email: "member@example.com" });
  assert.equal(createdMembership.status, "ACCEPTED");
  assert.deepEqual(queued[0].userIds, ["invitee"]);
  assert.equal(queued[0].type, "BAND_ADDED");
  assert.equal(queued[0].href, "/bands/band-1");
});

function delivery(id, overrides = {}) {
  return {
    id, attempts: 1,
    notification: {
      id: `notification-${id}`, userId: id, groupId: "band-1", type: "BAND_EVENT_CREATED",
      title: "New band event", body: "Rehearsal", href: "/events/event-1", createdAt: new Date(),
    },
    device: {
      id: `device-${id}`, token: `test-token-${id}`, userId: id,
      session: { userId: id, expiresAt: new Date(Date.now() + 60_000) },
      user: { notificationPreferences: null },
    },
    ...overrides,
  };
}

function dispatcherFixture(deliveries, responses) {
  const updates = [];
  const deleted = [];
  const sent = [];
  const database = {
    pushDelivery: {
      findMany: async ({ where }) => where.leaseId ? deliveries : deliveries.map(({ id }) => ({ id })),
      updateMany: async (query) => { updates.push(query); return { count: query.where.id?.in.length ?? 0 }; },
    },
    groupMembership: { findMany: async () => deliveries.map(({ notification }) => ({ groupId: notification.groupId, userId: notification.userId })) },
    pushDevice: { deleteMany: async (query) => { deleted.push(query); return { count: 1 }; } },
    $transaction: async (queries) => Promise.all(queries),
  };
  const service = loadSource("src/services/notification-service.ts", {
    "@/lib/prisma": database,
    "@/lib/notifications/firebase-admin": { getPushMessaging: () => ({ sendEach: async (messages) => {
      sent.push(...messages);
      return { responses };
    } }) },
  });
  return { service, updates, deleted, sent, database };
}

test("expired sessions, changed device owners, and opted-out categories are cancelled before sending", async () => {
  const expired = delivery("expired");
  expired.device.session.expiresAt = new Date(0);
  const reassigned = delivery("reassigned");
  reassigned.device.userId = "someone-else";
  const optedOut = delivery("opted-out");
  optedOut.device.user.notificationPreferences = { newEvents: false, bandInvites: true };
  const fixture = dispatcherFixture([expired, reassigned, optedOut], []);
  const result = await fixture.service.dispatchPendingNotifications();
  assert.equal(result.sent, 0);
  assert.equal(fixture.sent.length, 0);
  const cancelled = fixture.updates.find((query) => query.data.status === "CANCELLED");
  assert.deepEqual(cancelled.where.id.in, ["expired", "reassigned", "opted-out"]);
});

test("removed band members do not receive queued notifications", async () => {
  const fixture = dispatcherFixture([delivery("removed")], []);
  fixture.database.groupMembership.findMany = async () => [];
  await fixture.service.dispatchPendingNotifications();
  assert.equal(fixture.sent.length, 0);
});

test("successful deliveries, transient retries, and invalid tokens have separate outcomes", async () => {
  const fixture = dispatcherFixture([delivery("success"), delivery("retry"), delivery("invalid")], [
    { success: true },
    { success: false, error: { code: "messaging/server-unavailable" } },
    { success: false, error: { code: "messaging/registration-token-not-registered" } },
  ]);
  const result = await fixture.service.dispatchPendingNotifications();
  assert.equal(result.sent, 1);
  assert.equal(fixture.sent[0].data.recipientId, "success");
  assert.equal(fixture.sent[0].android.notification.tag, "notification-success");
  assert.ok(fixture.updates.some((query) => query.data.status === "SENT" && query.where.id.in.includes("success")));
  assert.ok(fixture.updates.some((query) => query.data.status === "PENDING" && query.where.id.in.includes("retry") && query.data.nextAttemptAt > new Date()));
  assert.deepEqual(fixture.deleted[0].where.OR, [{ id: "device-invalid", token: "test-token-invalid" }]);
});

test("the last transient attempt becomes a terminal failure", async () => {
  const fixture = dispatcherFixture([delivery("last", { attempts: 5 })], [
    { success: false, error: { code: "messaging/server-unavailable" } },
  ]);
  await fixture.service.dispatchPendingNotifications();
  assert.ok(fixture.updates.some((query) => query.data.status === "FAILED" && query.where.id?.in.includes("last")));
  assert.ok(!fixture.updates.some((query) => query.data.status === "PENDING" && query.where.id?.in.includes("last")));
});

test("a worker that loses the database claim cannot send a delivery", async () => {
  const fixture = dispatcherFixture([delivery("claimed")], []);
  fixture.database.pushDelivery.findMany = async ({ where }) => where.leaseId ? [] : [{ id: "claimed" }];
  await fixture.service.dispatchPendingNotifications();
  assert.equal(fixture.sent.length, 0);
  const claim = fixture.updates.find((query) => query.data.leaseId);
  assert.equal(claim.where.status, "PENDING");
  assert.equal(claim.where.OR[1].leaseUntil.lte instanceof Date, true);
});

test("the external dispatch endpoint fails closed when its secret is absent or incorrect", async () => {
  const previous = process.env.PUSH_DISPATCH_SECRET;
  let calls = 0;
  const route = loadSource("src/app/api/notifications/dispatch/route.ts", {
    "@/services/notification-service": { dispatchPendingNotifications: async () => {
      calls += 1;
      return { configured: true, processed: 0, sent: 0 };
    } },
  });
  try {
    delete process.env.PUSH_DISPATCH_SECRET;
    assert.equal((await route.GET(new Request("https://example.com"))).status, 401);
    process.env.PUSH_DISPATCH_SECRET = "test-dispatch-secret";
    const request = (value) => new Request("https://example.com", { headers: { authorization: value } });
    assert.equal((await route.GET(request("Bearer wrong-secret"))).status, 401);
    assert.equal(calls, 0);
    assert.equal((await route.GET(request("Bearer test-dispatch-secret"))).status, 200);
    assert.equal(calls, 1);
  } finally {
    if (previous === undefined) delete process.env.PUSH_DISPATCH_SECRET;
    else process.env.PUSH_DISPATCH_SECRET = previous;
  }
});

test("notification actions derive the device owner and session from authentication", async () => {
  const registrations = [];
  let session = { user: { id: "verified-user" }, session: { id: "verified-session" } };
  const actions = loadSource("src/actions/notification-actions.ts", {
    "next/headers": { headers: async () => ({}) },
    "@/lib/auth": { auth: { api: { getSession: async () => session } } },
    "@/lib/actions": {
      actionSuccess: (data) => ({ ok: true, data }),
      actionFailure: (code, message) => ({ ok: false, error: { code, message } }),
    },
    "@/services/notification-service": {
      registerAndroidDevice: async (input) => registrations.push(input),
    },
  });
  assert.equal((await actions.registerAndroidToken("valid-test-token-at-least-20-characters")).ok, true);
  assert.equal(registrations[0].userId, "verified-user");
  assert.equal(registrations[0].sessionId, "verified-session");
  assert.equal((await actions.registerAndroidToken("invalid token with spaces")).error.code, "VALIDATION_ERROR");
  session = null;
  assert.equal((await actions.registerAndroidToken("valid-test-token-at-least-20-characters")).error.code, "UNAUTHENTICATED");
  assert.equal(registrations.length, 1);
});

function androidFixture({ initialPermission = "granted", requestedPermission = "granted", optedOut = false } = {}) {
  const previous = { document: globalThis.document, window: globalThis.window, localStorage: globalThis.localStorage };
  const storage = new Map();
  if (optedOut) storage.set("chordph.android-push.enabled", "false");
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.document = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const callbacks = {};
  const calls = [];
  let permission = initialPermission;
  const actions = {
    registerAndroidToken: async () => { calls.push("save-token"); return { ok: true, data: null }; },
    unregisterDevice: async () => { calls.push("remove-token"); return { ok: true, data: null }; },
  };
  const service = loadSource("src/lib/client/android-push.ts", {
    "@capacitor/core": { Capacitor: { getPlatform: () => "android", isPluginAvailable: () => true } },
    "@capacitor/push-notifications": { PushNotifications: {
      addListener: async (name, callback) => { callbacks[name] = callback; return { remove: async () => {} }; },
      checkPermissions: async () => ({ receive: permission }),
      requestPermissions: async () => { calls.push("request-permission"); permission = requestedPermission; return { receive: permission }; },
      createChannel: async () => {},
      register: async () => { calls.push("register"); callbacks.registration({ value: "test-token" }); },
      unregister: async () => { calls.push("native-unregister"); },
      removeAllDeliveredNotifications: async () => { calls.push("clear-tray"); },
    } },
    "@/actions/notification-actions": actions,
  });
  const navigate = [];
  const unbind = service.bindAndroidPush("user-1", "session-1", (href) => navigate.push(href));
  return {
    service, actions, calls, callbacks, navigate,
    bind: (userId, sessionId) => service.bindAndroidPush(userId, sessionId, (href) => navigate.push(href)),
    setPermission: (value) => { permission = value; },
    restore: async () => {
      await service.prepareAndroidPushLogout();
      unbind();
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    },
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("Android login automatically registers granted permission and taps only navigate for the intended account", async () => {
  const fixture = androidFixture();
  try {
    await settle();
    assert.equal(fixture.service.getAndroidPushState().status, "enabled");
    assert.ok(fixture.calls.includes("save-token"));
    assert.ok(!fixture.calls.includes("request-permission"));
    const tap = (href, recipientId) => fixture.callbacks.pushNotificationActionPerformed({ notification: { data: { href, recipientId } } });
    tap("https://malicious.example", "user-1");
    tap("/bands/band-1", "another-user");
    tap("/bands/band-1", "user-1");
    assert.deepEqual(fixture.navigate, ["/bands/band-1"]);
    await fixture.service.disableAndroidPush();
    assert.equal(fixture.service.getAndroidPushState().status, "disabled");
    assert.ok(fixture.calls.includes("remove-token"));
  } finally {
    await fixture.restore();
  }
});

test("denied Android permission does not register a token", async () => {
  const fixture = androidFixture({ initialPermission: "prompt", requestedPermission: "denied" });
  try {
    await settle();
    assert.equal(fixture.service.getAndroidPushState().status, "denied");
    assert.ok(!fixture.calls.includes("save-token"));
    const unbind = fixture.bind("user-1", "session-1");
    await settle();
    unbind();
    assert.equal(fixture.calls.filter((call) => call === "request-permission").length, 1);
    fixture.setPermission("granted");
    fixture.bind("user-1", "session-1");
    await settle();
    assert.equal(fixture.service.getAndroidPushState().status, "enabled");
  } finally {
    await fixture.restore();
  }
});

test("first Android login prompts once and registers after permission is granted", async () => {
  const fixture = androidFixture({ initialPermission: "prompt" });
  try {
    fixture.bind("user-1", "session-1");
    await settle();
    assert.equal(fixture.calls.filter((call) => call === "request-permission").length, 1);
    assert.equal(fixture.calls.filter((call) => call === "register").length, 1);
    assert.equal(fixture.service.getAndroidPushState().status, "enabled");
  } finally {
    await fixture.restore();
  }
});

test("an explicit device opt-out survives login and can be enabled manually", async () => {
  const fixture = androidFixture({ optedOut: true });
  try {
    await settle();
    assert.equal(fixture.service.getAndroidPushState().status, "disabled");
    assert.ok(!fixture.calls.includes("register"));
    await fixture.service.enableAndroidPush();
    await settle();
    await fixture.service.disableAndroidPush();
    fixture.bind("user-1", "another-session");
    await settle();
    assert.equal(fixture.calls.filter((call) => call === "register").length, 1);
    assert.equal(fixture.service.getAndroidPushState().status, "disabled");
    await fixture.service.enableAndroidPush();
    await settle();
    assert.equal(fixture.service.getAndroidPushState().status, "enabled");
  } finally {
    await fixture.restore();
  }
});

test("Android logout removes the server registration and blocks late tokens until login resumes", async () => {
  const fixture = androidFixture();
  try {
    await settle();
    fixture.calls.length = 0;
    assert.equal(await fixture.service.prepareAndroidPushLogout(), true);
    assert.ok(fixture.calls.indexOf("remove-token") < fixture.calls.indexOf("native-unregister"));
    fixture.callbacks.registration({ value: "late-token" });
    await settle();
    assert.ok(!fixture.calls.includes("save-token"));
    fixture.bind("user-2", "session-2");
    await settle();
    assert.ok(fixture.calls.includes("save-token"));
  } finally {
    await fixture.restore();
  }
});

test("failed server unregistration prevents logout preparation and allows recovery", async () => {
  const fixture = androidFixture();
  const unregister = fixture.actions.unregisterDevice;
  try {
    await settle();
    fixture.calls.length = 0;
    fixture.actions.unregisterDevice = async () => ({ ok: false, error: { code: "UNAVAILABLE" } });
    await assert.rejects(fixture.service.prepareAndroidPushLogout());
    assert.ok(!fixture.calls.includes("native-unregister"));
    fixture.service.resumeAndroidPushAfterFailedLogout();
    await settle();
    assert.ok(fixture.calls.includes("save-token"));
  } finally {
    fixture.actions.unregisterDevice = unregister;
    await fixture.restore();
  }
});

test("disabling Android push waits for an in-flight token save before removing it", async () => {
  const fixture = androidFixture();
  let resolveSave;
  try {
    await settle();
    fixture.actions.registerAndroidToken = async () => {
      await new Promise((resolve) => { resolveSave = resolve; });
      fixture.calls.push("save-finished");
      return { ok: true, data: null };
    };
    await fixture.service.enableAndroidPush();
    await settle();
    const disabling = fixture.service.disableAndroidPush();
    await settle();
    assert.ok(!fixture.calls.includes("remove-token"));
    resolveSave();
    await disabling;
    assert.ok(fixture.calls.indexOf("save-finished") < fixture.calls.indexOf("remove-token"));
    fixture.callbacks.registration({ value: "late-token" });
    await settle();
    assert.equal(fixture.service.getAndroidPushState().status, "disabled");
  } finally {
    resolveSave?.();
    await fixture.restore();
  }
});
