// Social cards, rendered at build time.
//
// One card for the site and one per bot, so sharing a bot link shows that bot
// rather than a generic banner. Satori lays out a subset of CSS flexbox, resvg
// turns the SVG into PNG. Both are pure JS, so this runs in CI unchanged.
//
// The fonts in scripts/og-fonts are static TTF subsets: satori cannot parse the
// variable Fraunces the site loads, and needs TTF rather than woff2.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { loadEntries, CATEGORY_LABEL } from '../src/lib/entries.js';
import { botMark } from '../src/lib/botmark.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontDir = join(root, 'scripts', 'og-fonts');
// Straight into dist, which is gitignored: these are build output, and one
// committed PNG per bot would be megabytes of binary churn on every content PR.
const outDir = join(root, 'dist', 'og');

const W = 1200;
const H = 630;

// The dark theme's tokens, resolved. Satori has no var() or color-mix().
const BG = '#14110d';
const BG_RAISED = '#1c1814';
const FG = '#f0e7d7';
const FG_MUTED = '#a89a83';
const FG_FAINT = '#8f8474';
const RULE = '#3a3228';
const ACCENT = '#d4783c';
const COPPER_400 = '#e0873f';

const CAT_COLOR = {
  productivity: '#d6ab8f',
  development: '#8fb5d6',
  marketing: '#c58fd6',
  sales: '#8fd6bc',
  ops: '#d6c18f',
  personal: '#a98fd6',
  research: '#8fcad6',
  writing: '#d68fae',
  finance: '#abd68f',
  fun: '#d69d8f',
};

const fonts = [
  { name: 'Fraunces', data: readFileSync(join(fontDir, 'fraunces-600.ttf')), weight: 600, style: 'normal' },
  { name: 'IBM Plex Mono', data: readFileSync(join(fontDir, 'plex-mono-400.ttf')), weight: 400, style: 'normal' },
  { name: 'IBM Plex Mono', data: readFileSync(join(fontDir, 'plex-mono-500.ttf')), weight: 500, style: 'normal' },
];

const mono = (size, color, weight = 400) => ({
  fontFamily: 'IBM Plex Mono',
  fontSize: size,
  fontWeight: weight,
  color,
  letterSpacing: size * 0.1,
  textTransform: 'uppercase',
});

// Truncate on a word boundary so a long tagline never collides with the footer.
function clamp(text, max) {
  if (!text) return '';
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${cut.slice(0, at > max * 0.6 ? at : max).trimEnd()}…`;
}

// The site's mark: a small framed H with an aerial, drawn as plain divs.
function logo(scale = 1) {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
      children: [
        { type: 'div', props: { style: { width: 6 * scale, height: 6 * scale, borderRadius: 999, background: ACCENT } } },
        { type: 'div', props: { style: { width: 2 * scale, height: 10 * scale, background: ACCENT } } },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72 * scale,
              height: 72 * scale,
              background: BG,
              border: `${2 * scale}px solid ${COPPER_400}`,
              borderRadius: 4 * scale,
            },
            children: [
              { type: 'div', props: { style: { fontFamily: 'Fraunces', fontSize: 34 * scale, color: FG, lineHeight: 1 }, children: 'H' } },
              { type: 'div', props: { style: { width: 34 * scale, height: 4 * scale, marginTop: 6 * scale, background: ACCENT } } },
            ],
          },
        },
      ],
    },
  };
}

// A copper wash in the top-left, echoing the hero's radial gradient. It fills
// the frame rather than overhanging it: satori does not clip an oversized
// child, so an overhang leaves a visible rectangular edge mid-canvas.
const wash = {
  type: 'div',
  props: {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: W,
      height: H,
      background:
        'radial-gradient(900px 620px at 6% -18%, rgba(212,120,60,0.34), rgba(212,120,60,0.06) 46%, rgba(212,120,60,0) 68%)',
    },
  },
};

// Corner ticks, the printer's-mark detail from the current card.
function ticks() {
  const bar = (style) => ({ type: 'div', props: { style: { position: 'absolute', background: ACCENT, opacity: 0.55, ...style } } });
  return [
    bar({ top: 44, left: 44, width: 28, height: 2 }),
    bar({ top: 44, left: 44, width: 2, height: 28 }),
    bar({ bottom: 44, right: 44, width: 28, height: 2 }),
    bar({ bottom: 44, right: 44, width: 2, height: 28 }),
  ];
}

const frame = (children) => ({
  type: 'div',
  props: {
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      width: W,
      height: H,
      background: BG,
      padding: 72,
    },
    children: [wash, ...ticks(), ...children],
  },
});

// --- The site card -------------------------------------------------------
// A row of real bot marks, one per category, so the shelf's variety is the
// thing people see when the site itself is shared.
function markRow(entries) {
  const seen = new Set();
  const picks = [];
  for (const e of entries) {
    if (seen.has(e.category)) continue;
    seen.add(e.category);
    picks.push(e);
    if (picks.length === 8) break;
  }
  return {
    type: 'div',
    props: {
      style: { display: 'flex', gap: 20, marginLeft: 'auto' },
      children: picks.map((e) => {
        const cat = CAT_COLOR[e.category] ?? FG_MUTED;
        const svg = botMark(e.slug, e.category, {
          size: 52,
          colors: { accent: cat, ink: FG_MUTED, fill: BG_RAISED, stroke: cat },
        });
        return {
          type: 'img',
          props: { width: 52, height: 52, src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` },
        };
      }),
    },
  };
}

function siteCard(total, entries) {
  return frame([
    {
      type: 'div',
      props: {
        style: { display: 'flex', alignItems: 'center', gap: 28 },
        children: [
          logo(1),
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column' },
              children: [
                { type: 'div', props: { style: { fontFamily: 'Fraunces', fontSize: 62, color: FG, letterSpacing: 8, lineHeight: 1 }, children: 'HOWFF' } },
                { type: 'div', props: { style: { ...mono(19, FG_MUTED), marginTop: 10 }, children: 'howff · how + f · a Scots meeting-place' } },
              ],
            },
          },
          markRow(entries),
        ],
      },
    },
    {
      type: 'div',
      props: {
        style: { display: 'flex', flexDirection: 'column', marginTop: 'auto' },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexWrap: 'wrap', fontFamily: 'Fraunces', fontSize: 68, color: FG, lineHeight: 1.14, letterSpacing: -1.4 },
              // Flex children, so the gaps are set here: a trailing space inside
              // a span is collapsed away and the words would run together.
              children: [
                { type: 'span', props: { style: { marginRight: 18 }, children: 'Grok Bots you can' } },
                { type: 'span', props: { style: { marginRight: 18, color: COPPER_400 }, children: 'read' } },
                { type: 'span', props: { children: 'before you run.' } },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', gap: 18, marginTop: 34, paddingTop: 26, borderTop: `1px solid ${RULE}` },
              children: [
                { type: 'div', props: { style: mono(22, COPPER_400, 500), children: `${total} bots` }, },
                { type: 'div', props: { style: mono(22, FG_FAINT), children: '·' } },
                { type: 'div', props: { style: mono(22, FG_MUTED), children: 'every one shows its full instructions' } },
                { type: 'div', props: { style: { ...mono(22, FG_MUTED), marginLeft: 'auto' }, children: 'howff.dev' } },
              ],
            },
          },
        ],
      },
    },
  ]);
}

// --- A bot card ----------------------------------------------------------
function botCard(entry) {
  const cat = CAT_COLOR[entry.category] ?? FG_MUTED;
  const tools = entry.integrations.slice(0, 4);

  // The same generated mark the site shows, inlined: satori takes SVG only as
  // an <img> source, and needs the colours resolved rather than as var().
  const markSvg = botMark(entry.slug, entry.category, {
    size: 132,
    colors: { accent: cat, ink: FG_MUTED, fill: BG_RAISED, stroke: cat },
  });
  const mark = {
    type: 'img',
    props: {
      width: 132,
      height: 132,
      src: `data:image/svg+xml;base64,${Buffer.from(markSvg).toString('base64')}`,
    },
  };

  const pill = (text, color, border) => ({
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        paddingTop: 7,
        paddingBottom: 7,
        paddingLeft: 18,
        paddingRight: 18,
        color,
        border: `1px solid ${border}`,
        borderRadius: 999,
        ...mono(19, color, 500),
      },
      children: text,
    },
  });

  return frame([
    // Header: wordmark left, category right.
    {
      type: 'div',
      props: {
        style: { display: 'flex', alignItems: 'center', gap: 18 },
        children: [
          logo(0.42),
          { type: 'div', props: { style: { fontFamily: 'Fraunces', fontSize: 25, color: FG, letterSpacing: 5 }, children: 'HOWFF' } },
          {
            type: 'div',
            props: {
              style: { display: 'flex', marginLeft: 'auto' },
              children: [pill(CATEGORY_LABEL[entry.category] ?? entry.category, cat, cat)],
            },
          },
        ],
      },
    },
    // The mark, then name and tagline beside it.
    {
      type: 'div',
      props: {
        style: { display: 'flex', alignItems: 'center', gap: 40, marginTop: 'auto' },
        children: [
          mark,
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', flexShrink: 1 },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Fraunces',
                      fontSize: entry.name.length > 26 ? 58 : 70,
                      color: FG,
                      lineHeight: 1.1,
                      letterSpacing: -1.5,
                    },
                    children: clamp(entry.name, 42),
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontFamily: 'Fraunces', fontSize: 29, color: FG_MUTED, lineHeight: 1.4, marginTop: 18 },
                    children: clamp(entry.tagline, 100),
                  },
                },
              ],
            },
          },
        ],
      },
    },
    // Footer: tools left, author right.
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 34,
          paddingTop: 26,
          borderTop: `1px solid ${RULE}`,
        },
        children: [
          ...tools.map((t) => pill(t, FG_MUTED, RULE)),
          entry.instructions
            ? pill('full instructions', COPPER_400, ACCENT)
            : pill('share link', FG_FAINT, RULE),
          {
            type: 'div',
            props: {
              style: { display: 'flex', marginLeft: 'auto', ...mono(21, FG_MUTED) },
              children: entry.author ? `by ${entry.author}` : 'howff.dev',
            },
          },
        ],
      },
    },
  ]);
}

async function png(tree) {
  const svg = await satori(tree, { width: W, height: H, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

const entries = loadEntries();
mkdirSync(outDir, { recursive: true });

// PNG throughout: resvg emits PNG, and a .jpg holding PNG bytes is a card that
// some scrapers reject outright.
writeFileSync(join(outDir, 'default.png'), await png(siteCard(entries.length, entries)));

for (const entry of entries) {
  writeFileSync(join(outDir, `${entry.slug}.png`), await png(botCard(entry)));
}

console.log(`og · 1 site card · ${entries.length} bot cards`);
