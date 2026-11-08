# -*- coding: utf-8 -*-
"""Les captures del manual d'us.

    python tools/captures.py              # totes
    python tools/captures.py full-hores   # nomes aquesta

Que fa: construeix un _shot.html (l'index.html amb un guio a dins), l'obre amb
el Chrome fent veure que es un telefon, hi deixa unes dades d'exemple, obre la
pantalla o la finestra que toca i en desa un retall a manual-img/, en clar i en
fosc. El _shot.html s'esborra en acabar i no es publica mai.

Per que les dades son inventades i no una visita de debo: el repositori es
public, i a les visites de debo hi ha el nom del client, el numero de serie de
la seva maquina i el nom de qui hi ha anat. Les captures han de ser repetibles
i no han d'ensenyar res de ningu.

Per que el DevTools Protocol i no "chrome --screenshot": el Chrome sense
finestra no baixa de ~500 px d'ample (el minim d'una finestra de Windows) i les
captures sortien amb el disseny d'una tauleta estreta. Pel protocol si que es
pot dir que es un telefon de 390 px, i de passada es pot retallar la captura a
un element concret i esperar que la pagina avisi que ja esta.

Cal: el servidor estatic del projecte al port 8420 i el Chrome o l'Edge.
"""
import base64, io, json, math, os, socket, struct, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC  = os.path.join(ROOT, "index.html")
GEN  = os.path.join(ROOT, "_shot.html")
OUT  = os.path.join(ROOT, "manual-img")
PORT = 8420
W, H, DSF = 390, 844, 2          # un telefon corrent

CHROME = next((p for p in [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium",
] if os.path.exists(p)), None)


# ─────────────────────────── el que es captura ───────────────────────────
# nom del fitxer, guio (veure DRIVER), i qui es retalla (buit = la pantalla).
# Captures que acaben amb un pam de fons buit (la barra lateral d'un telefon
# amb una visita i prou): es talla, que al manual nomes hi fa nosa.
TRIM = {"barra-lateral"}

# nom del fitxer, guio (veure DRIVER), que es retalla (buit = la pantalla
# sencera) i, si cal, una pantalla mes alta que la d'un telefon: n'hi ha que no
# hi caben i el que importa no es que surtin tallades sino que es vegin senceres.
SHOTS = [
    ("barra-lateral",  "sidebar",    "#sidebar",         0),
    ("visita-nova",    "visitanova", "#newBack .modal",  1500),
    ("registre",       "registre",   "",                 0),
    ("entrada-nova",   "registre",   ".input-bar",       0),
    ("entrada-editar", "editar",     "#editBack .modal", 1400),
    ("menu-informe",   "informe",    "#expMenu",         1400),
    ("full-hores",     "hores",      "#tsBack .modal|#tsRows", 1700),
]


DRIVER = r"""
/* ---- captures del manual: nomes al _shot.html, que no es publica ---- */
window.__SHOT=(function(){
  var q={};(location.hash||"").replace(/^#/,"").split("&").forEach(function(p){
    var i=p.indexOf("=");if(i<0){q[p]=1}else{q[p.slice(0,i)]=decodeURIComponent(p.slice(i+1))}});
  if(!q.shot)return null;
  if(q.light)document.documentElement.classList.add("light");

  /* Sense aixo la barra lateral surt a mitja entrada: s'obre amb una transicio
     de 0,25 s i la captura la enxampava pel cami. I la barra d'instal.lar
     l'app no te res a dir en un manual. */
  var st=document.createElement("style");
  st.textContent="*,*::before,*::after{transition:none!important;animation:none!important}"
    +"#instBar{display:none!important}";
  document.head.appendChild(st);

  function iso(d,h,m){return new Date(2026,2,d,h,m,0).toISOString()}
  function demo(){
    return [{
      id:"demo1",client:"Ind\u00fastries Vall\u00e8s, S.A.",project:"P-2614",
      machine:"Envasadora LE-400",machineNo:"LE400-1182",year:"2019",
      location:"Sabadell",tech:"Marc Soler",type:"maintenance",
      contact:"Jordi Pla",contactRole:"Cap de manteniment",
      contactPhone:"937 001 122",contactEmail:"jpla@valles.cat",
      status:"open",createdAt:iso(10,7,40),startAt:"",notes:"",
      entries:[
        {id:"e1",ts:iso(10,8,15),severity:"info",tag:"Arribada",
         text:"Arribada a planta. Revisi\u00f3 de l'estat de la l\u00ednia amb el cap de manteniment. La m\u00e0quina est\u00e0 aturada des de divendres.",images:[]},
        {id:"e2",ts:iso(10,9,30),severity:"issue",tag:"Cinta d'entrada",
         text:"La cinta d'entrada patina en arrencar en fred. El rodet tensor t\u00e9 joc axial i el coixinet fa soroll.",images:[]},
        {id:"e3",ts:iso(10,11,5),severity:"ok",tag:"Cinta d'entrada",
         text:"Canviat el coixinet del rodet tensor i tornada a tensar la cinta. Tres arrencades en fred sense patinar.",images:[]},
        {id:"e4",ts:iso(10,12,20),severity:"warning",tag:"Grup de segellat",
         text:"La resist\u00e8ncia del grup de segellat arriba a temperatura 40 s m\u00e9s tard del que toca. Encara segella b\u00e9, per\u00f2 caldr\u00e0 canviar-la a la propera revisi\u00f3.",images:[]},
        /* Una d'interna: al manual hi surt dues vegades, al registre (que es on
           s'explica que no van a l'informe) i al menu de l'informe, que nomes
           ofereix l'informe intern si la visita en te cap. */
        {id:"e5",ts:iso(10,12,45),severity:"info",tag:"Recanvis",
         text:"Portar dos coixinets de recanvi la propera vegada: aqui no en tenen i el magatzem queda lluny.",images:[],intern:true}
      ]
    }];
  }

  function base(id){
    isLoggedIn=true;driveEmail="marc.soler@example.com";
    sessions=demo();aid=id||null;
    renderAll();updateAuthUI();
    var ib=$$("instBar");if(ib)ib.style.display="none";
    /* El registre s'obre per baix, a l'ultima entrada; per al manual interessa
       veure'l pel principi, que es per on es llegeix. */
    var la=$$("logArea");if(la&&la.parentNode)la.parentNode.scrollTop=0;
  }

  var S={
    llista:function(){base(null)},
    registre:function(){base("demo1")},
    visitanova:function(){base(null);openNewModal()},
    sidebar:function(){base("demo1");openSide()},
    informe:function(){base("demo1");var b=$$("btnExp"),m=$$("expMenu");if(!b||!m)throw new Error("no hi ha el boto de l'informe");openExpMenu(b,m)},
    /* El full d'hores llegeix els dies fitxats del Calendari laboral, que a
       l'app arriben de Drive i es guarden en una copia local. Sense copia
       nomes es veuria l'avis de "no s'ha pogut llegir el fitxer", que no es
       el que ha d'ensenyar un manual: hi deixem tres dies d'exemple, el de
       l'anada, el de la feina i el de la tornada. */
    hores:function(){
      var dies={};
      dies["2026-03-09"]={vi:"06:00",i:"10:00",f:"17:00",vf:"",p:0.5,d:"Sabadell"};
      dies["2026-03-10"]={vi:"",i:"08:00",f:"18:00",vf:"",p:0.5,d:"Sabadell"};
      dies["2026-03-11"]={vi:"",i:"08:00",f:"13:00",vf:"17:30",p:0.5,d:"Sabadell"};
      saveCalCache({years:{2026:{days:dies}}},"Drive");
      calCache.at=new Date(2026,2,11,19,40).toISOString();  // que la copia no dugui la data d'avui
      base("demo1");openTimesheet();
    },
    editar:function(){base("demo1");openEdit("e2")}
  };

  /* El boot de debo s'ha tret d'aquest fitxer (veure build()): llegeix les
     sessions de l'IndexedDB i aqui no hi ha res a llegir. Ho pintem tot de cop
     i avisem amb data-shot, que es el que espera el guio de fora. */
  try{S[q.shot]()}catch(e){document.documentElement.setAttribute("data-shot-error",e.message)}
  document.documentElement.setAttribute("data-shot","1");
  return S;
})();
"""


def build():
    """L'index.html amb el guio a dins i sense res que no acabi mai."""
    s = io.open(SRC, encoding="utf-8", newline="").read()
    # El service worker no pinta res en una captura i es queda viu entre proves.
    s = s.replace('if("serviceWorker" in navigator){', 'if(false){', 1)
    # Fora el boot asincron sencer (IndexedDB, Drive, la cua de pujades).
    a = s.index('$$("content").innerHTML="<div class=\\"empty\\"><span class=\\"spinner\\"></span>')
    b = s.index("\n})();", s.index("(async function(){", a))
    s = s[:a] + "/* el boot s'ha retirat per a les captures */\n" + s[b + len("\n})();"):]
    lines = s.split("\n")
    i = max(k for k, l in enumerate(lines) if l.rstrip() == "})();")
    lines.insert(i, DRIVER)
    io.open(GEN, "w", encoding="utf-8", newline="").write("\n".join(lines))


# ───────────────────── el minim del DevTools Protocol ─────────────────────
class WS(object):
    """Un WebSocket de joguina: text cap enfora, text cap endins, prou."""

    def __init__(self, url, timeout=60):
        host_port, _, path = url[5:].partition("/")
        host, _, port = host_port.partition(":")
        self.sock = socket.create_connection((host, int(port or 80)), timeout)
        self.sock.settimeout(timeout)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall(("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\n"
                           "Connection: Upgrade\r\nSec-WebSocket-Key: %s\r\n"
                           "Sec-WebSocket-Version: 13\r\n\r\n"
                           % (path, host_port, key)).encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self._raw(1)
        assert b"101" in buf.split(b"\r\n")[0], buf[:200]
        self.rest = buf.split(b"\r\n\r\n", 1)[1]

    def _raw(self, n):
        out = b""
        while len(out) < n:
            c = self.sock.recv(max(1, min(65536, n - len(out))))
            if not c:
                raise IOError("websocket tancat")
            out += c
        return out

    def _read(self, n):
        if not self.rest:
            return self._raw(n)
        take, self.rest = self.rest[:n], self.rest[n:]
        return take if len(take) == n else take + self._raw(n - len(take))

    def send(self, text):
        data = text.encode("utf-8")
        head, n = bytearray([0x81]), len(data)
        if n < 126:
            head.append(0x80 | n)
        elif n < 65536:
            head.append(0x80 | 126); head += struct.pack(">H", n)
        else:
            head.append(0x80 | 127); head += struct.pack(">Q", n)
        mask = os.urandom(4)
        head += mask
        self.sock.sendall(bytes(head) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def recv(self):
        parts = []
        while True:
            b0, b1 = self._read(2)
            fin, op, n = b0 & 0x80, b0 & 0x0F, b1 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._read(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._read(8))[0]
            if b1 & 0x80:
                self._read(4)
            payload = self._read(n) if n else b""
            if op == 0x8:
                raise IOError("el Chrome ha tancat la connexio")
            if op in (0x9, 0xA):
                continue
            parts.append(payload)
            if fin:
                return b"".join(parts).decode("utf-8", "replace")

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass


class Chrome(object):
    def __init__(self, exe, port=9333):
        prof = os.path.join(os.environ.get("TEMP", "/tmp"), "fsl-captures-profile")
        self.proc = subprocess.Popen(
            [exe, "--headless", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
             "--no-default-browser-check", "--disable-extensions",
             "--remote-debugging-port=%d" % port, "--user-data-dir=" + prof, "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.ws, self._id, err = None, 0, None
        for _ in range(150):
            try:
                # /json/new vol un PUT a les versions noves; la pestanya en blanc
                # amb que s'obre el Chrome ja ens serveix i surt a /json/list.
                lst = json.loads(urllib.request.urlopen(
                    "http://127.0.0.1:%d/json/list" % port, timeout=2).read().decode())
                tgt = next(t for t in lst if t.get("type") == "page" and t.get("webSocketDebuggerUrl"))
                self.ws = WS(tgt["webSocketDebuggerUrl"])
                return
            except Exception as e:
                err = e
                time.sleep(0.2)
        raise RuntimeError("el Chrome no ha obert el port de depuracio: %r" % (err,))

    def call(self, method, **params):
        self._id += 1
        mine = self._id
        self.ws.send(json.dumps({"id": mine, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mine:
                if "error" in msg:
                    raise RuntimeError("%s: %s" % (method, msg["error"]))
                return msg.get("result", {})

    def eval(self, expr):
        r = self.call("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        if r.get("exceptionDetails"):
            raise RuntimeError(json.dumps(r["exceptionDetails"])[:300])
        return r["result"].get("value")

    def close(self):
        try:
            self.call("Browser.close")
        except Exception:
            pass
        if self.ws:
            self.ws.close()
        try:
            self.proc.wait(timeout=10)
        except Exception:
            self.proc.kill()


# ──────────────────────────────── captura ────────────────────────────────
def capture(c, shot, sel, light, n, height=0):
    c.call("Emulation.setDeviceMetricsOverride", width=W, height=height or H,
           deviceScaleFactor=DSF, mobile=True)
    # Sense aixo, handheld() es fals i la barra de l'entrada surt amb el boto de
    # la carpeta en comptes del de la camera: el contrari del que veu qui llegeix.
    c.call("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
    url = "http://localhost:%d/_shot.html?n=%d#shot=%s%s" % (PORT, n, shot, "&light" if light else "")
    c.call("Page.navigate", url=url)
    for _ in range(200):
        # Mentre la pagina es canvia no hi ha ni document ni context on avaluar:
        # els errors d'aquests instants no volen dir res.
        try:
            if c.eval("(document.documentElement&&document.documentElement.dataset.shot)||''"):
                break
        except RuntimeError:
            pass
        time.sleep(0.05)
    else:
        raise RuntimeError("la pagina no ha arribat a punt: " + shot)
    bad = c.eval("document.documentElement.dataset.shotError||''")
    if bad:
        raise RuntimeError("el guio %s ha petat: %s" % (shot, bad))
    c.eval("document.activeElement&&document.activeElement.blur()")  # res de cursors parpellejant

    clip = None
    if sel:
        # "A" es l'element A sencer; "A|B" va de dalt de l'A fins a baix del B,
        # per retallar el tros d'una finestra que explica el pas que toca.
        top, _, bot = sel.partition("|")
        r = c.eval("(function(){var a=document.querySelector(%s),b=document.querySelector(%s);"
                   "if(!a||!b)return null;var p=a.getBoundingClientRect(),q=b.getBoundingClientRect();"
                   "return {x:p.left,y:p.top,width:p.width,height:q.bottom-p.top}})()"
                   % (json.dumps(top), json.dumps(bot or top)))
        if not r:
            raise RuntimeError("no hi ha cap %s a %s" % (sel, shot))
        # Cap endins: un rectangle que acaba en 283,6 px agafa, arrodonit cap
        # enfora, una tira del que hi ha al darrere.
        x0, y0 = math.ceil(r["x"]), math.ceil(r["y"])
        x1, y1 = math.floor(r["x"] + r["width"]), math.floor(r["y"] + r["height"])
        clip = {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0, "scale": 1}
    args = {"format": "png", "captureBeyondViewport": False}
    if clip:
        args["clip"] = clip
    return base64.b64decode(c.call("Page.captureScreenshot", **args)["data"])


def trim_bottom(im, pad=24):
    """Treu el fons llis del final, deixant-hi un marge."""
    last = im.crop((0, im.height - 1, im.width, im.height)).tobytes()
    y = im.height - 1
    while y > 1 and im.crop((0, y - 1, im.width, y)).tobytes() == last:
        y -= 1
    return im if y >= im.height - pad else im.crop((0, 0, im.width, min(im.height, y + pad)))


def main(only=None):
    if not CHROME:
        sys.exit("no trobo el Chrome ni l'Edge")
    try:
        socket.create_connection(("localhost", PORT), 2).close()
    except Exception:
        sys.exit("el servidor estatic del port %d no respon (preview_start 'static')" % PORT)
    from PIL import Image

    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    build()
    jobs = [s for s in SHOTS if not only or s[0] in only]
    if not jobs:
        sys.exit("cap captura amb aquest nom: " + ", ".join(s[0] for s in SHOTS))
    c = Chrome(CHROME)
    try:
        c.call("Page.enable")
        n = 0
        for name, shot, sel, height in jobs:
            for light in (True, False):
                n += 1
                png = capture(c, shot, sel, light, n, height)
                im = Image.open(io.BytesIO(png)).convert("RGB")
                if name in TRIM:
                    im = trim_bottom(im)
                path = os.path.join(OUT, "%s-%s.webp" % (name, "clar" if light else "fosc"))
                im.save(path, "WEBP", quality=82, method=6)
                print("%-26s %-5s %4dx%-5d %6.1f kB" % (
                    name, "clar" if light else "fosc", im.width, im.height,
                    os.path.getsize(path) / 1024.0))
    finally:
        c.close()
        if os.path.exists(GEN):
            os.remove(GEN)


if __name__ == "__main__":
    main(sys.argv[1:] or None)
