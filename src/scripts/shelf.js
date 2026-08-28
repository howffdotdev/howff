const q = document.getElementById('q');
const type = document.getElementById('type');
const runtime = document.getElementById('runtime');
const tag = document.getElementById('tag');
const items = [...document.querySelectorAll('[data-entry]')];
const count = document.getElementById('count');
const empty = document.getElementById('empty');

function here() {
  return (location.pathname.replace(/\/$/, '') || '/');
}

function pathForRuntime(r) {
  if (!r || r === 'all') return '/';
  return '/' + r;
}

function apply() {
  const query = (q.value || '').trim().toLowerCase();
  const t = type.value;
  const r = runtime.value;
  const g = tag.value;
  let n = 0;
  for (const el of items) {
    const hay = el.getAttribute('data-search') || '';
    const okQ = !query || hay.includes(query);
    const okT = t === 'all' || el.getAttribute('data-type') === t;
    const okR = r === 'all' || (el.getAttribute('data-runtimes') || '').split(' ').includes(r);
    const okG = g === 'all' || (el.getAttribute('data-tags') || '').split(' ').includes(g);
    const show = okQ && okT && okR && okG;
    el.hidden = !show;
    if (show) n += 1;
  }
  count.textContent = n === 1 ? '1 on the shelf' : `${n} on the shelf`;
  empty.hidden = n !== 0;
}

for (const el of [q, type, tag]) {
  el.addEventListener('input', apply);
  el.addEventListener('change', apply);
}

runtime.addEventListener('change', () => {
  const next = pathForRuntime(runtime.value);
  if (here() !== next) {
    location.assign(next);
    return;
  }
  apply();
});

apply();
