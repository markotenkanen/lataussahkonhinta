// Service Worker for PWA
const CACHE_NAME = "porssisahko-v9"
const urlsToCache = ["/manifest.json", "/icon-192.jpg", "/icon-512.jpg", "/offline.html"]
const precachePaths = new Set(urlsToCache)

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    }),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable()
      }
    })(),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event))
    return
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request))
    return
  }

  event.respondWith(cacheAssetRequest(request, url))
})

async function handleNavigationRequest(event) {
  try {
    const preloadResponse = await event.preloadResponse
    if (preloadResponse) {
      return preloadResponse
    }

    const networkResponse = await fetch(event.request)
    return networkResponse
  } catch (error) {
    const cache = await caches.open(CACHE_NAME)
    const offlineFallback = await cache.match("/offline.html")
    if (offlineFallback) {
      return offlineFallback
    }

    throw error
  }
}

async function cacheAssetRequest(request, url) {
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

    if (request.mode === "navigate") {
      const fallback = await caches.match("/offline.html")
      if (fallback) {
        return fallback
      }
    }

    throw error
  }
}
