/* Translation proxy for the Field Service Log.

   The Cloud Translation API is billed per character. Its key used to travel
   inside index.html, which meant every browser that opened the app — and every
   copy of the file — carried a key that spends money from the project. Here the
   key lives as a Worker secret and never leaves Cloudflare.

   What this does NOT do: prove the caller is the real app. `Origin` is set by
   browsers, not by curl, so anyone who learns this URL can still call it. What
   it buys is that the key is no longer handed out, and that this endpoint is
   ours to rate-limit, rotate or revoke. The real gate comes when the app ships
   licence tokens: check it in `fetch()` beside the origin and nothing else here
   changes. */

const ALLOWED_ORIGINS = ["https://txals13.github.io"];

/* Localhost is allowed only while `wrangler dev` is running. The deployed
   Worker reads ENVIRONMENT="production" from wrangler.toml and the development
   value only ever exists in .dev.vars, which never reaches git — so a local
   origin cannot end up live because someone forgot to re-comment a line. */
const DEV_ORIGINS = ["http://localhost:8080", "http://127.0.0.1:8080"];

function originsFor(env){
  return env.ENVIRONMENT === "development" ? ALLOWED_ORIGINS.concat(DEV_ORIGINS) : ALLOWED_ORIGINS;
}

const GOOGLE = "https://translation.googleapis.com/language/translate/v2";

/* The app already batches under Google's own limits (100 strings, ~20 000
   chars). These are the same ceilings, enforced here so a single call can't
   drain the monthly free tier. */
const MAX_STRINGS = 100;
const MAX_CHARS   = 30000;

function cors(origin, allowed){
  const h = {"Vary": "Origin"};
  if(origin && allowed.includes(origin)){
    h["Access-Control-Allow-Origin"]  = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"]       = "86400";
  }
  return h;
}

/* Google's shape for errors, because that is what the app reads to build the
   "couldn't translate" prompt: j.error.message. */
function fail(status, message, origin, allowed){
  return new Response(JSON.stringify({error:{message:message}}), {
    status: status,
    headers: Object.assign({"Content-Type":"application/json"}, cors(origin, allowed))
  });
}

export default {
  async fetch(request, env){
    const origin  = request.headers.get("Origin");
    const allowed = originsFor(env);

    if(request.method === "OPTIONS") return new Response(null, {status:204, headers:cors(origin, allowed)});
    if(request.method !== "POST")    return fail(405, "method not allowed", origin, allowed);
    if(new URL(request.url).pathname !== "/translate") return fail(404, "not found", origin, allowed);
    if(!allowed.includes(origin)) return fail(403, "origin not allowed", origin, allowed);

    let body;
    try{ body = await request.json(); }
    catch(e){ return fail(400, "invalid request body", origin, allowed); }

    const q = body && body.q;
    if(!Array.isArray(q) || !q.length)          return fail(400, "nothing to translate", origin, allowed);
    if(q.length > MAX_STRINGS)                  return fail(400, "too many strings in one call", origin, allowed);
    if(q.some(t => typeof t !== "string"))      return fail(400, "every item must be text", origin, allowed);
    if(q.reduce((n,t) => n+t.length, 0) > MAX_CHARS) return fail(400, "batch too large", origin, allowed);

    const target = typeof body.target === "string" ? body.target.slice(0,8) : "";
    if(!target) return fail(400, "no target language", origin, allowed);

    /* `format` is fixed here rather than passed through: the app always sends
       HTML (that is how <span translate="no"> survives) and pinning it keeps
       this endpoint from doubling as a general-purpose translator. */
    let res;
    try{
      res = await fetch(GOOGLE + "?key=" + encodeURIComponent(env.TRANSLATE_KEY), {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({q:q, target:target, format:"html"})
      });
    }catch(e){
      return fail(502, "the translator is unreachable", origin, allowed);
    }

    /* Passed through verbatim, status included: the app parses Google's reply
       as it always has, detectedSourceLanguage and all. */
    return new Response(res.body, {
      status: res.status,
      headers: Object.assign({"Content-Type":"application/json"}, cors(origin, allowed))
    });
  }
};
