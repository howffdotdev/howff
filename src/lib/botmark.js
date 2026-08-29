// A bot mark per entry, derived from its slug.
//
// There is no avatar in the data, so the mark is generated: the slug picks a
// head, eyes, a mouth, and an aerial, and the category picks the colour. Same
// slug always gives the same mark, so a bot's face never changes between
// builds, and a new entry gets one with no extra data to maintain.
//
// Returns an SVG string on a 48×48 grid. Colours default to the CSS custom
// properties the site already defines, so the mark follows the theme; the OG
// renderer passes resolved hex instead, since satori has no var().

// FNV-1a. Small, stable, and no dependency: the same slug must hash the same
// way on every machine and every build.
function hash(slug) {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// A separate stream per feature, so two bots sharing a head rarely also share
// eyes: consecutive bytes of one hash would correlate.
function picker(slug) {
  let state = hash(slug);
  return (n) => {
    state = Math.imul(state ^ (state >>> 15), 0x2545f491) >>> 0;
    return state % n;
  };
}

const HEADS = ['round', 'square', 'dome', 'hex'];
const EYES = ['dot', 'ring', 'bar', 'wide', 'happy'];
const MOUTHS = ['grille', 'line', 'smile', 'dots'];
const AERIALS = ['stalk', 'pair', 'dish', 'none'];

function head(kind, stroke, fill) {
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="2"`;
  if (kind === 'square') return `<rect x="9" y="13" width="30" height="27" rx="3" ${common}/>`;
  if (kind === 'dome') return `<path d="M9 40V27a15 15 0 0 1 30 0v13z" ${common} stroke-linejoin="round"/>`;
  if (kind === 'hex') {
    return `<path d="M24 12l13 7.5v13L24 40l-13-7.5v-13z" ${common} stroke-linejoin="round"/>`;
  }
  return `<rect x="9" y="13" width="30" height="27" rx="10" ${common}/>`;
}

function eyes(kind, accent) {
  const l = 18;
  const r = 30;
  const y = 25;
  if (kind === 'ring') {
    return `<circle cx="${l}" cy="${y}" r="3.4" fill="none" stroke="${accent}" stroke-width="2"/>
    <circle cx="${r}" cy="${y}" r="3.4" fill="none" stroke="${accent}" stroke-width="2"/>`;
  }
  if (kind === 'bar') {
    return `<rect x="${l - 4}" y="${y - 1.6}" width="8" height="3.2" rx="1.6" fill="${accent}"/>
    <rect x="${r - 4}" y="${y - 1.6}" width="8" height="3.2" rx="1.6" fill="${accent}"/>`;
  }
  if (kind === 'wide') {
    return `<rect x="${l - 4.5}" y="${y - 3.5}" width="9" height="7" rx="2" fill="${accent}"/>
    <rect x="${r - 4.5}" y="${y - 3.5}" width="9" height="7" rx="2" fill="${accent}"/>`;
  }
  if (kind === 'happy') {
    return `<path d="M${l - 4} ${y + 1.5} a4 4 0 0 1 8 0" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M${r - 4} ${y + 1.5} a4 4 0 0 1 8 0" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  return `<circle cx="${l}" cy="${y}" r="2.8" fill="${accent}"/>
    <circle cx="${r}" cy="${y}" r="2.8" fill="${accent}"/>`;
}

function mouth(kind, ink) {
  if (kind === 'line') {
    return `<path d="M19 33h10" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity="0.75"/>`;
  }
  if (kind === 'smile') {
    return `<path d="M19 32a5 5 0 0 0 10 0" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity="0.75"/>`;
  }
  if (kind === 'dots') {
    return `<g fill="${ink}" opacity="0.65"><circle cx="20" cy="33" r="1.3"/><circle cx="24" cy="33" r="1.3"/><circle cx="28" cy="33" r="1.3"/></g>`;
  }
  return `<g stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity="0.6">
    <path d="M20 31.5v3"/><path d="M24 31.5v3"/><path d="M28 31.5v3"/></g>`;
}

function aerial(kind, accent, stroke) {
  if (kind === 'none') return '';
  if (kind === 'pair') {
    return `<g stroke="${stroke}" stroke-width="2" stroke-linecap="round"><path d="M17 13l-3-5"/><path d="M31 13l3-5"/></g>
    <circle cx="14" cy="7" r="2.4" fill="${accent}"/><circle cx="34" cy="7" r="2.4" fill="${accent}"/>`;
  }
  if (kind === 'dish') {
    return `<path d="M24 13V9" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
    <path d="M18 8a6 6 0 0 1 12 0z" fill="${accent}"/>`;
  }
  return `<path d="M24 13V8" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="24" cy="6" r="2.6" fill="${accent}"/>`;
}

/**
 * @param slug     the entry slug; the only source of the shape
 * @param category picks the colour when `colors` are not given
 * @param opts.size    rendered px (viewBox stays 48)
 * @param opts.colors  { accent, ink, fill, stroke } to override the CSS vars
 * @param opts.attrs   extra attributes on the <svg>
 */
export function botMark(slug, category, { size = 48, colors, attrs = '' } = {}) {
  const pick = picker(slug);
  const shape = {
    head: HEADS[pick(HEADS.length)],
    eyes: EYES[pick(EYES.length)],
    mouth: MOUTHS[pick(MOUTHS.length)],
    aerial: AERIALS[pick(AERIALS.length)],
  };

  const c = colors ?? {
    accent: `var(--cat-${category}, var(--accent))`,
    ink: 'var(--fg-muted)',
    fill: 'var(--bg-sunken)',
    stroke: `var(--cat-${category}, var(--rule-strong))`,
  };

  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" ${attrs}>
  ${aerial(shape.aerial, c.accent, c.stroke)}
  ${head(shape.head, c.stroke, c.fill)}
  ${eyes(shape.eyes, c.accent)}
  ${mouth(shape.mouth, c.ink)}
</svg>`;
}
