/* Invistimo Web Push worker.
   Handles push display and notification clicks only.
   It intentionally has no fetch handler, so it does not intercept site traffic
   or replace another service worker's network behavior. */

self.addEventListener("push", (event) => {
  let payload = {
    title: "Invistimo",
    body: "",
    url: "/dashboard",
    tag: "",
  };
  try {
    const data = event.data ? event.data.json() : null;
    if (data && typeof data === "object") {
      payload = {
        title: String(data.title || payload.title).slice(0, 120),
        body: String(data.body || "").slice(0, 240),
        url: String(data.url || payload.url),
        tag: String(data.tag || "").slice(0, 120),
      };
    }
  } catch {
    payload.body = "";
  }

  const url = payload.url.startsWith("/") && !payload.url.startsWith("//")
    ? payload.url
    : "/dashboard";

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      lang: "he",
      dir: "rtl",
      icon: "/android-chrome-192x192-v6.png",
      badge: "/favicon-32x32-v6.png",
      tag: payload.tag || undefined,
      renotify: false,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification?.data?.url || "/dashboard";
  const path = String(raw).startsWith("/") && !String(raw).startsWith("//")
    ? String(raw)
    : "/dashboard";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (!String(client.url || "").startsWith(self.location.origin)) continue;
        if ("focus" in client) await client.focus();
        if ("navigate" in client) {
          try {
            await client.navigate(target);
          } catch {
            /* Older browsers open a new window below. */
          }
        }
        return;
      }
      await self.clients.openWindow(target);
    })()
  );
});
