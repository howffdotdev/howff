// The anti-flash script in Base.astro sets the attribute. This only handles
// the toggle, so it can load deferred like any other module.
const btn = document.getElementById('theme-toggle');
const root = document.documentElement;

function current() {
  if (root.dataset.theme) return root.dataset.theme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function label(theme) {
  return theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
}

function sync() {
  btn.setAttribute('aria-label', label(current()));
}

btn?.addEventListener('click', () => {
  const next = current() === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  try {
    localStorage.setItem('howff-theme', next);
  } catch {}
  sync();
});

if (btn) sync();
