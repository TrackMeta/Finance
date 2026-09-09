/* Libreta — service worker: la app abre sin internet.
   Guarda una copia de la pantalla (index.html) y de las fuentes.
   Lo de Supabase nunca se guarda aquí: de eso se encarga la cola de la app. */
const V = "libreta-v1";
const SHELL = new URL("./", self.location).href;          // https://…/Finance/  o  http://localhost:8765/
const FUENTES = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.add(new Request(SHELL, {cache: "reload"}))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate" || req.url.split("?")[0] === SHELL || /\/index\.html$/.test(req.url.split("?")[0])) { e.respondWith(pantalla(e)); return; }
  if (FUENTES.test(req.url)) { e.respondWith(fuente(req)); return; }
  /* todo lo demás (Supabase) va directo a la red */
});

/* la pantalla: responde con la copia guardada y, de fondo, busca si hay versión nueva */
async function pantalla(e) {
  const c = await caches.open(V);
  const guardada = await c.match(SHELL);
  const copia = guardada && guardada.clone();
  const red = fetch(new Request(SHELL, {cache: "no-cache"})).then(async r => {
    if (r && r.ok) { const cambio = await distinta(copia, r.clone()); await c.put(SHELL, r); if (cambio) avisa(); }
    return r;
  }).catch(() => null);
  if (guardada) { e.waitUntil(red); return guardada; }
  const r = await red;
  return r || new Response("Sin internet y sin copia guardada. Abre Libreta una vez con conexión.", {status: 503, headers: {"Content-Type": "text/plain; charset=utf-8"}});
}
async function distinta(vieja, nueva) {
  if (!vieja) return false;
  for (const h of ["etag", "last-modified", "content-length"]) { const x = vieja.headers.get(h), y = nueva.headers.get(h); if (x && y) return x !== y; }
  const [a, b] = await Promise.all([vieja.text(), nueva.text()]);
  return a !== b;
}
function avisa() {
  self.clients.matchAll({type: "window"}).then(cs => cs.forEach(c => c.postMessage({tipo: "nueva-version"})));
}
/* fuentes: la copia guardada primero; se renueva de fondo */
async function fuente(req) {
  const c = await caches.open(V);
  const g = await c.match(req);
  const red = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => null);
  return g || (await red) || Response.error();
}
