# Howff

A haunt for Grok Bots. Every bot on the shelf shows its full instructions, so
you can read it before you add it.

Pronounced HOWFF (how + f). Site: https://howff.dev

The repo is the CMS. Each bot is two files in data/entries: `<slug>.json` for
the metadata and `<slug>.md` for the instructions.

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

## Add a bot

See CONTRIBUTING.md or the submit page on howff.dev. One bot per pull request.

## Sources

The seeded bots come from mergisi/awesome-grokbot (CC0-1.0) and
HAEGONG/grok-bot-profiles (CC-BY-4.0). `node scripts/import-profiles.js`
re-imports them; it is idempotent and not part of the build.

## Licence

MIT.
