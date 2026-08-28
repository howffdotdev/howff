# Contributing

Every bot is two files in data/entries, both named for its slug:

- `<slug>.json` · the metadata
- `<slug>.md` · the bot's instructions, as plain markdown

The submit page drafts both. Open one pull request with them.

Run `npm run validate` before you push. CI runs the same script.

## Keys

All keys are required. Use null or [] when empty.

Keys: slug, name, category, tagline, description, integrations, add,
instructions, source, homepage, license, author, tags, verified, added, notes.

category: productivity | development | marketing | sales | ops | personal |
research | writing | finance | fun

integrations: a subset of the list in src/lib/taxonomy.js, spelled exactly.
Both lists are closed on purpose. Adding a value is its own pull request.

add.kind: share-link | profile-url
add.url: required, http(s). For profile-url use the raw.githubusercontent.com
URL, never a github.com blob page, or the bot receives HTML.
add.hint: a short extra step, or null.

instructions: `<slug>.md`, or null only when add.kind is share-link. A native
share link keeps its prompt behind x.ai, so there is nothing to publish.

verified: false on new entries. Maintainers flip it.
added: YYYY-MM-DD
filename must match slug.json

## The markdown file

Plain markdown. No YAML frontmatter, and no leading `# Bot Name` heading: the
page already renders the name. Start with the prompt itself.

Only submit instructions you wrote, or that are licensed for redistribution,
and record the licence in `license`. For CC-BY, name the author in `author`,
because attribution is a licence condition rather than a courtesy.

## House rules

Real bots, live URLs, one bot per PR, British English, middots or commas rather
than em dashes.
