// Measures real contrast of every text run against the rendered background behind it (worst case = brightest bg pixel).
// Writes shots/tc/NN_bg.png (text hidden) + shots/tc/boxes.json; tools/textcontrast.py does the maths.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(resolve(root, 'shots/tc'), { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(pathToFileURL(resolve(root, 'deck/index.html')).href + '?static');
const n = await p.evaluate(() => window.DECK.slides.length), all = {};
for (let i = 1; i < n; i++) {
  await p.evaluate(i => window.__go(i), i); await p.waitForFunction(() => window.__ready === true);
  all[i] = await p.evaluate(() => {
    const out = [], el = document.querySelector('.slide.is-on');
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const t = w.currentNode; if (!t.textContent.trim()) continue;
      const pe = t.parentElement; if (pe.closest('.card, .panel, mark, .brand')) continue;      // these sit on their own opaque surface
      const cs = getComputedStyle(pe), col = pe.closest('svg') ? getComputedStyle(pe).fill : cs.color, rg = document.createRange(); rg.selectNodeContents(t);
      for (const r of rg.getClientRects()) if (r.width > 2) out.push({ x: r.left, y: r.top, w: r.width, h: r.height, color: col, size: parseFloat(cs.fontSize), text: t.textContent.trim().slice(0, 30) });
    }
    return out;
  });
  await p.addStyleTag({ content: '.col, .viz-svg text, .viz-cap, .hdr, .counter { opacity: 0 !important; }' });
  await p.screenshot({ path: resolve(root, `shots/tc/${String(i).padStart(2, '0')}_bg.png`) });
  await p.evaluate(() => document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('opacity: 0 !important')) s.remove(); }));
}
writeFileSync(resolve(root, 'shots/tc/boxes.json'), JSON.stringify(all));
await b.close();
