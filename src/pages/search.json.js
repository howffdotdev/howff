import { loadEntries } from '../lib/entries.js';
import { popularityBySlug } from '../lib/signals.js';

// The compact index the homepage search downloads on first use.
// Row: [slug, name, tagline, author, category, "tag tag integration…", score]
export function GET() {
  const pop = popularityBySlug();
  const rows = loadEntries().map((e) => [
    e.slug,
    e.name,
    e.tagline,
    e.author ?? '',
    e.category,
    [...e.tags, ...e.integrations].join(' '),
    pop.get(e.slug)?.score ?? 0,
  ]);
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
