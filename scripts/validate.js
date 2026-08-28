#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', 'entries');

const TYPES = new Set(['template', 'skill', 'mcp']);
const RUNTIMES = new Set(['cursor', 'claude', 'grok-bot', 'codex', 'any']);
const RESERVED = new Set([...TYPES, ...['cursor', 'claude', 'grok-bot', 'codex', 'any'], 'about', 'submit', 'stats', 'contribute']);
const INSTALL_KINDS = new Set(['url', 'npx', 'skill-md', 'mcp-json', 'git']);
const REQUIRED = [
  'slug',
  'name',
  'type',
  'tagline',
  'description',
  'runtimes',
  'install',
  'source',
  'homepage',
  'license',
  'author',
  'tags',
  'verified',
  'added',
  'notes',
];
const INSTALL_KEYS = ['kind', 'command', 'url'];
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

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
if (files.length === 0) fail('data/entries', 'no JSON files');

const slugs = new Set();

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
    if (RESERVED.has(data.slug)) fail(file, 'slug is reserved for a filter or page');
    slugs.add(data.slug);
  }

  if (typeof data.name !== 'string' || !data.name.trim()) fail(file, 'name must be a non-empty string');
  if (!TYPES.has(data.type)) fail(file, 'type must be template | skill | mcp');
  if (typeof data.tagline !== 'string' || !data.tagline.trim()) fail(file, 'tagline must be a non-empty string');
  if (typeof data.description !== 'string' || !data.description.trim()) {
    fail(file, 'description must be a non-empty string');
  }

  if (!Array.isArray(data.runtimes) || data.runtimes.length === 0) {
    fail(file, 'runtimes must be a non-empty array');
  } else {
    for (const r of data.runtimes) {
      if (!RUNTIMES.has(r)) fail(file, `unknown runtime: ${r}`);
    }
  }

  const inst = data.install;
  if (inst === null || typeof inst !== 'object' || Array.isArray(inst)) {
    fail(file, 'install must be an object');
  } else {
    for (const k of INSTALL_KEYS) {
      if (!(k in inst)) fail(file, `install missing key: ${k}`);
    }
    for (const k of Object.keys(inst)) {
      if (!INSTALL_KEYS.includes(k)) fail(file, `install unknown key: ${k}`);
    }
    if (!INSTALL_KINDS.has(inst.kind)) fail(file, 'install.kind is invalid');
    if (!isNullOrString(inst.command)) fail(file, 'install.command must be string or null');
    if (!isNullOrString(inst.url)) fail(file, 'install.url must be string or null');
    if (inst.command === null && inst.url === null) {
      fail(file, 'install needs a command or a url');
    }
    if (typeof inst.url === 'string' && !HTTP_RE.test(inst.url)) {
      fail(file, 'install.url must be http(s)');
    }
    if (inst.kind === 'npx' && !inst.command) fail(file, 'npx install needs a command');
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
  } else {
    const t = Date.parse(data.added);
    if (Number.isNaN(t)) fail(file, 'added is not a real date');
  }
  if (!isNullOrString(data.notes)) fail(file, 'notes must be string or null');
}

if (errors) {
  console.error(`\n${errors} error(s).`);
  process.exit(1);
}

console.log(`ok · ${files.length} entries`);
