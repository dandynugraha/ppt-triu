// backup.pdf: one slide per page, 1920x1080, settled state (raster of the real deck, so it matches exactly).
import { chromium } from 'playwright';
import { writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(resolve(root, 'deck/index.html')).href + '?static');
const n = await page.evaluate(() => window.DECK.slides.length);
const imgs = [];
for (let i = 0; i < n; i++) {
  await page.evaluate(i => window.__go(i), i);
  await page.waitForFunction(() => window.__ready === true);
  imgs.push((await page.screenshot({ type: 'jpeg', quality: 90 })).toString('base64'));
}
const html = `<!doctype html><html><head><style>@page{size:1920px 1080px;margin:0}html,body{margin:0}
img{display:block;width:1920px;height:1080px;page-break-after:always;break-after:page}</style></head><body>
${imgs.map(b => `<img src="data:image/jpeg;base64,${b}">`).join('\n')}</body></html>`;
const pdfPage = await browser.newPage();
await pdfPage.setContent(html, { waitUntil: 'load' });
const out = resolve(root, 'backup.pdf');
await pdfPage.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, pageRanges: `1-${n}` });
await browser.close();
console.log(`backup.pdf: ${n} pages, ${(statSync(out).size / 1048576).toFixed(2)} MB`);
