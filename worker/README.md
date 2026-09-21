# fsl-translate

The translation proxy the app calls instead of Google. It exists so the Cloud
Translation key stops travelling inside `index.html`, where anyone who opened
the app could read it and spend the project's money.

## The two keys

They must be two, and this is the whole point of the exercise:

- **Server key** — new, only Cloud Translation API in its API restrictions, no
  referrer restriction (a Worker sends no `Referer`). Lives only in the
  `TRANSLATE_KEY` secret, and in `.dev.vars` while developing.
- **PICKER_KEY** — the one in `index.html`. Restrict it in Cloud Console to the
  Picker and Drive APIs and **remove Cloud Translation from it**. Until that is
  done the old key still translates, and the proxy has protected nothing.

Both in project `field-service-log-500615` → APIs & Services → Credentials.

## Running it locally

`index.html` looks at `location.hostname`: served from localhost it calls the
proxy on port 8787, anywhere else the live Worker. So a local copy never spends
against the deployed one, and neither needs the other to be running.

```bash
cp .dev.vars.example .dev.vars    # then paste the server key into it
```

```bash
npx wrangler dev
```

That is the proxy, on `http://localhost:8787`. In a second terminal, serve the
app from the **repository root** (not from here):

```bash
python -m http.server 8080 --bind 127.0.0.1
```

`--bind 127.0.0.1` is not optional: the default listens on every interface, and
the repository root contains `.dev.vars` with the real key in plain text.

One last thing, in Cloud Console → Credentials → the OAuth client: add
`http://localhost:8080` to **Authorized JavaScript origins**, or Google refuses
the sign-in and the app never gets far enough to translate anything.

Then open `http://localhost:8080/`. If the app looks stale, it is the service
worker: DevTools → Application → Service workers → Unregister.

`.dev.vars` is gitignored. Keep it that way — it is the plain-text key, which is
precisely what this folder exists to stop publishing.

## Deploy

```bash
npx wrangler secret put TRANSLATE_KEY
```

```bash
npx wrangler deploy
```

`wrangler deploy` prints the URL (`https://fsl-translate.<subdomain>.workers.dev`).
That URL, with `/translate` on the end, goes into `TR_URL` in `index.html`.

The deployed Worker reads `ENVIRONMENT = "production"` from `wrangler.toml`, and
only that value ships — so localhost can never be an accepted origin in
production, whatever `.dev.vars` says.

## Tests

```bash
node test.mjs
```

No framework and no network: Google is stubbed, so it checks what the proxy
itself decides — who may call it, what it refuses, that the dev origins are
allowed only in development, and that Google's answer reaches the app untouched.

Against the deployed Worker, the same check by hand:

```bash
curl -i -X POST https://fsl-translate.<subdomain>.workers.dev/translate -H "Origin: https://txals13.github.io" -H "Content-Type: application/json" -d '{"q":["Bomba substituida"],"target":"es"}'
```

The same call without the `Origin` header must answer 403.

## What it does not do

`Origin` is set by browsers; curl says whatever it likes. Anyone who learns this
URL can call it. What changed is that the key is no longer distributed, and this
endpoint can be rate-limited, rotated or revoked — which a key baked into every
copy of the app could not be. The real gate is the licence token, and its place
is beside the origin check in `src/index.js`.
