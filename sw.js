/* Service worker del Field Service Log.
   Ha de ser un fitxer servit per http(s): registrar-lo des d'una URL blob: el
   navegador ho rebutja («The URL protocol of the script is not supported»).

   Estratègia: xarxa primer amb 3 s de paciència, còpia local si no arriba.
   Així sempre tens l'última versió quan hi ha cobertura, i l'app obre igual
   en un avió o en un client sense senyal. */
const CACHE = "fsl-v2";
const SHELL = ["./", "./index.html", "./manual.html"];

/* Les llibreries que fan els informes (PDF, Word, Excel, ZIP), el visor de
   dibuixos i les fonts del PDF es baixen d'un CDN quan cal. Abans aquest worker
   no les tocava, i només eren a la memòria cau HTTP del navegador: sense
   cobertura, l'informe podia no sortir. Ara es guarden en una memòria a part,
   que no es buida en publicar una versió nova de l'app perquè les URL porten
   la versió fixada (si es canvia una versió, es canvia la URL i prou).
   LIBS són les primeres URL que prova cada carregador d'index.html; les de
   reserva (jsdelivr, cdnjs) també es guarden si mai s'arriben a fer servir. */
const LIBS_CACHE = "fsl-libs-1";
const LIBS = [
  "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js",
  "https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js",
  "https://unpkg.com/docx@8.5.0/build/index.umd.js",
  "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js",
  "https://unpkg.com/jszip@3.10.1/dist/jszip.min.js",
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js",
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans/NotoSans_400Regular.ttf",
  "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans/NotoSans_700Bold.ttf",
  "https://cdn.jsdelivr.net/npm/@expo-google-fonts/amiri/Amiri_400Regular.ttf"
];
const CDN = /^https:\/\/(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\//;

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
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== LIBS_CACHE).map(k => caches.delete(k))))
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

/* Baixa una llibreria en mode CORS, per poder llegir-ne l'estat i no desar mai
   un error. Un <script> sense crossorigin demana en mode no-cors, i aquella
   resposta és opaca: si fos un 404 o un 500, el desaríem igual per sempre. Els
   tres CDN responen amb CORS, i un script s'executa igual amb aquesta resposta. */
async function baixaLib(url){
  const res = await fetch(url, {mode:"cors", credentials:"omit"});
  if(!res.ok) throw new Error("CDN " + res.status);
  const cache = await caches.open(LIBS_CACHE);
  await cache.put(url, res.clone());
  return res;
}

/* Primer la còpia: les URL porten la versió, així que el contingut no canvia. */
async function responLib(req){
  const cache = await caches.open(LIBS_CACHE);
  const copia = await cache.match(req.url, {ignoreVary:true});
  if(copia) return copia;
  try{ return await baixaLib(req.url); }
  catch(e){ return fetch(req); }   /* com abans: que el carregador provi la següent URL */
}

/* La pàgina ho demana un cop el worker és actiu (vegeu index.html): baixa el que
   encara no hi és. No es fa a install ni a activate perquè, mentre durin, el
   worker no atén la pàgina, i són uns quants MB que amb mala cobertura trigarien.
   Les que ja hi són no es tornen a baixar, així que cada obertura costa poc. */
async function precarregaLibs(){
  const cache = await caches.open(LIBS_CACHE);
  await Promise.all(LIBS.map(async url => {
    if(await cache.match(url, {ignoreVary:true})) return;
    try{ await baixaLib(url); }catch(e){}
  }));
}

self.addEventListener("message", e => {
  if(e.data === "libs") e.waitUntil(precarregaLibs());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  /* Les llibreries dels CDN: de la memòria pròpia, perquè l'informe surti
     sense cobertura. */
  if(CDN.test(req.url)){ e.respondWith(responLib(req)); return; }
  /* Google (autenticació, Drive, Gemini) no es toca mai: ha d'anar sempre a la
     xarxa i les seves respostes no s'han de guardar. */
  if(new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(respon(req));
});
