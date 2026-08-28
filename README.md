# Howff

A haunt for bot templates, skills, and MCPs.

Pronounced HOWFF (how + f). Site: https://howff.dev

The repo is the CMS. Each listing is one JSON file in data/entries.

## Local

Scripts: dev, build, preview, validate. Node 22+.

## Deploy

Cloudflare. This is a static Astro site, not a Worker.

Build command: `npm run build`
Output: `dist`
If the dashboard insists on a deploy command, use:
`npx wrangler pages deploy dist`
Do not use `npx wrangler deploy` unless wrangler.toml has an `[assets]` directory (this repo now does).

Custom domain: howff.dev. wrangler.toml is the config.

## Add an entry

See CONTRIBUTING.md or the submit page on howff.dev. One file per pull request.

## Licence

MIT.
