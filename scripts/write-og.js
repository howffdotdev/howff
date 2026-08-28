import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const b64 = readFileSync(join(root, 'scripts', 'og.jpg.b64'), 'utf8').replace(/\s/g, '');
mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'og.jpg'), Buffer.from(b64, 'base64'));
