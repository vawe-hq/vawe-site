# vawe-site

The source of https://vawe.dev: the marketing site (`site/`, a Next 15 app), its build scripts
(`scripts/site/`) and its SEO and typography gates (`quality/gates/`). The engine is in
[vawe-hq/vawe](https://github.com/vawe-hq/vawe). The docs app is in
[vawe-hq/vawe-docs](https://github.com/vawe-hq/vawe-docs); this site proxies `/docs/*` to it.

The history before the split (2026-11-21) is the history of these paths in vawe-hq/vawe.

## Run it

```
cd site && npm ci
node ../vendor/vawe/generators/media/fonts.mjs   # fetch the free, hash-locked faces (never committed)
npm run dev                                      # predev copies the faces and rebuilds the generated JSON
```

Build and image: `DOCS_ORIGIN=<docs origin> npm run prebuild && npx next build` in `site/`, or
`docker build --build-arg DOCS_ORIGIN=<docs origin> -t vawe-site .` at the repo root. `DOCS_ORIGIN` is required
(Next bakes the `/docs` rewrites into the build). The image listens on port 3000.

Tests and gates: `npm test` and `node quality/gates/<gate>.mjs` at the repo root
(`site-typography`, `seo-surface`, `seo-pseo`, `site-build-check`). Set `DOCS_DIR` to a vawe-docs checkout
for the docs checks.

## The vawe engine files

`vendor/vawe/` holds the engine files the site reads (the motion library, the clip hash, the font script and
its lock, the brand-art cards, the engine `package.json`) at the commit named in `vendor/vawe/PIN`. Do not edit
them here. Update them with the "sync vawe vendor" workflow, or with `node scripts/vendor-sync.mjs ../vawe`
against a vawe checkout (`--check` reports drift).

Two generators need a vawe checkout, because they read `prompts/moves` and its git dates:
`scripts/site/moves.mjs` and `easing.mjs`. Without one, the prebuild keeps the committed
`site/lib/moves.json` and `easing.json`. Put a checkout at `../vawe` or set `VAWE_DIR`. The scripts that render
films (`og-cards.mjs`, `easing-clips.mjs`, `easing-rule-clips.mjs`, `inspiration.mjs`) need it too.

## Docs vendor

`.github/workflows/sync-docs-vendor.yml` copies `site/lib/typo.mjs` and `site/lib/md/accept.ts` to vawe-docs.
It needs the secret `DOCS_DEPLOY_KEY`.
