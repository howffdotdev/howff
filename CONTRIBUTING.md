# Contributing

Every listing is one JSON file in data/entries, named for its slug.
The submit page drafts the file. Open a pull request with that file.

All keys are required. Use null or [] when empty.

Keys: slug, name, type, tagline, description, runtimes, install, source,
homepage, license, author, tags, verified, added, notes.

type: template | skill | mcp
runtimes: cursor | claude | grok-bot | codex | any
install.kind: url | npx | skill-md | mcp-json | git
verified: false on new entries
added: YYYY-MM-DD
filename must match slug.json

House rules: real software, live URLs, one entry per PR, British English, middots or commas rather than em dashes. Run the validate script locally.
