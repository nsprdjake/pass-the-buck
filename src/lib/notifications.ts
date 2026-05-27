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
