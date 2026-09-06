const CACHE = "qualitytime-v9";
const ASSETS = [
  ".",
  "index.html",
  "css/style.css",
  "js/app.js",
  "data/questions.json",
  "manifest.webmanifest",
  "icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Network-first per l'archivio, così le modifiche alle domande arrivano subito.
  if (request.url.includes("data/questions.json")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first per il resto dell'app.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
