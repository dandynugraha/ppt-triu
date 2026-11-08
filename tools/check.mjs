// Automated acceptance checks (PRD 5.9.4). Exit code 1 on any FAIL.
import { chromium } from 'playwright';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deck = resolve(root, 'deck');
const results = [];
const ok = (name, pass, info = '') => results.push({ name, pass, info });
const warn = (name, info) => results.push({ name, pass: true, warn: true, info });
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

// 1. v6: art is drawn live (deck/js/art.js) — no frame folder; checked in the browser below
ok('no video frames needed (real-time WebGL art)', !existsSync(join(deck, 'frames')));
const deckBytes = walk(deck).reduce((s, f) => s + statSync(f).size, 0);
ok('deck folder < 60 MB', deckBytes < 60 * 1048576, (deckBytes / 1048576).toFixed(2) + ' MB');

// 2. no http(s):// and no placeholder strings in runtime files
const runtime = walk(deck).filter(f => ['.html', '.js', '.css'].includes(extname(f)));
const urlHits = runtime.filter(f => /https?:\/\//i.test(readFileSync(f, 'utf8')));
ok('no http(s):// in runtime files', !urlHits.length, urlHits.join(', '));
const phHits = runtime.filter(f => /\b(TODO|FIXME|lorem ipsum|placeholder|XXX)\b/i.test(readFileSync(f, 'utf8')));
ok('no TODO/placeholder strings', !phHits.length, phHits.join(', '));
ok('fonts bundled', readdirSync(join(deck, 'fonts')).filter(f => f.endsWith('.woff2')).length >= 5);

// 3. contrast of text token pairs (DESIGN.md)
const tok = readFileSync(join(deck, 'css/tokens.css'), 'utf8');
const T = n => tok.match(new RegExp(`--${n}:\\s*(#[0-9A-Fa-f]{6})`))[1];
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [['ink', 'paper'], ['ink', 'card'], ['muted', 'paper'], ['muted', 'card'], ['violet', 'paper'], ['violet', 'card'], ['mark-ink', 'lime']];
for (const [a, b] of pairs) { const r = cr(T(a), T(b)); ok(`contrast ${a}/${b} >= 7`, r >= 7, r.toFixed(2)); }
{ const r = cr('#FFFFFF', T('violet-deep')); ok('contrast white/violet-deep >= 7', r >= 7, r.toFixed(2)); }
{ const r = cr('#FFFFFF', T('periwinkle')); ok('contrast white/periwinkle (panel) >= 7', r >= 7, r.toFixed(2)); }

// 4. browser checks
const logosPresent = ['ipb.png', 'triu.png'].filter(f => existsSync(join(deck, 'assets/logo', f)));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });   // live pages: small (software GL in CI)
const page = await ctx.newPage();
const consoleErrors = [], external = [], logoMisses = [];
page.on('console', m => { if (m.type() === 'error') { const u = (m.location() || {}).url || ''; if (/assets\/(logo|img)\//.test(u)) logoMisses.push(u); else consoleErrors.push(m.text() + ' @ ' + u); } });
page.on('pageerror', e => consoleErrors.push(String(e)));
ctx.on('request', r => { const u = r.url(); if (!/^(file:|data:|blob:|about:)/.test(u)) external.push(u); });
await page.goto(pathToFileURL(join(deck, 'index.html')).href);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const n = await page.evaluate(() => window.DECK.slides.length);
const st0 = await page.evaluate(() => window.__state());
ok('WebGL background + slide visuals active', st0.webgl && st0.viz, JSON.stringify({ webgl: st0.webgl, viz: st0.viz }));
const vizCount = await page.evaluate(() => window.DECK.slides.filter(s => /class="viz[ "]/.test(s.html)).length);
ok('every slide has a visual (chart, diagram, structure, brain or campus)', vizCount === 14, vizCount + ' / 14');
ok('fonts loaded (Schibsted Grotesk)', await page.evaluate(() => document.fonts.check('600 68px "Schibsted Grotesk"')));

// forward through every slide with keyboard
const keyNext = ['Enter', 'PageDown', 'ArrowRight', 'Space', 'ArrowDown'];
let fwd = true;
for (let i = 1; i < n; i++) {
  await page.keyboard.press(keyNext[i % keyNext.length] === 'Space' ? ' ' : keyNext[i % keyNext.length]);
  const s = await page.evaluate(() => window.__state());
  if (s.idx !== i) { fwd = false; break; }
}
ok('every slide reachable forward (Enter/PageDown/→/Space/↓)', fwd);
await page.waitForTimeout(1800);
let back = true;
const keyPrev = ['Backspace', 'PageUp', 'ArrowLeft', 'ArrowUp'];
for (let i = n - 2; i >= 0; i--) {
  await page.keyboard.press(keyPrev[i % keyPrev.length]);
  const s = await page.evaluate(() => window.__state());
  if (s.idx !== i) { back = false; break; }
}
ok('every slide reachable backward (Backspace/PageUp/←/↑)', back);
await page.waitForTimeout(1800);

// rapid 5x Enter from slide 1 -> slide 6, settled on the right frame
await page.keyboard.press('Home'); await page.keyboard.press('Enter'); await page.waitForTimeout(3600);
for (let i = 0; i < 5; i++) await page.keyboard.press('Enter');
// travel is time-based (≤ 3.6 s); wait for it to finish rather than a fixed delay (CI uses software GL)
await page.waitForFunction(() => !window.__state().tweening, null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(400);
const st = await page.evaluate(() => window.__state());
ok('rapid 5× Enter ends on the right slide, inside its frame hold', st.idx === 6 && st.inHold && !st.tweening, JSON.stringify(st));
const shown = await page.evaluate(() => [...document.querySelectorAll('.slide.is-on')].map(e => e.className));
ok('only the current slide is visible after rapid input', shown.length === 1 && /\bs6\b/.test(shown[0]), shown.join(' | '));

// number jump, End, hash
await page.keyboard.press('1'); await page.keyboard.press('2'); await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__state().idx === 12, null, { timeout: 8000 }).catch(() => {});
ok('typing 12 + Enter jumps to slide 12', (await page.evaluate(() => window.__state().idx)) === 12);
await page.keyboard.press('End');
ok('End goes to the last main slide (11)', (await page.evaluate(() => window.__state().idx)) === 11);
await page.keyboard.press('b');
ok('B blacks the screen', await page.evaluate(() => document.getElementById('black').classList.contains('on')));
await page.keyboard.press('b');
ok('B again restores', !(await page.evaluate(() => document.getElementById('black').classList.contains('on'))));
await page.keyboard.press('.');
ok('"." blacks the screen (clicker)', await page.evaluate(() => document.getElementById('black').classList.contains('on')));
await page.keyboard.press('.');

// presenter window
const [pop] = await Promise.all([page.waitForEvent('popup', { timeout: 5000 }).catch(() => null), page.keyboard.press('n')]);
if (pop) {
  await pop.waitForTimeout(600);
  const txt = await pop.evaluate(() => document.body.innerText);
  ok('presenter window opens with notes + timers', /Thank you/.test(txt) && /total/i.test(txt) && /slide/i.test(txt), txt.slice(0, 80).replace(/\n/g, ' '));
  await pop.keyboard.press('PageUp');
  ok('keys in presenter window control the deck', (await page.evaluate(() => window.__state().idx)) === 10);
  await pop.close();
} else ok('presenter window opens with notes + timers', false, 'no popup');

// wheel = one slide per gesture
await page.bringToFront(); await page.waitForTimeout(300);
await page.keyboard.press('3'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
await page.waitForFunction(() => window.__state().idx === 3, null, { timeout: 15000 }).catch(async () => { console.log('DEBUG before wheel', JSON.stringify(await page.evaluate(() => ({ s: window.__state(), black: document.getElementById('black').className, hash: location.hash })))); await page.evaluate(() => { location.hash = '#3'; }); await page.waitForTimeout(500); });
const before = await page.evaluate(() => window.__state().idx);
await page.evaluate(() => { for (let i = 0; i < 6; i++) window.dispatchEvent(new WheelEvent('wheel', { deltaY: 30, cancelable: true })); });
const wIdx = await page.evaluate(() => window.__state().idx);
ok('wheel gesture advances exactly one slide', wIdx === 4, 'idx before ' + before + ', after wheel: ' + wIdx);

// hash deep link
await page.close();
const p2 = await ctx.newPage();
await p2.goto(pathToFileURL(join(deck, 'index.html')).href + '#7');
await p2.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
ok('URL hash #7 opens slide 7', (await p2.evaluate(() => window.__state().idx)) === 7);

// text overflow: no slide content beyond the text column / stage bottom
await p2.close();
const ctx3 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
ctx3.on('request', r => { const u = r.url(); if (!/^(file:|data:|blob:|about:)/.test(u)) external.push(u); });
const p3 = await ctx3.newPage();
p3.on('pageerror', e => consoleErrors.push(String(e)));
await p3.goto(pathToFileURL(join(deck, 'index.html')).href + '?static');
const over = [];
for (let i = 1; i < n; i++) {
  await p3.evaluate(i => window.__go(i), i);
  await p3.waitForFunction(() => window.__ready === true);
  const o = await p3.evaluate(() => {
    const el = document.querySelector('.slide.is-on'); const sr = document.getElementById('stage').getBoundingClientRect();
    const s = sr.width / 1920; let bad = [];
    el.querySelectorAll('.col *').forEach(c => { const r = c.getBoundingClientRect(); if (!r.width) return;
      const col = c.closest('.col').getBoundingClientRect();
      if (r.left < col.left - 2 || r.right > col.right + 4 || (r.bottom - sr.top) / s > 1040 || (r.top - sr.top) / s < 100) bad.push((c.className || c.tagName) + '@' + Math.round((r.right - sr.left) / s)); });
    return bad.slice(0, 3);
  });
  if (o.length) over.push(i + ':' + o.join('/'));
}
ok('all text inside its own column box, below the header and above the bottom edge', !over.length, over.join(' ; '));

await browser.close();
ok('no console errors', !consoleErrors.length, consoleErrors.slice(0, 3).join(' | '));
ok('no network requests', !external.length, external.slice(0, 3).join(', '));
if (logoMisses.length) warn('optional files not yet added (fallback shown)', logoMisses.map(u => u.split('/deck/')[1]).filter((v, i, a) => a.indexOf(v) === i).join(', '));
else ok('all optional files (logos, campus photo) load', true);

let fail = 0;
for (const r of results) { const tag = r.warn ? 'WARN' : r.pass ? 'PASS' : 'FAIL'; if (!r.pass) fail++; console.log(`${tag}  ${r.name}${r.info ? '  — ' + r.info : ''}`); }
console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed');
process.exit(fail ? 1 : 0);
