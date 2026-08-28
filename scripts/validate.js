#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, INTEGRATIONS, ADD_KINDS, RESERVED_SLUGS } from '../src/lib/taxonomy.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', 'entries');

const CATEGORY_SET = new Set(CATEGORIES);
const INTEGRATION_SET = new Set(INTEGRATIONS);
const ADD_KIND_SET = new Set(ADD_KINDS);
const RESERVED = new Set(RESERVED_SLUGS);

const REQUIRED = [
  'slug',
  'name',
  'category',
  'tagline',
  'description',
  'integrations',
  'add',
  'instructions',
  'source',
  'homepage',
  'license',
  'author',
  'tags',
  'verified',
  'added',
  'notes',
];
const ADD_KEYS = ['kind', 'url', 'hint'];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTP_RE = /^https?:\/\//;

let errors = 0;

function fail(file, msg) {
  console.error(`${file}: ${msg}`);
  errors += 1;
}

function isNullOrString(v) {
  return v === null || typeof v === 'string';
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

if (!fs.existsSync(DIR)) {
  fail('data/entries', 'directory missing');
  process.exit(1);
}

const all = fs.readdirSync(DIR);
const files = all.filter((f) => f.endsWith('.json')).sort();
const markdown = new Set(all.filter((f) => f.endsWith('.md')));
if (files.length === 0) fail('data/entries', 'no JSON files');

const slugs = new Set();
const claimedMarkdown = new Set();

for (const file of files) {
  const full = path.join(DIR, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (err) {
    fail(file, `invalid JSON (${err.message})`);
    continue;
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    fail(file, 'root must be an object');
    continue;
  }

  for (const key of REQUIRED) {
    if (!(key in data)) fail(file, `missing key: ${key}`);
  }
  for (const key of Object.keys(data)) {
    if (!REQUIRED.includes(key)) fail(file, `unknown key: ${key}`);
  }

  if (typeof data.slug !== 'string' || !SLUG_RE.test(data.slug)) {
    fail(file, 'slug must be lowercase kebab-case');
  } else {
    if (file !== `${data.slug}.json`) fail(file, `filename must be ${data.slug}.json`);
    if (slugs.has(data.slug)) fail(file, 'duplicate slug');
    if (RESERVED.has(data.slug)) fail(file, 'slug is reserved for a page or route');
    slugs.add(data.slug);
  }

  if (typeof data.name !== 'string' || !data.name.trim()) fail(file, 'name must be a non-empty string');
  if (!CATEGORY_SET.has(data.category)) {
    fail(file, `category must be one of: ${CATEGORIES.join(' | ')}`);
  }
  if (typeof data.tagline !== 'string' || !data.tagline.trim()) fail(file, 'tagline must be a non-empty string');
  if (typeof data.description !== 'string' || !data.description.trim()) {
    fail(file, 'description must be a non-empty string');
  }

  if (!isStringArray(data.integrations)) {
    fail(file, 'integrations must be an array of strings');
  } else {
    for (const name of data.integrations) {
      if (!INTEGRATION_SET.has(name)) {
        fail(file, `unknown integration: ${name}. Add it to src/lib/taxonomy.js first`);
      }
    }
    if (new Set(data.integrations).size !== data.integrations.length) {
      fail(file, 'integrations has duplicates');
    }
  }

  const add = data.add;
  if (add === null || typeof add !== 'object' || Array.isArray(add)) {
    fail(file, 'add must be an object');
  } else {
    for (const k of ADD_KEYS) {
      if (!(k in add)) fail(file, `add missing key: ${k}`);
    }
    for (const k of Object.keys(add)) {
      if (!ADD_KEYS.includes(k)) fail(file, `add unknown key: ${k}`);
    }
    if (!ADD_KIND_SET.has(add.kind)) fail(file, `add.kind must be one of: ${ADD_KINDS.join(' | ')}`);
    if (typeof add.url !== 'string' || !HTTP_RE.test(add.url)) {
      fail(file, 'add.url must be an http(s) URL');
    }
    if (!isNullOrString(add.hint)) fail(file, 'add.hint must be string or null');
  }

  // Instructions are the point of the shelf, so they are required for anything
  // whose prompt is publicly fetchable. A native share link keeps its prompt
  // behind x.ai, so that is the one exemption.
  if (!isNullOrString(data.instructions)) {
    fail(file, 'instructions must be a filename string or null');
  } else if (data.instructions === null) {
    if (add?.kind !== 'share-link') {
      fail(file, 'instructions is required unless add.kind is share-link');
    }
  } else {
    if (data.instructions !== `${data.slug}.md`) {
      fail(file, `instructions must be ${data.slug}.md`);
    }
    if (!markdown.has(data.instructions)) {
      fail(file, `instructions file is missing: data/entries/${data.instructions}`);
    } else {
      claimedMarkdown.add(data.instructions);
      const body = fs.readFileSync(path.join(DIR, data.instructions), 'utf8');
      if (!body.trim()) fail(file, `instructions file is empty: ${data.instructions}`);
      if (/^---\r?\n/.test(body)) {
        fail(file, `${data.instructions} still has YAML frontmatter; the JSON holds the metadata`);
      }
      // The page renders name as its own h1, so a leading one duplicates it.
      if (/^#\s/.test(body)) {
        fail(file, `${data.instructions} starts with an h1; the page already renders the name`);
      }
    }
  }

  for (const field of ['source', 'homepage']) {
    if (!isNullOrString(data[field])) fail(file, `${field} must be string or null`);
    else if (typeof data[field] === 'string' && !HTTP_RE.test(data[field])) {
      fail(file, `${field} must be http(s)`);
    }
  }

  if (!isNullOrString(data.license)) fail(file, 'license must be string or null');
  if (!isNullOrString(data.author)) fail(file, 'author must be string or null');
  if (!isStringArray(data.tags)) fail(file, 'tags must be an array of strings');
  if (typeof data.verified !== 'boolean') fail(file, 'verified must be a boolean');
  if (typeof data.added !== 'string' || !DATE_RE.test(data.added)) {
    fail(file, 'added must be YYYY-MM-DD');
  } else if (Number.isNaN(Date.parse(data.added))) {
    fail(file, 'added is not a real date');
  }
  if (!isNullOrString(data.notes)) fail(file, 'notes must be string or null');
}

for (const md of [...markdown].sort()) {
  if (!claimedMarkdown.has(md)) {
    fail(md, 'markdown file has no entry pointing at it');
  }
}

if (errors) {
  console.error(`\n${errors} error(s).`);
  process.exit(1);
}

console.log(`ok · ${files.length} bots · ${claimedMarkdown.size} with instructions`);
