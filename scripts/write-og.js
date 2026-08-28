import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = join(root, 'scripts');
const single = join(scriptsDir, 'og.jpg.b64');
const numbered = [1, 2, 3].map((i) => join(scriptsDir, `og.jpg.b64.${i}`));

let raw;
if (numbered.every((p) => existsSync(p))) {
  raw = numbered.map((p) => readFileSync(p, 'utf8')).join('');
} else if (existsSync(single)) {
  raw = readFileSync(single, 'utf8');
} else {
  throw new Error('missing scripts/og.jpg.b64 (or numbered .1 .2 .3 parts)');
}

const b64 = raw.replace(/\s/g, '');
mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'og.jpg'), Buffer.from(b64, 'base64'));
