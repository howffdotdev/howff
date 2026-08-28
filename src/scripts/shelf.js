const q = document.getElementById('q');
const tag = document.getElementById('tag');
const typePills = [...document.querySelectorAll('[data-filter-type]')];
const items = [...document.querySelectorAll('[data-entry]')];
const count = document.getElementById('count');
const empty = document.getElementById('empty');

function currentType() {
  return document.querySelector('[data-filter-type].is-on')?.getAttribute('data-filter-type') || 'all';
}

function apply() {
  const query = (q?.value || '').trim().toLowerCase();
  const t = currentType();
  const g = tag?.value || 'all';
  let n = 0;
  for (const el of items) {
    const hay = el.getAttribute('data-search') || '';
    const okQ = !query || hay.includes(query);
    const okT = t === 'all' || el.getAttribute('data-type') === t;
    const okG = g === 'all' || (el.getAttribute('data-tags') || '').split(' ').includes(g);
    const show = okQ && okT && okG;
    el.hidden = !show;
    if (show) n += 1;
  }
  if (count) count.textContent = n === 1 ? '1 on the shelf' : `${n} on the shelf`;
  if (empty) empty.hidden = n !== 0;
}

q?.addEventListener('input', apply);
tag?.addEventListener('change', apply);

for (const btn of typePills) {
  btn.addEventListener('click', () => {
    for (const b of typePills) b.classList.toggle('is-on', b === btn);
    apply();
  });
}

apply();
