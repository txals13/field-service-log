/* The Field Service Log Worker.

   It holds the Gemini key and hands out the model only to a device that can
   show a valid licence. That is what gives the licence teeth: a copy of
   index.html taken from the public page has no key of its own, so the
   corrector, the report translations, the day summary and the ticket reader
   are simply not there for it. The buyer, in exchange, never has to make a
   Gemini key or open a billing account — which is one obstacle less in every
   sale, and the reason this is worth paying for.

   What this does NOT do: prove the caller is the real app. `Origin` is set by
   browsers, not by curl, so anyone who learns this URL AND holds a licence can
   call it. The licence is what we are checking; the origin check only keeps
   other web pages out.

   Secrets, set with `wrangler secret put` (or in the dashboard):
     GEMINI_KEY   the AI Studio key that pays for the calls

   The old /translate endpoint was removed on 2026-11-04. It proxied Cloud
   Translation, which the app stopped using when the reports moved to Gemini,
   and it took no licence — an unauthenticated endpoint that spends money is
   not worth keeping for nothing. It is in the git history if it is ever
   wanted back, and the TRANSLATE_KEY secret can be deleted. */

const ALLOWED_ORIGINS = ["https://txals13.github.io"];

/* Localhost is allowed only while `wrangler dev` is running. The deployed
   Worker reads ENVIRONMENT="production" from wrangler.toml and the development
   value only ever exists in .dev.vars, which never reaches git — so a local
   origin cannot end up live because someone forgot to re-comment a line. */
const DEV_ORIGINS = ["http://localhost:8080", "http://127.0.0.1:8080",
                     "http://localhost:8420", "http://127.0.0.1:8420"];

function originsFor(env){
  return env.ENVIRONMENT === "development" ? ALLOWED_ORIGINS.concat(DEV_ORIGINS) : ALLOWED_ORIGINS;
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/";

/* Only the two models the app actually asks for. Without this, a licence would
   be a licence to spend our money on whatever model the caller names. */
const MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];

/* A ticket can be a whole PDF, so this has to be generous — but not unbounded.
   Gemini's own limit for inline data is what really applies; this is here so a
   single call cannot be used to run up a bill or tie up the Worker. */
const MAX_BODY = 20 * 1024 * 1024;

/* The public half of the licence key. The same one that is in index.html —
   public by definition, it only ever verifies. */
const LIC_PUB = {"kty":"EC","crv":"P-256",
  "x":"i5WMBBT-5fox0P6va1CKRd5SbvuyqDCWzpudAhpErtA",
  "y":"uLmv4izNR0kh7PxRHb0WXk0TI0iDQypzIt4kwgjwhf0"};
const LIC_GRACE_DAYS = 30;    // same courtesy the app gives, so the two agree

let licKey = null;
async function licPubKey(){
  if(!licKey) licKey = await crypto.subtle.importKey("jwk", LIC_PUB,
    {name:"ECDSA", namedCurve:"P-256"}, false, ["verify"]);
  return licKey;
}
function b64u(s){
  s = String(s).replace(/-/g,"+").replace(/_/g,"/");
  while(s.length % 4) s += "=";
  const b = atob(s), a = new Uint8Array(b.length);
  for(let i=0;i<b.length;i++) a[i] = b.charCodeAt(i);
  return a;
}
/* Same check as the app's, deliberately: FSL1.<payload>.<signature>, ECDSA
   P-256 over the payload AS ENCODED. If these two ever disagree, a customer
   gets a licence that opens the app but not the model, which is the most
   confusing failure there is. */
async function licCheck(tok){
  const p = String(tok || "").trim().split(".");
  if(p.length !== 3 || p[0] !== "FSL1") return null;
  let ok = false;
  try{
    ok = await crypto.subtle.verify({name:"ECDSA", hash:"SHA-256"}, await licPubKey(),
      b64u(p[2]), new TextEncoder().encode(p[1]));
  }catch(e){ return null; }
  if(!ok) return null;
  let d;
  try{ d = JSON.parse(new TextDecoder().decode(b64u(p[1]))); }catch(e){ return null; }
  if(!d || !d.n || !d.x) return null;
  const end = Date.parse(d.x + "T23:59:59Z");
  if(isNaN(end)) return null;
  if(Date.now() > end + LIC_GRACE_DAYS*864e5) return null;   // expired, past the grace
  return d;
}

function cors(origin, allowed){
  const h = {"Vary":"Origin"};
  if(origin && allowed.includes(origin)){
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
function fail(status, message, origin, allowed){
  return new Response(JSON.stringify({error:{message}}), {
    status,
    headers: Object.assign({"Content-Type":"application/json"}, cors(origin, allowed))
  });
}

export default {
  async fetch(request, env){
    const origin = request.headers.get("Origin");
    const allowed = originsFor(env);
    if(request.method === "OPTIONS") return new Response(null, {status:204, headers:cors(origin, allowed)});
    if(request.method !== "POST")    return fail(405, "method not allowed", origin, allowed);
    if(new URL(request.url).pathname !== "/gemini") return fail(404, "not found", origin, allowed);
    if(!allowed.includes(origin))    return fail(403, "origin not allowed", origin, allowed);

    const len = Number(request.headers.get("Content-Length") || 0);
    if(len > MAX_BODY) return fail(413, "the request is too big", origin, allowed);

    /* The licence, before anything is read or forwarded. */
    const auth = request.headers.get("Authorization") || "";
    const tok = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const lic = await licCheck(tok);
    if(!lic) return fail(401, "no licence, or it is not valid any more", origin, allowed);

    let body;
    try{ body = await request.json(); }
    catch(e){ return fail(400, "invalid request body", origin, allowed); }

    const model = body && typeof body.model === "string" ? body.model : "";
    if(!MODELS.includes(model)) return fail(400, "unknown model", origin, allowed);
    if(!body.req || typeof body.req !== "object") return fail(400, "nothing to ask", origin, allowed);

    if(!env.GEMINI_KEY) return fail(500, "the service has no key configured", origin, allowed);

    let res;
    try{
      res = await fetch(GEMINI + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(env.GEMINI_KEY), {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(body.req)
      });
    }catch(e){
      return fail(502, "the model is unreachable", origin, allowed);
    }
    /* Gemini's own answer, passed through untouched: the app parses exactly
       what it parsed when it called Google directly, errors included. */
    return new Response(res.body, {
      status: res.status,
      headers: Object.assign({"Content-Type":"application/json"}, cors(origin, allowed))
    });
  }
};
