# -*- coding: utf-8 -*-
"""Les proves automatiques de la fusio entre aparells.

    python tools/proves.py

Que fa: construeix un _proves.html (l'index.html amb una porta cap a dins del
codi de l'app i, al darrere, tools/proves.js), el serveix ell mateix en un port
propi, l'obre amb el Chrome sense finestra i recull el resultat de cada prova.
Surt amb 0 si han passat totes i amb 1 si n'ha fallat alguna. El _proves.html
s'esborra en acabar i no es publica mai.

Que es prova: el que fa perdre feina a algu si es trenca i que no es pot
comprovar mirant una pantalla. Dues copies d'una visita fetes una (entrades,
camps, esborrats), com s'apunta cada canvi, les despeses, les notes
d'esborrat, el fitxer d'historial i la llista d'usuaris. Les proves son a
tools/proves.js; les dades son inventades.

Per que amb el Chrome i no amb Node: l'app es un sol fitxer que viu al
navegador, i en aquest ordinador no hi ha Node. Aixi les proves corren contra
el mateix codi que es publica, sense treure'n cap funcio a part.

Quan passar-les: abans de publicar qualsevol canvi que toqui la sincronitzacio,
el desat, l'historial o les despeses. Cal: el Chrome o l'Edge. No cal el
servidor de les captures.
"""
import functools, http.server, io, json, os, socket, sys, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC  = os.path.join(ROOT, "index.html")
GEN  = os.path.join(ROOT, "_proves.html")
PORT = 8421                      # sempre el mateix: un sol origen al perfil del Chrome

sys.path.insert(0, HERE)
from captures import Chrome, CHROME   # el mateix Chrome sense finestra de les captures

HOOK = "window.__fsl=function(c){return eval(c)};   // les proves: una porta cap a dins de l'app"


def build(src=None):
    """L'index.html sense res que no acabi mai, amb la porta i les proves."""
    s = src if src is not None else io.open(SRC, encoding="utf-8", newline="").read()
    s = s.replace("\r\n", "\n")
    # Ni service worker ni arrencada asincrona (IndexedDB, Drive, la cua de
    # pujades): les proves criden funcions, no fan servir l'app.
    s = s.replace('if("serviceWorker" in navigator){', 'if(false){')
    a = s.index('$$("content").innerHTML="<div class=\\"empty\\"><span class=\\"spinner\\"></span>')
    b = s.index("\n})();", s.index("(async function(){", a))
    s = s[:a] + "/* l'arrencada s'ha retirat per a les proves */\n" + s[b + len("\n})();"):]
    lines = s.split("\n")
    i = max(k for k, l in enumerate(lines) if l.rstrip() == "})();")
    lines.insert(i, HOOK)
    s = "\n".join(lines)
    # L'ultim </body>: els informes en HTML que fa l'app en porten un a dins.
    k = s.rfind("</body>")
    if k < 0:
        sys.exit("no trobo el final de la pagina")
    s = s[:k] + '<script src="tools/proves.js"></script>\n' + s[k:]
    io.open(GEN, "w", encoding="utf-8", newline="").write(s)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    try:
        socket.create_connection(("localhost", PORT), 1).close()
        sys.exit("el port %d ja esta ocupat: hi ha unes altres proves en marxa?" % PORT)
    except (OSError, socket.timeout):
        pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT),
                                          functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def run(src=None):
    """Torna la llista de resultats: {g: grup, n: nom, ok: bool, m: missatge}."""
    if not CHROME:
        sys.exit("no trobo el Chrome ni l'Edge")
    build(src)
    srv = serve()
    c = None
    try:
        c = Chrome(CHROME, port=9334)
        c.call("Page.enable")
        c.call("Page.navigate", url="http://127.0.0.1:%d/_proves.html?perfil=proves&t=%d" % (PORT, time.time()))
        out = None
        for _ in range(600):
            try:
                out = c.eval("window.__proves&&window.__proves.done?JSON.stringify(window.__proves):''")
                if out:
                    break
            except RuntimeError:
                pass
            time.sleep(0.05)
        if not out:
            # la pagina no ha arribat a executar les proves: que diu el registre d'errors?
            why = ""
            try:
                why = c.eval("JSON.stringify((window.fslErr&&window.fslErr.list())||[])")
            except Exception:
                pass
            sys.exit("les proves no han arribat a executar-se. " + (why or ""))
        # res d'aixo ha de quedar al perfil del Chrome d'una vegada per l'altra
        try:
            c.eval("(function(){for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);"
                   "if(k.indexOf('fsl_v6_p_proves_')===0||k==='fsl_errlog')localStorage.removeItem(k)}})()")
        except Exception:
            pass
        res = json.loads(out)
        if res.get("fatal"):
            sys.exit("les proves no han pogut comencar: " + res["fatal"])
        return res.get("results", [])
    finally:
        if c:
            c.close()
        srv.shutdown()
        srv.server_close()
        if os.path.exists(GEN):
            os.remove(GEN)


def main():
    res = run()
    bad = [r for r in res if not r.get("ok")]
    group = None
    for r in res:
        if r["g"] != group:
            group = r["g"]
            print("\n" + group)
        print("  %s %s" % ("ok " if r.get("ok") else "FALLA", r["n"]))
        if not r.get("ok"):
            print("        " + r.get("m", ""))
    print("\n%d proves, %d fallades" % (len(res), len(bad)))
    sys.exit(1 if bad or not res else 0)


if __name__ == "__main__":
    main()
