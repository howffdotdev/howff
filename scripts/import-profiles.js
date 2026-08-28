#!/usr/bin/env node
// One-off importer for upstream Grok Bot profile collections.
// Run by hand, commit the result. Not part of the build or CI.
//
//   node scripts/import-profiles.js
//
// Idempotent: re-running against unchanged upstreams rewrites identical files.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, INTEGRATIONS } from '../src/lib/taxonomy.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', 'entries');

const SOURCES = [
  { repo: 'mergisi/awesome-grokbot', branch: 'main', author: 'mergisi', license: 'CC0-1.0' },
  { repo: 'HAEGONG/grok-bot-profiles', branch: 'main', author: 'HAEGONG', license: 'CC-BY-4.0' },
];

// Every imported bot carries the same added date so the shelf order is stable.
const ADDED = process.env.HOWFF_ADDED ?? '2026-08-28';

let warnings = 0;

function warn(msg) {
  console.warn(`warn · ${msg}`);
  warnings += 1;
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'howff-import' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} · ${url}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'howff-import' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} · ${url}`);
  return res.text();
}

// Upstream frontmatter is a flat key: value block, with [A, B] inline arrays.
// That is the whole grammar in use, so a real YAML parser buys nothing.
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { data: {}, body: raw.trim() };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at === -1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  return { data, body: raw.slice(match[0].length).trim() };
}

// Upstream bodies open with "# <Bot Name>", which the detail page already
// renders as its own h1. Two h1s is both a design and an outline problem.
function stripLeadingH1(body) {
  return body.replace(/^#\s+[^\n]*\n+/, '');
}

function sentence(text) {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

// "You are X, a Grok Bot that <does the thing>." -> "Does the thing."
function taglineFromBody(body, fallbackTitle) {
  if (fallbackTitle) return sentence(fallbackTitle);
  const line = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^You are /i.test(l));
  if (line) {
    const m = /a Grok Bot that\s+([\s\S]+)/i.exec(line);
    if (m) {
      const first = /^(.*?[.!?])(\s|$)/.exec(m[1]);
      return sentence(first ? first[1] : m[1]);
    }
  }
  return null;
}

// The first paragraph under "## What you do".
function descriptionFromBody(body) {
  const m = /^##\s+What you do\s*$([\s\S]*?)(?=^##\s|\Z)/im.exec(body);
  if (!m) return null;
  const para = m[1].trim().split(/\r?\n\s*\r?\n/)[0];
  return para ? sentence(para) : null;
}

function mapIntegrations(list, where) {
  const out = [];
  for (const raw of list ?? []) {
    const hit = INTEGRATIONS.find((i) => i.toLowerCase() === raw.toLowerCase());
    if (!hit) {
      // Fail loudly rather than silently dropping: an unknown tool means the
      // vocabulary in taxonomy.js needs a line, and we want to notice.
      throw new Error(`unknown integration "${raw}" in ${where}. Add it to src/lib/taxonomy.js`);
    }
    if (!out.includes(hit)) out.push(hit);
  }
  return out;
}

async function importSource(source, claimed) {
  const { repo, branch, author, license } = source;
  const tree = await getJSON(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
  );
  const paths = tree.tree
    .map((n) => n.path)
    .filter((p) => /^bots\/[^/]+\/[^/]+\/PROFILE\.md$/.test(p))
    .sort();
  const present = new Set(tree.tree.map((n) => n.path));

  console.log(`\n${repo} · ${paths.length} profiles`);
  const written = [];

  for (const profilePath of paths) {
    const dir = path.posix.dirname(profilePath);
    const folder = path.posix.basename(dir);
    const raw = await getText(`https://raw.githubusercontent.com/${repo}/${branch}/${profilePath}`);
    const { data, body } = parseFrontmatter(raw);

    if (!data.name) {
      warn(`${profilePath} has no name in frontmatter, skipping`);
      continue;
    }
    const category = String(data.category ?? '').toLowerCase();
    if (!CATEGORIES.includes(category)) {
      warn(`${profilePath} has unknown category "${data.category}", skipping`);
      continue;
    }

    let slug = folder;
    if (claimed.has(slug)) {
      const owner = repo.split('/')[0].toLowerCase();
      const next = `${slug}-${owner}`;
      warn(`slug collision on "${slug}", writing as "${next}"`);
      slug = next;
    }
    claimed.add(slug);

    const tagline = taglineFromBody(body, data.title);
    const description = descriptionFromBody(body);
    if (!tagline) {
      warn(`${profilePath} yielded no tagline, skipping`);
      continue;
    }
    if (!description) {
      warn(`${profilePath} yielded no description, skipping`);
      continue;
    }

    const setupPath = `${dir}/SETUP.md`;
    if (!present.has(setupPath)) {
      warn(`${profilePath} has no sibling SETUP.md, skipping`);
      continue;
    }

    const entry = {
      slug,
      name: data.name,
      category,
      tagline,
      description,
      integrations: mapIntegrations(data.integrations, profilePath),
      add: {
        kind: 'profile-url',
        url: `https://raw.githubusercontent.com/${repo}/${branch}/${setupPath}`,
        hint: null,
      },
      instructions: `${slug}.md`,
      source: `https://github.com/${repo}/blob/${branch}/${profilePath}`,
      homepage: `https://github.com/${repo}/tree/${branch}/${dir}`,
      license,
      author,
      tags: [],
      verified: false,
      added: ADDED,
      notes: null,
    };

    fs.writeFileSync(path.join(DIR, `${slug}.json`), `${JSON.stringify(entry, null, 2)}\n`);
    fs.writeFileSync(path.join(DIR, `${slug}.md`), `${stripLeadingH1(body)}\n`);
    written.push(slug);
  }

  console.log(`  wrote ${written.length}`);
  return written;
}

if (!fs.existsSync(DIR)) {
  console.error('data/entries is missing');
  process.exit(1);
}

const claimed = new Set();
let total = 0;
for (const source of SOURCES) {
  total += (await importSource(source, claimed)).length;
}

console.log(`\nimported ${total} bots${warnings ? ` · ${warnings} warning(s)` : ''}`);
