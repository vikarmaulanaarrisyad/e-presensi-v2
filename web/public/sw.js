// E-Presensi Guru PWA Service Worker
const CACHE_NAME = "epresensi-guru-v2";
const STATIC_ASSETS = [
  "/guru/login",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/app-logo.png",
  "/icons/apple-touch-icon.png"
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {})
  );
  // Only auto-skipWaiting on initial installation so update prompt can be presented to user
  if (!self.registration.active) {
    self.skipWaiting();
  }
});

// Listen for client message to skip waiting when user confirms update
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first strategy for dynamic app, with offline cache fallback
self.addEventListener("fetch", (event) => {
  // Only handle standard HTTP and HTTPS requests
  // Ignore chrome-extension://, moz-extension://, data:, blob:, ws:, etc.
  if (!event.request.url.startsWith("http://") && !event.request.url.startsWith("https://")) {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // Bypass API requests, authentication, and Next.js hot reload / webpack
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/_next/webpack-hmr")
  ) {
    return;
  }

  // Handle static and page requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET responses for static assets
        if (
          response &&
          response.status === 200 &&
          (url.pathname.startsWith("/icons/") ||
           url.pathname.endsWith(".png") ||
           url.pathname.endsWith(".svg") ||
           url.pathname.endsWith(".css") ||
           url.pathname.endsWith(".js"))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          }).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        // Fallback to cache if network fails
        try {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === "navigate") {
            const loginCache = await caches.match("/guru/login");
            if (loginCache) return loginCache;
          }
        } catch {
          // ignore cache lookup errors
        }
        return new Response("Offline - Tidak ada koneksi internet", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "text/plain" }),
        });
      })
  );
});
