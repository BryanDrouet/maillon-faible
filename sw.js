const CACHE = "maillon-faible-shell-v1";
const SHELL = ["/", "/index.html", "/style.css", "/main.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

// Ne sert que le shell en cache ; laisse passer Firebase et les autres requêtes vers le réseau.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
