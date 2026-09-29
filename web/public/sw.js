// E-Presensi Guru PWA Service Worker
const CACHE_NAME = "epresensi-guru-v1";
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
    })
  );
  self.skipWaiting();
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
  const url = new URL(event.request.url);

  // Bypass API requests and authentication from caching to ensure live accurate data
  if (
    url.pathname.startsWith("/api/") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Handle static and page requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET requests for static assets or pages
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
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // Fallback to cache if network fails
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === "navigate") {
          const loginCache = await caches.match("/guru/login");
          if (loginCache) return loginCache;
        }
        return new Response("Offline - Tidak ada koneksi internet", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "text/plain" }),
        });
      })
  );
});
