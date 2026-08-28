import fs from 'node:fs';
import path from 'node:path';
import { CATEGORIES, CATEGORY_LABEL, INTEGRATIONS } from './taxonomy.js';

const DIR = path.join(process.cwd(), 'data', 'entries');

export { CATEGORIES, CATEGORY_LABEL, INTEGRATIONS };
export { CATEGORY_BLURB } from './taxonomy.js';
export { ADD_KINDS, ADD_LABEL, ADD_HINT, RESERVED_SLUGS } from './taxonomy.js';

// Newest first. A growing shelf should show new arrivals, not the letter A.
export function loadEntries() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
  const entries = files.map((file) => {
    const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
    return JSON.parse(raw);
  });
  return entries.sort(
    (a, b) => b.added.localeCompare(a.added) || a.name.localeCompare(b.name, 'en-GB'),
  );
}

export function getEntry(slug) {
  return loadEntries().find((e) => e.slug === slug) ?? null;
}

// Raw instructions markdown, or null for share-link bots that have none.
export function readInstructions(entry) {
  if (!entry.instructions) return null;
  const file = path.join(DIR, entry.instructions);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

export function allTags(entries = loadEntries()) {
  const counts = new Map();
  for (const e of entries) {
    for (const tag of e.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// Ordered by the taxonomy, not by count, so the pill row never reshuffles.
export function allIntegrations(entries = loadEntries()) {
  const counts = new Map();
  for (const e of entries) {
    for (const name of e.integrations) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return INTEGRATIONS.filter((name) => counts.has(name)).map((name) => [name, counts.get(name)]);
}

export function categoryCounts(entries = loadEntries()) {
  const counts = new Map(CATEGORIES.map((c) => [c, 0]));
  for (const e of entries) {
    counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  }
  return CATEGORIES.filter((c) => counts.get(c) > 0).map((c) => [c, counts.get(c)]);
}

export function byCategory(category, entries = loadEntries()) {
  return entries.filter((e) => e.category === category);
}

export function stats(entries = loadEntries()) {
  const byCat = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  const byAdd = { 'share-link': 0, 'profile-url': 0 };
  const byLicense = new Map();
  let verified = 0;
  let withInstructions = 0;

  for (const e of entries) {
    byCat[e.category] += 1;
    byAdd[e.add.kind] += 1;
    if (e.verified) verified += 1;
    if (e.instructions) withInstructions += 1;
    const lic = e.license ?? 'unspecified';
    byLicense.set(lic, (byLicense.get(lic) ?? 0) + 1);
  }

  return {
    total: entries.length,
    verified,
    withInstructions,
    byCategory: byCat,
    byAdd,
    byLicense: [...byLicense.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    integrations: allIntegrations(entries),
    tags: allTags(entries),
  };
}

// Same category counts most, then shared tools, then shared tags.
export function related(entry, entries = loadEntries(), n = 3) {
  const scored = entries
    .filter((e) => e.slug !== entry.slug)
    .map((e) => {
      let score = 0;
      if (e.category === entry.category) score += 3;
      score += e.integrations.filter((i) => entry.integrations.includes(i)).length * 2;
      score += e.tags.filter((t) => entry.tags.includes(t)).length;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'en-GB'));
  return scored.slice(0, n).map((x) => x.e);
}
