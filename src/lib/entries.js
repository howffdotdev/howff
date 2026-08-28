import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'data', 'entries');

export const TYPES = ['template', 'skill', 'mcp'];
export const RUNTIMES = ['cursor', 'claude', 'grok-bot', 'codex', 'any'];

export const TYPE_LABEL = {
  template: 'template',
  skill: 'skill',
  mcp: 'mcp',
};

export const RUNTIME_LABEL = {
  cursor: 'Cursor',
  claude: 'Claude',
  'grok-bot': 'Grok Bot',
  codex: 'Codex',
  any: 'any',
};

export function loadEntries() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
  const entries = files.map((file) => {
    const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
    return JSON.parse(raw);
  });
  return entries.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
}

export function getEntry(slug) {
  return loadEntries().find((e) => e.slug === slug) ?? null;
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

export function stats(entries = loadEntries()) {
  const byType = Object.fromEntries(TYPES.map((t) => [t, 0]));
  const byRuntime = Object.fromEntries(RUNTIMES.map((r) => [r, 0]));
  const byLicense = new Map();
  let verified = 0;

  for (const e of entries) {
    byType[e.type] += 1;
    if (e.verified) verified += 1;
    const lic = e.license ?? 'unspecified';
    byLicense.set(lic, (byLicense.get(lic) ?? 0) + 1);
    const seen = new Set();
    for (const r of e.runtimes) {
      if (!seen.has(r)) {
        byRuntime[r] += 1;
        seen.add(r);
      }
    }
  }

  return {
    total: entries.length,
    verified,
    byType,
    byRuntime,
    byLicense: [...byLicense.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    tags: allTags(entries),
  };
}

export function related(entry, entries = loadEntries(), n = 3) {
  const scored = entries
    .filter((e) => e.slug !== entry.slug)
    .map((e) => {
      let score = 0;
      if (e.type === entry.type) score += 3;
      const shared = e.tags.filter((t) => entry.tags.includes(t)).length;
      score += shared * 2;
      const run = e.runtimes.filter((r) => entry.runtimes.includes(r)).length;
      score += run;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'en-GB'));
  return scored.slice(0, n).map((x) => x.e);
}
