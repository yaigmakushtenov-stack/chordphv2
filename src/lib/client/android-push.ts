import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

import * as NotificationActions from "@/actions/notification-actions";

type PushStatus = "checking" | "unsupported" | "unavailable" | "disabled" | "denied" | "registering" | "enabled" | "error";
export type AndroidPushState = { status: PushStatus; message: string | null };
type PushBinding = { key: string; userId: string; navigate: (href: string) => void };

const OPT_IN_KEY = "chordph.android-push.enabled";
const PERMISSION_REQUESTED_KEY = "chordph.android-push.permission-requested";
const INITIAL_STATE: AndroidPushState = { status: "checking", message: null };
const listeners = new Set<() => void>();
let state = INITIAL_STATE;
let binding: PushBinding | null = null;
let initialization: Promise<void> | null = null;
let paused = false;
let registrationTimeout: ReturnType<typeof setTimeout> | undefined;
let lastRegisteredKey: string | null = null;
let lastRegisteredAt = 0;
let registeringKey: string | null = null;
let pendingTokenSave: Promise<void> = Promise.resolve();
let permissionRequest: ReturnType<typeof PushNotifications.requestPermissions> | null = null;

export function subscribeAndroidPush(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAndroidPushState(): AndroidPushState {
  return state;
}

export function getAndroidPushServerState(): AndroidPushState {
  return INITIAL_STATE;
}

export function bindAndroidPush(
  userId: string,
  sessionId: string,
  navigate: (href: string) => void,
): () => void {
  const current: PushBinding = { key: `${userId}:${sessionId}`, userId, navigate };
  binding = current;
  paused = false;
  const resume = () => {
    if (document.visibilityState === "visible") {
      void resumeRegistration(current).catch(() => failRegistration(current));
    }
  };
  void resumeRegistration(current).catch(() => failRegistration(current));
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  return () => {
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("online", resume);
    if (binding === current) {
      binding = null;
    }
  };
}

export async function enableAndroidPush(): Promise<void> {
  const current = binding;
  if (!current || !isAndroidPushAvailable()) {
    return;
  }
  paused = false;
  try {
    await ensureListeners();
    const permission = await requestPermission();
    if (binding !== current || paused) {
      return;
    }
    if (permission.receive !== "granted") {
      updateState("denied", "Allow notifications in Android settings to receive band activity.");
      return;
    }
    lastRegisteredKey = null;
    localStorage.setItem(OPT_IN_KEY, "true");
    paused = false;
    await register(current);
  } catch {
    failRegistration(current);
  }
}

export async function disableAndroidPush(): Promise<void> {
  const current = binding;
  if (!current || !isAndroidPushAvailable()) {
    return;
  }
  paused = true;
  clearTimeout(registrationTimeout);
  try {
    await pendingTokenSave;
    const result = await NotificationActions.unregisterDevice();
    if (!result.ok) {
      paused = false;
      updateState("enabled", result.error.message);
      return;
    }
  } catch {
    paused = false;
    updateState("enabled", "Couldn't disable notifications. Check your connection and try again.");
    return;
  }
  localStorage.setItem(OPT_IN_KEY, "false");
  lastRegisteredKey = null;
  registeringKey = null;
  try {
    await PushNotifications.unregister();
    await PushNotifications.removeAllDeliveredNotifications();
    updateState("disabled");
  } catch {
    updateState("disabled", "Notifications are disabled for this session. Clear existing notifications in Android if they remain visible.");
  }
}

export async function prepareAndroidPushLogout(): Promise<boolean> {
  paused = true;
  clearTimeout(registrationTimeout);
  lastRegisteredKey = null;
  registeringKey = null;
  if (!isAndroidPushAvailable()) {
    return true;
  }
  await pendingTokenSave;
  const result = await NotificationActions.unregisterDevice();
  if (!result.ok) {
    throw new Error("Couldn't remove this session's push registration.");
  }
  const cleanup = await Promise.allSettled([
    PushNotifications.unregister(),
    PushNotifications.removeAllDeliveredNotifications(),
  ]);
  return cleanup.every((result) => result.status === "fulfilled");
}

export function resumeAndroidPushAfterFailedLogout(): void {
  paused = false;
  if (binding) {
    const current = binding;
    void resumeRegistration(current).catch(() => failRegistration(current));
  }
}

function isAndroidPushAvailable(): boolean {
  return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("PushNotifications");
}

async function resumeRegistration(current: PushBinding): Promise<void> {
  if (binding !== current || paused) {
    return;
  }
  if (Capacitor.getPlatform() !== "android") {
    updateState("unsupported", "Push notifications are available in the Android app.");
    return;
  }
  if (!isAndroidPushAvailable()) {
    updateState("unavailable", "Update the Android app to enable push notifications.");
    return;
  }
  await ensureListeners();
  if (binding !== current || paused) {
    return;
  }
  if (localStorage.getItem(OPT_IN_KEY) === "false") {
    lastRegisteredKey = null;
    updateState("disabled");
    return;
  }
  let permission = await PushNotifications.checkPermissions();
  if (binding !== current || paused) {
    return;
  }
  if (
    (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") &&
    (permissionRequest || localStorage.getItem(PERMISSION_REQUESTED_KEY) !== "true")
  ) {
    permission = await requestPermission();
  }
  if (binding !== current || paused) {
    return;
  }
  if (permission.receive !== "granted") {
    const result = await NotificationActions.unregisterDevice();
    if (!result.ok) {
      updateState("error", result.error.message);
      return;
    }
    lastRegisteredKey = null;
    updateState("denied", "Allow notifications in Android settings to receive band activity.");
    return;
  }
  localStorage.setItem(OPT_IN_KEY, "true");
  if (lastRegisteredKey === current.key && Date.now() - lastRegisteredAt < 5 * 60 * 1_000) {
    updateState("enabled");
    return;
  }
  if (state.status === "registering" && registeringKey === current.key) {
    return;
  }
  await register(current);
}

async function requestPermission(): ReturnType<typeof PushNotifications.requestPermissions> {
  if (!permissionRequest) {
    localStorage.setItem(PERMISSION_REQUESTED_KEY, "true");
    permissionRequest = PushNotifications.requestPermissions().finally(() => {
      permissionRequest = null;
    });
  }
  return await permissionRequest;
}

async function register(current: PushBinding): Promise<void> {
  await PushNotifications.createChannel({
    id: "band_activity",
    name: "Band activity",
    description: "Band invitations and new events",
    importance: 4,
    visibility: 0,
  });
  if (binding !== current || paused) {
    return;
  }
  if (
    registeringKey === current.key ||
    (lastRegisteredKey === current.key && Date.now() - lastRegisteredAt < 5 * 60 * 1_000)
  ) {
    return;
  }
  updateState("registering");
  registeringKey = current.key;
  clearTimeout(registrationTimeout);
  registrationTimeout = setTimeout(() => {
    if (state.status === "registering") {
      failRegistration(current);
    }
  }, 15_000);
  await PushNotifications.register();
}

async function ensureListeners(): Promise<void> {
  initialization ??= installListeners().catch((error: unknown) => {
    initialization = null;
    throw error;
  });
  await initialization;
}

async function installListeners(): Promise<void> {
  const handles: PluginListenerHandle[] = [];
  try {
    handles.push(await PushNotifications.addListener("registration", ({ value }) => {
      const current = binding;
      if (!current || paused || localStorage.getItem(OPT_IN_KEY) !== "true") {
        return;
      }
      pendingTokenSave = pendingTokenSave.then(() => saveToken(current, value)).catch(() => failRegistration(current));
    }));
    handles.push(await PushNotifications.addListener("registrationError", () => {
      if (binding) {
        failRegistration(binding);
      }
    }));
    handles.push(await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const data: unknown = event.notification.data;
      if (!binding || typeof data !== "object" || data === null || !("href" in data) || !("recipientId" in data)) {
        return;
      }
      if (
        data.recipientId === binding.userId && typeof data.href === "string" &&
        /^\/(bands|events)\/[A-Za-z0-9_-]+$/.test(data.href)
      ) {
        binding.navigate(data.href);
      }
    }));
  } catch (error: unknown) {
    await Promise.all(handles.map((handle) => handle.remove()));
    throw error;
  }
}

async function saveToken(current: PushBinding, token: string): Promise<void> {
  if (binding?.key !== current.key || paused) {
    return;
  }
  const permission = await PushNotifications.checkPermissions();
  if (binding?.key !== current.key || paused || permission.receive !== "granted") {
    return;
  }
  const result = await NotificationActions.registerAndroidToken(token);
  if (binding?.key !== current.key || paused) {
    return;
  }
  clearTimeout(registrationTimeout);
  registeringKey = null;
  if (!result.ok) {
    updateState("error", result.error.message);
    return;
  }
  lastRegisteredKey = current.key;
  lastRegisteredAt = Date.now();
  updateState("enabled");
}

function failRegistration(current: PushBinding): void {
  if (binding?.key === current.key && !paused) {
    clearTimeout(registrationTimeout);
    registeringKey = null;
    updateState("error", "Couldn't enable notifications. Check your connection and try again.");
  }
}

function updateState(status: PushStatus, message: string | null = null): void {
  state = { status, message };
  listeners.forEach((listener) => listener());
}
