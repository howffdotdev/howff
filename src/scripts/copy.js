// Every [data-copy] button on the site. The button is its own live region, so
// swapping the label both shows and announces the result.
const timers = new WeakMap();

async function copy(btn) {
  const text = btn.getAttribute('data-copy') ?? '';
  const done = btn.getAttribute('data-done') ?? 'Copied';
  const label = btn.getAttribute('data-label') ?? btn.textContent;
  let ok = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    ok = false;
  }
  btn.textContent = ok ? done : 'Press Ctrl+C';
  if (!ok) {
    // No Clipboard API, or permission refused. Select the text so the keyboard
    // shortcut the label now suggests actually does something.
    const target = document.getElementById(btn.getAttribute('data-copy-target') ?? '');
    if (target?.select) target.select();
  }
  clearTimeout(timers.get(btn));
  timers.set(
    btn,
    setTimeout(() => {
      btn.textContent = label;
    }, 2000),
  );
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-copy]');
  if (btn) copy(btn);
});
