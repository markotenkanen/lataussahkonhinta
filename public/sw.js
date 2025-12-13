// Service Worker for PWA
const CACHE_NAME = "porssisahko-v9"
const urlsToCache = [
  "/",
  "/manifest.json",
  "/icon-192.jpg",
  "/icon-512.jpg",
  "/offline.html",
]
const precachePaths = new Set(urlsToCache)

// Install event - cache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    }),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )

  if (self.registration.navigationPreload) {
    self.registration.navigationPreload.enable().catch(() => {})
  }
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request))
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)

        try {
          const preloadResponse = event.preloadResponse ? await event.preloadResponse : null
          const networkResponse = preloadResponse || (await fetch(request))

          cache.put(request, networkResponse.clone())
          return networkResponse
        } catch (error) {
          const cachedPage = await cache.match(request)
          if (cachedPage) return cachedPage

          const offlineFallback = await cache.match("/offline.html")
          if (offlineFallback) return offlineFallback

          throw error
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request)

        if (
          precachePaths.has(url.pathname) ||
          ["style", "script", "font", "image"].includes(request.destination)
        ) {
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, networkResponse.clone())
        }

        return networkResponse
      } catch (error) {
        const cachedResponse = await caches.match(request)
        if (cachedResponse) {
          return cachedResponse
        }

        const fallback = await caches.match("/offline.html")
        if (fallback) {
          return fallback
        }

        throw error
      }
    })(),
  )
})
