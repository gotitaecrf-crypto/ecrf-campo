// ECRF Campo — permite abrir la app sin internet y avisa cuando hay una versión nueva.
// Al publicar cambios, sube este número (v2, v3...) para que los celulares descarguen la versión nueva.
const VERSION = "ecrf-campo-v1";
const ARCHIVOS = ["./", "./index.html", "./config.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: "reload" })))));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "actualizar") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("script.google.com") || url.hostname.endsWith("googleusercontent.com")) return; // servidor: siempre en línea
  const esPropio = url.origin === location.origin;
  const esFuente = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const esFotoDrive = url.hostname === "drive.google.com" && url.pathname.startsWith("/thumbnail");
  if (!esPropio && !esFuente && !esFotoDrive) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const guardado = await c.match(req, { ignoreSearch: esPropio });
    const red = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => null);
    if (guardado) return guardado;          // rápido y sin internet; se refresca en segundo plano
    const r = await red;
    return r || (req.mode === "navigate" ? c.match("./index.html") : Response.error());
  }));
});
