// Filtering runs over the prerendered cards by toggling [hidden]. The URL is
// the single source of filter state, so a filtered view is shareable.
const form = document.getElementById('filters');
const q = document.getElementById('q');
const tag = document.getElementById('tag');
const sort = document.getElementById('sort');
const list = document.getElementById('list');
const count = document.getElementById('count');
const empty = document.getElementById('empty');
const clear = document.getElementById('clear');
const catPills = [...document.querySelectorAll('[data-cat]')];
const intPills = [...document.querySelectorAll('[data-int]')];
const cards = [...document.querySelectorAll('[data-entry]')];

const state = { q: '', cat: 'all', int: 'all', tag: 'all', sort: 'new' };
let announce;

function pressed(pills, key, value) {
  for (const btn of pills) {
    btn.setAttribute('aria-pressed', String(btn.getAttribute(key) === value));
  }
}

function isDefault() {
  return !state.q && state.cat === 'all' && state.int === 'all' && state.tag === 'all';
}

function writeUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.cat !== 'all') params.set('cat', state.cat);
  if (state.int !== 'all') params.set('int', state.int);
  if (state.tag !== 'all') params.set('tag', state.tag);
  if (state.sort !== 'new') params.set('sort', state.sort);
  const query = params.toString();
  // Replace, not push: otherwise the back button walks every keystroke.
  history.replaceState(null, '', query ? `?${query}` : location.pathname);
}

function order() {
  const sorted = [...cards].sort((a, b) =>
    state.sort === 'az'
      ? a.dataset.name.localeCompare(b.dataset.name, 'en-GB')
      : b.dataset.added.localeCompare(a.dataset.added) ||
        a.dataset.name.localeCompare(b.dataset.name, 'en-GB'),
  );
  list.append(...sorted);
}

function apply({ quiet = false } = {}) {
  const query = state.q.toLowerCase();
  let n = 0;
  for (const card of cards) {
    const show =
      (!query || card.dataset.search.includes(query)) &&
      (state.cat === 'all' || card.dataset.category === state.cat) &&
      (state.int === 'all' || card.dataset.integrations.split('|').includes(state.int)) &&
      (state.tag === 'all' || card.dataset.tags.split('|').includes(state.tag));
    card.hidden = !show;
    if (show) n += 1;
  }

  const text = n === 1 ? '1 bot' : `${n} bots`;
  clearTimeout(announce);
  if (quiet) {
    count.textContent = text;
  } else {
    // Debounced so the live region does not chatter once per keystroke.
    announce = setTimeout(() => {
      count.textContent = text;
    }, 350);
  }

  empty.hidden = n !== 0;
  clear.hidden = isDefault();
  writeUrl();
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  state.q = params.get('q') ?? '';
  state.cat = params.get('cat') ?? 'all';
  state.int = params.get('int') ?? 'all';
  state.tag = params.get('tag') ?? 'all';
  state.sort = params.get('sort') === 'az' ? 'az' : 'new';

  // Only honour values this page actually offers.
  if (!catPills.some((b) => b.dataset.cat === state.cat)) state.cat = 'all';
  if (!intPills.some((b) => b.dataset.int === state.int)) state.int = 'all';
  if (tag && ![...tag.options].some((o) => o.value === state.tag)) state.tag = 'all';

  if (q) q.value = state.q;
  if (tag) tag.value = state.tag;
  if (sort) sort.value = state.sort;
  pressed(catPills, 'data-cat', state.cat);
  pressed(intPills, 'data-int', state.int);
}

function reset() {
  state.q = '';
  state.cat = 'all';
  state.int = 'all';
  state.tag = 'all';
  if (q) q.value = '';
  if (tag) tag.value = 'all';
  pressed(catPills, 'data-cat', 'all');
  pressed(intPills, 'data-int', 'all');
  apply();
  q?.focus();
}

q?.addEventListener('input', () => {
  state.q = q.value.trim();
  apply();
});

tag?.addEventListener('change', () => {
  state.tag = tag.value;
  apply();
});

sort?.addEventListener('change', () => {
  state.sort = sort.value;
  order();
  apply();
});

for (const btn of catPills) {
  btn.addEventListener('click', () => {
    state.cat = btn.dataset.cat;
    pressed(catPills, 'data-cat', state.cat);
    apply();
  });
}

for (const btn of intPills) {
  btn.addEventListener('click', () => {
    state.int = btn.dataset.int;
    pressed(intPills, 'data-int', state.int);
    apply();
  });
}

clear?.addEventListener('click', reset);
document.querySelector('[data-clear]')?.addEventListener('click', reset);

// The form is a real GET form so search still works without JS.
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  apply();
});

document.addEventListener('keydown', (event) => {
  const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName);
  if (event.key === '/' && !inField && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    q?.focus();
    return;
  }
  if (event.key === 'Escape' && event.target === q) {
    if (q.value) {
      q.value = '';
      state.q = '';
      apply();
    } else {
      q.blur();
    }
  }
});

readUrl();
order();
apply({ quiet: true });
