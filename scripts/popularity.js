#!/usr/bin/env node
// Builds data/popularity.json from real, public signals only.
//
//   node scripts/popularity.js                    rebuild from data/signals/
//   node scripts/popularity.js --merge a.json …   fold raw X API v2 search
//                                                 responses into x-posts.json
//                                                 first, then rebuild
//
// Signals live in data/signals/ so a refresh is a data change, not a code one:
//   x-posts.json       public X posts that link a Howff bot's x.ai/bot URL
//   marketplace.json   what the official x.ai marketplace publishes
//
// Nothing here is estimated. A bot with no public signal gets no score.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRIES = path.join(ROOT, 'data', 'entries');
const SIGNALS = path.join(ROOT, 'data', 'signals');
const X_FILE = path.join(SIGNALS, 'x-posts.json');
const MARKET_FILE = path.join(SIGNALS, 'marketplace.json');
const OUT = path.join(ROOT, 'data', 'popularity.json');

const SHARE_RE = /x\.ai\/bot\/([A-Za-z0-9_-]{15,})/;
const HALF_LIFE_DAYS = 30;
const SHARER_BONUS = 10;
const VIEWS_PER_POINT = 250;
const IGNORED_AUTHORS = new Set(['bot', 'grok']);

const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;

function loadShareIds() {
  const bySlug = new Map();
  const byShare = new Map();
  for (const file of fs.readdirSync(ENTRIES)) {
    if (!file.endsWith('.json')) continue;
    const e = JSON.parse(fs.readFileSync(path.join(ENTRIES, file), 'utf8'));
    bySlug.set(e.slug, e);
    const m = (e.add?.url ?? '').match(SHARE_RE);
    if (m) byShare.set(m[1], e.slug);
  }
  return { bySlug, byShare };
}

// Raw X API v2 responses (data + includes.users) become compact post records.
function mergeRaw(files, store, byShare) {
  const posts = new Map(store.posts.map((p) => [p.id, p]));
  let added = 0;
  let updated = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const start = text.indexOf('{"data"');
    if (start < 0) continue;
    const raw = JSON.parse(text.slice(start, text.lastIndexOf('}') + 1));
    const users = new Map((raw.includes?.users ?? []).map((u) => [u.id, u.username]));
    for (const p of raw.data ?? []) {
      const author = users.get(p.author_id) ?? null;
      if (IGNORED_AUTHORS.has(author)) continue;
      const bots = new Set();
      for (const u of p.entities?.urls ?? []) {
        const m = (u.unwound_url ?? u.expanded_url ?? '').match(SHARE_RE);
        if (m && byShare.has(m[1])) bots.add(m[1]);
      }
      if (!bots.size) continue;
      const pm = p.public_metrics ?? {};
      const record = {
        id: p.id,
        author,
        createdAt: p.created_at,
        metrics: {
          likes: pm.like_count ?? 0,
          reposts: pm.retweet_count ?? 0,
          quotes: pm.quote_count ?? 0,
          bookmarks: pm.bookmark_count ?? 0,
          replies: pm.reply_count ?? 0,
          views: pm.impression_count ?? 0,
        },
        bots: [...bots].sort(),
      };
      if (posts.has(p.id)) updated += 1;
      else added += 1;
      posts.set(p.id, record);
    }
  }
  store.posts = [...posts.values()].sort((a, b) => a.id.localeCompare(b.id));
  store.fetchedAt = new Date().toISOString();
  console.log(`merged: ${added} new posts, ${updated} refreshed`);
  return store;
}

// One post's weight, split evenly across every Howff bot it links, so a
// roundup of ten bots does not count as ten endorsements.
function postWeight(m) {
  return (
    m.likes + 2 * m.reposts + 2 * m.quotes + 2 * m.bookmarks + m.replies + m.views / VIEWS_PER_POINT
  );
}

function build() {
  const { bySlug, byShare } = loadShareIds();
  const store = readJson(X_FILE, { posts: [] });
  const market = readJson(MARKET_FILE, { featured: [] });

  const args = process.argv.slice(2);
  const mergeAt = args.indexOf('--merge');
  if (mergeAt >= 0) {
    mergeRaw(args.slice(mergeAt + 1), store, byShare);
    writeCompact(X_FILE, store, 'posts');
  }

  const now = Date.now();
  const day = 86_400_000;
  const stats = new Map();
  const blank = () => ({
    posts: 0,
    sharers: new Set(),
    likes: 0,
    reposts: 0,
    quotes: 0,
    bookmarks: 0,
    replies: 0,
    views: 0,
    last14dPosts: 0,
    lastSharedAt: null,
    weight: 0,
  });

  for (const post of store.posts) {
    const slugs = post.bots.map((id) => byShare.get(id)).filter(Boolean);
    if (!slugs.length) continue;
    const age = Math.max(0, (now - Date.parse(post.createdAt)) / day);
    const share = (postWeight(post.metrics) / slugs.length) * 0.5 ** (age / HALF_LIFE_DAYS);
    for (const slug of slugs) {
      const s = stats.get(slug) ?? blank();
      s.posts += 1;
      if (post.author) s.sharers.add(post.author.toLowerCase());
      for (const k of ['likes', 'reposts', 'quotes', 'bookmarks', 'replies', 'views']) {
        s[k] += post.metrics[k];
      }
      if (age <= 14) s.last14dPosts += 1;
      if (!s.lastSharedAt || post.createdAt > s.lastSharedAt) s.lastSharedAt = post.createdAt;
      s.weight += share;
      stats.set(slug, s);
    }
  }

  const featured = new Set(
    (market.featured ?? []).map((id) => byShare.get(id)).filter(Boolean),
  );
  for (const slug of featured) if (!stats.has(slug)) stats.set(slug, blank());

  const bots = [...stats.entries()]
    .filter(([slug]) => bySlug.has(slug))
    .map(([slug, s]) => ({
      slug,
      score: Math.round(s.weight + SHARER_BONUS * Math.max(0, s.sharers.size - 1)),
      signals: {
        posts: s.posts,
        sharers: s.sharers.size,
        likes: s.likes,
        reposts: s.reposts,
        quotes: s.quotes,
        bookmarks: s.bookmarks,
        replies: s.replies,
        views: s.views,
        last14dPosts: s.last14dPosts,
        lastSharedAt: s.lastSharedAt,
      },
      featured: featured.has(slug),
    }))
    .sort((a, b) => b.score - a.score || b.signals.views - a.signals.views || a.slug.localeCompare(b.slug));

  const out = {
    generatedAt: new Date().toISOString(),
    sources: [
      {
        name: 'X public posts',
        file: 'data/signals/x-posts.json',
        fetchedAt: store.fetchedAt ?? null,
        posts: store.posts.length,
        used: true,
      },
      {
        name: 'x.ai Bot Marketplace',
        file: 'data/signals/marketplace.json',
        fetchedAt: market.fetchedAt ?? null,
        used: 'featured flag only',
        installCounts: market.installCountPublished
          ? 'published'
          : 'not published (every installCount reads 0), so not used',
      },
      {
        name: 'Real install or usage counts from xAI',
        used: false,
        note: 'xAI does not publish per-bot installs or active users for share links.',
      },
    ],
    scoring: {
      summary:
        'How much people on X share and engage with a bot, weighted towards recent posts. A proxy for use, not an install count.',
      postWeight: `likes + 2×reposts + 2×quotes + 2×bookmarks + replies + views/${VIEWS_PER_POINT}`,
      split: 'A post that links several Howff bots splits its weight evenly between them.',
      decay: `Each post's weight halves every ${HALF_LIFE_DAYS} days from when it was posted.`,
      sharerBonus: `+${SHARER_BONUS} for every distinct X account beyond the first that shared the bot.`,
      excluded: 'Reposts, and posts from @bot and @grok.',
      featured: 'featured = picked by xAI on the marketplace. Shown as a badge, never added to the score.',
    },
    bots,
  };
  writeCompact(OUT, out, 'bots');
  console.log(`popularity: ${bots.length} bots with a signal, top ${bots.slice(0, 5).map((b) => b.slug).join(', ')}`);
}

// Readable diffs: one record per line instead of 20.
function writeCompact(file, obj, listKey) {
  const { [listKey]: list, ...head } = obj;
  const headJson = JSON.stringify(head, null, 2).replace(/\n}$/, '');
  const rows = list.map((r) => `    ${JSON.stringify(r)}`).join(',\n');
  fs.writeFileSync(file, `${headJson},\n  "${listKey}": [\n${rows}\n  ]\n}\n`);
}

build();
