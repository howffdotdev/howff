// Homepage instant search. The index (/search.json) is fetched on first focus
// or keypress, so the page itself ships no bot data. Plain JS, no framework.

// Old shared links put filters on the homepage. The full shelf lives at /all.
if (/[?&](q|cat|int|tag|sort)=/.test(location.search)) {
  location.replace(`/all${location.search}`);
}

const form = document.getElementById('finder');
const input = document.getElementById('find');
const list = document.getElementById('find-results');
const status = document.getElementById('find-status');
const LIMIT = 8;
const CATS = JSON.parse(form?.dataset.cats ?? '{}');

let rows = null;
let loading = null;
let active = -1;
let shown = [];

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function load() {
  loading ??= fetch('/search.json')
    .then((r) => r.json())
    .then((data) => {
      rows = data.map(([slug, name, tagline, author, cat, tags, score]) => ({
        slug,
        name,
        tagline,
        author,
        cat,
        score,
        n: norm(name),
        nw: norm(name).split(' '),
        t: norm(tagline),
        a: norm(author),
        g: norm(`${tags} ${cat} ${slug}`),
        gw: norm(`${tags} ${cat}`).split(' '),
      }));
      if (input.value) render();
    })
    .catch(() => {
      loading = null;
    });
  return loading;
}

// Levenshtein with an early exit once the distance passes `max`.
function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

function subsequence(needle, hay) {
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i++;
  return i === needle.length;
}

function scoreToken(r, t) {
  if (r.nw.some((w) => w.startsWith(t))) return 10;
  if (r.n.includes(t)) return 7;
  if (r.gw.some((w) => w.startsWith(t))) return 5;
  if (r.t.includes(t) || r.a.includes(t) || r.g.includes(t)) return 4;
  if (t.length >= 4) {
    const max = t.length >= 7 ? 2 : 1;
    const words = r.nw.concat(r.gw);
    if (words.some((w) => within(t, w.slice(0, t.length + max), max))) return 3;
    if (r.t.split(' ').some((w) => w.length >= 4 && within(t, w, 1))) return 2;
  }
  if (t.length >= 3 && subsequence(t, r.n.replace(/ /g, ''))) return 1;
  return 0;
}

function search(query) {
  const q = norm(query);
  if (!q || !rows) return { hits: [], total: 0 };
  const tokens = q.split(' ');
  const hits = [];
  for (const r of rows) {
    let s = 0;
    let ok = true;
    for (const t of tokens) {
      const v = scoreToken(r, t);
      if (!v) {
        ok = false;
        break;
      }
      s += v;
    }
    if (!ok) continue;
    if (r.n === q) s += 20;
    else if (r.n.startsWith(q)) s += 8;
    s += Math.log1p(r.score) * 1.2;
    hits.push([s, r]);
  }
  hits.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name, 'en-GB'));
  return { hits: hits.slice(0, LIMIT).map((h) => h[1]), total: hits.length };
}

const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function open(on) {
  list.hidden = !on;
  input.setAttribute('aria-expanded', String(on));
  if (!on) setActive(-1);
}

function setActive(i) {
  const items = list.querySelectorAll('[role="option"]');
  items.forEach((el, n) => el.setAttribute('aria-selected', String(n === i)));
  active = i;
  if (i >= 0 && items[i]) {
    input.setAttribute('aria-activedescendant', items[i].id);
    items[i].scrollIntoView({ block: 'nearest' });
  } else {
    input.removeAttribute('aria-activedescendant');
  }
}

function render() {
  const query = input.value.trim();
  if (!query) {
    open(false);
    status.textContent = '';
    return;
  }
  if (!rows) {
    list.innerHTML = '<li class="find-note">Loading…</li>';
    open(true);
    return;
  }
  const { hits, total } = search(query);
  shown = hits.map((r) => `/${r.slug}`);
  const all = `/all?q=${encodeURIComponent(query)}`;
  shown.push(all);
  list.innerHTML =
    hits
      .map(
        (r, i) =>
          `<li role="option" id="opt-${i}" aria-selected="false" data-href="/${r.slug}" style="--cat: var(--cat-${r.cat})">` +
          `<span class="find-name">${esc(r.name)}</span>` +
          `<span class="find-tag">${esc(r.tagline)}</span>` +
          `<span class="find-meta"><span class="cat">${esc(CATS[r.cat] ?? r.cat)}</span> ${esc(r.author || 'anon')}</span>` +
          `</li>`,
      )
      .join('') +
    `<li role="option" id="opt-${hits.length}" aria-selected="false" data-href="${esc(all)}" class="find-all">` +
    (total
      ? `See all ${total} ${total === 1 ? 'match' : 'matches'} on the full shelf →`
      : `No quick matches. Search inside every bot's instructions →`) +
    `</li>`;
  status.textContent = total ? `${total} bots match` : 'No matches';
  open(true);
  setActive(-1);
}

if (form && input) {
  input.addEventListener('focus', load, { once: true });
  input.addEventListener('pointerdown', load, { once: true });
  input.addEventListener('input', () => {
    load();
    render();
  });
  input.addEventListener('keydown', (e) => {
    const n = list.querySelectorAll('[role="option"]').length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      if (list.hidden) open(true);
      setActive((active + 1) % n);
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      setActive(active <= 0 ? n - 1 : active - 1);
    } else if (e.key === 'Enter' && active >= 0 && shown[active]) {
      e.preventDefault();
      location.href = shown[active];
    } else if (e.key === 'Escape') {
      if (!list.hidden) open(false);
      else if (input.value) input.value = '';
      else input.blur();
    }
  });
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[data-href]');
    if (li) location.href = li.dataset.href;
  });
  input.addEventListener('blur', () => open(false));
  input.addEventListener('focus', () => input.value && render());

  document.querySelectorAll('[data-fill]').forEach((btn) =>
    btn.addEventListener('click', () => {
      input.value = btn.dataset.fill;
      input.focus();
      load().then(render);
      render();
    }),
  );

  document.addEventListener('keydown', (e) => {
    const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}
