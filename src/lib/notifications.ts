/**
 * Minimal browser-Notifications wrapper.
 *
 * Scope of v1 — covers the "tab is open but not the active window" case.
 * Doesn't (yet) cover the "tab is closed entirely" case — that needs a
 * service worker + Web Push API + VAPID keys, layered on later.
 *
 * iOS Safari only delivers Notifications when the site is installed as a
 * PWA from the home screen. We degrade silently when permission isn't
 * granted; the in-app flash + sound still fire.
 */

/** True when the API is available at all in this browser. */
export function isNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Current permission state, or "unsupported" when the API is missing. */
export function notificationPermission():
  | "granted"
  | "denied"
  | "default"
  | "unsupported" {
  if (!isNotificationsSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Ask for permission once. Safe to call repeatedly — re-uses an in-flight
 * request and short-circuits if we already have a definitive answer.
 * Must be invoked from a user-gesture handler in most browsers.
 */
let inFlight: Promise<NotificationPermission> | null = null;
export async function ensureNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!isNotificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  if (inFlight) return inFlight;
  try {
    inFlight = Notification.requestPermission();
    const result = await inFlight;
    return result;
  } finally {
    inFlight = null;
  }
}

// ---------- Service worker + Web Push (closed-tab notifications) ----------

const SW_PATH = "/sw.js";

/** Register the service worker. Idempotent — safe to call repeatedly. */
export async function registerServiceWorker(): Promise<
  ServiceWorkerRegistration | null
> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch {
    return null;
  }
}

/** Public VAPID key, embedded at build time. */
function getVapidPublicKey(): string | null {
  const k = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return k && k.trim().length > 0 ? k : null;
}

/** base64url → Uint8Array (PushManager.subscribe expects raw bytes). */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** Convert a PushSubscription to the shape we persist server-side. */
function serializeSubscription(sub: PushSubscription): StoredSubscription | null {
  const p256dhKey = sub.getKey?.("p256dh");
  const authKey = sub.getKey?.("auth");
  if (!p256dhKey || !authKey) return null;
  const toBase64Url = (key: ArrayBuffer) => {
    const bytes = new Uint8Array(key);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  return {
    endpoint: sub.endpoint,
    p256dh: toBase64Url(p256dhKey),
    auth: toBase64Url(authKey),
  };
}

/**
 * Make sure the current device has an active Web Push subscription, and
 * return its serialized form. Returns null if the browser doesn't support
 * push, the VAPID key isn't configured, or permission isn't granted.
 */
export async function ensurePushSubscription(): Promise<StoredSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  if (Notification.permission !== "granted") return null;
  const vapid = getVapidPublicKey();
  if (!vapid) return null;

  const reg = await registerServiceWorker();
  if (!reg) return null;
  // Wait for the registration to become active before subscribing — Safari
  // sometimes resolves register() before the worker is ready for push.
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast through BufferSource to side-step the TS narrowing on
        // Uint8Array<ArrayBufferLike> vs ArrayBufferView<ArrayBuffer>.
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
    } catch {
      return null;
    }
  }
  return serializeSubscription(sub);
}

/**
 * Fire an OS-level notification — but only when the page isn't visible
 * to the user. If the tab is the focused, foregrounded one, the in-app
 * UI is already telling them and a Notification would be redundant.
 */
export function maybeShowOsNotification(
  title: string,
  opts: NotificationOptions = {}
): void {
  if (typeof window === "undefined") return;
  if (!isNotificationsSupported()) return;
  if (Notification.permission !== "granted") return;

  // "visible" alone isn't enough — desktop browsers can show the tab as
  // visible while another window is on top. document.hasFocus() catches
  // that. The combination means "the page is the actual active surface".
  const isActive =
    document.visibilityState === "visible" &&
    typeof document.hasFocus === "function" &&
    document.hasFocus();
  if (isActive) return;

  try {
    new Notification(title, {
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      ...opts,
    });
  } catch {
    // Some platforms throw when called from a non-secure context or PWA
    // edge case — silently ignore so the in-app flash still works.
  }
}
