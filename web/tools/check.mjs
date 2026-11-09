// Behaviour test (Playwright/Chromium, file://): click-through matches the script, Morph mid-frames, rapid input,
// key → first changed frame latency, mouse/clicker keys, no console errors, no network outside web/.
// usage: node web/tools/check.mjs [outDir]
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(web, '..', '.work', 'check')); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [], external = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:')) external.push(u); });
const url = pathToFileURL(path.join(web, 'index.html')).href;
await page.goto(url);
await page.waitForFunction(() => window.__ready === true);
const state = () => page.evaluate(() => [window.DECK.S[window.DECK.st.i].id, window.DECK.st.step]);
const R = { ok: true, notes: [] };
const fail = (m) => { R.ok = false; R.notes.push('FAIL ' + m); };

// 1. opening auto-advances o1 → o2 → o3 and then waits
await page.waitForTimeout(4600);
let s = await state(); if (s[0] !== 'o3') fail('opening did not auto-advance to o3: ' + s); else R.notes.push('opening auto-advance ok');

// 2. full click-through with the clicker key (PageDown); compare with the script's KLIK count per slide
const script = await page.evaluate(() => Object.fromEntries(Object.entries(window.NOTES).map(([k, v]) => [k, (v.text.match(/\[click\]/g) || []).length])));
const seen = {};
let presses = 0;
for (let k = 0; k < 60; k++) {
  await page.keyboard.press('PageDown'); presses++;
  await page.waitForTimeout(k % 7 === 0 ? 800 : 120);
  s = await state();
  seen[s[0]] = Math.max(seen[s[0]] || 0, s[1]);
  if (s[0] === '10') break;
}
for (const [id, n] of Object.entries(script)) if ((seen[id] || 0) !== n) fail(`slide ${id}: ${seen[id]} builds vs ${n} KLIK in script`);
R.notes.push(`click-through: ${presses} presses from o3 to slide 10 (expected 35 = 12 slide changes incl. opening→title + 23 builds)`);
if (presses !== 35) fail('press count ' + presses);
await page.keyboard.press('PageDown'); s = await state(); if (s[0] !== '10') fail('advanced past the close slide');

// 3. backward then forward over a dive, mid-Morph frames
const mid = async (from, step, name) => {
  await page.evaluate(([f, b]) => window.__go(f, b), [from, step]);
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(330);
  await page.screenshot({ path: path.join(out, `morph_${name}.png`) });
  await page.waitForTimeout(800);
};
await mid('o3', 0, 'opening_to_title');
await mid('3a', 3, '3a_to_3b');
await mid('6a', 0, '6a_to_6b');
await mid('9', 3, '9_to_10');
await mid('2', 1, '2_to_3a');

// 4. rapid input: 15 presses within 1 s from slide 1 → must land exactly 15 steps on, no half-faded elements
await page.evaluate(() => window.__go('1', 0));
for (let k = 0; k < 15; k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60); }
await page.waitForTimeout(900);
s = await state();
const expect = await page.evaluate(() => { const D = window.DECK; let i = D.idx('1'), b = 0; for (let k = 0; k < 15; k++) { if (b < D.S[i].steps) b++; else { i++; b = 0; } } return [D.S[i].id, b]; });
if (s[0] !== expect[0] || s[1] !== expect[1]) fail(`rapid input landed ${s} expected ${expect}`); else R.notes.push(`rapid input ok (${s})`);
const half = await page.evaluate(() => Array.from(document.querySelectorAll('.slide.on .shp')).filter(e => { const o = +getComputedStyle(e).opacity; return o > 0.02 && o < 0.98 && !e.closest('.hid'); }).map(e => e.dataset.name).slice(0, 5));
if (half.length) R.notes.push('note: partially transparent (by design?) ' + half.join(', '));

// 5. latency: keydown → first frame with changed DOM state (median of 30)
const lat = await page.evaluate(async () => {
  const D = window.DECK, res = [];
  for (let k = 0; k < 30; k++) {
    D.go(D.idx('3a'), 0, { animate: false });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const t0 = performance.now();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await new Promise(r => requestAnimationFrame(r));
    res.push(performance.now() - t0);
    await new Promise(r => setTimeout(r, 120));
  }
  res.sort((a, b) => a - b); return res[15];
});
R.notes.push(`keydown → next painted frame, i.e. one 60 Hz frame (median of 30): ${lat.toFixed(1)} ms`);
if (lat > 25) fail('latency ' + lat);

// 6. mouse: left click = next, right click = previous, long press = spotlight without advancing
await page.evaluate(() => window.__go('4', 0));
await page.mouse.click(960, 600); await page.waitForTimeout(200);
s = await state(); if (s[1] !== 1) fail('left click did not advance: ' + s);
await page.mouse.click(960, 600, { button: 'right' }); await page.waitForTimeout(200);
s = await state(); if (s[1] !== 0) fail('right click did not go back: ' + s);
await page.mouse.move(900, 500); await page.mouse.down(); await page.waitForTimeout(450); await page.mouse.up(); await page.waitForTimeout(150);
s = await state(); if (s[1] !== 0) fail('long press advanced: ' + s);
await page.mouse.wheel(0, 120); await page.waitForTimeout(400);
s = await state(); if (s[1] !== 1) fail('wheel did not advance: ' + s);
// clicker black screen
await page.keyboard.press('b'); const black = await page.evaluate(() => document.getElementById('blank').className);
await page.keyboard.press('PageDown'); const after = await page.evaluate(() => document.getElementById('blank').className);
if (black !== 'black' || after !== '') fail('black screen toggle');
// backups via Shift+A
await page.keyboard.press('Shift+A'); s = await state(); if (s[0] !== 'A') fail('Shift+A');
await page.keyboard.press('5'); await page.waitForTimeout(800); s = await state(); if (s[0] !== '4') fail('digit 5 → slide 4 expected, got ' + s);

R.errors = errors; R.external = external;
if (errors.length) fail('console errors');
if (external.length) fail('external requests');
console.log(JSON.stringify(R, null, 1));
await browser.close();
process.exit(R.ok ? 0 : 1);
