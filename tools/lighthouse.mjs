import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const PAGES = ['', 'lookbook/', 'pieces/colombian-emerald-ring/', 'appointment/'];
const CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
const out = new URL('../screenshots/lighthouse/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const rows = [];
for (const preset of ['mobile', 'desktop']) {
  for (const p of PAGES) {
    const file = `${out}${(p || 'home').replace(/\/$/, '').replace(/\//g, '__')}--${preset}.json`;
    const args = [`${BASE}/${p}`, '--quiet', '--output=json', `--output-path=${file}`, `--only-categories=${CATS.join(',')}`, '--chrome-flags=--headless=new --no-sandbox'];
    if (preset === 'desktop') args.push('--preset=desktop');
    execFileSync('node_modules/.bin/lighthouse', args, { stdio: 'inherit' });
    const r = JSON.parse(readFileSync(file, 'utf8'));
    rows.push({ page: `/${p}`, preset, ...Object.fromEntries(CATS.map((c) => [c, Math.round(r.categories[c].score * 100)])) });
  }
}
console.table(rows);
writeFileSync(`${out}summary.json`, JSON.stringify(rows, null, 2));
