// Filtering runs over the prerendered cards by toggling [hidden]. The URL is
// the single source of filter state, so a filtered view is shareable.
const form = document.getElementById('filters');
const q = document.getElementById('q');
const cat = document.getElementById('cat');
const int = document.getElementById('int');
const tag = document.getElementById('tag');
const sort = document.getElementById('sort');
const list = document.getElementById('list');
const count = document.getElementById('count');
const countN = document.getElementById('count-n') || count;
const empty = document.getElementById('empty');
const clear = document.getElementById('clear');
const cards = [...document.querySelectorAll('[data-entry]')];

const state = { q: '', cat: 'all', int: 'all', tag: 'all', sort: 'new' };
let announce;

function hasOption(select, value) {
  return Boolean(select && [...select.options].some((o) => o.value === value));
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
    countN.textContent = text;
  } else {
    // Debounced so the live region does not chatter once per keystroke.
    announce = setTimeout(() => {
      countN.textContent = text;
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

  if (cat && !hasOption(cat, state.cat)) state.cat = 'all';
  if (int && !hasOption(int, state.int)) state.int = 'all';
  if (tag && !hasOption(tag, state.tag)) state.tag = 'all';

  if (q) q.value = state.q;
  if (cat) cat.value = state.cat;
  if (int) int.value = state.int;
  if (tag) tag.value = state.tag;
  if (sort) sort.value = state.sort;
}

function reset() {
  state.q = '';
  state.cat = 'all';
  state.int = 'all';
  state.tag = 'all';
  if (q) q.value = '';
  if (cat) cat.value = 'all';
  if (int) int.value = 'all';
  if (tag) tag.value = 'all';
  apply();
  q?.focus();
}

q?.addEventListener('input', () => {
  state.q = q.value.trim();
  apply();
});

cat?.addEventListener('change', () => {
  state.cat = cat.value;
  apply();
});

int?.addEventListener('change', () => {
  state.int = int.value;
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
