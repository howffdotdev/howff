const form = document.getElementById('entry-form');
const out = document.getElementById('json-out');
const copyBtn = document.getElementById('copy-json');
const pr = document.getElementById('open-pr');
const status = document.getElementById('copy-status');

const KEYS = [
  'slug', 'name', 'type', 'tagline', 'description',
  'runtimes', 'install', 'source', 'homepage', 'license',
  'author', 'tags', 'verified', 'added', 'notes',
];

function val(id) {
  return document.getElementById(id).value.trim();
}

function list(id) {
  return val(id)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function emptyToNull(s) {
  return s ? s : null;
}

function build() {
  const slug = val('slug').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const entry = {
    slug,
    name: val('name'),
    type: val('type'),
    tagline: val('tagline'),
    description: val('description'),
    runtimes: list('runtimes'),
    install: {
      kind: val('install-kind'),
      command: emptyToNull(val('install-command')),
      url: emptyToNull(val('install-url')),
    },
    source: emptyToNull(val('source')),
    homepage: emptyToNull(val('homepage')),
    license: emptyToNull(val('license')),
    author: emptyToNull(val('author')),
    tags: list('tags'),
    verified: false,
    added: val('added') || new Date().toISOString().slice(0, 10),
    notes: emptyToNull(val('notes')),
  };
  const ordered = {};
  for (const k of KEYS) ordered[k] = entry[k];
  return ordered;
}

function render() {
  const entry = build();
  out.value = JSON.stringify(entry, null, 2) + '\n';
  const slug = entry.slug || 'your-slug';
  pr.href =
    'https://github.com/howffdotdev/howff/new/main/data/entries?filename=' +
    encodeURIComponent(slug + '.json');
}

form.addEventListener('input', render);
form.addEventListener('change', render);
form.addEventListener('submit', (e) => e.preventDefault());
copyBtn.addEventListener('click', async () => {
  render();
  try {
    await navigator.clipboard.writeText(out.value);
    status.textContent = 'Copied.';
    status.className = 'copy-ok';
  } catch {
    out.select();
    status.textContent = 'Select and copy the JSON.';
  }
});
render();
