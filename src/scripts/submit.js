// Drafts the two files a bot needs. Nothing is posted anywhere; the outputs
// are for copying into a pull request. Enum values come from the rendered
// <select> and checkbox markup, so this file holds no copy of the taxonomy.
const form = document.getElementById('entry-form');
const jsonOut = document.getElementById('json-out');
const mdOut = document.getElementById('md-out');
const mdBlock = document.getElementById('md-block');
const jsonName = document.getElementById('json-name');
const mdName = document.getElementById('md-name');
const prJson = document.getElementById('pr-json');
const prMd = document.getElementById('pr-md');
const copyJson = document.getElementById('copy-json');
const copyMd = document.getElementById('copy-md');
const insReq = document.getElementById('ins-req');
const warnings = document.getElementById('warnings');

const NEW_FILE = 'https://github.com/howffdotdev/howff/new/main/data/entries?filename=';

function val(id) {
  return document.getElementById(id).value.trim();
}

function list(id) {
  return val(id)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function orNull(s) {
  return s || null;
}

function build() {
  const slug = val('slug')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const body = document.getElementById('instructions').value.trim();
  return {
    slug,
    name: val('name'),
    category: val('category'),
    tagline: val('tagline'),
    description: val('description'),
    integrations: [...form.querySelectorAll('input[name="integration"]:checked')].map(
      (el) => el.value,
    ),
    add: {
      kind: val('add-kind'),
      url: val('add-url'),
      hint: orNull(val('add-hint')),
    },
    instructions: body ? `${slug}.md` : null,
    source: orNull(val('source')),
    homepage: orNull(val('homepage')),
    license: orNull(val('license')),
    author: orNull(val('author')),
    tags: list('tags'),
    verified: false,
    added: val('added') || new Date().toISOString().slice(0, 10),
    notes: orNull(val('notes')),
  };
}

// Mirrors scripts/validate.js, so a contributor sees the problem here rather
// than in CI after they have already opened a pull request.
function check(entry, body) {
  const out = [];
  if (!entry.slug) out.push('slug is required');
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) out.push('slug must be kebab-case');
  if (!entry.name) out.push('name is required');
  if (!entry.tagline) out.push('tagline is required');
  if (!entry.description) out.push('description is required');
  if (!/^https?:\/\//.test(entry.add.url)) out.push('add.url must be an http(s) URL');
  if (entry.add.kind === 'profile-url') {
    if (!body) out.push('instructions are required for a profile-url bot');
    if (/github\.com\/.*\/blob\//.test(entry.add.url)) {
      out.push('use the raw.githubusercontent.com URL, not the blob page');
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.added)) out.push('added must be YYYY-MM-DD');
  return out;
}

function render() {
  const entry = build();
  const body = document.getElementById('instructions').value.trim();
  const slug = entry.slug || 'your-slug';

  jsonOut.value = `${JSON.stringify(entry, null, 2)}\n`;
  jsonName.textContent = `data/entries/${slug}.json`;
  prJson.href = NEW_FILE + encodeURIComponent(`${slug}.json`);
  copyJson.setAttribute('data-copy', jsonOut.value);
  copyJson.setAttribute('data-copy-target', 'json-out');

  mdBlock.hidden = !body;
  if (body) {
    mdOut.value = `${body}\n`;
    mdName.textContent = `data/entries/${slug}.md`;
    prMd.href = NEW_FILE + encodeURIComponent(`${slug}.md`);
    copyMd.setAttribute('data-copy', mdOut.value);
    copyMd.setAttribute('data-copy-target', 'md-out');
  }

  insReq.textContent =
    entry.add.kind === 'profile-url'
      ? '(markdown, required for a profile URL)'
      : '(markdown, optional for share links)';

  const problems = check(entry, body);
  warnings.textContent = problems.length ? `Fix first: ${problems.join(' · ')}` : '';
}

form.addEventListener('input', render);
form.addEventListener('change', render);
form.addEventListener('submit', (event) => event.preventDefault());
render();
