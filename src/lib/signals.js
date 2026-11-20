import fs from 'node:fs';
import path from 'node:path';

// Build-time readers for data/popularity.json and data/tips.json. Both are
// optional: a missing file means an empty section, never a broken build.
const DATA = path.join(process.cwd(), 'data');

function read(file, fallback) {
  const full = path.join(DATA, file);
  return fs.existsSync(full) ? JSON.parse(fs.readFileSync(full, 'utf8')) : fallback;
}

let popularity;
export function loadPopularity() {
  popularity ??= read('popularity.json', { bots: [], scoring: {}, sources: [] });
  return popularity;
}

export function popularityBySlug() {
  return new Map(loadPopularity().bots.map((b) => [b.slug, b]));
}

let tips;
export function loadTips() {
  tips ??= read('tips.json', { tips: [] }).tips;
  return tips;
}

export function tipsFor(slug) {
  return loadTips().filter((t) => t.slug === slug);
}

const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
export const short = (n) => compact.format(n);

// One honest line about why a bot ranks, from whichever signal is strongest.
export function signalLine(signals) {
  if (!signals) return '';
  if (signals.sharers > 1) return `Shared by ${signals.sharers} people on X`;
  if (signals.bookmarks >= 10) return `${short(signals.bookmarks)} saves on X`;
  if (signals.likes >= 5) return `${short(signals.likes)} likes on X`;
  if (signals.views >= 500) return `${short(signals.views)} views on X`;
  return 'Shared on X';
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const dateFmtYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const shortDate = (iso, year = false) =>
  (year ? dateFmtYear : dateFmt).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
