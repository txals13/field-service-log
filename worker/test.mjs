/* No framework and no network: Google is stubbed, so this checks what the proxy
   itself decides — who may call it, what it refuses, and that Google's answer
   reaches the app untouched. Run it with:  node test.mjs  */
import w from "./src/index.js";

const APP   = "https://txals13.github.io";
const LOCAL = "http://localhost:8080";
const PROD = {TRANSLATE_KEY:"fake-key", ENVIRONMENT:"production"};
const DEV  = {TRANSLATE_KEY:"fake-key", ENVIRONMENT:"development"};

let sent = null;
const stubGoogle = () => { globalThis.fetch = async (url, init) => {
  sent = {url, body: JSON.parse(init.body)};
  return new Response(JSON.stringify({data:{translations:[{translatedText:"Bomba sustituida",detectedSourceLanguage:"ca"}]}}),
    {status:200, headers:{"Content-Type":"application/json"}});
}; };
stubGoogle();

const post = (body, origin=APP, path="/translate") => new Request("https://w.dev"+path, {
  method:"POST", headers: origin ? {"Origin":origin,"Content-Type":"application/json"} : {"Content-Type":"application/json"},
  body: JSON.stringify(body)
});

let bad = 0;
const ok = (n,c) => { if(!c) bad++; console.log((c?"PASS":"FAIL")+"  "+n); };
let r;

// --- the live Worker -------------------------------------------------------
r = await w.fetch(new Request("https://w.dev/translate",{method:"OPTIONS",headers:{Origin:APP}}), PROD);
ok("preflight 204 + CORS", r.status===204 && r.headers.get("Access-Control-Allow-Origin")===APP);

r = await w.fetch(post({q:["Bomba substituida"],target:"es"}), PROD);
const j = await r.json();
ok("happy path 200", r.status===200 && j.data.translations[0].translatedText==="Bomba sustituida");
ok("detectedSourceLanguage survives", j.data.translations[0].detectedSourceLanguage==="ca");
ok("key added server-side", sent.url.includes("key=fake-key"));
ok("format pinned to html", sent.body.format==="html");
ok("CORS on the answer", r.headers.get("Access-Control-Allow-Origin")===APP);

r = await w.fetch(post({q:["x"],target:"es"}, null), PROD);
ok("no Origin -> 403", r.status===403);
r = await w.fetch(post({q:["x"],target:"es"}, "https://evil.example"), PROD);
ok("wrong Origin -> 403", r.status===403);
r = await w.fetch(post({q:["x"],target:"es"}, APP, "/"), PROD);
ok("wrong path -> 404", r.status===404);
r = await w.fetch(new Request("https://w.dev/translate",{method:"GET",headers:{Origin:APP}}), PROD);
ok("GET -> 405", r.status===405);
r = await w.fetch(post({q:[],target:"es"}), PROD);
ok("empty batch -> 400", r.status===400);
r = await w.fetch(post({q:["x"]}), PROD);
ok("no target -> 400", r.status===400);
r = await w.fetch(post({q:new Array(101).fill("x"),target:"es"}), PROD);
ok("101 strings -> 400", r.status===400);
r = await w.fetch(post({q:["x".repeat(30001)],target:"es"}), PROD);
ok("oversized batch -> 400", r.status===400);
r = await w.fetch(post({q:[{}],target:"es"}), PROD);
ok("non-text item -> 400", r.status===400);

// --- localhost is production-forbidden, dev-allowed ------------------------
r = await w.fetch(post({q:["x"],target:"es"}, LOCAL), PROD);
ok("localhost rejected in production", r.status===403);
r = await w.fetch(new Request("https://w.dev/translate",{method:"OPTIONS",headers:{Origin:LOCAL}}), PROD);
ok("localhost preflight carries no CORS in production", !r.headers.get("Access-Control-Allow-Origin"));

r = await w.fetch(post({q:["x"],target:"es"}, LOCAL), DEV);
ok("localhost accepted in dev", r.status===200);
r = await w.fetch(post({q:["x"],target:"es"}, "http://127.0.0.1:8080"), DEV);
ok("127.0.0.1 accepted in dev", r.status===200);
r = await w.fetch(post({q:["x"],target:"es"}, APP), DEV);
ok("the live origin still works in dev", r.status===200);
r = await w.fetch(post({q:["x"],target:"es"}, "https://evil.example"), DEV);
ok("dev still rejects a stranger", r.status===403);
r = await w.fetch(post({q:["x"],target:"es"}, LOCAL), {TRANSLATE_KEY:"k"});
ok("no ENVIRONMENT set -> treated as production", r.status===403);

// --- google down -----------------------------------------------------------
globalThis.fetch = async()=>{ throw new Error("down") };
r = await w.fetch(post({q:["x"],target:"es"}), PROD);
const ej = await r.json();
ok("google unreachable -> 502 with error.message", r.status===502 && typeof ej.error.message==="string");
stubGoogle();

console.log(bad ? "\n"+bad+" FAILED" : "\nall green");
