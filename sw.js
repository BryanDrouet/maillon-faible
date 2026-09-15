const CACHE = "maillon-faible-shell-v2";
const SHELL = ["/", "/index.html", "/style.css", "/main.js"];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
				),
			),
	);
	self.clients.claim();
});

// Réseau en priorité pour toujours servir le CSS/JS à jour ; le cache ne sert que hors-ligne.
self.addEventListener("fetch", (event) => {
	if (
		event.request.method !== "GET" ||
		!event.request.url.startsWith(self.location.origin)
	)
		return;
	event.respondWith(
		fetch(event.request)
			.then((response) => {
				const copy = response.clone();
				caches.open(CACHE).then((cache) => cache.put(event.request, copy));
				return response;
			})
			.catch(() => caches.match(event.request)),
	);
});
