// Stale-while-revalidate: serve from cache instantly, refresh in background.
// Bump CACHE_VERSION when you want to force old caches out.
const CACHE_VERSION = "bordr-v1";
const CORE = ["./", "index.html", "style.css", "script.js", "manifest.json", "favicon.svg"];

self.addEventListener("install", (e) => {
	e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(CORE)));
	self.skipWaiting();
});

self.addEventListener("activate", (e) => {
	e.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener("fetch", (e) => {
	if (e.request.method !== "GET") return;

	e.respondWith(
		caches.match(e.request).then((cached) => {
			const network = fetch(e.request)
				.then((res) => {
					if (res.ok || res.type === "opaque") {
						const copy = res.clone();
						caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
					}
					return res;
				})
				.catch(() => cached);
			return cached || network;
		})
	);
});
