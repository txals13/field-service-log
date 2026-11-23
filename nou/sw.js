/* Aquí hi havia el service worker de la còpia nova del Field Service Log. Des
   del dia del canvi (2026-11-23) l'app és a l'arrel i aquesta carpeta només
   redirigeix. Un aparell que tingués la còpia instal·lada encara té aquell
   worker, i mentre visqui li serviria l'app vella de la seva memòria cau quan
   no hi ha cobertura. Aquest fitxer el substitueix per un que no fa res més
   que treure's: esborra de la memòria compartida ("fsl-v2") NOMÉS les entrades
   d'aquesta carpeta —les de l'arrel i les de classic/ són d'altres workers—,
   es dona de baixa i torna a carregar les pàgines que tingués obertes, que ja
   reben la redirecció de la xarxa. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    try{
      const here = new URL("./", self.location.href).href;
      const cache = await caches.open("fsl-v2");
      const keys = await cache.keys();
      await Promise.all(keys.filter(r => r.url.indexOf(here) === 0).map(r => cache.delete(r)));
    }catch(err){}
    try{ await self.registration.unregister(); }catch(err){}
    try{
      const cs = await self.clients.matchAll({type:"window"});
      cs.forEach(c => { try{ c.navigate(c.url); }catch(err){} });
    }catch(err){}
  })());
});
/* cap "fetch": tot va a la xarxa */
