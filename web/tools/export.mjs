// Export: hold frames (?static, final build state) of the 12 main + 4 backup slides → web/shots/NN.png → web/backup.pdf
// usage: node web/tools/export.mjs
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(web, 'shots'); fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(web, 'index.html')).href + '?static');
await page.waitForFunction(() => window.__ready === true);
const ids = await page.evaluate(() => window.DECK.S.filter(s => !s.opening).map(s => [s.id, s.steps]));
const files = [];
for (const [k, [id, steps]] of ids.entries()) {
  await page.evaluate(([id, s]) => window.__go(id, s), [id, steps]);
  await page.evaluate(() => Promise.all([...document.querySelectorAll('.slide.on img')].map(i => i.decode().catch(() => 0))));
  await page.waitForTimeout(150);
  const f = path.join(shots, `${String(k + 1).padStart(2, '0')}_${id}.png`);
  await page.screenshot({ path: f }); files.push(f);
}
// one PDF page per slide, 13.333 × 7.5 in
const html = '<html><head><style>@page{size:13.333in 7.5in;margin:0}body{margin:0}img{width:13.333in;height:7.5in;display:block;page-break-after:always}</style></head><body>' +
  files.map(f => `<img src="${pathToFileURL(f).href}">`).join('') + '</body></html>';
const tmp = path.join(shots, '_pdf.html'); fs.writeFileSync(tmp, html);
await page.goto(pathToFileURL(tmp).href); await page.waitForLoadState('load');
await page.pdf({ path: path.join(web, 'backup.pdf'), width: '13.333in', height: '7.5in', printBackground: true });
fs.unlinkSync(tmp);
console.log('pages', files.length, '→', path.join(web, 'backup.pdf'));
await browser.close();
