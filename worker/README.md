# fsl-translate

The translation proxy the app calls instead of Google. It exists so the Cloud
Translation key stops travelling inside `index.html`, where anyone who opened
the app could read it and spend the project's money.

## Deploy

```bash
cd worker
npx wrangler login
npx wrangler secret put TRANSLATE_KEY   # paste the SERVER key, see below
npx wrangler deploy
```

`wrangler deploy` prints the URL (`https://fsl-translate.<subdomain>.workers.dev`).
That URL, with `/translate` on the end, goes into `TR_URL` in `index.html`.

## The two keys

They must be two, and this is the whole point of the exercise:

- **Server key** — new, only Cloud Translation API in its API restrictions, no
  referrer restriction (a Worker sends no `Referer`). Lives only as the
  `TRANSLATE_KEY` secret.
- **PICKER_KEY** — the one in `index.html`. Restrict it in Cloud Console to the
  Picker and Drive APIs and **remove Cloud Translation from it**. Until that is
  done the old key still translates, and the proxy has protected nothing.

Both in project `field-service-log-500615` → APIs & Services → Credentials.

## Checking it

```bash
curl -i -X POST https://fsl-translate.<subdomain>.workers.dev/translate \
  -H "Origin: https://txals13.github.io" -H "Content-Type: application/json" \
  -d '{"q":["Bomba substituïda"],"target":"es"}'
```

Same call without the `Origin` header must answer 403.

## What it does not do

`Origin` is set by browsers; curl says whatever it likes. Anyone who learns this
URL can call it. What changed is that the key is no longer distributed, and this
endpoint can be rate-limited, rotated or revoked — which a key baked into every
copy of the app could not be. The real gate is the licence token, and its place
is the origin check in `src/index.js`.
