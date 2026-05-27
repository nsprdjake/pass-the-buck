/* eslint-disable no-restricted-globals */

// Pass the Buck — service worker.
//
// Single responsibility for now: handle Web Push.
//
// - On a `push` event, parse the JSON payload (if any) and display a
//   notification. Falls back to a generic ping if the payload is missing
//   or malformed.
// - On a `notificationclick`, focus an existing app tab if one is open,
//   otherwise open one at the URL provided in the payload (defaulting
//   to "/").
//
// This file is served from /sw.js at the site root so it can control the
// whole origin. Don't add anything that needs build-time bundling here —
// it has to be plain JS the browser can fetch directly.

self.addEventListener("install", (event) => {
  // Take over immediately so newly-deployed SWs aren't waiting for a
  // page reload to start receiving push.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "Pass the Buck", body: event.data.text() };
    }
  }

  const title = payload.title || "Pass the Buck";
  const body = payload.body || "Something's happening at the saloon.";
  const url = payload.url || "/";
  const tag = payload.tag || "ptb-default";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      // Reusing the tag means a new push of the same kind replaces the
      // previous one instead of stacking.
      renotify: true,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Prefer focusing an already-open tab on the same origin.
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            await client.focus();
            // Navigate the focused tab to the target if it's somewhere else.
            if (clientUrl.pathname + clientUrl.search !== targetUrl) {
              if ("navigate" in client) {
                await client.navigate(targetUrl);
              }
            }
            return;
          }
        } catch {
          // ignore — keep trying others
        }
      }
      // No open tabs — open a new one.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
