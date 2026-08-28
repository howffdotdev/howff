// The instructions panel is capped by max-height in CSS. Only offer the
// expand control when there is genuinely something clipped, and default to
// expanded when JS is off so nothing is ever unreachable.
const body = document.getElementById('ins-body');
const btn = document.getElementById('expand');

if (body && btn && body.scrollHeight > body.clientHeight + 4) {
  const lines = body.textContent.trim().split('\n').length;
  btn.textContent = `Show all · ${lines} lines`;
  btn.hidden = false;
  btn.addEventListener('click', () => {
    const open = body.hasAttribute('data-expanded');
    if (open) {
      body.removeAttribute('data-expanded');
      btn.textContent = `Show all · ${lines} lines`;
    } else {
      body.setAttribute('data-expanded', '');
      btn.textContent = 'Show less';
    }
    btn.setAttribute('aria-expanded', String(!open));
  });
}
