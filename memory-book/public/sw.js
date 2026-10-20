// Memory Book service worker: makes the app open quickly and work offline.
// It only keeps the app itself (pages, scripts, fonts, icons) on this device.
// Your journal and photos come from your Google Drive and are never cached here
// (the app keeps its own offline copy in the browser, as before).
//
// It also receives photos shared into the installed app from the phone's gallery
// ("Share → Memory Book" on Android). They're held in this browser only until the
// app copies them into your Google Drive — they're never sent to our server.
const VERSION = "v2";
const SHARE_INBOX = "share-inbox";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES && k !== SHARE_INBOX).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === "POST" && url.origin === self.location.origin && url.pathname === "/share-target") {
    event.respondWith(receiveShare(request));
    return;
  }
  if (request.method !== "GET") return;
  // Google sign-in, Drive and our own sign-in endpoints always go to the network.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Built files never change once published: keep them.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/demo/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Pages: always try the network first, fall back to the last copy when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(PAGES).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/book")) || (await caches.match("/")) || Response.error()),
    );
  }
});

/** Keeps shared photos on this device, then opens the Write page, which brings them into the book. */
async function receiveShare(request) {
  try {
    const form = await request.formData();
    const photos = form.getAll("photos").filter((f) => typeof f === "object" && f.type.startsWith("image/"));
    const inbox = await caches.open(SHARE_INBOX);
    let n = Date.now();
    for (const photo of photos) {
      await inbox.put(
        new Request(`/share-inbox/${n++}`),
        new Response(photo, {
          headers: {
            "content-type": photo.type,
            "x-file-name": encodeURIComponent(photo.name || "photo.jpg"),
            "x-last-modified": new Date(photo.lastModified || Date.now()).toISOString(),
          },
        }),
      );
    }
    return Response.redirect(`/book/write?shared=${photos.length}`, 303);
  } catch {
    return Response.redirect("/book/write?shared=failed", 303);
  }
}
