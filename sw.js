/* Service worker del Field Service Log.
   Ha de ser un fitxer servit per http(s): registrar-lo des d'una URL blob: el
   navegador ho rebutja («The URL protocol of the script is not supported»).

   Estratègia: xarxa primer amb 3 s de paciència, còpia local si no arriba.
   Així sempre tens l'última versió quan hi ha cobertura, i l'app obre igual
   en un avió o en un client sense senyal. */
const CACHE = "fsl-v2";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(u => new Request(u, {cache:"no-store"}))))
      .catch(() => {})            /* si un recurs falla, no bloquegem la instal·lació */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function respon(req){
  const cache = await caches.open(CACHE);
  const copia = await cache.match(req);
  /* `no-store` és imprescindible: sense això el fetch passa per la memòria cau
     HTTP del navegador i, com que GitHub Pages envia max-age=600, la "xarxa"
     ens tornaria la còpia vella durant 10 minuts després de cada publicació
     —i encara la desaríem. Amb no-store, xarxa primer vol dir xarxa de debò. */
  const xarxa = fetch(req, {cache:"no-store"}).then(res => {
    if(res && res.ok && res.type === "basic") cache.put(req, res.clone());
    return res;
  });
  xarxa.catch(() => {});          /* evitem el rebuig no gestionat de la cursa */

  if(!copia){
    try{ return await xarxa; }
    catch(e){
      /* sense còpia d'aquest recurs: si és una navegació, servim l'app sencera.
         Provem les dues formes perquè segons com hi arribis la clau és una o
         l'altra ("/" en obrir l'app, "/index.html" si t'hi apunten directament). */
      const home = (await cache.match("./index.html")) || (await cache.match("./"));
      return home || new Response("Sense connexió", {status:503, headers:{"Content-Type":"text/plain;charset=utf-8"}});
    }
  }
  try{
    return await Promise.race([
      xarxa,
      new Promise((_, rej) => setTimeout(() => rej(new Error("lent")), 3000))
    ]);
  }catch(e){ return copia; }      /* lenta o caiguda: tira de còpia */
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  /* Google (autenticació i Drive) no es toca mai: ha d'anar sempre a la xarxa
     i les seves respostes no s'han de guardar. */
  if(new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(respon(req));
});
