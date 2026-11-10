import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = path.join(ROOT, 'screenshots');
const WIDTHS = { mobile: 375, tablet: 768, desktop: 1280, wide: 1920 };
const shotWidths = (process.env.WIDTHS || 'mobile,tablet,desktop,wide').split(',');
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const pages = [...sitemap.matchAll(/<loc>[^<]*?\.example\/([^<]*)<\/loc>/g)].map((m) => m[1]);
const results = { pages: pages.length, consoleErrors: [], brokenLinks: [], brokenAssets: [], checks: [] };
const check = (name, ok, detail = '') => { results.checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();

const seen = new Map();
async function status(url) {
  if (!seen.has(url)) seen.set(url, fetch(url, { method: 'GET' }).then((r) => r.status).catch(() => 0));
  return seen.get(url);
}

for (const [label, width] of Object.entries(WIDTHS)) {
  if (!shotWidths.includes(label)) continue;
  const ctx = await browser.newContext({ viewport: { width, height: label === 'mobile' ? 812 : 900 }, deviceScaleFactor: 1 });
  for (const p of pages) {
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push(`${label} /${p}: ${m.text()}`); });
    page.on('pageerror', (e) => results.consoleErrors.push(`${label} /${p}: ${e.message}`));
    page.on('response', (r) => { if (r.status() >= 400) results.brokenAssets.push(`${r.status()} ${r.url()} (from /${p})`); });
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
    });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 1) check(`no horizontal overflow ${label} /${p}`, false, `${overflow}px`);
    const name = (p.replace(/\/$/, '').replace(/\//g, '__') || 'home') + `--${label}.png`;
    await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
    if (label === 'desktop') {
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
      for (const h of new Set(hrefs)) {
        if (!h.startsWith(BASE)) continue;
        const s = await status(h.split('#')[0]);
        if (s !== 200) results.brokenLinks.push(`${s} ${h} (from /${p})`);
        const hash = h.split('#')[1];
        if (hash && h.split('#')[0] === page.url().split('#')[0] && !(await page.$(`#${hash}`))) results.brokenLinks.push(`missing anchor #${hash} on /${p}`);
      }
    }
    await page.close();
  }
  await ctx.close();
  console.log(`screenshots ${label} done`);
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => results.consoleErrors.push(`flow: ${e.message}`));

await page.goto(BASE + 'appointment/?piece=rolex-submariner-16800');
check('appointment preselects piece from ?piece=', (await page.textContent('[data-chosen]')).includes('Submariner Date'));
await page.click('button[type="submit"]');
const errText = await page.textContent('[data-errors]');
check('empty submit shows error summary', /Choose a date/.test(errText) && /Enter your name/.test(errText), errText.replace(/\s+/g, ' ').slice(0, 90));
check('error summary receives focus', await page.evaluate(() => document.activeElement?.matches('[data-errors]')));
await page.focus('.day:not([disabled])');
const before = await page.evaluate(() => document.activeElement.dataset.date);
await page.keyboard.press('ArrowRight');
const after = await page.evaluate(() => document.activeElement.dataset.date);
check('calendar arrow keys move between open days', before !== after && !!after, `${before} -> ${after}`);
await page.keyboard.press('Enter');
check('keyboard Enter selects a date', (await page.inputValue('input[name="date"]')) === after);
const slot = page.locator('[data-slots] input:not([disabled])').first();
await slot.check({ force: true });
check('time slot selection updates summary', !/Not chosen/.test(await page.textContent('[data-sum="time"]')));
await page.locator('input[name="party"][value="2"]').check({ force: true });
await page.locator('input[name="interests"][value="High jewelry"]').check({ force: true });
await page.selectOption('[data-piece-select]', 'cartier-must-tank');
check('second piece can be added', (await page.locator('[data-chosen] li').count()) === 2);
await page.fill('#ap-name', 'Avery Demo');
await page.fill('#ap-email', 'not-an-email');
await page.locator('input[name="consent"]').check({ force: true });
await page.click('button[type="submit"]');
check('invalid email is rejected', /valid email/.test(await page.textContent('[data-errors]')));
await page.fill('#ap-email', 'avery@example.com');
await page.locator('input[name="contactPref"][value="WhatsApp"]').check({ force: true });
await page.click('button[type="submit"]');
await page.waitForSelector('[data-confirm]:not([hidden])');
const conf = await page.textContent('[data-confirm]');
check('confirmation shows reference and details', /Reference QB-/.test(conf) && /Avery/.test(conf) && /Tank/.test(conf), conf.replace(/\s+/g, ' ').slice(0, 120));
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('qb.appointment')));
check('request persisted to localStorage', saved?.length === 1 && saved[0].pieces === 'rolex-submariner-16800,cartier-must-tank' && saved[0].party === '2', JSON.stringify(saved?.[0]).slice(0, 140));
const icsHref = await page.getAttribute('[data-confirm] a[download]', 'href');
const icsText = await page.evaluate(async (u) => (await fetch(u)).text(), icsHref);
check('add-to-calendar produces a valid .ics', icsText.includes('BEGIN:VEVENT') && icsText.includes('DTSTART;TZID=America/New_York'));
await page.goto(BASE + 'appointment/');
check('pending request banner shows after reload', !(await page.isHidden('[data-pending]')));

await page.goto(BASE + 'consign/');
await page.fill('#cs-name', 'Sam Seller');
await page.fill('#cs-email', 'sam@example.com');
await page.fill('#cs-maker', 'Haldane Traverse');
await page.locator('#consign input[name="consent"], form[data-form="consign"] input[name="consent"]').first().check({ force: true });
await page.click('form[data-form="consign"] button[type="submit"]');
await page.waitForSelector('[data-confirm]:not([hidden])');
check('consign form confirms', /in confidence/.test(await page.textContent('[data-confirm]')));

await page.goto(BASE + 'pieces/orsolya-octa-41/');
await page.click('.enquiry summary');
await page.fill('#iq-name', 'Quinn');
await page.fill('#iq-contact', 'quinn@example.com');
await page.click('form[data-form="inquiry"] button[type="submit"]');
check('piece inquiry confirms inline', /Received, reference QB-/.test(await page.textContent('form[data-form="inquiry"] .form-status')));
await page.click('[data-thumb="1"]');
check('gallery thumbnail switches image', await page.evaluate(() => document.querySelector('[data-slide="1"]').classList.contains('is-active')));

await page.fill('#list-email', 'bad');
await page.click('form[data-form="list"] button[type="submit"]');
check('list signup rejects bad email', (await page.getAttribute('#list-email', 'aria-invalid')) === 'true');
await page.fill('#list-email', 'list@example.com');
await page.click('form[data-form="list"] button[type="submit"]');
check('list signup confirms', /on the list/.test(await page.textContent('form[data-form="list"] .form-status')));

await page.goto(BASE + 'lookbook/');
await page.click('[data-filter="watch"]');
const visible = await page.$$eval('.look', (ls) => ls.filter((l) => !l.hidden).map((l) => l.dataset.kind));
check('lookbook filter shows only watches', visible.length > 0 && visible.every((k) => k === 'watch'), `${visible.length} shown`);

await page.goto(BASE);
await page.click('[data-menu-open]');
check('menu opens and focuses close', await page.evaluate(() => document.activeElement?.matches('[data-menu-close]')));
await page.keyboard.press('Escape');
check('Escape closes menu and returns focus', await page.evaluate(() => document.querySelector('[data-menu]').hidden && document.activeElement?.matches('[data-menu-open]')));
await page.keyboard.press('Tab');
const skip = await ctx.newPage();
await skip.goto(BASE + 'house/');
await skip.keyboard.press('Tab');
check('first Tab reaches skip link', await skip.evaluate(() => document.activeElement?.classList.contains('skip')));

const html = await (await fetch(BASE)).text();
const allHtml = pages.map((p) => fs.readFileSync(path.join(ROOT, p, 'index.html'), 'utf8')).join('') + fs.readFileSync(path.join(ROOT, 'assets/js/site.js'), 'utf8');
check('no popup, marquee, countdown, or chat widget markup on any page', !/<marquee|<dialog|role="dialog"|class="[^"]*(countdown|modal|popup|chat)|setInterval/i.test(allHtml));
const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
check('home JSON-LD parses with JewelryStore', ld.some((j) => j['@type'] === 'JewelryStore'));
for (const f of ['robots.txt', 'sitemap.xml', 'favicon.svg', 'site.webmanifest', 'assets/og.png', 'assets/apple-touch-icon.png', '404.html']) check(`serves ${f}`, (await status(BASE + f)) === 200);
const nf = await fetch(BASE + 'no-such-page/');
check('unknown path returns 404', nf.status === 404);

await browser.close();
check('no console errors', results.consoleErrors.length === 0, results.consoleErrors.slice(0, 5).join(' | '));
check('no broken internal links or anchors', results.brokenLinks.length === 0, results.brokenLinks.slice(0, 5).join(' | '));
check('no failed asset requests', results.brokenAssets.length === 0, results.brokenAssets.slice(0, 5).join(' | '));
fs.writeFileSync(path.join(ROOT, 'screenshots', 'verify-report.json'), JSON.stringify(results, null, 2));
const failed = results.checks.filter((c) => !c.ok).length;
console.log(`\n${results.checks.length - failed}/${results.checks.length} checks passed across ${pages.length} pages`);
process.exit(failed ? 1 : 0);
